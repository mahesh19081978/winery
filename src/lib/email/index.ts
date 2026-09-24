import path from 'path';
import { FileOutboxEmailProvider, ResendEmailProvider } from './providers';
import type { EmailProvider } from './types';

export type { EmailMessage, EmailProvider } from './types';

const DEFAULT_FROM = 'VINORA <onboarding@resend.dev>';

let provider: EmailProvider | null = null;

export function setEmailProvider(customProvider: EmailProvider | null): void {
  provider = customProvider;
}

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
  const subject = 'Reset your VINORA password';
  const expiryText =
    expiryMinutes % 60 === 0 ? `${expiryMinutes / 60} hour${expiryMinutes > 60 ? 's' : ''}` : `${expiryMinutes} minutes`;

  const html = `<!doctype html>
<html>
  <body style="margin:0;padding:0;background-color:#faf8f5;">
    <div style="max-width:480px;margin:0 auto;padding:32px 16px;font-family:Georgia,'Times New Roman',serif;">
      <div style="background:#ffffff;border:1px solid #e7e5e4;border-radius:16px;padding:32px;">
        <h1 style="font-size:22px;font-weight:400;color:#1c1917;margin:0 0 16px;">Password Reset Request</h1>
        <p style="font-size:15px;color:#57534e;line-height:1.6;margin:0 0 16px;">
          We received a request to reset the password for your VINORA guest account.
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
        VINORA — Guest Account Services
      </p>
    </div>
  </body>
</html>`;

  const text = [
    'Password Reset Request',
    '',
    'We received a request to reset the password for your VINORA guest account.',
    `Reset your password: ${resetUrl}`,
    `This link expires in ${expiryText}.`,
    'If you did not request a password reset, you can safely ignore this email. Your password will remain unchanged.',
  ].join('\n');

  await getEmailProvider().send({ to, subject, html, text });
}

export interface GuestNotificationEmailPayload {
  to: string;
  recipientName?: string;
  eventType:
    | 'BOOKING_CONFIRMATION'
    | 'BOOKING_CANCELLATION'
    | 'EVENT_BOOKING_CONFIRMATION'
    | 'EVENT_BOOKING_CANCELLATION'
    | 'REVIEW_APPROVED'
    | 'REVIEW_REJECTED';
  title: string;
  message: string;
  bookingNumber?: string;
  date?: string;
  time?: string;
  guestsCount?: number;
  itemTitle?: string;
  targetUrl?: string;
}

export async function sendGuestNotificationEmail(payload: GuestNotificationEmailPayload): Promise<void> {
  const { to, recipientName, eventType, title, message, bookingNumber, date, time, guestsCount, itemTitle, targetUrl } = payload;

  let subject = `VINORA Estate Update: ${title}`;
  if (eventType === 'BOOKING_CONFIRMATION' && bookingNumber) {
    subject = `Booking Confirmed: ${bookingNumber} — VINORA`;
  } else if (eventType === 'BOOKING_CANCELLATION' && bookingNumber) {
    subject = `Reservation Cancelled: ${bookingNumber} — VINORA`;
  } else if (eventType === 'EVENT_BOOKING_CONFIRMATION' && bookingNumber) {
    subject = `Event Reservation Confirmed: ${bookingNumber} — VINORA`;
  } else if (eventType === 'EVENT_BOOKING_CANCELLATION' && bookingNumber) {
    subject = `Event Reservation Cancelled: ${bookingNumber} — VINORA`;
  } else if (eventType === 'REVIEW_APPROVED') {
    subject = `Your Review Has Been Approved — VINORA`;
  } else if (eventType === 'REVIEW_REJECTED') {
    subject = `Review Status Update — VINORA`;
  }

  const greeting = recipientName ? `Dear ${recipientName},` : 'Dear Guest,';
  const actionUrl = targetUrl ? `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}${targetUrl}` : null;

  const html = `<!doctype html>
<html>
  <body style="margin:0;padding:0;background-color:#faf8f5;">
    <div style="max-width:540px;margin:0 auto;padding:32px 16px;font-family:Georgia,'Times New Roman',serif;">
      <div style="background:#ffffff;border:1px solid #e7e5e4;border-radius:16px;padding:36px;">
        <div style="text-align:center;margin-bottom:24px;">
          <span style="font-size:11px;letter-spacing:0.25em;text-transform:uppercase;color:#c5a059;font-weight:600;">VINORA ESTATE</span>
          <h1 style="font-size:22px;font-weight:400;color:#1c1917;margin:8px 0 0;">${title}</h1>
        </div>
        <p style="font-size:15px;color:#57534e;line-height:1.6;margin:0 0 16px;">
          ${greeting}
        </p>
        <p style="font-size:15px;color:#57534e;line-height:1.6;margin:0 0 20px;">
          ${message}
        </p>
        ${
          bookingNumber || date || itemTitle
            ? `<div style="background:#faf8f5;border:1px solid #e7e5e4;border-radius:12px;padding:18px;margin:20px 0;font-size:14px;color:#44403c;line-height:1.6;">
                ${bookingNumber ? `<div><strong>Reservation:</strong> ${bookingNumber}</div>` : ''}
                ${itemTitle ? `<div><strong>Experience/Event:</strong> ${itemTitle}</div>` : ''}
                ${date ? `<div><strong>Date:</strong> ${date}${time ? ` at ${time}` : ''}</div>` : ''}
                ${guestsCount ? `<div><strong>Guests:</strong> ${guestsCount}</div>` : ''}
              </div>`
            : ''
        }
        ${
          actionUrl
            ? `<div style="text-align:center;margin:28px 0 12px;">
                <a href="${actionUrl}" style="display:inline-block;background:#8a3243;color:#ffffff;text-decoration:none;font-size:13px;letter-spacing:0.08em;text-transform:uppercase;padding:12px 28px;border-radius:999px;font-weight:500;">View in Guest Portal</a>
              </div>`
            : ''
        }
        <p style="font-size:13px;color:#78716c;line-height:1.6;margin:24px 0 0;border-top:1px solid #f5f5f4;padding-top:16px;">
          Warm regards,<br/>
          <em>The Estate Concierge Team at VINORA</em>
        </p>
      </div>
      <p style="font-size:11px;color:#a8a29e;text-align:center;margin:16px 0 0;">
        VINORA — Estate Communications
      </p>
    </div>
  </body>
</html>`;

  const textLines = [
    'VINORA ESTATE',
    title,
    '',
    greeting,
    '',
    message,
    '',
  ];
  if (bookingNumber) textLines.push(`Reservation: ${bookingNumber}`);
  if (itemTitle) textLines.push(`Experience/Event: ${itemTitle}`);
  if (date) textLines.push(`Date: ${date}${time ? ` at ${time}` : ''}`);
  if (guestsCount) textLines.push(`Guests: ${guestsCount}`);
  if (actionUrl) {
    textLines.push('');
    textLines.push(`View in Guest Portal: ${actionUrl}`);
  }
  textLines.push('');
  textLines.push('Warm regards,');
  textLines.push('The Estate Concierge Team at VINORA');

  await getEmailProvider().send({ to, subject, html, text: textLines.join('\n') });
}
