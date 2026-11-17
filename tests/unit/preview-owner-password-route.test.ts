import {afterEach,beforeEach,expect,it,vi} from 'vitest';
const fx=vi.hoisted(()=>({reset:vi.fn(),configured:vi.fn(),revocable:vi.fn()}));
vi.mock('../../apps/web/lib/auth',()=>({
  resetPreviewOwnerPassword:fx.reset,
  isAuthConfigured:fx.configured,
  revocableSessionsEnabled:fx.revocable,
}));
import {POST} from '../../apps/web/app/api/auth/preview-owner-password/route';

const origin='https://preview.invalid';
const valid={password:'owner-selected-permanent-password',confirmation:'owner-selected-permanent-password'};
const request=(body:unknown=valid,headers:Record<string,string>={})=>new Request(origin+'/api/auth/preview-owner-password',{
  method:'POST',headers:{origin,'content-type':'application/json',...headers},body:JSON.stringify(body),
});

beforeEach(()=>{
  vi.clearAllMocks();
  vi.stubEnv('VERCEL_ENV','preview');
  vi.stubEnv('MOHEN_OWNER_PASSWORD_RECOVERY_ENABLED','true');
  fx.configured.mockReturnValue(true);
  fx.revocable.mockReturnValue(true);
  fx.reset.mockResolvedValue(true);
});
afterEach(()=>vi.unstubAllEnvs());

it('allows same-origin recovery only in the explicitly enabled protected Preview and never creates a session',async()=>{
  const response=await POST(request());
  expect(response.status).toBe(200);
  expect(await response.json()).toEqual({ok:true});
  expect(response.headers.get('cache-control')).toContain('no-store');
  expect(response.headers.get('set-cookie')).toBeNull();
  expect(fx.reset).toHaveBeenCalledWith(valid.password);
});

it.each([
  ['production','true'],['development','true'],['preview','false'],
])('refuses VERCEL_ENV=%s with recovery flag=%s',async(environment,enabled)=>{
  vi.stubEnv('VERCEL_ENV',environment);
  vi.stubEnv('MOHEN_OWNER_PASSWORD_RECOVERY_ENABLED',enabled);
  expect((await POST(request())).status).toBe(503);
  expect(fx.reset).not.toHaveBeenCalled();
});

it('requires configured auth and revocable sessions',async()=>{
  fx.configured.mockReturnValue(false);
  expect((await POST(request())).status).toBe(503);
  fx.configured.mockReturnValue(true);
  fx.revocable.mockReturnValue(false);
  expect((await POST(request())).status).toBe(503);
  expect(fx.reset).not.toHaveBeenCalled();
});

it('rejects cross-origin, wrong content type, oversized body and mismatched passwords',async()=>{
  expect((await POST(request(valid,{origin:'https://foreign.invalid'}))).status).toBe(403);
  expect((await POST(request(valid,{'content-type':'text/plain'}))).status).toBe(415);
  expect((await POST(request({password:'x'.repeat(5000)}))).status).toBe(400);
  expect((await POST(request({...valid,confirmation:'different-password'}))).status).toBe(400);
  expect(fx.reset).not.toHaveBeenCalled();
});

it('returns a generic unavailable response when no unique Owner account can be reset',async()=>{
  fx.reset.mockResolvedValue(false);
  const response=await POST(request());
  expect(response.status).toBe(409);
  expect(JSON.stringify(await response.json())).not.toContain('owner@test');
});

it('does not expose dependency failures',async()=>{
  fx.reset.mockRejectedValue(Error('private database details'));
  const response=await POST(request());
  expect(response.status).toBe(503);
  expect(JSON.stringify(await response.json())).not.toContain('private database details');
});
