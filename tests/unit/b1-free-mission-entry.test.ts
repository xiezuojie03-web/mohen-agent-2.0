// B1（2026-11-13）：自由研究委托通用入口 —— 正反单测
//
// 验证 applyFreeMissionEntry 不再让问答式意图判不出（understand→unknown）
// 把整条研究链判死，同时不假装有收获、不污染预置题材的问答语义。
import { expect, it } from 'vitest';
import { applyFreeMissionEntry } from '../../apps/web/lib/mohen-agent/research';
import type { AgentDecision, Material } from '@mohen/agent-runtime';

const unknownIntent = {
  llmResponded: true,
  intent: 'unknown' as const,
  needsClarification: true,
  objects: [] as string[],
  terms: [] as string[],
  clarifyQuestion: null,
};

const cannotAnswer = (): AgentDecision => ({
  understanding: unknownIntent as unknown as AgentDecision['understanding'],
  materials: [],
  engineIntent: 'unknown',
  primaryStage: 'unknown_gap',
  secondaryStage: null,
  focus: [],
  verdict: 'cannot_answer',
  mohenLine: '我还不确定你在追哪一条。',
  gaps: ['意图未确定'],
  clarifyQuestion: null,
  evidenceRefs: [],
});

const material = (id: string, epistemic: Material['epistemic'], score = 0.9): Material => ({
  id,
  kind: 'evidence',
  entityIds: [],
  snippet: `片段 ${id}`,
  sourceRef: `来源 ${id}`,
  epistemic,
  year: 2000,
  score,
  matchScore: 0,
});

it('正例：非模板题材 + 有材料 → 转成可继续的研究裁决，不再判死', () => {
  const decision = applyFreeMissionEntry(
    'generic',
    [material('local:1', 'FACT_EVIDENCED'), material('wikisource:chu', 'RESEARCH_LEAD', 0.4)],
    cannotAnswer(),
    [],
    ['楚国']
  );
  expect(decision.verdict).toBe('partial');
  expect(decision.gaps).not.toContain('意图未确定');
  expect(decision.gaps[0]).toContain('研究委托');
  expect(decision.materials.length).toBe(2);
  expect(decision.evidenceRefs.length).toBe(2);
  expect(decision.focus).toContain('楚国');
  expect(decision.clarifyQuestion).toContain('楚国');
  expect(decision.primaryStage).toBe('evidence_reveal');
});

it('诚实边界：外部线索转进裁决后仍是 RESEARCH_LEAD，不冒充合格知识', () => {
  const decision = applyFreeMissionEntry(
    'generic',
    [material('local:1', 'FACT_EVIDENCED'), material('wikisource:chu', 'RESEARCH_LEAD', 0.4)],
    cannotAnswer(),
    [],
    []
  );
  const lead = decision.materials.find((m) => m.id === 'wikisource:chu');
  const local = decision.materials.find((m) => m.id === 'local:1');
  expect(lead?.epistemic).toBe('RESEARCH_LEAD');
  expect(local?.epistemic).toBe('FACT_EVIDENCED');
});

it('反例一：一条材料都没有 → 保持 cannot_answer，不假装有收获', () => {
  const decision = applyFreeMissionEntry('generic', [], cannotAnswer(), [], ['楚国']);
  expect(decision.verdict).toBe('cannot_answer');
  expect(decision.gaps).toContain('意图未确定');
  expect(decision.materials).toHaveLength(0);
});

it('反例二：预置题材（jinze）保持问答语义，不被研究委托路径污染', () => {
  const decision = applyFreeMissionEntry('jinze', [material('local:1', 'FACT_EVIDENCED')], cannotAnswer(), [], []);
  expect(decision.verdict).toBe('cannot_answer');
  expect(decision.gaps).toContain('意图未确定');
  expect(decision.materials).toHaveLength(0);
});

it('反例三：意图已能判读（非 cannot_answer）时不做任何改写', () => {
  const answered: AgentDecision = {
    ...cannotAnswer(),
    verdict: 'answered',
    gaps: [],
    mohenLine: '这是可回答的问题。',
  };
  const decision = applyFreeMissionEntry('generic', [material('local:1', 'FACT_EVIDENCED')], answered, [], []);
  expect(decision).toBe(answered);
});

it('正例二：意图判出来了但无该类型材料（真实「楚国八百年」形态）也要转，不丢线索', () => {
  // 实测：intent=temporal 只要 event/claim，外部线索 kind=evidence 被整体过滤
  const temporalDead = {
    ...cannotAnswer(),
    engineIntent: 'temporal' as const,
    gaps: ['已审核材料里没有能回答这个问题的条目'],
  };
  const decision = applyFreeMissionEntry(
    'generic',
    [material('wikisource:chu', 'RESEARCH_LEAD', 0.4), material('commons:chu', 'RESEARCH_LEAD', 0.3)],
    temporalDead,
    [],
    ['楚国']
  );
  expect(decision.verdict).toBe('partial');
  expect(decision.materials).toHaveLength(2);
  expect(decision.gaps).toContain('已审核材料里没有能回答这个问题的条目');
});

it('诚实边界：只有外部线索时必须明说「线索不是答案」', () => {
  const decision = applyFreeMissionEntry(
    'generic',
    [material('wikisource:chu', 'RESEARCH_LEAD', 0.4)],
    { ...cannotAnswer(), gaps: ['已审核材料里没有能回答这个问题的条目'] },
    [],
    []
  );
  expect(decision.gaps.some((g) => g.includes('不是答案'))).toBe(true);
  expect(decision.mohenLine).toContain('库里还不能直接回答');
});

it('诚实边界：有库内证据时不说「不能直接回答」', () => {
  const decision = applyFreeMissionEntry(
    'generic',
    [material('local:1', 'FACT_EVIDENCED'), material('wikisource:chu', 'RESEARCH_LEAD', 0.4)],
    cannotAnswer(),
    [],
    []
  );
  expect(decision.gaps.some((g) => g.includes('不是答案'))).toBe(false);
  expect(decision.mohenLine).toContain('可先看的材料');
});
