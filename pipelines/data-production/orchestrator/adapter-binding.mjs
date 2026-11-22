import fs from "node:fs";
import path from "node:path";

export function assertAdapterBinding(projectRoot,registry,adapterPath,selectedStages,runScope) {
  // A typed private-original scope selects only the approved alternative of
  // this same Registry. Real ownership, bytes and rights remain Worker checks.
  const privateRoute=runScope?.original_id!==undefined;
  if(privateRoute&&(!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(runScope.original_id)||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(runScope.project_id??'')||
      !Number.isSafeInteger(runScope.page_number)||runScope.page_number<1||runScope.page_number>10000))
    throw Error('PRIVATE_SOURCE_RUN_SCOPE_INVALID');
  const root=fs.realpathSync(projectRoot);
  let selected;
  try{selected=fs.realpathSync(path.resolve(root,adapterPath));}
  catch{throw Error('ADAPTER_BINDING_MISMATCH');}
  if(!selected.startsWith(root+path.sep))throw Error('ADAPTER_BINDING_MISMATCH');
  // Whole-run CLI remains strict by default; a resumed range only needs
  // its own reviewed stage modules, not a global Registry override.
  const stages=selectedStages===undefined?registry.jobs.map(j=>j.stage):selectedStages;
  if(!Array.isArray(stages)||stages.length===0||new Set(stages).size!==stages.length)
    throw Error('ADAPTER_BINDING_MISMATCH');
  for(const stage of stages){
    const job=registry.jobs.find(j=>j.stage===stage);
    const bound=privateRoute?job?.implementation?.private_evidence_adapter_binding:job?.implementation?.adapter_binding;
    if(privateRoute&&bound!==PRIVATE_EVIDENCE_ADAPTER_PATH)throw Error('PRIVATE_STAGE_ADAPTER_NOT_BOUND');
    if(typeof bound!=='string'||path.isAbsolute(bound)||
        bound.split(/[\\/]/).includes('..'))throw Error('ADAPTER_BINDING_MISMATCH');
    let canonical;
    try{canonical=fs.realpathSync(path.resolve(root,bound));}
    catch{throw Error('ADAPTER_BINDING_MISMATCH');}
    if(canonical!==selected)throw Error('ADAPTER_BINDING_MISMATCH');
  }
}

export function assertNoUnboundTopicInputs(environment = process.env) {
  // These adapters read material/configuration outside run.input. Until a frozen
  // snapshot handshake is implemented they cannot be authorized by an intent-only grant.
  // 例外：当 Studio 已通过签名执行授权绑定（MOHEN_EXECUTION_AUTH_TOKENS 或动态令牌服务）
  // 启动生产时，动态主题文件已被授权覆盖，不再阻断。
  const hasSignedAuth = !!(environment.MOHEN_EXECUTION_AUTH_TOKENS ||
    (environment.MOHEN_EXECUTION_AUTH_DYNAMIC_URL && environment.MOHEN_EXECUTION_AUTH_DYNAMIC_CREDENTIAL));
  if ((environment.MOHEN_TOPIC_JSON_FILE || environment.MOHEN_TOPIC_CONFIG) && !hasSignedAuth) {
    throw new Error("EXECUTION_DYNAMIC_INPUT_BINDING_REQUIRED");
  }
}


/** The only private evidence adapter module eligible for D01–D05.
 * A Registry document cannot enable private inputs merely by inventing a
 * binding name; binding must resolve to this exact reviewed module.
 */
export const PRIVATE_EVIDENCE_ADAPTER_PATH =
  "pipelines/data-production/adapters/private-evidence-adapters.mjs";

export function hasReviewedPrivateStageBinding(job) {
  return job?.implementation?.private_evidence_adapter_binding===PRIVATE_EVIDENCE_ADAPTER_PATH ||
    job?.implementation?.adapter_binding===PRIVATE_EVIDENCE_ADAPTER_PATH;
}

const PRIVATE_REQUEST_SCHEMA = "mohen.private-evidence-stage-request.v1";

/** Pure shape check for the ONE Runner's real next-stage input. Not authorization,
 * not a Gate PASS, and not a substitute for per-Worker professional validation. */
export function isTypedPrivateStageRequest(stage,input) {
  return ["D01","D02","D03","D04","D05"].includes(stage) &&
    input?.schema===PRIVATE_REQUEST_SCHEMA && input.stage===stage &&
    typeof input.originalId==="string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(input.originalId) &&
    !["private_evidence","private_original","mab_private_evidence"].some(k=>input[k]!==undefined) &&
    // D01 adds a carrier that MUST be typed and consistent; the G0 stage_binding
    // signs exactly this shape, so a loose D01 request is not a typed handoff.
    (stage!=="D01" || isTypedD01Carrier(input));
}

const UUID_RE=/^[0-9a-f]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
const SHA_RE=/^[0-9a-f]{64}$/;
const METHOD_RE=/^[A-Z][0-9]+$/;
/** Pure, authorization-free shape check of the D01 carrier bound by G0.
 * When a method_plan is present it must agree with exactly one well-formed
 * carrier. Legacy/resume inputs without a method_plan keep their historical
 * shape (the professional Worker still performs all professional validation). */
export function isTypedD01Carrier(input) {
  if(!input||input.schema!==PRIVATE_REQUEST_SCHEMA||input.stage!=="D01"||
     !UUID_RE.test(input.originalId??''))return false;
  const page=input.page,text=input.text;
  const plan=input.method_plan;
  if(plan===undefined){
    // No method plan bound: preserve the pre-existing typed shape. A carrier,
    // if supplied, must be internally well-formed; a bare typed request (as in
    // historical resume fixtures) is still accepted here. Professional Workers
    // independently reject any request they cannot act on.
    if(page&&text)return false;
    if(page)return page.kind==='scanned_page/v1'&&UUID_RE.test(page.source_version_id??'');
    if(text)return text.kind==='verified_utf8_full/v1'&&UUID_RE.test(text.source_version_id??'');
    return true;
  }
  if(Boolean(page)===Boolean(text))return false; // exactly one carrier when bound
  if(!Array.isArray(plan)||plan.length<1||plan.length>8||
     !plan.every(r=>r&&r.kind==='method_plan'&&METHOD_RE.test(r.method_id??'')&&
       typeof r.method_version==='string'&&r.method_version.length>0))return false;
  if(plan.some(r=>r.method_id==='C02')){
    return Boolean(page&&page.kind==='scanned_page/v1'&&
      Number.isInteger(page.page_number)&&page.page_number>=1&&page.page_number<=10000&&
      UUID_RE.test(page.source_version_id??'')&&UUID_RE.test(page.raw_item_id??'')&&
      SHA_RE.test(page.raw_sha256??'')&&SHA_RE.test(page.page_sha256??'')&&
      page.raw_sha256===page.page_sha256);
  }
  if(plan.some(r=>r.method_id==='C01')){
    return Boolean(text&&text.kind==='verified_utf8_full/v1'&&
      UUID_RE.test(text.source_version_id??'')&&UUID_RE.test(text.raw_item_id??'')&&
      SHA_RE.test(text.raw_sha256??''));
  }
  return false;
}

/** Pure, authorization-free shape check of the D02 generation request the
 * orchestrator derives from a current-qualified C01 reading. D02's professional
 * Worker independently re-reads every field (read_unit, revision, locator,
 * G1 current, original bytes) and still owns all access decisions; this only
 * keeps a resumed D02 input inside the one contract shape instead of accepting
 * any object that happens to carry schema/stage/originalId. */
export function isTypedD02ReadingRequest(input) {
  if(!input||input.schema!==PRIVATE_REQUEST_SCHEMA||input.stage!=="D02"||
     !UUID_RE.test(input.originalId??'')||!UUID_RE.test(input.readUnitId??''))return false;
  const r=input.reading;
  if(!r||typeof r!=="object"||Array.isArray(r))return false;
  if(r.schema!=="mohen.qualified-private-reading.v1"||
     ![r.run_id,r.project_id,r.root_task_id,r.gate_audit_id,r.read_run_id,
       r.source_version_id,r.raw_item_id].every(v=>UUID_RE.test(v??''))||
     ![r.artifact_revision,r.raw_sha256].every(v=>SHA_RE.test(v??'')))return false;
  const e=r.extent;
  return Boolean(e&&typeof e==="object"&&e.kind==="utf8_byte_range/v1"&&
    SHA_RE.test(e.quote_sha256??'')&&
    Number.isSafeInteger(e.start_byte)&&Number.isSafeInteger(e.end_byte)&&
    e.start_byte>=0&&e.end_byte>e.start_byte);
}

/** Pure, authorization-free shape check of the D03 world-claim request the
 * orchestrator/authority derives from a current-qualified G2 material evidence.
 * D03 accepts exactly one of two mutually exclusive forms (mirrored by
 * resume-input.mjs PRIVATE_SHAPE.D03): a derived `claim`, or the legacy
 * `claimRevisionId` + `supportType` link. Mixing them, or carrying observation
 * fields, fails closed. Worker still re-reads all G2/bytes/rights facts. */
export function isTypedD03WorldClaimRequest(input) {
  if(!input||input.schema!==PRIVATE_REQUEST_SCHEMA||input.stage!=="D03"||
     !UUID_RE.test(input.originalId??'')||!UUID_RE.test(input.evidenceId??''))return false;
  const hasClaim=input.claim!==undefined;
  const hasLink=input.claimRevisionId!==undefined||input.supportType!==undefined;
  if(hasClaim===hasLink)return false; // exactly one form
  if(hasLink)return UUID_RE.test(input.claimRevisionId??'')&&
    ['supports','contradicts','contextualizes'].includes(input.supportType);
  const c=input.claim;
  return Boolean(c&&typeof c==="object"&&!Array.isArray(c)&&
    typeof c.assertion==="string"&&c.assertion.length>0&&Buffer.byteLength(c.assertion)<=2000&&
    typeof c.change_type==="string"&&c.change_type.length>0&&c.change_type.length<=200&&
    c.time_scope&&typeof c.time_scope==="object"&&!Array.isArray(c.time_scope)&&
    ['supports','contradicts','contextualizes'].includes(c.support_type));
}

/** Pure, authorization-free shape check of the D04 humanistic-finding request
 * the authority derives from a current-qualified G3 claim revision. Exactly one
 * form is accepted: the derived `finding` plus its `claimRevisionId`. No
 * upstream snapshot or Producer-supplied finding is trusted by the Worker — it
 * re-reads every field (G3 current, claim bytes, original binding) before the
 * candidate is persisted. */
export function isTypedD04FindingRequest(input) {
  if(!input||input.schema!==PRIVATE_REQUEST_SCHEMA||input.stage!=="D04"||
     !UUID_RE.test(input.originalId??'')||!UUID_RE.test(input.claimRevisionId??''))return false;
  if(input.claim!==undefined||input.evidenceId!==undefined||input.finding===undefined)return false;
  const f=input.finding;
  return Boolean(f&&typeof f==="object"&&!Array.isArray(f)&&
    /^A(0[1-9]|1[0-2])$/.test(f.method_id??'')&&
    typeof f.finding_type==="string"&&f.finding_type.length>0&&Buffer.byteLength(f.finding_type)<=200&&
    typeof f.human_question==="string"&&f.human_question.length>0&&Buffer.byteLength(f.human_question)<=2000&&
    typeof f.interpretive_statement==="string"&&f.interpretive_statement.length>0&&Buffer.byteLength(f.interpretive_statement)<=5000&&
    (f.understanding_delta===undefined||typeof f.understanding_delta==="string")&&
    Array.isArray(f.counter_view_or_alternative)&&f.counter_view_or_alternative.every(v=>typeof v==="string")&&
    Array.isArray(f.missing_evidence)&&f.missing_evidence.every(v=>typeof v==="string")&&
    f.uncertainty&&typeof f.uncertainty==="object"&&!Array.isArray(f.uncertainty)&&
    f.uncertainty.qualification==="UNASSESSED");
}

function containsPrivateRequest(input) {
  const seen = new WeakSet();
  function visit(value) {
    if (!value || typeof value !== "object") return false;
    if (seen.has(value)) return false;
    seen.add(value);
    if (value.schema === PRIVATE_REQUEST_SCHEMA ||
      value.private_evidence !== undefined ||
      value.private_original !== undefined ||
      value.mab_private_evidence !== undefined) return true;
    return Object.values(value).some(visit);
  }
  return visit(input);
}

/**
 * Private inputs cannot reach a legacy adapter. Only the exact reviewed
 * private module may handle a stage-specific, top-level typed request after
 * the Registry has been activated and stage policy authorized independently.
 * This check never authorizes execution by itself.
 */
export function assertNoUnboundPrivateEvidenceInput(input, { job } = {}) {
  if (!containsPrivateRequest(input)) return;
  if (!job || !["D01","D02","D03","D04","D05"].includes(job.stage) ||
      !hasReviewedPrivateStageBinding(job) ||
      input?.schema !== PRIVATE_REQUEST_SCHEMA ||
      input?.stage !== job.stage ||
      typeof input?.originalId !== "string" ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(input.originalId) ||
      ["private_evidence","private_original","mab_private_evidence"].some(k=>input[k]!==undefined)) {
    throw Error("PRIVATE_EVIDENCE_STAGE_BINDING_REQUIRED");
  }
}
