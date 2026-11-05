import {expect,it} from 'vitest';
import {parseH1Candidate,parseDirectorCandidates,parseBeatCandidates} from '../../apps/web/lib/studio-creation';
// Pure candidate structure tests: these fixtures provide no transfer/spend authority.
const finding={motifCodes:['M1'],historicalQuestion:'question',understandingDelta:'delta',supportScope:'scope',limitations:['unknown']};
const plan={angle:'angle',points:['point'],cover:'cover',motif:'M1',directorDecisions:['choice']};
const beat={title:'title',narration:'narration',visual:'visual',directorTimecodeMs:0,provenanceRefs:['record-1']};
for(const bad of [{...finding,motifCodes:['invalid']},{...finding,historicalQuestion:''},{...finding,limitations:[3]}]) it('rejects incomplete H1 candidate '+JSON.stringify(bad),()=>{expect(parseH1Candidate(bad)).toBeNull();});
it('retains valid H1 boundaries',()=>{expect(parseH1Candidate(finding)).toEqual(finding);});
it('rejects malformed H2 before persisting a candidate',()=>{expect(parseDirectorCandidates({planA:{},planB:plan})).toBeNull();});
for(const bad of [null,{...beat,provenanceRefs:['invented']},{...beat,directorTimecodeMs:-1},{...beat,narration:{}},{...beat,provenanceRefs:[]}]) it('rejects bad H3 candidate '+JSON.stringify(bad),()=>{expect(parseBeatCandidates({beats:[bad]},['record-1'])).toBeNull();});
it('rejects reversed timecodes',()=>{expect(parseBeatCandidates({beats:[{...beat,directorTimecodeMs:100},beat]},['record-1'])).toBeNull();});
it('preserves an input reference without inventing an identity',()=>{expect(parseBeatCandidates({beats:[beat]},['record-1'])).toEqual([beat]);});
it('returns complete, structurally valid director candidates without attesting history',()=>{expect(parseDirectorCandidates({planA:plan,planB:{...plan,angle:'alternate'}})).toEqual({planA:plan,planB:{...plan,angle:'alternate'}});});
it('rejects a malformed saved plan',()=>{expect(parseDirectorCandidates({planA:{angle:'bad'},planB:plan})).toBeNull();});
