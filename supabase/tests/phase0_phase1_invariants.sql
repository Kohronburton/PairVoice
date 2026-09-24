do $$
declare p1 uuid; p2 uuid;
begin
 if to_regclass('public.partner_pool') is null then raise exception 'partner_pool_missing'; end if;
 if to_regclass('public.potential_partnerships') is null then raise exception 'potential_partnerships_missing'; end if;
 if to_regclass('public.referral_programs') is null then raise exception 'referral_programs_missing'; end if;
 if to_regclass('public.participant_payout_methods') is null then raise exception 'payout_methods_missing'; end if;

 insert into participants(first_name,email,phone,country_code,primary_language_code)
 values('Phase','phase0-1-a@example.com','+15550000001','ES','es') returning id into p1;
 begin
  insert into participants(first_name,email,phone,country_code,primary_language_code)
  values('Duplicate','phase0-1-b@example.com','+15550000001','ES','es') returning id into p2;
  raise exception 'duplicate_phone_was_allowed';
 exception when unique_violation then null;
 end;

 insert into participants(first_name,email,country_code,primary_language_code)
 values('Partner','phase0-1-c@example.com','ES','es') returning id into p2;
 insert into partner_pool(participant_id,country_code,language_code) values(p1,'ES','es'),(p2,'ES','es');

 begin
  insert into potential_partnerships(participant_a_id,participant_b_id) values(p1,p1);
  raise exception 'self_pair_was_allowed';
 exception when check_violation then null;
 end;

 if not exists(select 1 from referral_programs where milestone_referrals=10 and active=false) then
  insert into referral_programs(name,milestone_referrals,milestone_bonus_cents,active)
  values('Phase 0/1 default',10,0,false);
 end if;
end $$;
