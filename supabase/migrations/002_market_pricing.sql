-- Safe follow-up for environments where 001_signup_growth.sql was already applied.
insert into campaigns(slug,name,language_target,country_target,active) values
('us-english-v1','U.S. English Pair Voice Project','English','United States',true),
('es-spain-v1','Spain Spanish Pair Voice Project','Spanish','Spain',true)
on conflict(slug) do update set
 name=excluded.name,
 language_target=excluded.language_target,
 country_target=excluded.country_target,
 active=excluded.active;

insert into gigs(slug,title,compensation_cents,compensation_unit,language,country,requires_pair,active) values
('us-pair-60','U.S. Introductory Pair Voice Project',6000,'pair','English','United States',true,true),
('es-pair-50','Spain Introductory Pair Voice Project',5000,'pair','Spanish','Spain',true,true)
on conflict(slug) do update set
 title=excluded.title,
 compensation_cents=excluded.compensation_cents,
 compensation_unit=excluded.compensation_unit,
 language=excluded.language,
 country=excluded.country,
 requires_pair=excluded.requires_pair,
 active=excluded.active;

update gigs set active=false where slug='intro-pair-50';
