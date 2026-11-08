import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../apps/web/lib/read-model-bridge', () => ({ readProductionRelationSummary: vi.fn() }));
vi.mock('../../apps/web/lib/mohen-agent/research', () => ({ runResearch: vi.fn() }));

import {
  authorizeProviderDispatch,
  authorizeStudioDispatchGrant,
  currentPriceTable,
  dispatchAuthorizedCall,
  dispatchWithGrant,
  estimateCostFromUsageUsd,
  isUsableDispatchGrant,
  isUsableDispatchHandle,
  worstCaseCostUsd,
  type DispatcherDeps,
} from '../../apps/web/lib/studio/provider-dispatcher';
import { directorExternalProcessingBlocker } from '../../apps/web/lib/studio-creation';

const DELEGATION_ID = '11111111-2222-4333-8444-555555555555';
const PROJECT_ID = 'aaaaaaaa-2222-4333-8444-555555555555';
const OTHER_PROJECT_ID = 'bbbbbbbb-2222-4333-8444-555555555555';
const SOURCE_OK = 'b0a11000-0000-4000-8000-000000000004';
const SOURCE_DENIED = 'b0a11000-0000-4000-8000-0000000000ff';
const CALL = { system: '你是墨痕的 H1 方法。', user: '真实材料：松江府田赋。', temperature: 0.3, maxTokens: 64 };

function makeDelegation(overrides: Record<string, unknown> = {}) {
  return {
    delegation_id: DELEGATION_ID,
    project_id: PROJECT_ID,
    request_hash: 'a'.repeat(64),
    expires_at: new Date(Date.now() + 600_000).toISOString(),
    allowed_actions: ['llm_director_h1'],
    transfer_rights_decision: { external_processing: 'GRANTED' },
    currency: 'USD',
    budget_limit: '0.020000',
    ...overrides,
  };
}

function makeDeps(overrides: Partial<DispatcherDeps> = {}, delegationOverrides: Record<string, unknown> = {}) {
  const receipts: unknown[] = [];
  const delegation = makeDelegation(delegationOverrides);
  const deps: DispatcherDeps = {
    delegations: {
      getDelegation: vi.fn(async () => delegation),
      listReceipts: vi.fn(async () => receipts.slice() as never[]),
      appendVerifiedReceipt: vi.fn(async (input: unknown) => {
        const v = input as Record<string, unknown>;
        const record = {
          receipt_id: 'r-' + receipts.length, delegation_id: DELEGATION_ID,
          attempt_no: v.attemptNo, request_hash: v.requestHash,
          acceptance_state: 'ACCEPT_AS_CANDIDATE', cost: v.cost, cost_confidence: 'ESTIMATED',
          result_manifest: v.resultManifest,
        };
        receipts.push(record);
        return record as never;
      }),
      appendHeldReceipt: vi.fn(async (input: unknown) => {
        const v = input as Record<string, unknown>;
        const record = {
          receipt_id: 'h-' + receipts.length, delegation_id: DELEGATION_ID,
          attempt_no: v.attemptNo, acceptance_state: 'HOLD', cost: null,
          cost_confidence: 'UNKNOWN', error_code: v.errorCode, result_manifest: v.resultManifest,
        };
        receipts.push(record);
        return record as never;
      }),
    },
    readSourceRights: vi.fn(async (ids: string[]) => ids.map((id) => ({
      source_id: id,
      rights: id === SOURCE_OK
        ? { basis: 'NAJ_secondary_use_policy', status: 'public_domain_secondary_use' }
        : {},
    }))),
    fetchImpl: vi.fn(async () => new Response(JSON.stringify({
      choices: [{ message: { content: '收到。' } }],
      usage: { prompt_tokens: 30, completion_tokens: 4, prompt_cache_hit_tokens: 0, prompt_cache_miss_tokens: 30 },
    }), { status: 200 })),
    apiKey: 'synthetic-key-is-not-consent',
    ...overrides,
  };
  return { deps, receipts, delegation };
}

const AUTH_INPUT = {
  delegationId: DELEGATION_ID, action: 'llm_director_h1', model: 'deepseek-flash',
  call: CALL, sourceIds: [SOURCE_OK], sessionToken: 'session-token',
};

beforeEach(() => { vi.clearAllMocks(); });

describe('provider-pricing', () => {
  it('prices known models and treats unknown models as unpriced (fail closed)', () => {
    expect(currentPriceTable().priceRef).toBe('deepseek/2026-11-07');
    expect(worstCaseCostUsd('deepseek-flash', 1_000_000, 1_000_000)).toBeCloseTo(1.5, 9);
    expect(worstCaseCostUsd('no-such-model', 1, 1)).toBeNull();
    expect(estimateCostFromUsageUsd('deepseek-flash', {
      prompt_tokens: 1_000_000, completion_tokens: 0,
      prompt_cache_hit_tokens: 1_000_000, prompt_cache_miss_tokens: 0,
    })).toBeCloseTo(0.006, 9);
    // cache 字段缺失 → 全部按 miss（保守上界）
    expect(estimateCostFromUsageUsd('deepseek-flash', { prompt_tokens: 1_000_000, completion_tokens: 0 }))
      .toBeCloseTo(0.30, 9);
    expect(estimateCostFromUsageUsd('deepseek-flash', { prompt_tokens: 'x' })).toBeNull();
  });
});

describe('authorizeProviderDispatch', () => {
  it('authorizes a fully-granted delegation with rights and budget, issues a one-time handle', async () => {
    const { deps } = makeDeps();
    const handle = await authorizeProviderDispatch(deps, AUTH_INPUT);
    expect(isUsableDispatchHandle(handle)).toBe(true);
    expect(handle.replay).toBe(false);
    expect(deps.fetchImpl).not.toHaveBeenCalled();
  });

  it('denies sources without explicit external-processing rights before any fetch', async () => {
    const { deps } = makeDeps();
    await expect(authorizeProviderDispatch(deps, { ...AUTH_INPUT, sourceIds: [SOURCE_DENIED] }))
      .rejects.toMatchObject({ code: 'TRANSFER_DENIED' });
    await expect(authorizeProviderDispatch(deps, { ...AUTH_INPUT, sourceIds: [SOURCE_OK, SOURCE_DENIED] }))
      .rejects.toMatchObject({ code: 'TRANSFER_DENIED' });
    expect(deps.fetchImpl).not.toHaveBeenCalled();
  });

  it('holds when the budget cannot cover the worst-case estimate', async () => {
    const { deps } = makeDeps({}, { budget_limit: '0' });
    await expect(authorizeProviderDispatch(deps, AUTH_INPUT))
      .rejects.toMatchObject({ code: 'HOLD_BUDGET' });
    expect(deps.fetchImpl).not.toHaveBeenCalled();
  });

  it('uses UTF-8 bytes rather than character count as a conservative input-token bound', async () => {
    const { deps } = makeDeps({}, { budget_limit: '0.000500' });
    const multibyteCall = { ...CALL, system: '汉'.repeat(500), user: '字'.repeat(500) };
    await expect(authorizeProviderDispatch(deps, { ...AUTH_INPUT, call: multibyteCall }))
      .rejects.toMatchObject({ code: 'HOLD_BUDGET' });
    expect(deps.fetchImpl).not.toHaveBeenCalled();
  });

  it('counts every known billable receipt state, not only ACCEPT_AS_CANDIDATE', async () => {
    const { deps, receipts } = makeDeps({}, { budget_limit: '0.000500' });
    receipts.push({ acceptance_state: 'QUARANTINE', cost: '0.000490', cost_confidence: 'ESTIMATED' });
    await expect(authorizeProviderDispatch(deps, AUTH_INPUT))
      .rejects.toMatchObject({ code: 'HOLD_BUDGET' });
    expect(deps.fetchImpl).not.toHaveBeenCalled();
  });

  it('rejects expired delegations, wrong actions, non-granted transfer and unpriced models', async () => {
    const expired = makeDeps({}, { expires_at: new Date(Date.now() - 1000).toISOString() });
    await expect(authorizeProviderDispatch(expired.deps, AUTH_INPUT))
      .rejects.toMatchObject({ code: 'DISPATCH_DELEGATION_EXPIRED' });
    const wrongAction = makeDeps({}, { allowed_actions: ['prepare_candidate'] });
    await expect(authorizeProviderDispatch(wrongAction.deps, AUTH_INPUT))
      .rejects.toMatchObject({ code: 'DISPATCH_ACTION_NOT_ALLOWED' });
    const denied = makeDeps({}, { transfer_rights_decision: { external_processing: 'DENIED' } });
    await expect(authorizeProviderDispatch(denied.deps, AUTH_INPUT))
      .rejects.toMatchObject({ code: 'TRANSFER_DENIED' });
    const { deps } = makeDeps();
    await expect(authorizeProviderDispatch(deps, { ...AUTH_INPUT, model: 'no-such-model' }))
      .rejects.toMatchObject({ code: 'DISPATCH_MODEL_UNPRICED' });
    expect(deps.fetchImpl).not.toHaveBeenCalled();
  });
});

describe('dispatchAuthorizedCall', () => {
  it('dispatches one real call and persists an ESTIMATED receipt with usage and hashes', async () => {
    const { deps, receipts } = makeDeps();
    const handle = await authorizeProviderDispatch(deps, AUTH_INPUT);
    const result = await dispatchAuthorizedCall(deps, handle, CALL);
    expect(result.replay).toBe(false);
    expect(result.text).toBe('收到。');
    expect(deps.fetchImpl).toHaveBeenCalledTimes(1);
    const receipt = receipts[0] as Record<string, unknown>;
    expect(receipt.acceptance_state).toBe('ACCEPT_AS_CANDIDATE');
    expect(receipt.cost_confidence).toBe('ESTIMATED');
    expect(Number(receipt.cost)).toBeGreaterThan(0);
    const manifest = receipt.result_manifest as Record<string, any>;
    expect(manifest.usage.prompt_tokens).toBe(30);
    expect(manifest.price_ref).toBe('deepseek/2026-11-07');
    expect(manifest.rate_window).toBe('peak');
    expect(manifest.input_hash).toMatch(/^[a-f0-9]{64}$/);
    expect(manifest.output_hash).toMatch(/^[a-f0-9]{64}$/);
    // 句柄已消费：不能二次执行
    expect(isUsableDispatchHandle(handle)).toBe(false);
    await expect(dispatchAuthorizedCall(deps, handle, CALL))
      .rejects.toMatchObject({ code: 'DISPATCH_HANDLE_INVALID' });
  });

  it('replays an identical input without a second fetch or a second charge', async () => {
    const { deps, receipts } = makeDeps();
    const first = await authorizeProviderDispatch(deps, AUTH_INPUT);
    await dispatchAuthorizedCall(deps, first, CALL);
    expect(deps.fetchImpl).toHaveBeenCalledTimes(1);
    const second = await authorizeProviderDispatch(deps, AUTH_INPUT);
    expect(second.replay).toBe(true);
    const replayed = await dispatchAuthorizedCall(deps, second, CALL);
    expect(replayed.replay).toBe(true);
    expect(replayed.text).toBe('收到。');
    expect(deps.fetchImpl).toHaveBeenCalledTimes(1);
    expect(receipts.length).toBe(1);
  });

  it('writes a HOLD receipt and never retries on timeout', async () => {
    const timeoutFetch = vi.fn((_url: unknown, init: RequestInit) => new Promise<Response>((_res, reject) => {
      init.signal?.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')));
    }));
    const { deps, receipts } = makeDeps();
    (deps as any).fetchImpl = timeoutFetch;
    (deps as any).timeoutMs = 10;
    const handle = await authorizeProviderDispatch(deps, AUTH_INPUT);
    await expect(dispatchAuthorizedCall(deps, handle, CALL))
      .rejects.toMatchObject({ code: 'DISPATCH_UNCERTAIN' });
    expect(timeoutFetch).toHaveBeenCalledTimes(1);
    expect(receipts.length).toBe(1);
    const held = receipts[0] as Record<string, unknown>;
    expect(held.acceptance_state).toBe('HOLD');
    expect(held.cost_confidence).toBe('UNKNOWN');
    expect(held.error_code).toBe('PROVIDER_TIMEOUT');
    await expect(authorizeProviderDispatch(deps, AUTH_INPUT))
      .rejects.toMatchObject({ code: 'DISPATCH_RECONCILIATION_REQUIRED' });
  });

  it('keeps the timeout active until the response body has been fully read', async () => {
    const bodyTimeout = vi.fn(async (_url: unknown, init: RequestInit) => {
      const body = new ReadableStream<Uint8Array>({
        start(controller) {
          init.signal?.addEventListener('abort', () => controller.error(new DOMException('Aborted', 'AbortError')));
        },
      });
      return new Response(body, { status: 200, headers: { 'content-type': 'application/json' } });
    });
    const { deps, receipts } = makeDeps({ fetchImpl: bodyTimeout as never });
    (deps as any).timeoutMs = 10;
    const handle = await authorizeProviderDispatch(deps, AUTH_INPUT);
    await expect(dispatchAuthorizedCall(deps, handle, CALL))
      .rejects.toMatchObject({ code: 'DISPATCH_UNCERTAIN' });
    expect(bodyTimeout).toHaveBeenCalledTimes(1);
    expect((receipts[0] as Record<string, unknown>).error_code).toBe('PROVIDER_TIMEOUT');
  });

  it('writes a HOLD receipt on provider HTTP failure and never retries', async () => {
    const failing = vi.fn(async () => new Response('quota', { status: 429 }));
    const { deps, receipts } = makeDeps({ fetchImpl: failing as never });
    const handle = await authorizeProviderDispatch(deps, AUTH_INPUT);
    await expect(dispatchAuthorizedCall(deps, handle, CALL))
      .rejects.toMatchObject({ code: 'DISPATCH_UNCERTAIN' });
    expect(failing).toHaveBeenCalledTimes(1);
    expect((receipts[0] as Record<string, unknown>).error_code).toBe('PROVIDER_HTTP_429');
  });

  it('refuses forged or consumed handles', async () => {
    const { deps } = makeDeps();
    await expect(dispatchAuthorizedCall(deps, { handleId: 'forged', replay: false }, CALL))
      .rejects.toMatchObject({ code: 'DISPATCH_HANDLE_INVALID' });
    expect(deps.fetchImpl).not.toHaveBeenCalled();
  });
});

describe('studio-creation blocker wiring', () => {
  it('stays fail-closed without a handle and opens only for a real authorized handle', async () => {
    expect(directorExternalProcessingBlocker()).toBe('external_processing_not_authorized');
    expect(directorExternalProcessingBlocker(undefined)).toBe('external_processing_not_authorized');
    expect(directorExternalProcessingBlocker({ handleId: 'forged', replay: false }))
      .toBe('external_processing_not_authorized');
    const { deps } = makeDeps();
    const handle = await authorizeProviderDispatch(deps, AUTH_INPUT);
    expect(directorExternalProcessingBlocker(handle)).toBeNull();
  });
});

const GRANT_INPUT = {
  delegationId: DELEGATION_ID, projectId: PROJECT_ID, actions: ['llm_director_h1', 'llm_director_h2'],
  model: 'deepseek-flash', sourceIds: [SOURCE_OK], sessionToken: 'session-token', maxCalls: 2,
};

describe('authorizeStudioDispatchGrant / dispatchWithGrant（M5 批次 G）', () => {
  it('issues a usable grant for a fully-authorized delegation and blocker accepts it', async () => {
    const { deps } = makeDeps({}, { budget_limit: '5.000000', allowed_actions: ['llm_director_h1', 'llm_director_h2'] });
    const grant = await authorizeStudioDispatchGrant(deps, GRANT_INPUT);
    expect(isUsableDispatchGrant(grant)).toBe(true);
    expect(directorExternalProcessingBlocker(grant)).toBeNull();
    expect(deps.fetchImpl).not.toHaveBeenCalled();
  });

  it('rejects a delegation belonging to another project even when the Owner can read both projects', async () => {
    const { deps } = makeDeps({}, {
      project_id: OTHER_PROJECT_ID,
      budget_limit: '5.000000',
      allowed_actions: ['llm_director_h1', 'llm_director_h2'],
    });
    await expect(authorizeStudioDispatchGrant(deps, GRANT_INPUT))
      .rejects.toMatchObject({ code: 'DISPATCH_PROJECT_MISMATCH' });
    expect(deps.fetchImpl).not.toHaveBeenCalled();
  });

  it('rejects unknown actions, actions outside the delegation, denied rights and short budget', async () => {
    const wide = { budget_limit: '5.000000', allowed_actions: ['llm_director_h1', 'llm_director_h2'] };
    const { deps } = makeDeps({}, wide);
    await expect(authorizeStudioDispatchGrant(deps, { ...GRANT_INPUT, actions: ['drop_table'] }))
      .rejects.toMatchObject({ code: 'DISPATCH_ACTION_NOT_ALLOWED' });
    const narrow = makeDeps({}, { budget_limit: '5.000000', allowed_actions: ['llm_director_h1'] });
    await expect(authorizeStudioDispatchGrant(narrow.deps, GRANT_INPUT))
      .rejects.toMatchObject({ code: 'DISPATCH_ACTION_NOT_ALLOWED' });
    const denied = makeDeps({}, wide);
    await expect(authorizeStudioDispatchGrant(denied.deps, { ...GRANT_INPUT, sourceIds: [SOURCE_DENIED] }))
      .rejects.toMatchObject({ code: 'TRANSFER_DENIED' });
    const broke = makeDeps({}, { ...wide, budget_limit: '0.010000' });
    await expect(authorizeStudioDispatchGrant(broke.deps, GRANT_INPUT))
      .rejects.toMatchObject({ code: 'HOLD_BUDGET' });
    expect(deps.fetchImpl).not.toHaveBeenCalled();
  });

  it('dispatches real calls through the grant, persists receipts and enforces maxCalls', async () => {
    const { deps, receipts } = makeDeps({}, { budget_limit: '5.000000', allowed_actions: ['llm_director_h1'] });
    const grant = await authorizeStudioDispatchGrant(deps, { ...GRANT_INPUT, actions: ['llm_director_h1'], maxCalls: 1 });
    const result = await dispatchWithGrant(deps, grant, 'llm_director_h1',
      { system: CALL.system, user: CALL.user, temperature: 0.3 });
    expect(result.text).toBe('收到。');
    expect(deps.fetchImpl).toHaveBeenCalledTimes(1);
    expect((receipts[0] as Record<string, unknown>).acceptance_state).toBe('ACCEPT_AS_CANDIDATE');
    expect(isUsableDispatchGrant(grant)).toBe(false);
    await expect(dispatchWithGrant(deps, grant, 'llm_director_h1',
      { system: CALL.system, user: CALL.user, temperature: 0.3 }))
      .rejects.toMatchObject({ code: 'DISPATCH_GRANT_INVALID' });
    expect(deps.fetchImpl).toHaveBeenCalledTimes(1);
  });

  it('rejects an action not covered by the grant and forged grants before any fetch', async () => {
    const { deps } = makeDeps({}, { budget_limit: '5.000000', allowed_actions: ['llm_director_h1', 'llm_work_panels'] });
    const grant = await authorizeStudioDispatchGrant(deps, { ...GRANT_INPUT, actions: ['llm_director_h1'], maxCalls: 1 });
    await expect(dispatchWithGrant(deps, grant, 'llm_work_panels',
      { system: 's', user: 'u', temperature: 0.3 }))
      .rejects.toMatchObject({ code: 'DISPATCH_ACTION_NOT_ALLOWED' });
    expect(isUsableDispatchGrant({ grantId: 'forged' })).toBe(false);
    expect(directorExternalProcessingBlocker({ grantId: 'forged' })).toBe('external_processing_not_authorized');
    expect(deps.fetchImpl).not.toHaveBeenCalled();
  });
});
