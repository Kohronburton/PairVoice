#!/usr/bin/env bash
set -euo pipefail

HOST="${PGHOST:-localhost}"
USER="${PGUSER:-postgres}"
SOURCE_DB="${PGDATABASE:-postgres}"
RESTORE_DB="pairvoice_restore"

echo "Seeding restore probe"
psql -h "$HOST" -U "$USER" -d "$SOURCE_DB" -v ON_ERROR_STOP=1 <<'SQL'
insert into participants(first_name,email,country_code,primary_language_code)
values('Restore Probe','restore-probe@example.test','US','en')
on conflict(email) do nothing;

insert into ledger_entries(participant_id,entry_type,amount_cents,currency,idempotency_key,metadata)
select id,'ADJUSTMENT',1234,'USD','restore-probe-ledger','{"probe":true}'::jsonb
from participants where email='restore-probe@example.test'
on conflict(idempotency_key) do nothing;

insert into audit_events(actor_label,operation,resource_type,reason,after_data)
values('CI','RESTORE_PROBE','SYSTEM','Backup/restore verification','{"probe":true}'::jsonb);
SQL

echo "Creating logical backup"
pg_dump -h "$HOST" -U "$USER" -d "$SOURCE_DB" --format=custom --no-owner --no-acl -f /tmp/pairvoice.dump

dropdb -h "$HOST" -U "$USER" --if-exists "$RESTORE_DB"
createdb -h "$HOST" -U "$USER" "$RESTORE_DB"
pg_restore -h "$HOST" -U "$USER" -d "$RESTORE_DB" --no-owner --no-acl /tmp/pairvoice.dump

echo "Verifying restored business state"
psql -h "$HOST" -U "$USER" -d "$RESTORE_DB" -v ON_ERROR_STOP=1 <<'SQL'
do $$
declare p uuid; balance integer; controls integer;
begin
 select id into p from participants where email='restore-probe@example.test';
 if p is null then raise exception 'restore_participant_missing'; end if;

 select coalesce(sum(amount_cents),0) into balance from ledger_entries where participant_id=p and currency='USD';
 if balance<>1234 then raise exception 'restore_ledger_mismatch:%',balance; end if;

 select count(*) into controls from subsystem_controls;
 if controls<>5 then raise exception 'restore_subsystem_controls_mismatch:%',controls; end if;

 if not exists(select 1 from audit_events where operation='RESTORE_PROBE') then
  raise exception 'restore_audit_evidence_missing';
 end if;

 if not exists(select 1 from provider_integrations where provider_key='funcrowd' and provider_type='WORK') then
  raise exception 'restore_work_provider_missing';
 end if;
end $$;

do $$
declare target uuid;
begin
 select id into target from ledger_entries where idempotency_key='restore-probe-ledger';
 begin
  update ledger_entries set amount_cents=9999 where id=target;
  raise exception 'restored_ledger_was_mutable';
 exception
  when others then
   if sqlerrm='restored_ledger_was_mutable' then raise; end if;
   if sqlerrm<>'immutable_record' then raise; end if;
 end;
end $$;

select 'backup restore drill passed' result;
SQL
