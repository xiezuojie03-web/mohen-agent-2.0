// scripts/check-name-resolution.mjs（C6 · E 组 · pnpm guard:names）
// 目的：让 `entities.canonical_name` 的重名不再是"一笔无解释的糊涂账"。
//
// 为什么需要它：
//   库里存在 383 组同名 canonical_name。没有结论时，下游（抽取 / 编织 / 链接）遇到同名只能
//   **猜**——而猜错的代价本仓已付过：C4 首版把"同一对象被移植成两行"当成"同名异义"，
//   253 张图被假 HOMONYM_CONFLICT 卡住、一条链接都建不出来。
//
// 规则（与 unattended.name-resolution 作业逐字一致）：
//   ① 每个重名组必须有结论（resolved = 同一对象的重复行；homonym_open = 机器不可定，送人审）；
//   ② 结论只能来自 legacy_mappings(legacy_source='c6-name-resolution')；
//   ③ 拒绝"既没结论也不申报"的组 —— 那正是糊涂账的定义。
//
// DB 不可达 → WARN 并跳过（离线可跑）。只读：本脚本只执行 SELECT。
import { queryRows, queryValue } from "../packages/data-access/src/index.mjs";

const SRC = "c6-name-resolution";
let failed = false;
const bad = (m) => { console.error("NAME_RESOLUTION_ERROR " + m); failed = true; };

let dbNote = "";
try {
  // 口径必须与 unattended.name-resolution 作业**逐字一致**：按 btrim(canonical_name) 分组。
  // 差一个 trim，守卫就会把「名字带尾空格」的组算成未覆盖 —— 那是守卫自己造出来的假缺口。
  const DUP = `select btrim(canonical_name) as n from entities
                where canonical_name is not null and btrim(canonical_name) <> ''
                 group by 1 having count(*) > 1`;
  const dupGroups = Number(await queryValue(`select count(*)::int from (${DUP}) t`));

  const covered = Number(await queryValue(
    `select count(*)::int from legacy_mappings m
      where m.legacy_source = :'s' and m.legacy_type = 'entity_name_group'
        and m.legacy_id in (${DUP})`, { s: SRC }));

  const byStatus = await queryRows(
    `select mapping_status, count(*)::int c from legacy_mappings
      where legacy_source = :'s' and legacy_type = 'entity_name_group' group by 1 order by 2 desc`, { s: SRC });

  const unknownStatus = byStatus.filter((r) => !["resolved", "homonym_open"].includes(String(r.mapping_status)))
    .map((r) => `${r.mapping_status}(${r.c})`);
  if (unknownStatus.length) bad(`出现未定义的结论状态：${unknownStatus.join("、")}（只允许 resolved / homonym_open）`);

  const orphan = Number(await queryValue(
    `select count(*)::int from legacy_mappings m
      where m.legacy_source = :'s' and m.legacy_type = 'entity_name_group'
        and m.legacy_id not in (${DUP})`, { s: SRC }));
  if (orphan > 0) bad(`有 ${orphan} 条结论指向已不存在的重名组（实体被改名/删除？）→ 结论失效`);

  const uncovered = dupGroups - covered;
  if (uncovered > 0) bad(`${uncovered}/${dupGroups} 个重名组**没有结论**（既没 resolved 也没申报 homonym_open）—— 下游遇到同名只能猜`);

  console.log(
    `NAME_RESOLUTION dup_groups=${dupGroups} covered=${covered} uncovered=${uncovered} orphan=${orphan} ` +
    `status=${byStatus.map((r) => `${r.mapping_status}:${r.c}`).join(" ") || "(无)"}`);
} catch (e) {
  dbNote = "WARN DB 不可达，跳过核对（离线环境可接受）：" + String((e && e.message) || e).slice(0, 140);
}

if (dbNote) console.error(dbNote);
process.exit(failed ? 1 : 0);
