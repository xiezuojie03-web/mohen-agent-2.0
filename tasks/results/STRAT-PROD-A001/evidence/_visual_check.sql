\pset pager off
\echo === visual_objects 画面阅读 / 对应主张 / 成熟度 ===
select visual_type,
       (case when literal_reading is null or length(literal_reading)=0 then '(空)' else left(literal_reading,30) end) as reading,
       (case when correspondence_claim is null or correspondence_claim='{}'::jsonb then '(空)' else left(correspondence_claim->>'statement',30) end) as claim,
       maturity,
       count(*) n
from world.visual_objects
group by 1,2,3,4 order by 1;

\echo === 各 provider 的 reading_units 模态 ===
select s.provider, r.media_type, count(ru.reading_unit_id) as reading_units
from source.raw_items r
join source.source_versions v on v.source_version_id=r.source_version_id
join source.sources s on s.source_id=v.source_id
left join evidence.reading_units ru on ru.raw_item_id=r.raw_item_id
group by 1,2 order by 1,2;
