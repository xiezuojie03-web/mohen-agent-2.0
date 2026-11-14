/** Type boundary for the existing Owner-RLS registration reader.
 * Runtime implementation remains private-source-registration-repository.mjs.
 * This declaration does not grant any additional source-table permissions. */
export interface PrivateSourceRegistration {
  schema: "mohen.private-source-registration.v1";
  original_id: string;
  project_id: string;
  source_id: string;
  source_version_id: string;
  raw_item_id: string;
  asset_revision_id: string;
  sha256: string;
  artifact_revision: string;
  byte_size: number;
  content_type: string;
  storage_ref: string;
  rights: Record<string, unknown>;
}
export interface PrivateSourceRegistrationReader {
  lookup(originalId: string, ownerSessionToken: string): Promise<PrivateSourceRegistration>;
}
export function createPrivateSourceRegistrationRepository(pool: unknown): PrivateSourceRegistrationReader;
