// apps/web/lib/fine-capabilities.ts — E1-8 细分能力补真。
// 对话持久化、系统设置、帮助文章、权利政策、作品互动指标：真实表 + 真实读写，不伪造。

import { queryRows, queryValue, run } from "@mohen/data-access";

// ---- 对话 ----
export interface ConversationMessage {
  role: "user" | "assistant";
  content: string;
  created_at?: string;
}

export async function createConversation(title: string, messages: ConversationMessage[], ownerUserId: string): Promise<string> {
  if (!ownerUserId) throw new Error("CONVERSATION_OWNER_REQUIRED");
  const id = await queryValue("select gen_random_uuid()::text");
  await run(
    "insert into public.conversations (conversation_id, title, messages, owner_user_id) values (:'id', :'title', :'msgs'::jsonb, :'owner')",
    { id: id!, title, msgs: JSON.stringify(messages), owner: ownerUserId }
  );
  return id!;
}

export async function getConversation(conversationId: string, ownerUserId: string) {
  if (!ownerUserId) return null;
  const rows = await queryRows(
    "select conversation_id::text as conversation_id, title, messages, created_at::text as created_at, updated_at::text as updated_at from public.conversations where conversation_id = :'id' and owner_user_id = :'owner'",
    { id: conversationId, owner: ownerUserId }
  );
  return rows.length ? rows[0] : null;
}

export async function appendConversationMessage(conversationId: string, message: ConversationMessage, ownerUserId: string): Promise<boolean> {
  const row = await getConversation(conversationId, ownerUserId);
  if (!row) return false;
  await run(
    "update public.conversations set messages = coalesce(messages,'[]'::jsonb) || :'msgs'::jsonb, updated_at = now() where conversation_id = :'id' and owner_user_id = :'owner'",
    { id: conversationId, owner: ownerUserId, msgs: JSON.stringify([{ ...message, created_at: message.created_at ?? new Date().toISOString() }]) }
  );
  return true;
}

// ---- 系统设置 ----
export function getSettings() {
  return queryRows("select key, value, updated_at::text as updated_at from public.app_settings order by key");
}
export async function setSetting(key: string, value: unknown): Promise<void> {
  await run(
    `insert into public.app_settings (key, value) values (:'k', :'v'::jsonb)
     on conflict (key) do update set value = excluded.value, updated_at = now()`,
    { k: key, v: JSON.stringify(value) }
  );
}

// ---- 帮助文章 ----
export function listHelpArticles() {
  return queryRows("select article_id::text as article_id, slug, title, content, updated_at::text as updated_at from public.help_articles order by title");
}
export async function getHelpArticle(slugOrId: string) {
  const rows = await queryRows(
    "select article_id::text as article_id, slug, title, content, updated_at::text as updated_at from public.help_articles where slug = :'k' or article_id::text = :'k'",
    { k: slugOrId }
  );
  return rows.length ? rows[0] : null;
}

// ---- 权利政策 ----
export function listPolicies() {
  return queryRows("select policy_id::text as policy_id, slug, title, content, updated_at::text as updated_at from public.policies order by title");
}

// ---- 作品互动指标 ----
export async function getEngagement() {
  const rows = await queryRows(
    "select coalesce(sum(views),0)::text as views, coalesce(sum(favorites),0)::text as favorites, coalesce(sum(comments),0)::text as comments from public.work_engagement"
  );
  return rows.length
    ? { views: Number(rows[0].views), favorites: Number(rows[0].favorites), comments: Number(rows[0].comments) }
    : { views: 0, favorites: 0, comments: 0 };
}
export async function incrementEngagement(workId: string, field: "views" | "favorites" | "comments"): Promise<void> {
  const col = field;
  await run(
    `insert into public.work_engagement (work_id, ${col}) values (:'id', 1)
     on conflict (work_id) do update set ${col} = public.work_engagement.${col} + 1, updated_at = now()`,
    { id: workId }
  );
}
