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

// ── B3（2026-11-13）：图像渠道的 Y06 相关性判定 ──────────────────────────────
// 缺陷事实：图像此前一律记作题名命中，导致「楚国八百年」把「孟子趙注補正(二)」当可读材料。
// 设计要求（D00 Y06）：研究相关性要逐条判，未命中的线索限量保留、不得冒充命中。

const image = (over: Partial<ShlMaterial>): ShlMaterial => lead({
  provider: 'wikimedia-commons',
  source_type: 'image',
  carrier_type: 'image',
  content_availability: 'image_only',
  title: '某图',
  ...over,
});

it('B3 反例：图像题名与描述都没命中检索词 → 只作候选，不进材料', () => {
  const { locatable, candidates } = classifyDiscoveredLeads(
    [image({ title: '孟子趙注補正(二).jpg', fragments: ['经部 · 孟子类'] })],
    ['楚国', '八百年'],
  );
  expect(locatable).toHaveLength(0);
  expect(candidates).toHaveLength(1);
  expect(candidates[0].title).toBe('孟子趙注補正(二).jpg');
});

it('B3 正例：图像描述命中检索词 → 可读材料（不因英文题名误杀）', () => {
  const { locatable, candidates } = classifyDiscoveredLeads(
    [image({ title: 'Chu State bronze.jpg', fragments: ['楚国 青铜器，战国时期'] })],
    ['楚国'],
  );
  expect(locatable).toHaveLength(1);
  expect(candidates).toHaveLength(0);
});

it('B3 边界：文本渠道仍按原口径（仅正文偶遇不删，保持 B2 行为）', () => {
  const { locatable } = classifyDiscoveredLeads(
    [lead({ title: '某判决书', fragments: ['文中偶然提到楚国'] })],
    ['楚国'],
  );
  expect(locatable).toHaveLength(1);
});

it('B3 兼容：不传检索词时行为与 B2 完全一致（老调用不受影响）', () => {
  const { locatable } = classifyDiscoveredLeads([image({ title: '无关图像.jpg' })]);
  expect(locatable).toHaveLength(1);
});
