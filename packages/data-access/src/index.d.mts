// packages/data-access/src/index.d.mts
//
// 为 ESM 运行时 `index.mjs` 补类型声明（新增文件，不改运行时行为）。
// 目的：让 TS 侧（如 Next route handler）能安全地 import 本包，而不必绕过类型检查。
//
// 注意：`src/index.ts` 仍是 TASK-0001 的占位（foundation-only），仅服务于既有
// typecover 清单；**真实实现是 index.mjs**，本声明与之一致。

export interface PgRow {
  [column: string]: string;
}

export type SqlParams = Record<string, string | number | null | undefined> | null;

/** 执行查询并返回对象数组（psql --csv 解析；jsonb 列返回字符串，NULL 渲染为空串） */
export declare function queryRows(sql: string, params?: SqlParams): Promise<PgRow[]>;

/** 单值查询（首行首列） */
export declare function queryValue(sql: string, params?: SqlParams): Promise<string | null>;

/** 执行写 / DDL */
export declare function run(sql: string, params?: SqlParams): Promise<boolean>;

/** 批量执行（一次 psql 调用） */
export declare function runMany(
  items: Array<string | { sql: string; params?: SqlParams }>
): Promise<number>;

export declare function getConnection(): {
  user: string;
  password: string;
  host: string;
  port: string;
  db: string;
};

export declare const PSQL_PATH: string;
export declare const PROJECT_ROOT: string;

declare const _default: {
  getConnection: typeof getConnection;
  run: typeof run;
  runMany: typeof runMany;
  queryRows: typeof queryRows;
  queryValue: typeof queryValue;
  PSQL_PATH: string;
  PROJECT_ROOT: string;
};
export default _default;

export interface ImportedMaterialInput {
  title: string;
  text: string;
  sourceUrl: string | null;
  license: string | null;
  rightsDeclared: boolean;
}
export interface ImportedMaterialView {
  material_id: string;
  title: string;
  source_url: string | null;
  license: string | null;
  rights_declared: boolean;
  excerpt: string;
  created_at: string;
}
export interface ImportedMaterialDetail {
  material_id: string;
  title: string;
  text: string;
  source_url: string | null;
  license: string | null;
  rights_declared: boolean;
  created_at: string;
}
export interface ImportedMaterialRepository {
  get(materialId: string, sessionToken: string | null): Promise<ImportedMaterialDetail | null>;
  list(sessionToken: string | null): Promise<ImportedMaterialView[]>;
  create(input: ImportedMaterialInput, sessionToken: string | null): Promise<{material_id: string; owner_user_id: string}>;
}
export declare function createImportedMaterialRepository(pool: {connect: Function}): ImportedMaterialRepository;
export declare function getNodePgPool(): {connect: Function; query(sql: string, params?: unknown[]): Promise<{rows: Array<Record<string, unknown>>}>; end(): Promise<void>};

export interface StudioStoredRevision {
  revision_id: string;
  asset_id: string;
  project_id: string;
  asset_kind: string;
  revision_no: number;
  supersedes_revision_id: string | null;
  payload: unknown;
  content_hash: string;
  content_state: string;
  access_state: string;
  validation: unknown;
}
export interface StudioAssetRepository {
  listProjects(token: string): Promise<Array<{project_id: string; project_title: string; research_scope: unknown; lifecycle_status: string; created_at: string}>>;
  listPlanAssets(projectId:string,token:string,cursor?:string|null):Promise<StudioStoredRevision[]>;
  listAssets(projectId: string, token: string): Promise<StudioStoredRevision[]>;
  listAssetRevisions(projectId: string, assetId: string, token: string): Promise<StudioStoredRevision[]>;
  listRevisionUseEvents(projectId: string, revisionId: string, token: string): Promise<Array<{
    use_event_id: string; asset_revision_id: string; consumer: string; purpose: string;
    requested_action: string; rights_decision_ref: string; created_at: string;
  }>>;
  createProject(input: {projectId: string; title: string; scope?: Record<string, unknown>}, token: string): Promise<{project_id: string; project_title: string; research_scope: unknown}>;
  saveRevision(input: {projectId: string; assetId: string; kind: string; expectedRevisionId: string | null; idempotencyKey: string; payload: unknown; sourceRefs?: unknown[]; dependencyRefs?: unknown[]}, token: string): Promise<StudioStoredRevision>;
  getRevision(revisionId: string, token: string): Promise<StudioStoredRevision | null>;
}
export declare function createStudioAssetRepository(pool: {connect: Function}): StudioAssetRepository;

export interface PrivateOriginalRecord {
 original_id:string;project_id:string;asset_id:string;asset_revision_id:string|null;
 state:string;sha256:string;byte_size:number;file_name:string;content_type:string;
}
export interface PrivateOriginalInput {
 projectId:string;originalId:string;assetId:string;idempotencyKey:string;
 bytes:Buffer;fileName:string;contentType:string;
}
export interface PrivateOriginalRepository {
 reserve(input: Omit<PrivateOriginalInput,"bytes"> & {sha256:string;byteSize:number},token:string):Promise<PrivateOriginalRecord & {storage_key:string}>;
 finalize(originalId:string,sha256:string,token:string):Promise<PrivateOriginalRecord>;
 getStored(originalId:string,token:string):Promise<(PrivateOriginalRecord & {storage_key:string})|null>;
}
export interface PrivateOriginalStorage {
 putVerified(key:string,bytes:Buffer,contentType?:string):Promise<{sha256:string;byteSize:number;contentType:string}>;
 readVerified(key:string,hash:string,size?:number):Promise<Buffer>;
 discardUnverified(key:string):Promise<void>;
}
export declare function createPrivateOriginalRepository(pool:{connect:Function}):PrivateOriginalRepository;
export declare function createPrivateOriginalWorkflow(args:{repository:PrivateOriginalRepository;storage:PrivateOriginalStorage}):{
 upload(input:PrivateOriginalInput,token:string):Promise<PrivateOriginalRecord>;
 download(originalId:string,token:string):Promise<{record:PrivateOriginalRecord;bytes:Buffer}>;
};
export declare function createPrivateOriginalStorage(options?:{
 endpoint?:string;token?:string;fetcher?:typeof fetch;
}):PrivateOriginalStorage;
export declare const MAX_ORIGINAL_BYTES:number;

export interface PrivateTextExtent {
 kind:'utf8_byte_range/v1';source_version_id:string;raw_item_id:string;
 start_byte:number;end_byte:number;raw_sha256:string;quote_sha256:string;
}
export interface EvidenceBridgeRepository {
 linkReading(input:{originalId:string;evidenceId:string;readUnitId:string;extent:PrivateTextExtent;quote:string;extentOrder?:number},token:string):Promise<{link_id:string;qualification:'UNASSESSED'}>;
 linkClaim(input:{originalId:string;evidenceId:string;claimRevisionId:string;supportType:'supports'|'contradicts'|'contextualizes'},token:string):Promise<{link_id:string;qualification:'UNASSESSED'}>;
}
export declare function createEvidenceBridgeRepository(pool:{connect:Function},options:{readOriginal:(id:string,token:string)=>Promise<{record:PrivateOriginalRecord;bytes:Buffer}>;verificationKey?:string;keyVersion?:string}):EvidenceBridgeRepository;
export interface QualificationPurpose {
  namespace: string;
  code: string;
  version: string;
}
export interface QualificationReadOptions {
  consumer: "visual_stage" | "agent";
  purpose: QualificationPurpose;
  scope: Record<string, unknown>;
}
export interface ReadModelRepository {
  getRuntimeEligible(kind: string, id: string, options: QualificationReadOptions): Promise<Record<string, unknown> | null>;
  listRuntimeEligible(kind: string, options: QualificationReadOptions): Promise<Array<Record<string, unknown>>>;
}
export declare function assertQualificationContext(options: unknown): QualificationReadOptions;
export declare function createReadModelRepository(db: { query: (sql: string, params: unknown[]) => Promise<{ rows: Array<Record<string, unknown>> }> }): ReadModelRepository;
/** A verified D01 source binding; returns false for mismatch, throws on denied DB access. */
export declare function createPrivateOriginalSourceVerifier(pool:{connect:Function}):(
  binding:{originalId:string;sourceVersionId:string;rawItemId:string;rawSha256:string},
  token:string
)=>Promise<boolean>;

/** Persistence of unverified envelopes and HOLD observations, never execution permission. */
export interface StudioDelegationInput {
 projectId:string;rootTaskRef:string;rootTaskSnapshot:Record<string,unknown>;subtaskRef:string;
 seriesId:string;revisionNo:number;executor:string;provider:string;engineVersion:string;
 inputManifest:Record<string,unknown>;allowedActions:string[];transferRightsDecision:Record<string,unknown>;
 policyVersion:string;expiresAt:string;budgetLimit:string;currency:string;idempotencyKey:string;outputSchema:string;
}
export interface StudioDelegationRecord {
 delegation_id:string;project_id:string;root_task_ref:string;root_task_id:string|null;requester:string;
 request_hash:string;budget_limit:string;[key:string]:unknown;
}
export interface StudioHeldReceiptInput {
 delegationId:string;attemptNo:number;requestHash:string;resultManifest:Record<string,unknown>;candidateRefs:unknown[];
 acceptanceState?:'HOLD';actualProvider:string;actualEngineVersion:string;
 startedAt:string;finishedAt:string;cost:string|null;currency:string|null;costConfidence:'UNKNOWN'|'ESTIMATED';errorCode:string;
}
export interface StudioExecutionReceiptRecord {
 receipt_id:string;delegation_id:string;attempt_no:number;request_hash:string;result_hash:string|null;
 acceptance_state:'ACCEPT_AS_CANDIDATE'|'QUARANTINE'|'REJECT'|'REQUEST_D_STAGE'|'WAITING_GATE'|'HOLD';
 cost:string|null;cost_confidence:'UNKNOWN'|'ESTIMATED'|'ACTUAL';[key:string]:unknown;
}
export interface StudioHeldReceiptRecord extends StudioExecutionReceiptRecord {
 result_hash:string;acceptance_state:'HOLD';cost_confidence:'UNKNOWN'|'ESTIMATED';
}
export declare function createStudioDelegationRepository(pool:{connect:Function}):{
 saveDelegation(input:StudioDelegationInput,token:string):Promise<StudioDelegationRecord>;
 appendHeldReceipt(input:StudioHeldReceiptInput,token:string):Promise<StudioHeldReceiptRecord>;
 getDelegationForPlan(projectId:string,rootTaskRef:string,idempotencyKey:string,token:string):Promise<StudioDelegationRecord|null>;
 listDelegations(projectId:string,token:string):Promise<StudioDelegationRecord[]>;
 getDelegation(delegationId:string,token:string):Promise<StudioDelegationRecord|null>;
 listReceipts(delegationId:string,token:string):Promise<StudioExecutionReceiptRecord[]>;
};

/** Byte-attested private L1 candidate write, never a Gate decision. */
export declare function createPrivateTextReadingRepository(pool:{connect:Function},options:{verificationKey:string;keyVersion:string}):{
 save(input:{runId:string;originalId:string;extent:PrivateTextExtent;quote:string;
   record:PrivateOriginalRecord;bytes:Buffer},token:string):Promise<{
     read_run_id:string;read_unit_id:string;artifact_revision:string;request_digest:string;qualification:'UNASSESSED'}>;
};

/** Owner-scoped immutable receipt inspection. Never grants execution/knowledge use. */
export declare function assessStudioReceiptCandidates(input:{
 delegation:StudioDelegationRecord;receipt:StudioExecutionReceiptRecord;
 verifyCurrent?:(request:Record<string,unknown>)=>Promise<unknown>;timeoutMs?:number;
}):Promise<{schema:string;receipt_id:string;state:'HOLD';execution_authorized:false;
 knowledge_use_authorized:false;cost:string|null;cost_confidence:string;
 items:{index:number;state:'hold';checks:Record<string,string>}[]}>;

export {createStudioExecutionRepository} from './studio-execution-repository.mjs';
export type {StudioExecutionState,StudioExecutionRepository} from './studio-execution-repository.mjs';
export {createStudioCandidateReceiver} from './studio-receive-candidate.mjs';

/** Read-only exact WorkRevision/current independent G5 binding. */
export declare function workContentDigest(content: Record<string, unknown>): string;
export declare function createWorkQualificationReader(db: {query: Function}): {
 check(workId: string,revisionId: string,context: {consumer: string;purpose: {namespace:string;code:string;version:string};scope: Record<string,unknown>},content: Record<string,unknown>): Promise<boolean>;
};
