alter table public.funnel_events drop constraint if exists funnel_events_event_name_check;
alter table public.funnel_events add constraint funnel_events_event_name_check check(event_name in('landing_view','opportunity_view','signup_started','signup_submitted','signup_completed','email_queued','invite_created','invite_view','partner_signup_started','partner_signup_completed','share_clicked'));
