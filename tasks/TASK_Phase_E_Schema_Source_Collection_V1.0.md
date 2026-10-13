# TASK｜MoHen Phase E 真实 Schema 补充资料收集

**版本：V1.0 · 2026-10-07**  
**执行者：CodeBuddy**  
**任务性质：只读资料收集**  
**当前阶段：Phase E｜Physical Data Migration**  
**目标：补齐 ChatGPT 生成真实 legacy backfill SQL 所需的物理数据库结构资料**

---

# 0｜任务目标

本任务只做：

```text
读取真实 Repo
+
只读读取 PostgreSQL Schema
+
整理 migration / trigger / function / constraint
+
按原目录树打包
+
STOP
```

不得：

- 修改数据库；
- 执行 migration；
- 写入/删除任何表；
- 修改 Repo 文件；
- 修改 Schema；
- 修改代码；
- 修改 Registry / Skill / Guard；
- Git commit / push；
- 部署；
- 进入后续 Phase。

---

# 1｜最高安全要求

## 1.1 数据库只读

允许：

```text
pg_dump --schema-only
psql 只读元数据查询
读取 pg_catalog / information_schema
```

禁止：

```text
INSERT
UPDATE
DELETE
ALTER
CREATE
DROP
TRUNCATE
VACUUM FULL
migration apply
restore
```

不得停止、重启或重建 PostgreSQL。

---

## 1.2 不泄露凭证

禁止在任何输出中包含：

```text
数据库密码
完整 DATABASE_URL
.env / .env.local
token
API key
credential
```

如果命令需要 DATABASE_URL：

- 从本机已有安全环境读取；
- 不打印完整连接串；
- 输出报告必须脱敏。

---

## 1.3 Repo 只读

不得：

```text
修改文件
移动文件
重命名文件
format
reset
stash
clean
checkout
commit
push
```

工作树原来如果 dirty，只记录：

```text
Working tree has uncommitted changes.
No repo files were modified by this task.
```

---

# 2｜输出目录

在 Repo 外新建：

```text
MoHen_Phase_E_Schema_Source_Package_20261007/
├── repo_snapshot/
│   └── supabase/
│       └── migrations/
│
└── package_meta/
    ├── README.md
    ├── DB_SCHEMA_ONLY.sql
    ├── TABLE_COLUMN_INVENTORY.md
    ├── CONSTRAINT_INVENTORY.md
    ├── TRIGGER_FUNCTION_INVENTORY.md
    ├── TABLE_ROW_COUNTS.md
    ├── FILE_MANIFEST.md
    └── MISSING_OR_NOT_FOUND.md
```

原则：

> `repo_snapshot/` 必须保持真实 Repo 原相对路径。

---

# 3｜必须收集 A：全部 migration 原文件

完整复制：

```text
supabase/migrations/
```

到：

```text
repo_snapshot/supabase/migrations/
```

必须保留：

- 原文件名；
- 原顺序；
- 原内容；
- 原目录结构。

不得修改 migration。

---

# 4｜必须收集 B：真实数据库 Schema-only Dump

对当前正式开发库：

```text
mohen_dev
```

生成：

```text
package_meta/DB_SCHEMA_ONLY.sql
```

要求使用：

```text
pg_dump --schema-only
```

或者等价的 PostgreSQL 官方 schema-only 导出方式。

必须满足：

```text
DATA ROWS = 0
PASSWORD = 0
SECRET = 0
```

需要包含真实：

- schemas；
- tables；
- columns；
- data types；
- defaults；
- sequences；
- primary keys；
- foreign keys；
- unique constraints；
- check constraints；
- indexes；
- functions；
- triggers；
- views；
- enums/types。

如果 dump 中包含数据库 owner / local path 等非敏感环境信息，可以保留。

如果含密码或 secret，任务立即 FAIL，不得打包。

---

# 5｜必须收集 C：表与字段清单

生成：

```text
package_meta/TABLE_COLUMN_INVENTORY.md
```

至少列：

| Schema | Table | Column | Data Type | Nullable | Default |
|---|---|---|---|---|---|

范围至少包括所有项目自有 schema/table。

必须覆盖当前已知表，例如：

```text
source_records
evidence
evidence_fragments
entities
claims
claim_evidence
relations
relation_evidence
visual_assets
visual_entity_links
cultural_events
cultural_relation_claims
historical_change_records
historical_features
historical_feature_anchors
historical_spatial_relations
historical_spatial_slices
cultural_conflicts
cultural_meaning_candidates
cultural_present_connections
discovery_candidates
knowledge_paths
knowledge_path_steps
evidence_gate_audit
review_queue
human_review_decisions
ingest_runs
legacy_mappings
research_*
research_bridge_queue
```

如果真实库中还有其它项目表，也必须列出。

---

# 6｜必须收集 D：Constraint 清单

生成：

```text
package_meta/CONSTRAINT_INVENTORY.md
```

至少列出：

| Schema | Table | Constraint | Type | Definition |
|---|---|---|---|---|

包括：

```text
PRIMARY KEY
FOREIGN KEY
UNIQUE
CHECK
EXCLUDE（如有）
```

---

# 7｜必须收集 E：Trigger / Function 清单

生成：

```text
package_meta/TRIGGER_FUNCTION_INVENTORY.md
```

必须包括：

## Trigger

| Schema | Table | Trigger | Timing/Event | Function |
|---|---|---|---|---|

## Function

| Schema | Function | Arguments | Return Type | Definition/Body |
|---|---|---|---|---|

重点确认：

```text
Evidence Gate
Promotion Gate
Review/Triage
Visual Asset Gate
Research Workspace
Second Promotion Gate
```

相关 trigger/function 的真实定义。

不要只列名称。

---

# 8｜必须收集 F：当前行数快照

生成：

```text
package_meta/TABLE_ROW_COUNTS.md
```

格式：

| Schema | Table | Row Count |
|---|---|---:|

只允许：

```text
SELECT count(*)
```

不得导出数据内容。

---

# 9｜可选：仅在语义仍无法判断时提供极小样本

默认：

```text
NO SAMPLE DATA
```

只有当某张表的字段含义仅靠 schema 无法判断时，才允许从该表导出最多：

```text
3 行
```

并且必须：

- 不含个人敏感信息；
- 不含 secret；
- 不含大文本原文；
- 单独放在 `package_meta/OPTIONAL_SEMANTIC_SAMPLES.md`；
- 写明为什么需要该样本。

如果不需要，完全不要生成。

---

# 10｜README.md

记录：

```text
repo_name
branch
commit_hash
working_tree_clean = YES / NO

database = mohen_dev
postgres_version
schema_dump_method
generated_at

repo_modified = NO
database_modified = NO
migration_executed = NO
phase_e_implementation_started = NO
```

不得记录密码或完整连接串。

---

# 11｜MISSING_OR_NOT_FOUND.md

逐项确认：

```text
supabase/migrations/
DB_SCHEMA_ONLY.sql
TABLE_COLUMN_INVENTORY
CONSTRAINT_INVENTORY
TRIGGER_FUNCTION_INVENTORY
TABLE_ROW_COUNTS
```

每项只能写：

```text
FOUND
NOT FOUND
FAILED: <non-sensitive reason>
```

---

# 12｜FILE_MANIFEST.md

至少：

| Package Path | Original Source | Type | Size |
|---|---|---|---|

Repo 文件必须标出真实原路径。

DB 导出文件标出：

```text
source = mohen_dev schema metadata
```

---

# 13｜禁止打包

不得包含：

```text
.env
.env.local
password
DATABASE_URL
API key
token
database data directory
full data dump
COPY data
INSERT data
large PDF/image/video
node_modules
.next
.git
backup
cache
```

特别注意：

> **本任务要的是 Schema-only，不是数据库备份。**

---

# 14｜完成前自检

必须确认：

```text
repo_modified = NO
database_modified = NO
schema_changed = NO
migration_executed = NO
git_commit_created = NO
git_push = NO
data_rows_exported = NO
secret_exposed = NO
```

以及：

```text
schema_only_dump_present = YES
all_migrations_present = YES
columns_inventory_present = YES
constraints_inventory_present = YES
triggers_functions_inventory_present = YES
row_counts_present = YES
```

---

# 15｜最终交付

生成：

```text
MoHen_Phase_E_Schema_Source_Package_20261007.zip
```

最终终端只需报告：

```text
PHASE_E_SCHEMA_SOURCE_PACKAGE = READY / NOT_READY

repo_modified = NO
database_modified = NO
migration_executed = NO
data_rows_exported = NO
secret_exposed = NO

migration_file_count = ...
table_count = ...
trigger_count = ...
function_count = ...

zip_path = ...
missing_items = ...
```

完成后立即 STOP。

不要继续：

- 设计新 Schema；
- 写 backfill SQL；
- 修改 migration；
- 执行数据迁移；
- 重构数据库；
- 修改 pipeline；
- 进入下一 Phase。

后续由 ChatGPT 根据该 ZIP 完成 Phase E。
