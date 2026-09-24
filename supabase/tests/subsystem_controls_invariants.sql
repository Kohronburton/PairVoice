\set ON_ERROR_STOP on
begin;
do $$
begin
 if not subsystem_is_enabled('MATCHING') then raise exception 'matching_should_default_enabled'; end if;
 perform set_subsystem_control('MATCHING',false,'test incident',null,'TEST');
 if subsystem_is_enabled('MATCHING') then raise exception 'matching_pause_failed'; end if;
 if not exists(select 1 from audit_events where operation='SUBSYSTEM_CONTROL_CHANGED' and after_data->>'subsystem'='MATCHING' and after_data->>'enabled'='false') then raise exception 'control_audit_missing'; end if;
 perform set_subsystem_control('MATCHING',true,'test recovery',null,'TEST');
 if not subsystem_is_enabled('MATCHING') then raise exception 'matching_resume_failed'; end if;
end $$;
rollback;
select 'subsystem control invariants passed' result;
