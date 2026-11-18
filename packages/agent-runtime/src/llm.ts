// packages/agent-runtime/src/llm.ts
//
// ADR-003 第 ① 层的 LLM 档（可选、可降级）。
//
// 铁律：**LLM 永不提供事实**。它在这里只做一件事——把用户的自然语言判成
// 「此刻在追什么」+「提到了哪些对象」。任何年份、关系、出处都不由它产生。
//
// 不可用即 null，绝不抛错、绝不阻塞：无 key / 浏览器环境 / 超时 / 输出非法，一律降级。
// 这与 ADR-001 的 local-first、工具可替换一致。

import type { AgentIntentKind, EntityAliases } from "./types";

const VALID: AgentIntentKind[] = ["relation", "evidence", "temporal", "present", "place", "unknown"];

export interface LlmUnderstanding {
  intent: AgentIntentKind;
  objects: string[];
}

function env(name: string): string | undefined {
  // 浏览器侧不可能持有服务端凭据，直接判定为不可用
  if (typeof window !== "undefined") return undefined;
  const g = globalThis as unknown as { process?: { env?: Record<string, string | undefined> } };
  return g.process?.env?.[name];
}

function llmProviderConfig() {
  const baseUrl = env("MOHEN_LLM_BASE_URL")?.trim();
  const apiKey = env("MOHEN_LLM_API_KEY")?.trim();
  if (baseUrl && apiKey) return { baseUrl, apiKey };

  const deepseekKey = env("DEEPSEEK_API_KEY")?.trim();
  if (!baseUrl && !apiKey && deepseekKey) {
    return { baseUrl: "https://api.deepseek.com", apiKey: deepseekKey };
  }
  return null;
}

export function hasLlmProviderConfiguration(): boolean {
  return llmProviderConfig() !== null;
}

/**
 * 可选 LLM 理解。返回 null 表示「本档不可用」，调用方回退 L0 确定性理解。
 */
export async function llmUnderstand(
  question: string,
  aliases: EntityAliases
): Promise<LlmUnderstanding | null> {
  const config = llmProviderConfig();
  if (!config) return null;
  const { baseUrl, apiKey } = config;

  const model = env("MOHEN_LLM_MODEL") || "deepseek-chat";
  const vocabulary = Object.entries(aliases)
    .map(([id, names]) => `${id}: ${names.join(" / ")}`)
    .join("\n");

  const system = [
    "你是墨痕的意图判读器。只做分类，不回答历史问题，不提供任何事实、年份、出处。",
    "把用户的问题判成以下之一：relation（追关系）/ evidence（追问依据）/ temporal（追时间变化）/ present（要去现场）/ place（想看这地方什么样）/ unknown（都不像）。",
    "并从问题里找出提到的对象 id。",
    "只输出一行 JSON：{\"intent\":\"...\",\"objects\":[\"...\"]}。不要解释。",
    `对象词表：\n${vocabulary}`,
  ].join("\n");

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 4000);
  try {
    const res = await fetch(`${baseUrl.replace(/\/$/, "")}/chat/completions`, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model,
        temperature: 0,
        messages: [
          { role: "system", content: system },
          { role: "user", content: question },
        ],
      }),
      signal: ctrl.signal,
    });
    if (!res.ok) return null;
    const json = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const text = json.choices?.[0]?.message?.content?.trim();
    if (!text) return null;
    const m = text.match(/\{[\s\S]*\}/);
    if (!m) return null;
    const parsed = JSON.parse(m[0]) as { intent?: string; objects?: unknown };
    if (!parsed.intent || !VALID.includes(parsed.intent as AgentIntentKind)) return null;
    const objects = Array.isArray(parsed.objects)
      ? parsed.objects.filter((o): o is string => typeof o === "string" && o in aliases)
      : [];
    return { intent: parsed.intent as AgentIntentKind, objects };
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * 可选 LLM 润色墨痕短句。**不得引入材料中不存在的事实**。
 * 校验：输出里若出现「材料中不存在的对象名 / 四位年份」，判定为越界 → 返回 null（回退模板句）。
 */
export async function llmPolish(
  templateLine: string,
  allowedTerms: string[],
  facts: string[]
): Promise<string | null> {
  const config = llmProviderConfig();
  if (!config) return null;
  const { baseUrl, apiKey } = config;

  const model = env("MOHEN_LLM_MODEL") || "deepseek-chat";
  const system = [
    "你是墨痕的措辞润色器。只能把给定句子改得更像人话、更短（≤2 句）。",
    "严格禁止：新增任何事实、年份、地名、关系、推测；禁止添加下面「可用事实」之外的内容。",
    `允许出现的词：${allowedTerms.join("、") || "（无）"}`,
    `可用事实：\n- ${facts.join("\n- ")}`,
    "只输出润色后的句子本身，不要引号、不要解释。",
  ].join("\n");

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 4000);
  try {
    const res = await fetch(`${baseUrl.replace(/\/$/, "")}/chat/completions`, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model,
        temperature: 0.3,
        messages: [
          { role: "system", content: system },
          { role: "user", content: templateLine },
        ],
      }),
      signal: ctrl.signal,
    });
    if (!res.ok) return null;
    const json = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
    const text = json.choices?.[0]?.message?.content?.trim();
    if (!text) return null;
    return passesFactGuard(text, facts) ? text : null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * 事实护栏（年份）：润色结果不得凭空出现材料中不存在的四位年份。
 * 宁可判越界回退模板句，也不放行一句可能编造的话。
 *
 * 实体护栏不在此做：材料白名单由 `select` 强制（Mohen 只能引用 materials 里的条目），
 * 逐词比对易误杀正常措辞，交给上层 materials 引用约束更可靠。
 */
export function passesFactGuard(text: string, facts: string[]): boolean {
  const knownYears = new Set<string>();
  for (const f of facts) for (const y of f.match(/\d{4}/g) ?? []) knownYears.add(y);
  const foundYears = text.match(/\d{4}/g) ?? [];
  for (const y of foundYears) if (!knownYears.has(y)) return false;
  return true;
}
