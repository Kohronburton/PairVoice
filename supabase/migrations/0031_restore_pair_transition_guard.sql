-- Correct the transition guard overwritten by 0030 and enforce readiness at READY.
create or replace function public.guard_pair_transition() returns trigger language plpgsql as $$
begin
 if old.state<>new.state and not pair_transition_allowed(old.state,new.state) then
  raise exception 'invalid_pair_transition:%->%',old.state,new.state;
 end if;
 if old.state='READINESS_PENDING' and new.state='READY' then
  if exists(select 1 from (values('PARTNER_ACCEPTED'),('ELIGIBILITY_A'),('ELIGIBILITY_B'),('SAMPLE_A'),('SAMPLE_B'),('CONSENT_A'),('CONSENT_B'),('PARTICIPATION_HISTORY'),('CAPACITY'),('CREDENTIAL')) req(gate_key)
    where not exists(select 1 from pair_readiness_gates g where g.pair_id=new.id and g.gate_key=req.gate_key and g.status in('PASSED','WAIVED'))) then
    raise exception 'readiness_gates_incomplete';
  end if;
 end if;
 return new;
end $$;
