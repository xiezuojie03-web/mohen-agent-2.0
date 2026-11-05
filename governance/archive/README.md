> ⚠️ **本目录是归档区（governance archive）。其中一切内容都是历史件，不代表当前状态，不拥有任何 Authority。**
> 本目录只放**被取代的治理件**（含 C0—C4 各版本及最后版本、旧 Roadmap / Phase Plan / 旧版 docx、移交稿、旧 CURRENT 备份、Candidate Backlog），不授予执行权。
> **当前唯一工程设计宪章：`governance/mhka/MHKA-00—05`**；当前实际状态：根 `CURRENT.md`；唯一入口：根 `AGENTS.md`，目录职责：根 `OWNERSHIP_MAP.md`。C0—C4 最后版本原件索引及 Blob 校验见 [归档与承接凭证](C0_C4_TO_MHKA_ARCHIVAL_20261105.md)。正式旧运行代际退役仍由 M8 实测验收。
> 下方内容为**归档时原样保留**的旧项目 README（其描述的入口、目录结构与 `.codebuddy/` 机制均已失效，不再改写正文）。

---

# 墨痕 Agent 2.0

> Greenfield Project with Existing Assets.  
> 当前阶段：Phase II — Canonical Experience Productization。

墨痕不是“网站 + 聊天框”。它是一个以证据为边界、以时空人文知识为底座、由 Agent 驱动 Experience Canvas 的探索系统。

## 第一次接手项目，只读 5 个入口

1. `CONTEXT.md` — 现在做到哪里。
2. `specs/FOUNDATION.md` — 不可轻易改变的原则。
3. `specs/OWNERSHIP_MAP.md` — 什么代码归谁管。
4. `tasks/CURRENT_TASK.md` — 当前唯一任务。
5. 与任务直接相关的一个 Contract / Skill。不要默认通读整个仓库。

## 本地启动

前提：Git、Node.js LTS、pnpm。数据库在 TASK-0002 后接入；TASK-0001 不要求先装 Docker。

```bash
pnpm install
pnpm dev
```

访问 `http://localhost:3000`。首屏只是 Foundation 健康页，不是正式产品 UI。

## 验收

```bash
pnpm guard:docs
pnpm guard:structure
pnpm test
pnpm build
```

需要浏览器验收时再执行：

```bash
pnpm exec playwright install chromium
pnpm test:e2e
```

## 数据原则

`data/raw` 保存原始资料，但大文件不进 Git。数据库正式知识不能由 AI 直接写入：  
`RAW → EXTRACTED → CANDIDATE → EVIDENCE_LINKED → VERIFIED / REJECTED / PENDING → PUBLISHED`

`seed.master.json` 在 2.0 中只是 Legacy 输入/可再生导出，不是真源。

## Legacy

老项目只读。禁止在老项目内安装依赖、构建、格式化或执行会写文件的脚本。迁移必须通过 `legacy/manifests` + staging 完成。

## 文档纪律

Git 保存历史，Contract 保存当前规则，ADR 保存重大决策。不要创建 `final2`、`v3-fix`、`new-new` 文档。
