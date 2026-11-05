import {beforeEach,expect,it,vi} from 'vitest';
import {createPrivateOriginalRepository} from '../../packages/data-access/src/private-original-repository.mjs';

const project='22222222-2222-4222-8222-222222222222';
const actor='33333333-3333-4333-8333-333333333333';
const original='44444444-4444-4444-8444-444444444444';
const token='signed-owner-session';
const query=vi.fn(),release=vi.fn(),connect=vi.fn();
const pool={connect};
beforeEach(()=>{
 vi.clearAllMocks();
 connect.mockResolvedValue({query,release});
 query.mockImplementation(async(sql:string)=>{
  if(sql.includes('current_app_user_id()'))return {rows:[{user_id:actor}]};
  if(sql.includes('from studio.private_originals'))return {rows:[{
   original_id:original,project_id:project,asset_id:original,asset_revision_id:actor,state:'STORED_VERIFIED',
   sha256:'a'.repeat(64),byte_size:'42',file_name:'synthetic.txt',content_type:'text/plain',
   storage_key:'private-bucket/secret-object'
  }]};
  return {rows:[]};
 });
});
it('lists only verified originals under the current Owner project transaction and omits storage keys',async()=>{
 const rows=await createPrivateOriginalRepository(pool).listForProject(project,token);
 expect(rows).toEqual([{
  original_id:original,project_id:project,asset_id:original,asset_revision_id:actor,state:'STORED_VERIFIED',
  sha256:'a'.repeat(64),byte_size:42,file_name:'synthetic.txt',content_type:'text/plain'
 }]);
 expect(query.mock.calls.map(args=>args[0])).toContain('select * from studio.private_originals where project_id=$1 and state=\'STORED_VERIFIED\' order by created_at desc,original_id limit 20');
 expect(query.mock.calls.some(([sql])=>sql.includes('source.read_runs')||sql.includes('source.read_units'))).toBe(false);
 expect(query.mock.calls.map(args=>args[0])).toContain('commit');
 expect(release).toHaveBeenCalledWith(false);
});
it('returns no originals for an empty or foreign project result',async()=>{
 query.mockImplementation(async(sql:string)=>sql.includes('current_app_user_id()')?{rows:[{user_id:actor}]}:{rows:[]});
 await expect(createPrivateOriginalRepository(pool).listForProject(project,token)).resolves.toEqual([]);
});
it('rejects malformed project IDs before opening a database connection',async()=>{
 await expect(createPrivateOriginalRepository(pool).listForProject('../foreign',token)).rejects.toThrow('ORIGINAL_ID_INVALID');
 expect(connect).not.toHaveBeenCalled();
});
