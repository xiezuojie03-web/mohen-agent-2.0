import { NextResponse } from 'next/server';
import { createStudioAssetRepository, getNodePgPool } from '@mohen/data-access';

export function studioAssetStore() {
  return createStudioAssetRepository(getNodePgPool());
}

export async function studioObjectBody(request: Request): Promise<Record<string, unknown> | NextResponse> {
  try {
    const body: unknown = await request.json();
    if (body === null || typeof body !== 'object' || Array.isArray(body)) throw new Error();
    return body as Record<string, unknown>;
  } catch { return NextResponse.json({ok:false,reason:'bad_request'},{status:400}); }
}

export function studioAssetFailure(error: unknown) {
  const reason = error instanceof Error ? error.message : '';
  if (reason === 'STUDIO_IDENTITY_REQUIRED') return NextResponse.json({ok:false,reason:'login_required'},{status:401});
  const notFound = new Set(['STUDIO_PROJECT_NOT_FOUND','STUDIO_ASSET_NOT_FOUND']);
  const conflict = new Set(['STUDIO_PROJECT_IDEMPOTENCY_CONFLICT','STUDIO_IDEMPOTENCY_CONFLICT','STUDIO_REVISION_CONFLICT',
    'STUDIO_CANONICAL_BINDING_REQUIRED','STUDIO_ORIGIN_BINDING_REQUIRED','STUDIO_FEEDBACK_WITHDRAWN']);
  const invalid = new Set(['STUDIO_ID_INVALID','STUDIO_PROJECT_TITLE_INVALID','STUDIO_SCOPE_INVALID','STUDIO_ASSET_KIND_INVALID',
    'STUDIO_IDEMPOTENCY_KEY_INVALID','STUDIO_FEEDBACK_CONSENT_REQUIRED','STUDIO_PAYLOAD_REQUIRED','STUDIO_PAYLOAD_INVALID','STUDIO_REFERENCES_INVALID']);
  if (notFound.has(reason)) return NextResponse.json({ok:false,reason},{status:404});
  if (conflict.has(reason)) return NextResponse.json({ok:false,reason},{status:409});
  if (invalid.has(reason)) return NextResponse.json({ok:false,reason},{status:400});
  return NextResponse.json({ok:false,reason:'studio_storage_unavailable'},{status:503});
}
