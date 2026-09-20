do $$ begin
 if (select count(*) from job_families where active) < 2 then raise exception 'catalog_job_families_missing'; end if;
 if not exists(select 1 from campaigns c join campaign_versions v on v.campaign_id=c.id and v.status='PUBLISHED' where c.slug='es-spain-v1' and c.job_family_id is not null) then raise exception 'spain_catalog_link_missing'; end if;
 if not exists(select 1 from campaign_access a join campaigns c on c.id=a.campaign_id where c.slug='es-spain-v1' and a.provider='FUNCROWD') then raise exception 'spain_access_missing'; end if;
 if exists(select 1 from campaigns c left join campaign_versions v on v.campaign_id=c.id and v.status='PUBLISHED' where c.active and v.id is null) then raise exception 'active_campaign_without_published_version'; end if;
end $$;
