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
