import {afterEach,beforeEach,expect,it,vi} from 'vitest';
import {consumerContext,qualificationRefs,mediaPermitted,savedPanel,revisionNumber,validPlayhead,qualifiedContentSql} from '../../apps/web/lib/kad1-policy.mjs';
const context={purpose:{namespace:'test',code:'display',version:'1'},scope:{project:'one'}};
const ref={qualification_ref:'11111111-1111-4111-8111-111111111111',artifact_ref:{type:'story_seed',id:'22222222-2222-4222-8222-222222222222',revision:'rev-2'},consumer:'visual_stage',...context};
beforeEach(()=>{vi.stubEnv('MOHEN_G5_CONTEXTS','');});
afterEach(()=>{vi.unstubAllEnvs();});
it.each([undefined,'bad','{}','null','{"visual_stage":{"purpose":{},"scope":{}}}'])('does not authorize consumption from absent or invalid context (%s)',raw=>{
 expect(consumerContext('visual_stage',raw)).toBeNull();
});
it('keeps configured purpose and project scope specific to the requested consumer',()=>{
 const raw=JSON.stringify({visual_stage:context});
 expect(consumerContext('visual_stage',raw)).toEqual(context);
 expect(consumerContext('agent',raw)).toBeNull();
 expect(consumerContext('watch',raw)).toBeNull();
});
it('requires a versioned qualification, matching consumer, purpose and scope',()=>{
 expect(qualificationRefs({qualification_refs:[ref]},context,'visual_stage')).toEqual([ref]);
 for(const invalid of ['old source citation',{...ref,consumer:'agent'},{...ref,purpose:{...context.purpose,code:'download'}},{...ref,scope:{project:'two'}},{...ref,artifact_ref:{...ref.artifact_ref,revision:''}}]){
  expect(qualificationRefs({qualification_refs:[invalid]},context,'visual_stage')).toBeNull();
 }
});
it('requires cleared, licensed, unexpired media tied to the exact artifact revision',()=>{
 const now=Date.parse('2026-11-03T00:00:00Z');
 const media={license:'CC0',rights_status:'cleared',artifact_ref:ref.artifact_ref,valid_until:'2026-11-04T00:00:00Z'};
 expect(mediaPermitted({media:[media]},[ref],now)).toBe(true);
 for(const invalid of [{...media,license:''},{...media,rights_status:'unknown'},{...media,valid_until:'2026-11-02T00:00:00Z'},{...media,artifact_ref:{...ref.artifact_ref,revision:'rev-1'}}])expect(mediaPermitted({media:[invalid]},[ref],now)).toBe(false);
 expect(mediaPermitted({media:[]},[ref],now)).toBe(false);
 expect(mediaPermitted({media:[],rights_acknowledged:true},[ref],now)).toBe(true);
});
it('reads only saved allowed panels and refuses invalid revision or playhead input',()=>{
 expect(savedPanel({panels:{voiceover:{full:'saved'}}},'voiceover')).toEqual({full:'saved'});
 expect(savedPanel({plan:{voiceover:'draft'}},'voiceover')).toBeNull();
 expect(savedPanel({panels:{}},'__proto__')).toBeNull();
 for(const value of ['1x','0','-1','1.2','9999999999999999999'])expect(revisionNumber(value)).toBeNull();
 expect(revisionNumber('3')).toBe(3);
 for(const value of [-1,NaN,Infinity,'1'])expect(validPlayhead(value)).toBe(false);
 expect(validPlayhead(2.5)).toBe(true);
});
it('rejects untrusted SQL aliases or consumer interpolation',()=>{
 expect(()=>qualifiedContentSql('r; drop table users','agent')).toThrow('INVALID_SQL_CONTEXT');
 expect(()=>qualifiedContentSql('r',"agent' or true--")).toThrow('INVALID_SQL_CONTEXT');
});
