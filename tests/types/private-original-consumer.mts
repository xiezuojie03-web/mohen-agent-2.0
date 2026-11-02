import {Buffer} from 'node:buffer';
import {createPrivateOriginalStorage,createPrivateOriginalWorkflow,type PrivateOriginalRepository,MAX_ORIGINAL_BYTES} from '../../packages/data-access/src/index.mjs';
const storage=createPrivateOriginalStorage({endpoint:'https://example.invalid',token:'synthetic-not-a-production-key'});
const size:number=MAX_ORIGINAL_BYTES;
void size;
void storage.putVerified('key',Buffer.from('synthetic'));
void storage.discardUnverified('key');
// @ts-expect-error Storage inputs are bytes, never an arbitrary URL/string.
void storage.putVerified('key','not bytes','text/plain');
// @ts-expect-error Hash is required before reading private original bytes.
void storage.readVerified('key');
declare const repository:PrivateOriginalRepository;
const workflow=createPrivateOriginalWorkflow({repository,storage});
// @ts-expect-error A browser-supplied UUID does not substitute for session token.
void workflow.download('id',{uid:'fake'});
// @ts-expect-error The upload must specify a project and exact request identity.
void workflow.upload({bytes:Buffer.from('synthetic')},'synthetic-token');
