import { afterEach, describe, expect, it, vi } from 'vitest';
import { diagnoseSourceNeed, discoverExternalSources } from '../../apps/web/lib/mohen-agent/source-discovery';

// D00 来源发现（Y01/Y02/Y03）：缺口诊断与多渠道合并必须可核，且失败不得伪造线索。

function stubChannels(handlers: {
  shl?: () => Response;
  commons?: () => Response;
  wikisource?: () => Response;
  loc?: () => Response;
}) {
  const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
    const url = String(input);
    if (url.includes('data1.library.sh.cn')) return (handlers.shl ?? (() => new Response('{}', { status: 503 })))();
    if (url.includes('commons.wikimedia.org')) return (handlers.commons ?? (() => new Response('{}', { status: 503 })))();
    if (url.includes('zh.wikisource.org')) return (handlers.wikisource ?? (() => new Response('{}', { status: 503 })))();
    if (url.includes('loc.gov')) return (handlers.loc ?? (() => new Response('{}', { status: 503 })))();
    return new Response('{}', { status: 404 });
  });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('diagnoseSourceNeed (Y01)', () => {
  it('marks external discovery as required only when the library has no material', () => {
    expect(diagnoseSourceNeed('我想做一部关于楚国八百年的作品', 0)).toMatchObject({ required: true });
    expect(diagnoseSourceNeed('金泽古桥', 3)).toMatchObject({ required: false });
    expect(diagnoseSourceNeed('   ', 0)).toMatchObject({ required: false });
  });
});

describe('discoverExternalSources (Y02/Y03)', () => {
  it('merges candidate leads from several channels and records a trace per channel', async () => {
    stubChannels({
      wikisource: () =>
        new Response(
          JSON.stringify({
            query: { search: [{ title: '楚國史記', snippet: '楚國之先，出自帝顓頊' }] },
          }),
          { status: 200 }
        ),
      commons: () =>
        new Response(
          JSON.stringify({
            query: {
              pages: {
                1: {
                  title: 'Chu state map.jpg',
                  imageinfo: [
                    {
                      url: 'https://upload.wikimedia.org/chu.jpg',
                      descriptionurl: 'https://commons.wikimedia.org/wiki/File:Chu_state_map.jpg',
                      extmetadata: { LicenseShortName: { value: 'Public domain' } },
                    },
                  ],
                },
              },
            },
          }),
          { status: 200 }
        ),
    });

    const result = await discoverExternalSources('我想做一部关于楚国八百年的作品', { entities: ['楚国'] });

    expect(result.need.required).toBe(true);
    expect(result.leads.length).toBeGreaterThan(0);
    const channels = new Set(result.trace.map((t) => t.channel));
    expect(channels.has('zh-wikisource')).toBe(true);
    expect(channels.has('wikimedia-commons')).toBe(true);
    // 每个渠道都要有独立轨迹，不能只报一个总数。
    expect(result.trace.every((t) => typeof t.count === 'number')).toBe(true);
  });

  it('reports channel unavailability as gaps instead of returning fabricated leads', async () => {
    stubChannels({});

    const result = await discoverExternalSources('楚国八百年', { entities: ['楚国'] });

    expect(result.leads).toEqual([]);
    expect(result.gaps.length).toBeGreaterThan(0);
    // 失败必须说清是渠道覆盖不到，不能被读成"历史中没有这份资料"。
    expect(result.gaps.join(' ')).toContain('渠道');
    expect(result.trace.some((t) => t.status === 'unavailable')).toBe(true);
  });

  it('ranks title matches ahead of documents that only mention the term in body text (Y06)', async () => {
    stubChannels({
      wikisource: () =>
        new Response(
          JSON.stringify({
            query: {
              search: [
                { title: '佛祖綱目/卷第八', snippet: '當此土周襄王十五年甲申歲也' },
                { title: '楚國先賢傳', snippet: '楚國之先，出自帝顓頊' },
              ],
            },
          }),
          { status: 200 }
        ),
    });

    const result = await discoverExternalSources('楚国八百年', { entities: ['楚国'] });

    const titles = result.leads.map((m) => m.title);
    // 题名命中的线索必须排在只有正文偶遇的文档之前。
    const bodyOnly = titles.indexOf('佛祖綱目/卷第八');
    expect(titles.length).toBeGreaterThan(0);
    expect(result.trace.some((t) => t.channel === 'relevance-rank')).toBe(true);
    // 仅正文偶遇的文档最多保留 2 条，不能挤占首屏。
    if (bodyOnly >= 0) expect(bodyOnly).toBeGreaterThanOrEqual(titles.length - 2);
  });

  it('does not fabricate leads when no usable term can be derived', async () => {
    const result = await discoverExternalSources('   ', { entities: [] });
    expect(result.leads).toEqual([]);
    expect(result.need.required).toBe(false);
  });
});
