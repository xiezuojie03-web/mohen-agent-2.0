import {describe,expect,it} from "vitest";
import {
  requireIndependentWorkPublicationG5,
  requireCurrentWorkConsumerQualification,
} from "../../apps/web/lib/work-publish-qualification";

const work="123e4567-e89b-42d3-a456-426614174001";
const rev="123e4567-e89b-42d3-a456-426614174002";
describe("MAB HP12 unqualified new publication fails closed",()=>{
  it("does not interpret approved narrative provenance as a professional G5",async()=>{
    await expect(requireIndependentWorkPublicationG5(work,rev,{
      beats:[{provenanceRefs:["synthetic-source"]}],
      reviewer_decision:"approved",
      rights_acknowledged:true,
    })).resolves.toEqual({ok:false,reason:"independent_g5_required"});
  });
  it.each(["watch","visual_stage","agent","evidence_on_demand"] as const)(
    "does not borrow a different consumer qualification for %s",
    async consumer=>{
      await expect(requireCurrentWorkConsumerQualification(work,rev,consumer,{
        legacy_gate_result:"PASS",rights_acknowledged:true,
      })).resolves.toEqual({ok:false,reason:"independent_g5_required"});
    }
  );
});
