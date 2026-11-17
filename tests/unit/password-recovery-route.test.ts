import {existsSync} from 'node:fs';
import {afterEach,beforeEach,expect,it,vi} from 'vitest';
const fx=vi.hoisted(()=>({request:vi.fn(),complete:vi.fn(),config:vi.fn()}));
vi.mock('../../apps/web/lib/password-recovery',()=>({requestPasswordReset:fx.request,completePasswordReset:fx.complete}));
vi.mock('../../apps/web/lib/password-reset-mail',()=>({passwordResetMailConfig:fx.config}));
const origin='https://preview.invalid';
const request=(body:unknown={},headers:Record<string,string>={})=>new Request(origin+'/api/auth/forgot-password',{
  method:'POST',headers:{origin,'content-type':'application/json',...headers},body:JSON.stringify(body)});
const load=async()=>existsSync('apps/web/app/api/auth/forgot-password/route.ts')?{
  forgot:(await import('../../apps/web/app/api/auth/forgot-password/route')).POST,
  reset:(await import('../../apps/web/app/api/auth/reset-password/route')).POST}:null;
beforeEach(()=>{vi.clearAllMocks();fx.config.mockReturnValue({origin});fx.request.mockResolvedValue(undefined);fx.complete.mockResolvedValue(true);});
afterEach(()=>vi.unstubAllEnvs());
it('uniformly acknowledges a request without exposing account existence or creating a session',async()=>{
  const api=await load();expect(api).not.toBeNull();const r=await api!.forgot(request({email:'owner@test.invalid'}));
  expect(r.status).toBe(202);expect(await r.json()).toEqual({ok:true});
  expect(r.headers.get('cache-control')).toContain('no-store');expect(r.headers.get('set-cookie')).toBeNull();
});
it('missing mail configuration is an explicit service error before any account access',async()=>{
  const api=await load();expect(api).not.toBeNull();fx.config.mockReturnValue(null);
  expect((await api!.forgot(request())).status).toBe(503);expect(fx.request).not.toHaveBeenCalled();
});
it('accepts the configured browser origin when the reverse proxy supplies an internal request URL',async()=>{
  const api=await load();expect(api).not.toBeNull();
  const r=await api!.forgot(new Request('http://127.0.0.1:4187/api/auth/forgot-password',{
    method:'POST',headers:{origin,'content-type':'application/json'},body:JSON.stringify({email:'owner@test.invalid'})}));
  expect(r.status).toBe(202);
});
it.each(['forgot','reset'] as const)('%s rejects cross-origin, wrong type and oversized input',async name=>{
  const api=await load();expect(api).not.toBeNull();
  expect((await api![name](request({},{origin:'https://foreign.invalid'}))).status).toBe(403);
  expect((await api![name](request({}, {'content-type':'text/plain'}))).status).toBe(415);
  expect((await api![name](request({text:'x'.repeat(5000)}))).status).toBe(400);
  expect(fx.request).not.toHaveBeenCalled();expect(fx.complete).not.toHaveBeenCalled();
});
it('invalid capability has a generic failure; valid reset never auto-logs-in',async()=>{
  const api=await load();expect(api).not.toBeNull();fx.complete.mockResolvedValue(false);
  const invalid=await api!.reset(request());expect(invalid.status).toBe(400);
  expect(await invalid.json()).toEqual({ok:false,reason:'reset_invalid_or_expired'});
  fx.complete.mockResolvedValue(true);const valid=await api!.reset(request());
  expect(valid.status).toBe(200);expect(valid.headers.get('set-cookie')).toBeNull();
});
it('internal failures never expose underlying dependency details',async()=>{
  const api=await load();expect(api).not.toBeNull();fx.request.mockRejectedValue(Error('private-db-secret'));
  const r=await api!.forgot(request());expect(r.status).toBe(503);expect(JSON.stringify(await r.json())).not.toContain('private-db-secret');
});
