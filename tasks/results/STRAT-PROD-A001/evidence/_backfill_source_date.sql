-- A001 补登记：来源发布日期（此前批次只写了标题与 URL，source_date 为 NULL）。
-- 只补空值，不覆盖任何既有登记。
update source.sources
   set source_date = jsonb_build_object('text', '2021-01-25')
 where title like '杨浦滨江%绿之丘%建筑奖%'
   and (source_date is null or source_date = '{}'::jsonb);

update source.sources
   set source_date = jsonb_build_object('text', '2023-10-07')
 where title like '出片又好玩%'
   and (source_date is null or source_date = '{}'::jsonb);

update source.sources
   set source_date = jsonb_build_object('text', '2021-08-16')
 where title like '杨浦区滨江发展%'
   and (source_date is null or source_date = '{}'::jsonb);

select left(title, 30) as title, source_date->>'text' as pub_date, publisher_or_institution
from source.sources
where provider in ('yangpu-gov', 'shanghai-gov')
order by created_at desc
limit 3;
