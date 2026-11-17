import test from 'node:test';
import assert from 'node:assert/strict';
import {
  PUBLISHED_WORKS_SQL,
  LEGACY_PUBLISHED_WORKS_SQL,
  isAbsentStudioPublicationSchema,
} from '../../apps/web/lib/publication-watch-sql.mjs';

test('Studio publication migration gap is the only fallback trigger', () => {
  assert.equal(isAbsentStudioPublicationSchema({
    code: '42P01', message: 'relation "studio.work_revisions" does not exist',
  }), true);
  assert.equal(isAbsentStudioPublicationSchema({
    code: '42P01', message: 'relation "publication.withdrawals" does not exist',
  }), true);
  assert.equal(isAbsentStudioPublicationSchema({
    code: '42703', message: 'column p.source_schema does not exist',
  }), true);
  assert.equal(isAbsentStudioPublicationSchema({
    code: '42703', message: 'column p.studio_revision_id does not exist',
  }), true);
  assert.equal(isAbsentStudioPublicationSchema({
    code: '42703', message: 'column p.publication_id does not exist',
  }), true);
  assert.equal(isAbsentStudioPublicationSchema({
    code: '42703', message: 'column r.beats does not exist',
  }), true);
});

test('ordinary DB outages, auth errors, and legacy schema errors remain hard failures', () => {
  for (const error of [
    {code:'28P01',message:'password authentication failed for user postgres'},
    {code:'42501',message:'permission denied for table work_revisions'},
    {code:'42P01',message:'relation "publication.work_revisions" does not exist'},
    {code:'42703',message:'column r.status does not exist'},
    new Error('network unavailable'),
    null,
  ]) assert.equal(isAbsentStudioPublicationSchema(error),false);
});

test('fallback only returns truly published legacy revisions; no Studio or G5 bypass', () => {
  assert.match(PUBLISHED_WORKS_SQL,/studio\.work_revisions/);
  assert.match(LEGACY_PUBLISHED_WORKS_SQL,/from publication\.published_pointers/);
  assert.match(LEGACY_PUBLISHED_WORKS_SQL,/join publication\.work_revisions/);
  assert.match(LEGACY_PUBLISHED_WORKS_SQL,/where r\.status = 'published'/);
  assert.doesNotMatch(LEGACY_PUBLISHED_WORKS_SQL,/studio\.|union all|qualification_current/i);
});
