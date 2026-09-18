-- Allow locale detection without inventing a geography when the browser gives only a language.
update leads
set market_code='UNKNOWN', country='Unknown', country_code=null, region_code=null
where market_code='US'
  and detected_locale is not null
  and position('-' in replace(detected_locale,'_','-'))=0;
