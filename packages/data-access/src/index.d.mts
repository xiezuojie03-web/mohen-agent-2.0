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
export interface ImportedMaterialRepository {
  list(sessionToken: string | null): Promise<ImportedMaterialView[]>;
  create(input: ImportedMaterialInput, sessionToken: string | null): Promise<{material_id: string; owner_user_id: string}>;
}
export declare function createImportedMaterialRepository(pool: {connect: Function}): ImportedMaterialRepository;
export declare function getNodePgPool(): {connect: Function};

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
  listAssets(projectId: string, token: string): Promise<StudioStoredRevision[]>;
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
