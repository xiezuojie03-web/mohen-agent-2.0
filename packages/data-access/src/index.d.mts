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
