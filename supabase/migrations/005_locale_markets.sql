-- Locale + market expansion for multilingual acquisition.
alter table leads drop constraint if exists leads_country_check;

alter table leads add column if not exists market_code text;
alter table leads add column if not exists country_code text;
alter table leads add column if not exists detected_locale text;
alter table leads add column if not exists detected_languages text[];
alter table leads add column if not exists preferred_language text;
alter table leads add column if not exists language_code text;
alter table leads add column if not exists region_code text;

update leads set
 market_code=case
  when country='United States' then 'US_EN'
  when country='Spain' then 'ES_ES'
  else market_code end,
 country_code=case
  when country='United States' then 'US'
  when country='Spain' then 'ES'
  else country_code end,
 preferred_language=case
  when country='Spain' then 'Spanish'
  else coalesce(preferred_language,'English') end,
 language_code=case
  when country='Spain' then 'es'
  else coalesce(language_code,'en') end
where market_code is null or country_code is null;

create index if not exists leads_market_code_idx on leads(market_code);
create index if not exists leads_language_code_idx on leads(language_code);
create index if not exists leads_detected_locale_idx on leads(detected_locale);
