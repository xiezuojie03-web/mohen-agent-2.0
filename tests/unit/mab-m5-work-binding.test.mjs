import {it,expect} from 'vitest';
import * as access from '../../packages/data-access/src/index.mjs';
it('requires a current independent signed whole-work binding rather than author supplied qualification refs',async()=>{
 expect(typeof access.createWorkQualificationReader).toBe('function');
 const reader=access.createWorkQualificationReader({query:async()=>({rows:[]})});
 expect(await reader.check('11111111-1111-4111-8111-111111111111','22222222-2222-4222-8222-222222222222',{consumer:'watch',purpose:{namespace:'G5',code:'fixture',version:'1'},scope:{project:'fixture'}},{})).toBe(false);
});
