import {afterEach,beforeEach,expect,it,vi} from 'vitest';
const fx=vi.hoisted(()=>({complete:vi.fn(),configured:vi.fn(),revocable:vi.fn()}));
vi.mock('../../apps/web/lib/auth',()=>({completePasswordSetup:fx.complete,isAuthConfigured:fx.configured,revocableSessionsEnabled:fx.revocable}));
import {POST} from '../../apps/web/app/api/auth/password-setup/route';
const origin='https://preview.invalid';
const req=(body:unknown={},headers:Record<string,string>={})=>new Request(origin+'/api/auth/password-setup',
  {method:'POST',headers:{origin,'content-type':'application/json',...headers},body:JSON.stringify(body)});
beforeEach(()=>{vi.clearAllMocks();vi.stubEnv('VERCEL_ENV','preview');fx.configured.mockReturnValue(true);fx.revocable.mockReturnValue(true);fx.complete.mockResolvedValue(true);});
afterEach(()=>vi.unstubAllEnvs());
it('allows only a same-origin Preview request and never returns credentials or creates a session',async()=>{
  const r=await POST(req({email:'owner@test.invalid',token:'b'.repeat(64),password:'owner-selected-password'}));
  expect(r.status).toBe(200);expect(await r.json()).toEqual({ok:true});
  expect(r.headers.get('cache-control')).toContain('no-store');expect(r.headers.get('set-cookie')).toBeNull();
});
it.each(['production','development',''])('cannot be enabled on %s by presenting a setup capability',async mode=>{
  vi.stubEnv('VERCEL_ENV',mode);expect((await POST(req())).status).toBe(503);expect(fx.complete).not.toHaveBeenCalled();
});
it('rejects cross-origin, oversized and non-JSON bodies before credential lookup',async()=>{
  expect((await POST(req({},{origin:'https://foreign.invalid'}))).status).toBe(403);
  expect((await POST(req({}, {'content-type':'text/plain'}))).status).toBe(415);
  expect((await POST(req({oversized:'a'.repeat(5000)}))).status).toBe(400);
  expect(fx.complete).not.toHaveBeenCalled();
});
it('invalid or expired capability has one generic response and no account details',async()=>{
  fx.complete.mockResolvedValue(false);const r=await POST(req());
  expect(r.status).toBe(400);expect(await r.json()).toEqual({ok:false,reason:'setup_invalid_or_expired'});
});
it('dependency failures are closed without raw errors',async()=>{
  fx.complete.mockRejectedValue(Error('private database details'));const r=await POST(req());
  expect(r.status).toBe(503);expect(JSON.stringify(await r.json())).not.toContain('private database details');
});
