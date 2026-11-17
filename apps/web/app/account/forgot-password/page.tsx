import EmailRecoveryForm from './email-recovery-form';
import PreviewOwnerPasswordForm from './preview-owner-password-form';

export const dynamic = 'force-dynamic';

export default function ForgotPasswordPage() {
  // In the protected development Preview, use the permanent no-email Owner recovery.
  // Production keeps the standard email-verified recovery flow.
  if (process.env.VERCEL_ENV === 'preview' &&
      process.env.MOHEN_OWNER_PASSWORD_RECOVERY_ENABLED === 'true') {
    return <PreviewOwnerPasswordForm />;
  }
  return <EmailRecoveryForm />;
}
