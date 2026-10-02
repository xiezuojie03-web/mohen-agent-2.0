# DATA-TRIAGE-01 · 图片资格数据止血 — Result

- **日期**：2026-10-02
- **性质**：① 数据处置（**只标记、不删除**，事务内，可逆）；② 夜跑根因代码修复
- **授权**：项目拥有者 2026-10-02 指定的执行顺序「1+5 → 2+3+4 → **6（数据止血）**」
- **依据**：C0 §2.1（工程问题自主解决）；R14（不删除只归档/只标记）；夜间协议 §7（No destructive cleanup）

---

## 1. 数据处置（已提交，事务内完成）

### 1.1 结果

| 指标 | BEFORE | AFTER |
|---|---|---|
| `visual_assets` 总行数 | 1288 | **1288**（未删除任何行） |
| 已排除（`excluded_from_heritage_primary`） | 20 | **68** |
| `eligibility_tags = '{}'`（默认"可用"侧） | 1268 | **1220** |
| `effective_visual_assets`（视图，真正有效可用） | 8 | **8**（无副作用） |

### 1.2 两步处置

| 步 | 动作 | 影响行数 | reason tag |
|---|---|---|---|
| 1 | **恢复被夜跑洗掉的人工排除**：凡 `file_path`（去 query）与某条已排除资产相同、而自身未排除者，重新标记排除 | **20** | `cleanup_20261002_hr5_restore` |
| 2 | **排除客观非图片记录**：`file_path` 以 `.djvu` / `.webm` 结尾者（却标 `asset_type='image'`） | **28** | `cleanup_20261002_nonimage` |

> 步 2 的 28 行 + 步 1 中已包含的 2 条非图片记录 = 该批非图片总数 30，与取证一致。

### 1.3 处置后的 tag 分布（实测）

| tags | 行数 |
|---|---|
| `{}` | 1220 |
| `{excluded_from_heritage_primary, cleanup_20261002_nonimage}` | 28 |
| `{excluded_from_heritage_primary, cleanup_20261002_hr5_restore}` | 20 |
| `{excluded_from_heritage_primary}`（原有 HR-5 裁定） | 20 |

### 1.4 回滚（如需撤销本批）

```sql
update visual_assets
   set eligibility_tags = array_remove(array_remove(eligibility_tags,'excluded_from_heritage_primary'),'cleanup_20261002_hr5_restore')
 where 'cleanup_20261002_hr5_restore' = any(eligibility_tags);
update visual_assets
   set eligibility_tags = array_remove(array_remove(eligibility_tags,'excluded_from_heritage_primary'),'cleanup_20261002_nonimage')
 where 'cleanup_20261002_nonimage' = any(eligibility_tags);
```

**说明**：以上两步**只加标记、未删除任何数据**；且 `effective_visual_assets` 保持 8，证明未误伤已确认的 7 桥 + 颐浩寺遗址照片。

---

## 2. 夜跑根因代码修复（真正的止血）

`visual_assets` 的"默认即可用"是**表结构问题**（须 Reconciliation，见 `DATA-RECON-01-eligibility-field-proposal.md`）；
但夜跑脚本自身有 **5 个独立缺陷**，属工程问题，本轮已修：

| # | 文件 | 缺陷 | 修复 |
|---|---|---|---|
| 1 | `night-runner.mjs` `jobImages` | `select source_id from source_records where provider=…` **无 ORDER BY / 无过滤**，取任意一行 → 727 张照片挂到"沪上经纬**诗词**"源上 | 改为解析"图片源"并要求**唯一可确定**（排除 `kind='poem_source'` 与标题含"诗词/poem"者）；不唯一即 **fail loud**，拒绝猜测 |
| 2 | `night-runner.mjs` `jobImages` | HTTP 校验 **fail-open**：`im._http` 缺失或 `status` 为 0/null 时整条判断短路 → 23 张死链入库 | 改为 **fail-closed**：状态未知一律不收，计数入 `unverified_status` |
| 3 | 两个脚本 | 非图片类型冒充 `asset_type='image'`（29 `.djvu` + 1 `.webm`） | 按扩展名白名单拒收，计数入 `not_image` |
| 4 | 两个脚本 | 跨批幂等失效：各脚本 `legacy_id` 规则不同（`https:…` / `File:标题` / `sha(url)` / `hushang-jingwei:shl:…`）→ 同一张图重复入库（实测 14 组） | 去重改为 **并集 `legacy_id` + 规范化 `file_path`** |
| 5 | 两个脚本 | INSERT 不含 `eligibility_tags` → 落列默认 `'{}'` = **无条件"可用"** | 显式写入 `array['pending_heritage_review']`，新增图片**不再默认可用** |
| 6 | `port-photos.mjs` | 对全部 519 张照片硬编码 `depicted_period='现代影像（非历史）'`（老照片被误标，夜跑自产审计亦承认属"史料级误用"） | 改为 `'unknown'` |
| 7 | `night-runner.mjs` 晨报 | "安全"段是**硬编码字符串**（曾断言"未绕过 Evidence Gate"，而同批 1246 张图 0 条门禁记录） | 删除不可验证的断言，如实写明"本批次未运行 Evidence Gate"，并要求**另行查询**门禁覆盖 |

---

## 3. 验证

| 项 | 结果 |
|---|---|
| `node --check` | `pipelines/legacy/` 全部 5 个 `.mjs` **exit=0** |
| 中途发现并修复的自身回归 | 首次修改晨报"安全"段时在**模板字符串内引入了反引号**，导致 `night-runner.mjs` 语法错误——由 `node --check` 捕获，已修并复验通过 |
| 数据库 | 处置在单事务内完成（`BEGIN … COMMIT`），`ON_ERROR_STOP=1`；`effective_visual_assets` 保持 **8** |
| 未做运行时验证 | 夜跑两脚本**未实跑**（需 `MOHEN_WRITE_ENABLED=true` + 源文件在位）。**建议下次夜跑前先 DRY_RUN，并核对 `inserted / not_image / unverified_status` 三项计数** |

---

## 4. 未做（属内容判断或核心对象变更，待项目拥有者裁决）

见 `tasks/results/DATA-RECON-01-eligibility-field-proposal.md` 与 `CURRENT.md` §9 **ESC-04**：

1. `visual_assets` 是否新增**正面资格字段 + 门禁触发器**（把"默认可用"翻转为"默认不可用"）——属 C3 核心对象变更。
2. **727 张图片 provenance 纠正**（为其建立专属 image `source_record` 并回写 `source_id`）。
3. **341 张内容可疑图片**（他镇桥梁 / 金山超市 / 嘉定工业区…）的处置标准——属**内容判断**，不由开发总工程师单方决定。
4. **109 个门禁 `fail` 对象**是否置为 `rejected`（不删除、保留审计）。
5. **`entities.canonical_name` 543 条重名**是否启动 resolution。
