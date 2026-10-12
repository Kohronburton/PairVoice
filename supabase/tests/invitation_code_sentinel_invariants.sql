\set ON_ERROR_STOP on
begin;
do $$
begin
 if exists(select 1 from campaign_access where invitation_code='CONFIGURE_IN_ADMIN') then
  raise exception 'invitation_code_placeholder_present';
 end if;
end $$;
rollback;
select 'invitation code sentinel invariants passed' result;
