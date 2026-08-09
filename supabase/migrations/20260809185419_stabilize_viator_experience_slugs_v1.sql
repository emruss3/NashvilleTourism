update public.experiences e
set slug = 'viator-' || regexp_replace(lower(esi.external_id), '[^a-z0-9]+', '-', 'g'),
    updated_at = now()
from public.experience_source_ids esi
join public.data_sources ds on ds.id = esi.source_id
where esi.experience_id = e.id
  and ds.provider_key = 'viator';
