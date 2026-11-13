-- QR-05 / QR-04：Studio 资产消费裁决对齐唯一权利动作词典。
--
-- 背景：`studio.asset_consumption_disposition` 自带第三套动作白名单
-- （read/quote/display/download/adapt/external_processing），与
-- `packages/data-access/src/rights-actions.mjs`（mohen.rights-actions.v1）的九动作不一致：
--   · access_view / machine_read / retain / redistribute 一律被判 INVALID_ACTION，
--     想按词典请求"机器读取"或"保存副本"永远拿不到裁决；
--   · `studio.asset_revisions.rights_by_action` 的默认快照只写六个键，
--     另外四个动作连"未知"都没有落下来。
--
-- 本迁移只统一词表与默认快照，**不改变任何判定语义**：
--   · access_view（本人项目内研究读取）沿用既有取证规则：显式 denied 才阻断，
--     unknown 不阻断；项目归属、access_state、content_state 与依赖解析照旧另行校验。
--   · 其余八个动作照旧要求显式 allowed，缺失/unknown/restricted/denied 一律 BLOCKED。
--   · `read` / `public_display` 作为旧写法别名归一，历史 use_events 行原样保留、不改写。
--
-- 边界：只应用到本地隔离库；生产迁移另行授权。

begin;

-- 1) 资产修订默认快照补齐九动作（只改默认值，不动历史行）。
alter table studio.asset_revisions
  alter column rights_by_action set default
  '{"access_view":"unknown","machine_read":"unknown","retain":"unknown","download":"unknown","quote":"unknown","display":"unknown","adapt":"unknown","redistribute":"unknown","external_processing":"unknown"}'::jsonb;

-- 2) 消费裁决函数：动作白名单取唯一词典，read 归一到 access_view。
create or replace function studio.asset_consumption_disposition(p_revision_id uuid,p_action text)
returns jsonb
language plpgsql stable security definer set search_path=pg_catalog set jit=off as $$
declare r record; v_src jsonb; v_dep jsonb; v_blockers jsonb:='[]'::jsonb;
 v_right text; v_kind text; v_derived int:=0; v_origin text; v_action text;
begin
 v_action:=case lower(btrim(coalesce(p_action,'')))
  when 'read' then 'access_view'
  when 'public_display' then 'display'
  else lower(btrim(coalesce(p_action,''))) end;
 if v_action not in ('access_view','machine_read','retain','download','quote','display','adapt','redistribute','external_processing')
  then return jsonb_build_object('disposition','BLOCKED','action',p_action,'blockers',jsonb_build_array('INVALID_ACTION')); end if;
 select a.revision_id,a.epistemic_class,a.access_state,a.content_state,a.rights_by_action,
        a.source_refs,a.dependency_refs,h.project_id,h.asset_kind
  into r
  from studio.asset_revisions a join studio.asset_heads h on h.asset_id=a.asset_id
  where a.revision_id=p_revision_id;
 if not found
  then return jsonb_build_object('disposition','BLOCKED','action',v_action,'blockers',jsonb_build_array('REVISION_NOT_FOUND')); end if;
 v_kind:=r.epistemic_class;
 if r.access_state='REVOKED' then v_blockers:=v_blockers||jsonb_build_array('ACCESS_REVOKED'); end if;
 if r.content_state='ARCHIVED' then v_blockers:=v_blockers||jsonb_build_array('ARCHIVED'); end if;
 -- access_view 兼容历史快照里的旧键名 read：快照不可改写，旧行只能靠读取时归一。
 v_right:=coalesce(r.rights_by_action->>v_action,
  case when v_action='access_view' then r.rights_by_action->>'read' end,'unknown');
 if v_action='access_view' then
  if v_right='denied' then v_blockers:=v_blockers||jsonb_build_array('RIGHT_DENIED'); end if;
 else
  if v_right<>'allowed' then v_blockers:=v_blockers||jsonb_build_array('RIGHT_NOT_ALLOWED'); end if;
 end if;
 v_src:=studio.resolve_asset_references(r.source_refs);
 v_dep:=studio.resolve_asset_references(r.dependency_refs);
 if (v_src->>'status')<>'OK' or (v_dep->>'status')<>'OK'
  then v_blockers:=v_blockers||jsonb_build_array('REFERENCE_SHAPE_INVALID');
 elsif (v_src->>'blocked')::int>0 or (v_dep->>'blocked')::int>0
  then v_blockers:=v_blockers||jsonb_build_array('UNRESOLVED_REFERENCE');
 end if;
 if v_kind in ('original_material','observation','claim','hypothesis','qualified_L_ref') then
  v_derived:=studio.asset_verified_original_bindings(p_revision_id);
  if coalesce((v_src->>'total')::int,0)=0 and v_derived=0
   then v_blockers:=v_blockers||jsonb_build_array('NO_SOURCE_REF'); end if;
 end if;
 v_origin:=case when coalesce((v_src->>'total')::int,0)>0 then 'STORED_SOURCE_REFS'
  when v_derived>0 then 'VERIFIED_ORIGINAL_BINDING' else 'NONE' end;
 return jsonb_build_object(
  'disposition',case when jsonb_array_length(v_blockers)=0 then 'ELIGIBLE' else 'BLOCKED' end,
  'action',v_action,'asset_kind',r.asset_kind,'epistemic_class',v_kind,
  'access_state',r.access_state,'content_state',r.content_state,'right',v_right,
  'source_origin',v_origin,'verified_original_bindings',v_derived,
  'blockers',v_blockers,'source',v_src,'dependency',v_dep);
end $$;

comment on column studio.asset_revisions.rights_by_action is
 'Per-action permission snapshot in the single dictionary mohen.rights-actions.v1 (access_view/machine_read/retain/download/quote/display/adapt/redistribute/external_processing). Missing action = unknown = BLOCKED for every action except access_view, which blocks only on explicit denied.';

commit;
