-- Normalize market to geography only; language remains a separate signal.
update leads set market_code = case market_code
 when 'US_EN' then 'US'
 when 'ES_ES' then 'ES'
 when 'IT_IT' then 'IT'
 when 'AU_EN' then 'AU'
 when 'GB_EN' then 'GB'
 when 'MX_ES' then 'MX'
 when 'AR_ES' then 'AR'
 when 'CO_ES' then 'CO'
 else market_code end;
