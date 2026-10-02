# SOURCE REGISTRY

| 等级 | 类型 | 可否直接生成 Evidence | 规则 |
|---|---|---:|---|
| S1 | 上海图书馆、馆藏原件、地方志/古籍原件、政府/文保公开资料 | 是 | 仍记录具体页/记录 URI |
| S2 | 其他图书馆/档案馆、Wikimedia Commons、Internet Archive 等 | 是 | 核原始出处、对象身份、许可 |
| S3 | 地图服务、政府 POI、实地 GPS、现场照片 | 现代层 | 坐标/拍摄时间/来源分开记录 |
| S4 | 视频、社交媒体、博客、旅游文章 | 否 | 只能生成 Candidate/检索线索 |

每个 provider 额外维护：访问方式、限流、许可、失败经验、最后验证日期。网络策略属于运维知识，不写死进业务逻辑。

---

> **机器可读落地（2026-10-02 · M4.1）**
> - **文件**：`data/fixtures/source-providers.json`（schema `mohen.source-providers` v2）：每个 provider 的
>   `canonical` / `aliases` / `tier` / `evidence_allowed` / `access` / `license_note` / `ops_status` / `basis`。
>   归一规则见该文件的 `normalization` 字段（trim → 小写 → 空格与连字符 → 下划线）。
> - **读取者**：`packages/data-access/src/source-gate.mjs` → `resolveProvider()` / `canGenerateEvidence()` /
>   `assertProviderRegistered()`。**这是那份"读它的人"**——此前全仓无一行代码读该文件，导致门禁形同虚设。
> - **校验者**：`scripts/check-source-gate.mjs`（已纳入 `pnpm guard`）。其中一条关键检查是
>   **真库里出现过的每一个 provider 字符串都必须能解析** —— 这让**所有写入路径**都受门禁约束，
>   无需逐个改造二十多个写脚本。
> - **执行**：写入前 `assertProviderRegistered()` 未登记即拒绝（fail loud，不静默接受）。
> - **未落地部分**：限流、失败经验、最后验证日期尚未逐 provider 补齐；`ops_status=todo` 的条目即为待补清单，
>   守卫每次运行都会报出数量。另有 5 项分级（`needs_owner_confirmation`）待项目拥有者确认。
