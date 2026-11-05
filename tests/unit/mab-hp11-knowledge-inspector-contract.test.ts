import {describe,expect,it} from "vitest";
import {countStoredRefs,privateAssetStatus,assetPayloadPreview} from "../../apps/web/app/admin/knowledge-asset-view";

describe("HP11 private knowledge asset display contract",()=>{
  it("cannot turn candidate fields into a signed G5 statement",()=>{
    const label=privateAssetStatus({epistemic_class:"editorial",content_state:"WORKING",access_state:"RESTRICTED"});
    expect(label).toContain("独立G资格未由此视图验证");
    expect(label).not.toContain("已发布");
    expect(privateAssetStatus({})).toContain("状态未定");
  });
  it("counts only actual stored arrays and refuses to fabricate missing provenance",()=>{
    expect(countStoredRefs([{id:"a"},{id:"b"}])).toBe(2);
    expect(countStoredRefs('[{"id":"a"}]')).toBe(1);
    expect(countStoredRefs("{bad-json")).toBeNull();
    expect(countStoredRefs('{"id":"a"}')).toBeNull();
    expect(countStoredRefs(null)).toBeNull();
  });
  it("limits displayed private text and treats markup as text",()=>{
    const raw="<img src=x onerror=alert(1)>";
    expect(assetPayloadPreview(raw)).toBe(raw);
    expect(assetPayloadPreview("a".repeat(4000))).toHaveLength(2000);
    expect(assetPayloadPreview(undefined)).toBe("未提供可预览内容");
  });
});

it('selects only the requested immutable revision within the selected asset history',async()=>{
 const {selectInspectedRevision,assetRightsSummary}=await import('../../apps/web/app/admin/knowledge-asset-view');
 const current={asset_id:'a',revision_id:'new',rights_by_action:{display:'unknown'}};
 const old={asset_id:'a',revision_id:'old',payload:{text:'old'},rights_by_action:{display:'denied'}};
 expect(selectInspectedRevision(current,[old],'old')).toEqual(old);
 expect(selectInspectedRevision(current,[{...old,asset_id:'foreign'}],'old')).toBeNull();
 expect(assetRightsSummary(old.rights_by_action)).toContain('denied');
 expect(assetRightsSummary(undefined)).toContain('未知');
});

it('reports stored validation and use context without inventing Gate qualification',async()=>{
 const {assetValidationSummary,assetPermissionSummary,assetUseSummary}=await import('../../apps/web/app/admin/knowledge-asset-view');
 expect(assetValidationSummary({status:'CHECKED',rule_version:'r1',findings:['missing L1']})).toContain('missing L1');
 expect(assetValidationSummary(undefined)).toContain('未评估');
 expect(assetPermissionSummary({purposes:['research']})).toContain('research');
 expect(assetPermissionSummary(undefined)).toContain('未记录');
 expect(assetUseSummary({purpose:'research',created_at:'2026-01-01',asset_revision_id:'old'})).toContain('old');
 expect(assetUseSummary({})).toContain('未记录');
});
