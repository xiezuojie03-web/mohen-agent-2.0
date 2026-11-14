import {expect,it,vi} from "vitest";
vi.mock("node:child_process",()=>({spawn:vi.fn()}));
vi.mock("../../packages/data-access/src/index.mjs",()=>({
 run:vi.fn(),queryRows:vi.fn(),queryValue:vi.fn()
}));
vi.mock("../../apps/web/lib/mohen-agent/prepare-topic",()=>({prepareFreeTopic:vi.fn()}));
import {privateSourceHandoffBlocker,triggerProduction} from "../../apps/web/lib/studio-production";
const id="123e4567-e89b-42d3-a456-426614174001";
const source={originalId:id,pageNumber:2,sourceVersionId:id,sha256:"a".repeat(64),
 assetRevisionId:id,contentType:"image/jpeg",byteSize:100};
const privateAdapter="pipelines/data-production/adapters/private-evidence-adapters.mjs";
const oldAdapter="pipelines/data-production/adapters/layer1-adapters.mjs";
const canonical=(adapter:string)=>({jobs:["D00","D01","D02","D03","D04","D05"].map(stage=>({
 stage,implementation:{adapter_binding:adapter}
}))});

it("never binds genuine private originals to the parallel layer1 adapter",()=>{
 expect(privateSourceHandoffBlocker(canonical(oldAdapter),source)).toBe("production_private_adapter_not_bound");
 expect(privateSourceHandoffBlocker(canonical(privateAdapter),source)).toBe("production_acquisition_receipt_required");
 expect(privateSourceHandoffBlocker({jobs:[{stage:"D00",implementation:{adapter_binding:privateAdapter}}]},source)).toBe("production_private_adapter_not_bound");
});

it("refuses missing, malformed or contradictory source selection",()=>{
 expect(privateSourceHandoffBlocker(canonical(privateAdapter))).toBe("production_original_selection_required");
 expect(privateSourceHandoffBlocker(canonical(privateAdapter),{...source,pageNumber:0})).toBe("production_original_binding_invalid");
 expect(privateSourceHandoffBlocker(canonical(privateAdapter),{...source,originalId:"not-a-uuid"})).toBe("production_original_binding_invalid");
 expect(privateSourceHandoffBlocker(canonical(privateAdapter),{...source,sha256:"x"})).toBe("production_original_binding_invalid");
});

it("cannot directly spawn production from a malformed project identity",async()=>{
 const r=await triggerProduction(id,"test intent","not-a-project",source);
 expect(r).toEqual({runId:"",started:false,reason:"production_project_binding_required"});
});
