import { createHash } from 'node:crypto';

// Pure, bounded planning only. No Runner, subprocess, network, Gate or ledger access.
// All currentContext and checkpoint arguments MUST originate from trusted server
// state. A provider/client's asserted permissions, bindings, costs or completion
// proofs are not authority. Hashes detect drift; they are not signatures/grants.
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const HASH = /^[0-9a-f]{64}$/;
const ID = /^[A-Za-z0-9][A-Za-z0-9_.:-]{0,127}$/;
const CATEGORIES = new Set(['reuse_asset', 'existing_production', 'receive_candidate', 'external_delegate']);
const FINGERPRINTS = ['input', 'policy', 'registry', 'dependencies', 'rights', 'lease'];
const fail = code => { throw new Error(code); };
const record = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const own = (value, key) => Object.hasOwn(value, key);
const exact = (value, keys) => record(value) && Object.keys(value).every(key => keys.includes(key));
const text = value => typeof value === 'string' && value.length > 0 && value.length <= 1024;

function clone(value, depth = 0, seen = new Set(), meter = { size: 0 }) {
  if (depth > 48 || ++meter.size > 32768) fail('STUDIO_PLAN_JSON_INVALID');
  if (value === null || typeof value === 'boolean' || typeof value === 'string') return value;
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value !== 'object' || seen.has(value)) fail('STUDIO_PLAN_JSON_INVALID');
  const array = Array.isArray(value);
  if (!array && Object.getPrototypeOf(value) !== Object.prototype && Object.getPrototypeOf(value) !== null) fail('STUDIO_PLAN_JSON_INVALID');
  if (array && Object.getPrototypeOf(value) !== Array.prototype) fail('STUDIO_PLAN_JSON_INVALID');
  seen.add(value);
  const descriptors = Object.getOwnPropertyDescriptors(value);
  if (Reflect.ownKeys(descriptors).some(key => typeof key !== 'string')) fail('STUDIO_PLAN_JSON_INVALID');
  const result = array ? [] : {};
  for (const key of Object.keys(descriptors)) {
    if (array && key === 'length') continue;
    const descriptor = descriptors[key];
    if (['__proto__', 'prototype', 'constructor'].includes(key) || !own(descriptor, 'value') || !descriptor.enumerable) fail('STUDIO_PLAN_JSON_INVALID');
    if (array && !/^(0|[1-9][0-9]*)$/.test(key)) fail('STUDIO_PLAN_JSON_INVALID');
    result[key] = clone(descriptor.value, depth + 1, seen, meter);
  }
  if (array && result.length !== value.length) fail('STUDIO_PLAN_JSON_INVALID');
  if (array && Object.keys(result).length !== result.length) fail('STUDIO_PLAN_JSON_INVALID');
  seen.delete(value);
  return result;
}
function canonical(value) {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (record(value)) return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${canonical(value[key])}`).join(',')}}`;
  return JSON.stringify(value);
}
const digest = value => createHash('sha256').update(canonical(value)).digest('hex');
function freeze(value) {
  if (value && typeof value === 'object') { Object.values(value).forEach(freeze); Object.freeze(value); }
  return value;
}
const ref = value => exact(value, ['ref', 'revision']) && text(value.ref) && text(value.revision) && !/^(latest|current|head|\*)$/i.test(value.revision);
function decimal(value) {
  if (typeof value !== 'string' || !/^(0|[1-9][0-9]{0,23})(\.[0-9]{1,12})?$/.test(value)) return null;
  const [whole, fraction = ''] = value.split('.');
  return BigInt(whole) * 10n ** 12n + BigInt(fraction.padEnd(12, '0'));
}
const currency = value => typeof value === 'string' && /^[A-Z]{3}$/.test(value);

/** Creates an immutable request DAG, not an execution authorization.
 * Node input_hash identifies the planned request/source manifest; actual Runner
 * inputs must be reauthorized at handoff. Output hashes are optional at planning.
 */
export function createStudioPlan(input) {
  const plan = clone(input);
  if (Buffer.byteLength(canonical(plan)) > 262144) fail('STUDIO_PLAN_JSON_INVALID');
  if (!exact(plan, ['schema_version', 'root_task_id', 'project_id', 'actor_id', 'policy_ref', 'registry_ref', 'source_refs', 'budget', 'nodes']) || plan.schema_version !== 1 || ![plan.root_task_id, plan.project_id, plan.actor_id].every(value => typeof value === 'string' && UUID.test(value))) fail('STUDIO_PLAN_INVALID');
  if (!ref(plan.policy_ref) || !ref(plan.registry_ref) || !Array.isArray(plan.source_refs) || plan.source_refs.length > 128 || !plan.source_refs.every(ref) || new Set(plan.source_refs.map(canonical)).size !== plan.source_refs.length) fail('STUDIO_PLAN_REFERENCE_INVALID');
  if (!exact(plan.budget, ['amount', 'currency']) || decimal(plan.budget.amount) === null || !currency(plan.budget.currency)) fail('STUDIO_PLAN_BUDGET_INVALID');
  if (!Array.isArray(plan.nodes) || plan.nodes.length < 1 || plan.nodes.length > 32) fail('STUDIO_PLAN_NODE_INVALID');
  const ids = new Set();
  for (const node of plan.nodes) {
    if (!exact(node, ['node_id', 'tool_id', 'category', 'dependencies', 'input_schema', 'output_schema', 'input_hash', 'output_hash']) || !ID.test(node.node_id ?? '') || !ID.test(node.tool_id ?? '') || !CATEGORIES.has(node.category) || ids.has(node.node_id) || !Array.isArray(node.dependencies) || node.dependencies.length > 31 || !record(node.input_schema) || !record(node.output_schema) || !HASH.test(node.input_hash ?? '') || (node.output_hash != null && !HASH.test(node.output_hash))) fail('STUDIO_PLAN_NODE_INVALID');
    ids.add(node.node_id);
  }
  const byId = new Map(plan.nodes.map(node => [node.node_id, node]));
  for (const node of plan.nodes) if (new Set(node.dependencies).size !== node.dependencies.length || node.dependencies.some(id => typeof id !== 'string' || !ids.has(id))) fail('STUDIO_PLAN_DEPENDENCY_INVALID');
  const visited = new Set(), visiting = new Set();
  function visit(id) {
    if (visiting.has(id)) fail('STUDIO_PLAN_CYCLE');
    if (visited.has(id)) return;
    visiting.add(id); byId.get(id).dependencies.forEach(visit); visiting.delete(id); visited.add(id);
  }
  plan.nodes.forEach(node => visit(node.node_id));
  return freeze({ ...plan, plan_hash: digest(plan) });
}
function verifyPlan(input) {
  const plan = clone(input), { plan_hash, ...body } = plan;
  const verified = createStudioPlan(body);
  if (plan_hash !== verified.plan_hash) fail('STUDIO_PLAN_HASH_INVALID');
  return verified;
}
/** Inspection preserves dependency order and contains no runnable function. */
export function inspectStudioPlan(input) {
  const plan = verifyPlan(input);
  return freeze({ schema_version: 1, plan_hash: plan.plan_hash, root_task_id: plan.root_task_id, project_id: plan.project_id, actor_id: plan.actor_id, node_count: plan.nodes.length, nodes: plan.nodes.map(node => ({ node_id: node.node_id, tool_id: node.tool_id, category: node.category, dependencies: [...node.dependencies] })) });
}
function contextSnapshot(input) {
  const ctx = clone(input);
  if (!record(ctx) || !Number.isSafeInteger(ctx.epoch) || ctx.epoch < 0 || !record(ctx.fingerprints) || !FINGERPRINTS.every(key => own(ctx.fingerprints, key) && HASH.test(ctx.fingerprints[key]))) fail('STUDIO_PLAN_CONTEXT_INVALID');
  return ctx;
}
function bindingHash(ctx) {
  return digest({ registry: ctx.registry ?? null, registered_tools: ctx.registered_tools ?? null, qualifications: ctx.qualifications ?? null, transfer_allowed: ctx.transfer_allowed ?? null });
}
function validateAttempts(plan, attempts) {
  if (!record(attempts)) fail('STUDIO_PLAN_CHECKPOINT_INVALID');
  const byId = new Map(plan.nodes.map(node => [node.node_id, node]));
  const receipts = new Set(), pending = new Set();
  for (const [id, attempt] of Object.entries(attempts)) {
    if (!byId.has(id) || !record(attempt)) fail('STUDIO_PLAN_CHECKPOINT_INVALID');
    if (attempt.status === 'completed') {
      if (!exact(attempt, ['status', 'receipt_ref', 'output_hash']) || !ref(attempt.receipt_ref) || !HASH.test(attempt.output_hash ?? '')) fail('STUDIO_PLAN_CHECKPOINT_INVALID');
      const receipt = canonical(attempt.receipt_ref);
      if (receipts.has(receipt)) fail('STUDIO_PLAN_CHECKPOINT_INVALID');
      receipts.add(receipt);
    } else if (['running', 'uncertain'].includes(attempt.status)) {
      if (!exact(attempt, ['status', 'attempt_ref']) || !text(attempt.attempt_ref) || pending.has(attempt.attempt_ref)) fail('STUDIO_PLAN_CHECKPOINT_INVALID');
      pending.add(attempt.attempt_ref);
    } else fail('STUDIO_PLAN_CHECKPOINT_INVALID');
  }
  for (const [id, attempt] of Object.entries(attempts)) if (attempt.status === 'completed' && byId.get(id).dependencies.some(dependency => attempts[dependency]?.status !== 'completed')) fail('STUDIO_PLAN_CHECKPOINT_INVALID');
}
/** Snapshots trusted persisted attempts and current server fingerprints. This
 * helper is not a substitute for durable CAS, current leases or receipt checks.
 */
export function createStudioPlanCheckpoint(input, currentContext, attempts = {}) {
  const plan = verifyPlan(input), ctx = contextSnapshot(currentContext), saved = clone(attempts);
  validateAttempts(plan, saved);
  const checkpoint = { schema_version: 1, plan_hash: plan.plan_hash, epoch: ctx.epoch, fingerprints: ctx.fingerprints, binding_hash: bindingHash(ctx), attempts: saved };
  return freeze({ ...checkpoint, checkpoint_hash: digest(checkpoint) });
}

/** Pure read-only admission classification. READY means a request can be offered
 * to the existing authorized Runner, never permission to execute or transfer.
 * Both context and checkpoint must be loaded/verified by the server; never pass
 * through a client/provider supplied binding map or self-reported completion.
 */
export function nextStudioPlanNodes(input, checkpoint, currentContext) {
  const plan = verifyPlan(input);
  const held = reason => freeze({ status: 'HOLD', reason, ready_nodes: [], nodes: plan.nodes.map(node => ({ node_id: node.node_id, status: 'HOLD', reason })) });
  let ctx;
  try { ctx = contextSnapshot(currentContext); } catch { return held('CONTEXT_UNAVAILABLE'); }
  if (ctx.revoked === true || ctx.root_task_id !== plan.root_task_id || ctx.project_id !== plan.project_id || ctx.actor_id !== plan.actor_id) return held('DELEGATION_REVOKED');
  if (ctx.revoked !== false) return held('CONTEXT_UNAVAILABLE');
  if (!checkpoint) return held('CHECKPOINT_REQUIRED');
  let saved;
  try {
    saved = clone(checkpoint);
    const { checkpoint_hash, ...body } = saved;
    if (!exact(body, ['schema_version', 'plan_hash', 'epoch', 'fingerprints', 'binding_hash', 'attempts']) || saved.schema_version !== 1 || checkpoint_hash !== digest(body) || saved.plan_hash !== plan.plan_hash || saved.epoch !== ctx.epoch || canonical(saved.fingerprints) !== canonical(ctx.fingerprints) || saved.binding_hash !== bindingHash(ctx)) return held('CHECKPOINT_STALE');
    validateAttempts(plan, saved.attempts);
  } catch { return held('CHECKPOINT_STALE'); }
  const now = Date.parse(ctx.now), expiry = Date.parse(ctx.lease_expires_at);
  if (!Number.isFinite(now) || !Number.isFinite(expiry) || expiry <= now) return held('LEASE_EXPIRED');
  if (Object.values(saved.attempts).some(attempt => attempt.status === 'running' || attempt.status === 'uncertain')) return held('RECONCILIATION_REQUIRED');
  const nodes = plan.nodes.map(node => ({ node_id: node.node_id, status: saved.attempts[node.node_id]?.status === 'completed' ? 'COMPLETED' : node.dependencies.every(id => saved.attempts[id]?.status === 'completed') ? 'READY' : 'BLOCKED' }));
  const ready = plan.nodes.filter(node => nodes.find(item => item.node_id === node.node_id).status === 'READY');
  if (nodes.every(node => node.status === 'COMPLETED')) return freeze({ status: 'COMPLETE', reason: null, ready_nodes: [], nodes });
  if (ctx.registry?.enabled !== true) return held('REGISTRY_DISABLED');
  let total = 0n;
  const available = decimal(ctx.budget?.remaining);
  if (available === null || ctx.budget.currency !== plan.budget.currency) return held('BUDGET_EXHAUSTED');
  for (const node of ready) {
    if (!own(ctx.registry.jobs ?? {}, node.tool_id) || ctx.registry.jobs[node.tool_id] !== true) return held('REGISTRY_DISABLED');
    const binding = own(ctx.registered_tools ?? {}, node.tool_id) ? ctx.registered_tools[node.tool_id] : null;
    if (!binding || binding.enabled !== true || binding.category !== node.category || binding.method_bound !== true) return held('METHOD_BINDING_UNAVAILABLE');
    if (node.category === 'external_delegate' && ctx.transfer_allowed !== true) return held('TRANSFER_DENIED');
    if (binding.qualification_required !== false && ctx.qualifications?.[node.tool_id] !== true) return held('WAITING_GATE');
    const price = decimal(binding.price?.amount);
    if (price === null || binding.price.currency !== plan.budget.currency) return held('BUDGET_EXHAUSTED');
    total += price;
  }
  if (total > available || total > decimal(plan.budget.amount)) return held('BUDGET_EXHAUSTED');
  return freeze({ status: 'READY', reason: null, ready_nodes: ready.map(node => node.node_id), nodes });
}
