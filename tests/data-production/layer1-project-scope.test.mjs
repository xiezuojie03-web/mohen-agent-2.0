// MAB M5 ST-04: the authorized run's real project is the sole Gate scope.
// These tests exercise the production adapter's live input-shape rule, not a mock Gate.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { requireRunProjectId } from '../../pipelines/data-production/adapters/layer1-adapters.mjs';

const a = '123e4567-e89b-42d3-a456-426614174001';
const b = '123e4567-e89b-42d3-a456-426614174002';

test('D00 and later D inputs share the exact Creator run project, never a fixed sample', () => {
  for (const projectId of [a,b]) {
    const run = {run_id:'123e4567-e89b-42d3-a456-426614174099',scope:{project_id:projectId}};
    assert.equal(requireRunProjectId(run,{scope:{project_id:projectId}}),projectId);
    assert.equal(requireRunProjectId(run,{material_evidence:[{evidence_id:'source-evidence'}]}),projectId);
    assert.equal(requireRunProjectId(run,{findings:[{finding_id:'finding'}]}),projectId);
  }
  assert.notEqual(a,b);
});

test('missing, malformed or conflicting project scope fails closed', () => {
  for (const run of [{}, {scope:{}}, {scope:{project_id:'not-a-uuid'}}, {scope:{project_id:null}}]) {
    assert.throws(()=>requireRunProjectId(run),/PRODUCTION_PROJECT_SCOPE_INVALID/);
  }
  assert.throws(()=>requireRunProjectId({scope:{project_id:a}},{scope:{project_id:b}}),/PRODUCTION_PROJECT_SCOPE_INVALID/);
  assert.throws(()=>requireRunProjectId({scope:{project_id:a}},{scope:{project_id:'fixture'}}),/PRODUCTION_PROJECT_SCOPE_INVALID/);
});
