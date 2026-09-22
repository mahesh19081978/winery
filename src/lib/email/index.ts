import path from 'path';
import { FileOutboxEmailProvider, ResendEmailProvider } from './providers';
import type { EmailProvider } from './types';

export type { EmailMessage, EmailProvider } from './types';

const DEFAULT_FROM = 'Domaine Élysée <onboarding@resend.dev>';

let provider: EmailProvider | null = null;

export function getEmailProvider(): EmailProvider {
  if (provider) return provider;

  const apiKey = process.env.RESEND_API_KEY;
  if (apiKey && apiKey.trim().length > 0) {
    provider = new ResendEmailProvider(apiKey.trim(), process.env.EMAIL_FROM?.trim() || DEFAULT_FROM);
    return provider;
  }

  if (process.env.NODE_ENV === 'production') {
    console.error(
      '[Email] RESEND_API_KEY is not configured: outbound email is disabled in production. ' +
        'Set RESEND_API_KEY (and EMAIL_FROM) to enable delivery.'
    );
  }

  const outboxDir = process.env.EMAIL_OUTBOX_DIR || path.join(process.cwd(), '.email-outbox');
  provider = new FileOutboxEmailProvider(outboxDir);
  return provider;
}

export async function sendPasswordResetEmail(to: string, resetUrl: string, expiryMinutes: number): Promise<void> {
  const subject = 'Reset your Domaine Élysée password';
  const expiryText =
    expiryMinutes % 60 === 0 ? `${expiryMinutes / 60} hour${expiryMinutes > 60 ? 's' : ''}` : `${expiryMinutes} minutes`;

  const html = `<!doctype html>
<html>
  <body style="margin:0;padding:0;background-color:#faf8f5;">
    <div style="max-width:480px;margin:0 auto;padding:32px 16px;font-family:Georgia,'Times New Roman',serif;">
      <div style="background:#ffffff;border:1px solid #e7e5e4;border-radius:16px;padding:32px;">
        <h1 style="font-size:22px;font-weight:400;color:#1c1917;margin:0 0 16px;">Password Reset Request</h1>
        <p style="font-size:15px;color:#57534e;line-height:1.6;margin:0 0 16px;">
          We received a request to reset the password for your Domaine Élysée guest account.
          Click the button below to choose a new password.
        </p>
        <div style="text-align:center;margin:24px 0;">
          <a href="${resetUrl}" style="display:inline-block;background:#8a3243;color:#ffffff;text-decoration:none;font-size:14px;letter-spacing:0.05em;text-transform:uppercase;padding:12px 32px;border-radius:999px;">Reset Password</a>
        </div>
        <p style="font-size:13px;color:#78716c;line-height:1.6;margin:0 0 16px;">
          This link expires in ${expiryText}. If the button does not work, copy and paste this link into your browser:<br/>
          <a href="${resetUrl}" style="color:#8a3243;word-break:break-all;">${resetUrl}</a>
        </p>
        <p style="font-size:13px;color:#78716c;line-height:1.6;margin:0;">
          If you did not request a password reset, you can safely ignore this email. Your password will remain unchanged.
        </p>
      </div>
      <p style="font-size:11px;color:#a8a29e;text-align:center;margin:16px 0 0;">
        Domaine Élysée — Guest Account Services
      </p>
    </div>
  </body>
</html>`;

  const text = [
    'Password Reset Request',
    '',
    'We received a request to reset the password for your Domaine Élysée guest account.',
    `Reset your password: ${resetUrl}`,
    `This link expires in ${expiryText}.`,
    'If you did not request a password reset, you can safely ignore this email. Your password will remain unchanged.',
  ].join('\n');

  await getEmailProvider().send({ to, subject, html, text });
}
