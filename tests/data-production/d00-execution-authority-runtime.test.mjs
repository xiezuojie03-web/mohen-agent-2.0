import assert from 'node:assert/strict';
import test from 'node:test';
import {startD00ExecutionAuthorityRuntime} from '../../pipelines/data-production/orchestrator/d00-execution-authority-runtime.mjs';

test('authority listener is opt-in and validates configuration before opening files or sockets',async()=>{
 assert.equal(await startD00ExecutionAuthorityRuntime({env:{}}),null);
 await assert.rejects(startD00ExecutionAuthorityRuntime({env:{MOHEN_D00_AUTHORITY_ENABLED:'true'}}),/CONFIG_INVALID/);
});
