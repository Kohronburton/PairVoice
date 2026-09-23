\set ON_ERROR_STOP on

begin;
insert into public.funnel_events(event_name,session_id,page_path,language_code,metadata)
values('landing_view','sql-funnel-test','/','en','{"source":"test"}'::jsonb);
do $$ begin
 if not exists(select 1 from public.funnel_events where session_id='sql-funnel-test' and event_name='landing_view') then
  raise exception 'funnel_event_not_inserted';
 end if;
end $$;
rollback;

select 'funnel invariants passed' as result;
