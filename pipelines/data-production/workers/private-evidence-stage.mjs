// MAB-ENG-01: private D01-D03 candidate bridge to the existing six-stage chain.
// Not a second producer, not a Gate signer, and not a replacement for source L0/L1 rows.
import { createHash } from 'node:crypto';
import { assertStageExecutionAuthorized } from '../orchestrator/execution-authority.mjs';

const HEX=/^[a-f0-9]{64}$/;
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
function requireBoundStage(stage, job) {
  if(job?.stage!==stage)throw Error('PRIVATE_STAGE_MISMATCH');
}
function requireToken(token) {
  if(typeof token!=='string'||token.length===0)throw Error('PRIVATE_STAGE_SESSION_REQUIRED');
}
export function createPrivateEvidenceStageWorker({readOriginal,bridge}={}) {
  if(typeof readOriginal!=='function'||typeof bridge?.linkReading!=='function'||
     typeof bridge?.linkClaim!=='function')throw Error('PRIVATE_EVIDENCE_BRIDGE_REQUIRED');

  async function authorized({stage,run,job,registry,context,input,token}) {
    requireBoundStage(stage,job);
    requireToken(token);
    // The existing independent execution-authority check verifies stage, job,
    // registry hash, exact input hash, nonce and revocation at the trusted verifier.
    // This is before any DB mutation or privileged original read.
    await assertStageExecutionAuthorized({run,job,registry,context,input});
  }

  return {
    async draftTextReading({run,job,registry,context={},input,token}) {
      await authorized({stage:'D01',run,job,registry,context,input,token});
      const {originalId,extent,quote}=input??{};
      if(typeof originalId!=='string'||!extent||extent.kind!=='utf8_byte_range/v1'||
         !Number.isSafeInteger(extent.start_byte)||!Number.isSafeInteger(extent.end_byte)||
         extent.start_byte<0||extent.end_byte<=extent.start_byte||
         typeof quote!=='string'||Buffer.byteLength(quote)>32768)throw Error('PRIVATE_READING_LOCATOR_INVALID');
      const {record,bytes}=await readOriginal(originalId,token);
      if(record?.state!=='STORED_VERIFIED'||record?.content_type!=='text/plain'||
         !HEX.test(record?.sha256??'')||hash(bytes)!==record.sha256||
         extent.end_byte>bytes.length||extent.raw_sha256!==record.sha256)
        throw Error('PRIVATE_READING_ORIGINAL_UNVERIFIED');
      const selected=bytes.subarray(extent.start_byte,extent.end_byte);
      if(!Buffer.from(quote,'utf8').equals(selected)||
         !Buffer.from(selected.toString('utf8'),'utf8').equals(selected)||
         extent.quote_sha256!==hash(selected))
        throw Error('PRIVATE_READING_QUOTE_MISMATCH');
      // This is a verified L1 *candidate* for existing source.read_runs/read_units;
      // persistence, D01 professional G1, and D02 evidence linking are separate.
      return {stage:'D01',candidate_kind:'private_text_reading',
        original_id:originalId,source_version_id:extent.source_version_id,
        raw_item_id:extent.raw_item_id,raw_sha256:record.sha256,
        extent,quote,qualification:'UNASSESSED',gate_code:'G1'};
    },

    async linkReading({run,job,registry,context={},input,token}) {
      await authorized({stage:'D02',run,job,registry,context,input,token});
      const {originalId,evidenceId,readUnitId,extent,quote,extentOrder}=input??{};
      const linked=await bridge.linkReading({originalId,evidenceId,readUnitId,extent,quote,extentOrder},token);
      if(linked?.qualification!=='UNASSESSED'||!linked.link_id)throw Error('PRIVATE_BRIDGE_INVALID_RESULT');
      return {stage:'D02',candidate_kind:'private_read_evidence_link',
        link_id:linked.link_id,qualification:'UNASSESSED',gate_code:'G2'};
    },

    async linkClaim({run,job,registry,context={},input,token}) {
      await authorized({stage:'D03',run,job,registry,context,input,token});
      const {originalId,evidenceId,claimRevisionId,supportType}=input??{};
      const linked=await bridge.linkClaim({originalId,evidenceId,claimRevisionId,supportType},token);
      if(linked?.qualification!=='UNASSESSED'||!linked.link_id)throw Error('PRIVATE_BRIDGE_INVALID_RESULT');
      return {stage:'D03',candidate_kind:'private_claim_revision_evidence_link',
        link_id:linked.link_id,claim_revision_id:claimRevisionId,
        qualification:'UNASSESSED',gate_code:'G3'};
    },
  };
}
