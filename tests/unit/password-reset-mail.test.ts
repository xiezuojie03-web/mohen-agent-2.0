import {existsSync} from 'node:fs';
import {afterEach,beforeEach,expect,it,vi} from 'vitest';
const smtp=vi.hoisted(()=>({create:vi.fn(),send:vi.fn(),close:vi.fn()}));
vi.mock('nodemailer',()=>({default:{createTransport:smtp.create}}));
const load=async()=>existsSync('apps/web/lib/password-reset-mail.ts')?import('../../apps/web/lib/password-reset-mail'):null;
beforeEach(()=>{
  vi.stubEnv('MOHEN_PASSWORD_RESET_ENABLED','true');vi.stubEnv('MOHEN_REVOCABLE_SESSIONS_ENABLED','true');
  vi.clearAllMocks();smtp.create.mockReturnValue({sendMail:smtp.send,close:smtp.close});
  smtp.send.mockResolvedValue({accepted:['owner@example.invalid']});
  vi.stubEnv('MOHEN_QQ_SMTP_AUTH_CODE','test-only-authorization-code');vi.stubEnv('MOHEN_AUTH_MAIL_FROM','123456@qq.com');
  vi.stubEnv('MOHEN_AUTH_PUBLIC_ORIGIN','https://preview.invalid');vi.stubEnv('AUTH_SECRET','a'.repeat(40));
});
afterEach(()=>{vi.unstubAllEnvs();vi.unstubAllGlobals();vi.useRealTimers();});
it('fails closed until all delivery and revocation settings exist',async()=>{
  const api=await load();expect(api).not.toBeNull();expect(api!.passwordResetMailConfig()).not.toBeNull();
  vi.stubEnv('MOHEN_QQ_SMTP_AUTH_CODE','');expect(api!.passwordResetMailConfig()).toBeNull();
});
it.each(['https://evil.invalid/path','https://u:p@evil.invalid','http://remote.invalid','https://evil.invalid?x=1'])('rejects unsafe reset origin %s',async origin=>{
  const api=await load();expect(api).not.toBeNull();vi.stubEnv('MOHEN_AUTH_PUBLIC_ORIGIN',origin);
  expect(api!.passwordResetMailConfig()).toBeNull();
});
it('uses QQ SMTP with verified TLS, bounded timeouts, no protocol logs and closes the connection',async()=>{
  const api=await load();expect(api).not.toBeNull();
  await api!.sendPasswordResetMail('owner@example.invalid','https://preview.invalid/account/reset-password#token=synthetic');
  const options=smtp.create.mock.calls[0][0];expect(options.host).toBe('smtp.qq.com');expect(options.port).toBe(465);expect(options.secure).toBe(true);
  expect(options.tls.rejectUnauthorized).toBe(true);expect(options.socketTimeout).toBe(10000);expect(options.logger).toBe(false);expect(options.debug).toBe(false);
  expect(options.disableFileAccess).toBe(true);expect(options.disableUrlAccess).toBe(true);
  expect(smtp.send.mock.calls[0][0].to).toEqual(['owner@example.invalid']);expect(smtp.close).toHaveBeenCalled();
  smtp.send.mockRejectedValue(Error('private QQ SMTP details'));
  await expect(api!.sendPasswordResetMail('owner@example.invalid','https://preview.invalid/account/reset-password#token=synthetic')).rejects.toThrow('PASSWORD_RESET_MAIL_UNAVAILABLE');
});
it('a stalled SMTP transaction has a 15-second absolute deadline and closes the transport',async()=>{
  const api=await load();expect(api).not.toBeNull();vi.useFakeTimers();
  smtp.send.mockImplementation(()=>new Promise(()=>{}));
  const outcome=api!.sendPasswordResetMail('owner@example.invalid','https://preview.invalid/account/reset-password#token=synthetic')
    .then(()=>false,()=>true);
  await vi.advanceTimersByTimeAsync(15001);
  expect(await Promise.race([outcome,Promise.resolve('pending')])).toBe(true);
  expect(smtp.close).toHaveBeenCalled();
});
