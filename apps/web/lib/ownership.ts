// apps/web/lib/ownership.ts — 内容归属校验（P0-1）。
// 目标：作品/研究任务/探索会话不再"谁都能读、谁都能改"。
// 约定：表名与列名只来自本文件的常量映射，绝不拼接外部输入。
import { queryValue } from "@mohen/data-access";

export type OwnedTable = "publication.works" | "public.research_tasks" | "public.explore_sessions" | "public.director_plans";

const ID_COLUMN: Record<OwnedTable, string> = {
  "publication.works": "work_id",
  "public.research_tasks": "task_id",
  "public.explore_sessions": "session_id",
  "public.director_plans": "plan_id",
};

/** 该行是否属于该用户（owner_user_id 匹配）。 */
export async function isOwnedBy(table: OwnedTable, id: string, uid: string): Promise<boolean> {
  const col = ID_COLUMN[table];
  const hit = await queryValue(
    `select 1 from ${table} where ${col} = :'id' and owner_user_id = :'uid'`,
    { id, uid }
  );
  return hit !== null;
}

/** 读取该行的 owner（不存在返回 null）。 */
export async function getOwner(table: OwnedTable, id: string): Promise<string | null> {
  const col = ID_COLUMN[table];
  const hit = await queryValue(`select owner_user_id::text from ${table} where ${col} = :'id'`, { id });
  return hit === null ? null : String(hit);
}

/**
 * 允许"本人或运营"访问（运营后台需要跨用户查看）。
 * 返回 true 表示可以继续。
 */
export async function canAccess(table: OwnedTable, id: string, uid: string, isOperator: boolean): Promise<boolean> {
  const owner = await getOwner(table, id);
  if (owner === null) return false;
  return owner === uid || isOperator;
}
