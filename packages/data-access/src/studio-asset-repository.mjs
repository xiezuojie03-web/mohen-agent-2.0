import { createHash, randomUUID } from 'node:crypto';
import { createAppTransaction } from './app-transaction.mjs';

const kinds = new Set(['research_brief','source_anchor','reading_note','evidence_note','spacetime_candidate',
  'relation_hypothesis','humanistic_insight','research_collection','director_plan','media_selection','work_revision','citation_snapshot','consented_feedback']);
const uuid = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
function requireId(value) { if (typeof value !== 'string' || !uuid.test(value)) throw new Error('STUDIO_ID_INVALID'); }
function canonical(value) {
  if (Array.isArray(value)) return '[' + value.map(canonical).join(',') + ']';
  if (value !== null && typeof value === 'object') return '{' + Object.keys(value).sort().map(k => JSON.stringify(k)+':'+canonical(value[k])).join(',') + '}';
  return JSON.stringify(value);
}
function jsonCopy(value, code) {
  try {
    const text = JSON.stringify(value);
    if (!text || Buffer.byteLength(text,'utf8') > 1_000_000) throw new Error();
    return JSON.parse(text);
  } catch { throw new Error(code); }
}
const revisionSelect = `select r.*,h.project_id,h.asset_kind from studio.asset_revisions r
  join studio.asset_heads h on h.asset_id=r.asset_id`;

async function savedRevision(client, revisionId) {
  const {rows} = await client.query(revisionSelect+' where r.revision_id=$1',[revisionId]);
  if (rows.length !== 1) throw new Error('STUDIO_REVISION_NOT_PERSISTED');
  return rows[0];
}

/** Private persistence only. Saved candidates remain WORKING/RESTRICTED/UNASSESSED.
 * Formal references, reuse eligibility and publication require their separate
 * authorized services; storing a payload or reading one's draft grants none.
 */
export function createStudioAssetRepository(pool) {
  const transaction = createAppTransaction(pool, 'STUDIO_IDENTITY_REQUIRED');
  return {
    listProjects(sessionToken) {
      return transaction(sessionToken, async client => (await client.query(`select project_id,project_title,research_scope,lifecycle_status,
        created_at::text as created_at from studio.projects order by created_at desc,project_id limit 100`)).rows);
    },
    async listPlanAssets(projectId, sessionToken, cursor=null) {
      requireId(projectId);if(cursor!==null)requireId(cursor);
      return transaction(sessionToken,async client=>(await client.query(revisionSelect+`
        where h.project_id=$1 and h.current_revision_id=r.revision_id
          and r.payload->>'schema'='mohen.studio-research-plan.v1'
          and ($2::uuid is null or (h.created_at,h.asset_id)<(
            select c.created_at,c.asset_id from studio.asset_heads c
            where c.project_id=$1 and c.asset_id=$2::uuid))
        order by h.created_at desc,h.asset_id desc limit 21`,[projectId,cursor])).rows);
    },
    listAssets(projectId, sessionToken) {
      requireId(projectId);
      return transaction(sessionToken, async client => (await client.query(revisionSelect+
        ' where h.project_id=$1 and h.current_revision_id=r.revision_id order by r.created_at desc,r.revision_id limit 100',[projectId])).rows);
    },
    /** Full immutable revision lineage for one owner's exact asset.
     * This is private history, never G5 publication or reuse authorization.
     */
    listAssetRevisions(projectId, assetId, sessionToken) {
      requireId(projectId); requireId(assetId);
      return transaction(sessionToken, async client => (await client.query(
        revisionSelect + ` where h.project_id=$1 and h.asset_id=$2
          order by r.revision_no desc,r.revision_id limit 100`,
        [projectId,assetId]
      )).rows);
    },
    /** Private trace of actual recorded uses. An empty result cannot be
     * interpreted as permission to reuse the asset or as a missing Gate.
     */
    listRevisionUseEvents(projectId, revisionId, sessionToken) {
      requireId(projectId); requireId(revisionId);
      return transaction(sessionToken, async client => (await client.query(
        `select e.use_event_id,e.asset_revision_id,e.consumer,e.purpose,
           e.requested_action,e.rights_decision_ref,e.created_at::text as created_at
         from studio.use_events e
         join studio.asset_revisions r on r.revision_id=e.asset_revision_id
         join studio.asset_heads h on h.asset_id=r.asset_id
         where e.project_id=$1 and h.project_id=$1
           and e.asset_revision_id=$2
         order by e.created_at desc,e.use_event_id limit 100`,
        [projectId,revisionId]
      )).rows);
    },
    async createProject({projectId,title,scope={}}, sessionToken) {
      requireId(projectId);
      if (typeof title !== 'string' || !title.trim() || title.trim().length > 200) throw new Error('STUDIO_PROJECT_TITLE_INVALID');
      const cleanScope = jsonCopy(scope,'STUDIO_SCOPE_INVALID');
      if (cleanScope === null || Array.isArray(cleanScope) || typeof cleanScope !== 'object') throw new Error('STUDIO_SCOPE_INVALID');
      return transaction(sessionToken, async (client, actor) => {
        await client.query(`insert into studio.projects(project_id,owner_user_id,project_title,research_scope)
          values($1,$2,$3,$4::jsonb) on conflict(project_id) do nothing`,[projectId,actor,title.trim(),JSON.stringify(cleanScope)]);
        const {rows} = await client.query('select project_id,project_title,research_scope from studio.projects where project_id=$1',[projectId]);
        if (rows.length !== 1 || rows[0].project_title !== title.trim() || canonical(rows[0].research_scope) !== canonical(cleanScope)) {
          throw new Error('STUDIO_PROJECT_IDEMPOTENCY_CONFLICT');
        }
        return rows[0];
      });
    },
    async saveRevision(input, sessionToken) {
      const {projectId,assetId,kind,expectedRevisionId=null,idempotencyKey,payload,sourceRefs=[],dependencyRefs=[]} = input;
      requireId(projectId); requireId(assetId); if (expectedRevisionId !== null) requireId(expectedRevisionId);
      if (!kinds.has(kind)) throw new Error('STUDIO_ASSET_KIND_INVALID');
      if (['director_plan','media_selection','work_revision'].includes(kind)) throw new Error('STUDIO_CANONICAL_BINDING_REQUIRED');
      if (input.originKind && input.originKind !== 'human') throw new Error('STUDIO_ORIGIN_BINDING_REQUIRED');
      if (typeof idempotencyKey !== 'string' || !idempotencyKey.trim() || idempotencyKey.length > 200) throw new Error('STUDIO_IDEMPOTENCY_KEY_INVALID');
      if (payload === undefined || payload === null) throw new Error('STUDIO_PAYLOAD_REQUIRED');
      const content = jsonCopy(payload,'STUDIO_PAYLOAD_INVALID');
      const sources = jsonCopy(sourceRefs,'STUDIO_REFERENCES_INVALID');
      const dependencies = jsonCopy(dependencyRefs,'STUDIO_REFERENCES_INVALID');
      if (!Array.isArray(sources) || !Array.isArray(dependencies)) throw new Error('STUDIO_REFERENCES_INVALID');
      return transaction(sessionToken, async (client, actor) => {
        const project = await client.query("select project_id from studio.projects where project_id=$1 and lifecycle_status='ACTIVE'",[projectId]);
        if (project.rows.length !== 1) throw new Error('STUDIO_PROJECT_NOT_FOUND');
        if (expectedRevisionId === null) {
          await client.query(`insert into studio.asset_heads(asset_id,project_id,asset_kind) values($1,$2,$3)
            on conflict(asset_id) do nothing`,[assetId,projectId,kind]);
        }
        const headResult = await client.query('select project_id,asset_kind,current_revision_id from studio.asset_heads where asset_id=$1 for update',[assetId]);
        const head = headResult.rows[0];
        if (!head || head.project_id !== projectId || head.asset_kind !== kind) throw new Error('STUDIO_ASSET_NOT_FOUND');
        const hash = createHash('sha256').update(canonical({projectId,assetId,kind,actor,expectedRevisionId,
          payload:content,sourceRefs:sources,dependencyRefs:dependencies,origin:'human',epistemicClass:'editorial',
          contentState:'WORKING',accessState:'RESTRICTED',freshnessState:'UNKNOWN_DEPENDENCY',validation:'UNASSESSED'})).digest('hex');
        const previous = await client.query('select revision_id,content_hash from studio.asset_revisions where asset_id=$1 and idempotency_key=$2',[assetId,idempotencyKey]);
        if (previous.rows.length) {
          if (previous.rows[0].content_hash !== hash) throw new Error('STUDIO_IDEMPOTENCY_CONFLICT');
          return savedRevision(client, previous.rows[0].revision_id);
        }
        if (head.current_revision_id !== expectedRevisionId) throw new Error('STUDIO_REVISION_CONFLICT');
        let revisionNo = 1;
        if (expectedRevisionId !== null) {
          const current = await client.query('select revision_no from studio.asset_revisions where asset_id=$1 and revision_id=$2',[assetId,expectedRevisionId]);
          if (current.rows.length !== 1) throw new Error('STUDIO_REVISION_CONFLICT');
          revisionNo = current.rows[0].revision_no + 1;
        }
        const revisionId = randomUUID();
        await client.query(`insert into studio.asset_revisions(revision_id,asset_id,revision_no,supersedes_revision_id,actor_id,workspace_id,
          origin_kind,epistemic_class,payload,content_hash,source_refs,dependency_refs,idempotency_key,correlation_id)
          values($1,$2,$3,$4,$5,'studio','human','editorial',$6::jsonb,$7,$8::jsonb,$9::jsonb,$10,$11)`,
          [revisionId,assetId,revisionNo,expectedRevisionId,actor,JSON.stringify(content),hash,JSON.stringify(sources),JSON.stringify(dependencies),idempotencyKey,randomUUID()]);
        const changed = await client.query(`update studio.asset_heads set current_revision_id=$1
          where asset_id=$2 and current_revision_id is not distinct from $3::uuid returning asset_id`,[revisionId,assetId,expectedRevisionId]);
        if (changed.rows.length !== 1) throw new Error('STUDIO_REVISION_CONFLICT');
        return savedRevision(client, revisionId);
      });
    },
    getRevision(revisionId, sessionToken) {
      requireId(revisionId);
      return transaction(sessionToken, async client => (await client.query(revisionSelect+' where r.revision_id=$1',[revisionId])).rows[0] ?? null);
    },
  };
}
