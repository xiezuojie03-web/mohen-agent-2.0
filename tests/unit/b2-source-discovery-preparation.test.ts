// B2（2026-11-13）：自由主题准备的来源发现 —— 正反单测
//
// 设计要求：D00 §11.2 的 Y01/Y02/Y03/Y06 多渠道发现结果中，
// 只有「可定位（有 url）且带内容」的候选才能作为可读材料交给 D01；
// 仅题名的线索如实记为候选，绝不参与读取（否则等于把线索当原件）。
import { expect, it } from 'vitest';
import { classifyDiscoveredLeads } from '../../apps/web/lib/mohen-agent/prepare-topic';
import type { ShlMaterial } from '../../apps/web/lib/mohen-agent/retrieve-shl';

const lead = (over: Partial<ShlMaterial>): ShlMaterial => ({
  title: '某文献',
  provider: 'shl-open-data',
  publisher: '上海图书馆',
  url: 'https://example.invalid/record/1',
  fragments: ['正文片段'],
  ...over,
});

it('正例：有 url 且有内容片段 → 可读材料', () => {
  const { locatable, candidates } = classifyDiscoveredLeads([lead({})]);
  expect(locatable).toHaveLength(1);
  expect(candidates).toHaveLength(0);
});

it('反例：只有题名、没有 url → 只能作候选，不得进材料', () => {
  const { locatable, candidates } = classifyDiscoveredLeads([lead({ url: undefined })]);
  expect(locatable).toHaveLength(0);
  expect(candidates).toHaveLength(1);
  expect(candidates[0].title).toBe('某文献');
});

it('反例：有 url 但内容片段为空 → 只能作候选', () => {
  const { locatable, candidates } = classifyDiscoveredLeads([lead({ fragments: [] })]);
  expect(locatable).toHaveLength(0);
  expect(candidates).toHaveLength(1);
});

it('反例：片段只有空白 → 只能作候选', () => {
  const { locatable } = classifyDiscoveredLeads([lead({ fragments: ['   ', ''] })]);
  expect(locatable).toHaveLength(0);
});

it('空输入：两类都是空，不抛错', () => {
  const { locatable, candidates } = classifyDiscoveredLeads([]);
  expect(locatable).toHaveLength(0);
  expect(candidates).toHaveLength(0);
});

it('混合输入：按可定位性正确分流，不丢条目', () => {
  const { locatable, candidates } = classifyDiscoveredLeads([
    lead({ title: '可定位A' }),
    lead({ title: '仅题名B', url: undefined }),
    lead({ title: '可定位C', url: 'https://example.invalid/record/3' }),
    lead({ title: '无内容D', fragments: [] }),
  ]);
  expect(locatable.map((m) => m.title)).toEqual(['可定位A', '可定位C']);
  expect(candidates.map((m) => m.title)).toEqual(['仅题名B', '无内容D']);
});
