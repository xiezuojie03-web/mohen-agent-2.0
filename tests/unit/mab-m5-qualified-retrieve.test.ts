import {beforeEach,expect,it,vi} from 'vitest';
const db=vi.hoisted(()=>({queryRows:vi.fn()}));
vi.mock('../../packages/data-access/src/index.mjs',async original=>({...await original<Record<string,unknown>>(),queryRows:db.queryRows}));
import {retrieveMaterials} from '../../apps/web/lib/mohen-agent/retrieve';
const qualification={consumer:'agent' as const,purpose:{namespace:'G5',code:'fixture',version:'1'},scope:{project:'fixture'}};
beforeEach(()=>{vi.resetAllMocks();db.queryRows.mockResolvedValue([{id:'legacy',kind:'claim',snippet:'unqualified legacy secret',vstatus:'SUPPORTED',conf:'0.7'}]);});
it('missing server qualification context refuses even legacy PASS rows before querying',async()=>{
 expect(await retrieveMaterials(['secret'])).toEqual({materials:[],degraded:true,coverage:"UNAVAILABLE"});
 expect(db.queryRows).not.toHaveBeenCalled();
});
it.each([{}, {...qualification,scope:{}},{...qualification,scope:{project:undefined}},{...qualification,consumer:'watch'},{...qualification,purpose:{...qualification.purpose,version:''}}])('invalid context refuses before querying: %j',async invalid=>{
 const result=await retrieveMaterials(['secret'],12,{qualification:invalid} as never);
 expect(result).toEqual({materials:[],degraded:true,coverage:"UNAVAILABLE"});expect(db.queryRows).not.toHaveBeenCalled();
});
it('uses exact purpose/scope/consumer and current independent qualification on every branch',async()=>{
 await retrieveMaterials(['桥市'],12,{qualification} as never);
 const [sql,params]=db.queryRows.mock.calls[0];
 expect(params).toMatchObject({consumer:'agent',purpose_namespace:'G5',purpose_code:'fixture',purpose_version:'1',scope:'{"project":"fixture"}'});
 expect(sql.match(/control\.qualification_allows\(/g)).toHaveLength(8);
 expect(sql).not.toContain('g.current_valid=true');
 expect(sql).toContain('control.qualification_current');
});
it('returns no materials when current qualification database is unavailable',async()=>{
 db.queryRows.mockRejectedValue(Error('synthetic database unavailable'));
 expect(await retrieveMaterials(['secret'],12,{qualification} as never)).toEqual({materials:[],degraded:true,coverage:"UNAVAILABLE"});
});
it('single-character residue terms are not a qualified read-model hit basis',async()=>{
 const result=await retrieveMaterials(['做','部'],12,{qualification} as never);
 expect(result).toEqual({materials:[],degraded:false,coverage:"NOT_SEARCHED"});
 expect(db.queryRows).not.toHaveBeenCalled();
});
it('filters single-character noise out of a mixed term list without marking coverage partial',async()=>{
 db.queryRows.mockResolvedValue([]);
 const result=await retrieveMaterials(['做','部','上海豫园','作品'],24,{qualification} as never);
 expect(result).toEqual({materials:[],degraded:false,coverage:"COMPLETE"});
 const [,params]=db.queryRows.mock.calls[0];
 expect(params).toMatchObject({terms:'上海豫园|作品'});
});
