export declare const PUBLISHED_WORKS_SQL: string;
export declare const STUDIO_REVISION_WATCHABLE_SQL: string;

/** Read-only compatibility for installations without the optional Studio publication tables. */
export declare const LEGACY_PUBLISHED_WORKS_SQL: string;
export declare function isAbsentStudioPublicationSchema(error: unknown): boolean;
