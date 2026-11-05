import {test,expect} from '@playwright/test';

const work={work_id:'synthetic-watch',revision_id:'revision-one',title:'合成撤权作品',revision_no:'1',description:'',published_at:'',content:JSON.stringify({beats:[{title:'第一章',narration:'撤权前的正文'},{title:'第二章',narration:'不应继续展示的正文'}]})};
test('WATCH clears already loaded content when chapter revalidation refuses it',async({page})=>{
 let reads=0;
 await page.route('**/api/works/published',route=>route.fulfill({json:{works:++reads===1?[work]:[]}}));
 await page.goto('/watch');await expect(page.getByText('撤权前的正文',{exact:true})).toBeVisible();
 await page.getByRole('button',{name:'下一章',exact:true}).click();
 await expect(page.getByText('撤权前的正文',{exact:true})).toHaveCount(0);
 await expect(page.getByText('不应继续展示的正文',{exact:true})).toHaveCount(0);
 expect(reads).toBeGreaterThan(1);
});
test('WATCH stops and clears content on qualification service failure, and retry reads current catalogue',async({page})=>{
 let reads=0;
 await page.route('**/api/works/published',route=>++reads===2?route.fulfill({status:503,json:{ok:false}}):route.fulfill({json:{works:reads===1?[work]:[]}}));
 await page.goto('/watch');await expect(page.getByText('撤权前的正文',{exact:true})).toBeVisible();
 await page.getByRole('button',{name:'自动翻页',exact:true}).click();
 await expect(page.getByText('作品暂时加载失败，请重试。',{exact:true})).toBeVisible();await expect(page.getByText('撤权前的正文',{exact:true})).toHaveCount(0);
 await page.getByRole('button',{name:'重试',exact:true}).click();
 await expect(page.getByText('暂无已发布作品',{exact:true})).toBeVisible();expect(reads).toBe(3);
});
test('WATCH rechecks an open page on focus and periodically',async({page})=>{
 let allowed=true,reads=0;
 await page.route('**/api/works/published',route=>{reads++;return route.fulfill({json:{works:allowed?[work]:[]}});});
 await page.clock.install();await page.goto('/watch');await expect(page.getByText('撤权前的正文',{exact:true})).toBeVisible();
 await page.evaluate(()=>window.dispatchEvent(new Event('focus')));await expect.poll(()=>reads).toBeGreaterThan(1);
 allowed=false;await page.clock.fastForward(15_000);
 await expect(page.getByText('撤权前的正文',{exact:true})).toHaveCount(0);
});
test('WATCH refresh preserves a long chapter timer and rechecks before automatic advance',async({page})=>{
 let reads=0;
 const longWork={...work,content:JSON.stringify({beats:[{title:'长章节',narration:'长章节正文',directorTimecodeMs:0},{title:'后续章节',narration:'重新核验后的后续正文',directorTimecodeMs:20_000}]})};
 await page.route('**/api/works/published',route=>{reads++;return route.fulfill({json:{works:[longWork]}});});
 await page.clock.install();await page.goto('/watch');await expect(page.getByText('长章节正文',{exact:true})).toBeVisible();
 await page.getByRole('button',{name:'自动翻页',exact:true}).click();
 await expect(page.getByRole('button',{name:'停止翻页',exact:true})).toBeVisible();
 await page.clock.fastForward(15_000);await expect.poll(()=>reads).toBeGreaterThanOrEqual(3);
 await page.clock.fastForward(5_000);
 await expect(page.getByText('重新核验后的后续正文',{exact:true})).toBeVisible();expect(reads).toBeGreaterThanOrEqual(4);
});
test('WATCH shows only current chapter provenance text and closes back to the same chapter',async({page})=>{
 const sourced={...work,content:JSON.stringify({beats:[{title:'有出处章节',narration:'当前章阅读正文',provenanceRefs:['来源A，第3页','https://example.invalid/original']},{title:'无出处章节',narration:'无出处正文',provenanceRefs:[]}]})};
 await page.route('**/api/works/published',route=>route.fulfill({json:{works:[sourced]}}));
 await page.goto('/watch');await expect(page.getByText('当前章阅读正文',{exact:true})).toBeVisible();
 await expect(page.getByRole('button',{name:'相关探索',exact:true})).toBeDisabled();
 await page.getByRole('button',{name:'参考资料',exact:true}).click();
 const panel=page.getByRole('region',{name:'当前章节出处'});await expect(panel).toBeVisible();
 await expect(panel.getByText('来源A，第3页',{exact:true})).toBeVisible();
 await expect(panel.getByRole('link')).toHaveCount(0);
 await page.getByRole('button',{name:'返回当前章节',exact:true}).click();await expect(panel).toHaveCount(0);
 await expect(page.getByText('当前章阅读正文',{exact:true})).toBeVisible();
 await page.getByRole('button',{name:'下一章',exact:true}).click();await expect(page.getByText('无出处正文',{exact:true})).toBeVisible();
 await expect(page.getByRole('button',{name:'参考资料',exact:true})).toBeDisabled();
 await expect(page.getByText('本章未提供可读出处。',{exact:true})).toBeVisible();
});
