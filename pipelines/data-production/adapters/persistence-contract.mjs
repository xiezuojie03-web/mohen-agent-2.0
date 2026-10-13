export const ALLOWED_SCHEMAS = Object.freeze({
  D01:["source","control"], D02:["evidence","control"], D03:["world","control"],
  D04:["meaning","control"], D05:["read_model","control"]
});
export function assertPersistenceScope(stage, qualifiedTable) {
  const schema=String(qualifiedTable).split('.')[0];
  if (!ALLOWED_SCHEMAS[stage]?.includes(schema)) throw new Error(`PERSISTENCE_SCOPE_VIOLATION:${stage}:${qualifiedTable}`);
  return true;
}
