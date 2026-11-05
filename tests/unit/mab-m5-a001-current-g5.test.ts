import {afterEach,beforeEach,expect,it,vi} from 'vitest';
const {queryRows}=vi.hoisted(()=>({queryRows:vi.fn()}));
vi.mock('@mohen/data-access',()=>({queryRows}));
import {readA001ExperienceData} from '../../apps/web/lib/a001-experience-data';
const original=process.env.MOHEN_G5_CONTEXTS;
const context={purpose:{namespace:'test',code:'stage-display',version:'1'},scope:{project:'synthetic',requested_action:'display'}};
beforeEach(()=>{queryRows.mockReset();process.env.MOHEN_G5_CONTEXTS=JSON.stringify({visual_stage:context});});
afterEach(()=>{if(original===undefined)delete process.env.MOHEN_G5_CONTEXTS;else process.env.MOHEN_G5_CONTEXTS=original;});
for(const [label,config] of [['absent',undefined],['agent only',JSON.stringify({agent:context})],['wrong action',JSON.stringify({visual_stage:{...context,scope:{requested_action:'read'}}})]] as const){
 it(`fails closed for ${label} context before SQL`,async()=>{if(config===undefined)delete process.env.MOHEN_G5_CONTEXTS;else process.env.MOHEN_G5_CONTEXTS=config;
 expect((await readA001ExperienceData()).available).toBe(false);expect(queryRows).not.toHaveBeenCalled();});
}
it('checks current qualification, purpose, scope and display consumer for every facet including agent-context content',async()=>{
 queryRows.mockResolvedValue([]).mockResolvedValueOnce([{pid:'projection',run_id:'run',payload:'{}'}]);
 expect((await readA001ExperienceData()).available).toBe(true);
 expect(queryRows).toHaveBeenCalledTimes(5);
 for(const [sql,params] of queryRows.mock.calls){
  expect(sql).toContain('control.qualification_current q');expect(sql).toContain('control.qualification_allows');
  expect(sql).not.toContain('g.current_valid=true');expect(sql).not.toContain("g.consumer='agent'");
  expect(params).toMatchObject({purpose_namespace:'test',purpose_code:'stage-display',purpose_version:'1',allowed_scope:JSON.stringify(context.scope)});
 }
});
it('withholds a previously available projection after current qualification is revoked',async()=>{
 queryRows.mockResolvedValue([]).mockResolvedValueOnce([{pid:'projection',run_id:'run',payload:'{}'}]);
 expect((await readA001ExperienceData()).available).toBe(true);
 expect((await readA001ExperienceData()).available).toBe(false);
});
it('fails closed if current dependency qualification cannot be checked',async()=>{
 queryRows.mockRejectedValue(new Error('qualification unavailable'));
 expect((await readA001ExperienceData()).available).toBe(false);
});
const photo={visual_object_id:'synthetic-photo',visual_type:'today_photo',display_url:'/synthetic-authorized-photo',license:'CC-BY-4.0',rights_status:'cleared'};
async function readVisuals(visuals:unknown[]){
 queryRows.mockResolvedValue([]).mockResolvedValueOnce([{pid:'projection',run_id:'run',payload:JSON.stringify({title:'Independent qualified text',visuals})}]);
 return readA001ExperienceData();
}
it('keeps explicitly cleared licensed photos with current display qualification',async()=>{
 const data=await readVisuals([photo,{...photo,valid_until:'2999-01-01T00:00:00Z'}]);
 expect(data.available).toBe(true);expect(data.visuals).toHaveLength(2);
 expect(data.visuals[0].displayUrl).toBe(photo.display_url);
});
for(const [reason,changes] of [
 ['missing license',{license:undefined}],['blank license',{license:'  '}],['unknown rights',{rights_status:'unknown'}],
 ['missing rights',{rights_status:undefined}],['revoked rights',{rights_status:'revoked'}],
 ['expired rights',{valid_until:'2000-01-01T00:00:00Z'}],['invalid expiry',{valid_until:'invalid'}],
] as const){
 it(`withholds photo with ${reason} while preserving independently usable text`,async()=>{
  const data=await readVisuals([{...photo,...changes}]);
  expect(data.available).toBe(true);expect(data.title).toBe('Independent qualified text');expect(data.visuals).toEqual([]);
  expect(JSON.stringify(data)).not.toContain(photo.display_url);
 });
}
