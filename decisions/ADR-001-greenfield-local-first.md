# ADR-001 — Greenfield + Local-first

Status: Accepted  
Date: 2026-09-21

## Decision
墨痕 Agent 2.0 新建独立仓库；老项目只读。项目真源采用本机 Git + PostgreSQL + Raw Store；在线 AI/云服务均为可替换加速器。

## Why
老项目已积累大量可复用数据/方法，同时存在脚本与文档膨胀。直接重构会把历史耦合带入 Agent 2.0。中国大陆网络环境也要求核心开发链在海外 SaaS 不可用时继续工作。

## Consequences
- Legacy 通过 manifest/staging 迁移。
- Schema 只由 migrations 重建。
- AI Coding 工具无架构决策权。
- 大型 Raw Assets 不进 Git。
