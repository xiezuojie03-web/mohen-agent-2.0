export type VerificationStatus =
  | "raw" | "extracted" | "candidate" | "evidence_linked"
  | "verified" | "rejected" | "pending" | "published";

export type Confidence = "low" | "medium" | "high";

export interface SourceRecord {
  sourceId: string;
  provider: string;
  title: string;
  sourceUri?: string;
  contentType: string;
  retrievedAt: string;
  checksum: string;
  rawPath: string;
  licenseCode?: string;
  metadata: Record<string, unknown>;
}

export interface Evidence {
  evidenceId: string;
  sourceId: string;
  evidenceType: "text" | "image" | "map" | "record" | "field_observation";
  locator?: string;
  quoteText?: string;
  region?: Record<string, unknown>;
  placeHint?: string;
  timeHint?: string;
  extractionMethod: "manual" | "api" | "parser" | "ocr" | "vision" | "llm";
  confidence: number;
  verificationStatus: VerificationStatus;
}

export interface Claim {
  claimId: string;
  subjectId: string;
  predicate: string;
  objectId?: string;
  objectValue?: unknown;
  certainty: number;
  status: VerificationStatus;
  evidenceIds: string[];
  reviewTier: "A" | "B" | "C";
}
