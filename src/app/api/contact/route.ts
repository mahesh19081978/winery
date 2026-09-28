import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { getEmailProvider } from '@/lib/email';
import { GuestRateLimiter } from '@/lib/auth/guest-rate-limit';

const ContactInquirySchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(100),
  email: z.string().trim().email('Valid email address is required'),
  phone: z.string().trim().max(30).optional().default(''),
  subject: z.string().trim().min(3, 'Subject must be at least 3 characters').max(200),
  category: z.enum([
    'GENERAL',
    'PRIVATE_EVENT',
    'CELLAR_TASTING',
    'ALLOCATION',
    'PRESS',
  ]).default('GENERAL'),
  message: z.string().trim().min(10, 'Message must be at least 10 characters').max(3000),
});

const CATEGORY_LABELS: Record<string, string> = {
  GENERAL: 'General Concierge Inquiry',
  PRIVATE_EVENT: 'Private Event & Wedding Booking',
  CELLAR_TASTING: 'VIP Cellar Tasting Request',
  ALLOCATION: 'Wine Allocation & Cellar Membership',
  PRESS: 'Media & Trade Relations',
};

export async function POST(request: NextRequest) {
  try {
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
    const rateCheck = GuestRateLimiter.isRateLimited(`contact:${ip}`);
    if (rateCheck.limited) {
      return NextResponse.json(
        {
          success: false,
          error: `Too many contact inquiries from this network. Please wait ${rateCheck.remainingSeconds || 60} seconds before sending another message.`,
        },
        { status: 429 }
      );
    }

    const json = await request.json();
    const validated = ContactInquirySchema.parse(json);

    const categoryTitle = CATEGORY_LABELS[validated.category] || validated.category;
    const estateConciergeEmail = process.env.ESTATE_CONCIERGE_EMAIL || 'concierge@domaine-elysee.com';

    // Find default active winery
    const winery = await prisma.winery.findFirst({
      select: { id: true },
    });
    if (!winery) {
      throw new Error('Estate winery configuration not found');
    }

    // Persist inquiry to database
    await prisma.contactInquiry.create({
      data: {
        wineryId: winery.id,
        name: validated.name,
        email: validated.email,
        phone: validated.phone || null,
        subject: validated.subject,
        category: validated.category,
        message: validated.message,
        status: 'NEW',
      },
    });

    // 1. Send notification to estate concierge
    const conciergeHtml = `<!doctype html>
<html>
  <body style="margin:0;padding:0;background-color:#faf8f5;">
    <div style="max-width:560px;margin:0 auto;padding:32px 16px;font-family:Georgia,'Times New Roman',serif;">
      <div style="background:#ffffff;border:1px solid #e7e5e4;border-radius:16px;padding:36px;">
        <span style="font-size:11px;letter-spacing:0.25em;text-transform:uppercase;color:#c5a059;font-weight:600;">VINORA ESTATE CONCIERGE</span>
        <h2 style="font-size:22px;color:#1c1917;margin:8px 0 20px;">New Guest Inquiry: ${validated.subject}</h2>
        <div style="background:#faf8f5;border:1px solid #e7e5e4;border-radius:12px;padding:18px;margin-bottom:24px;font-size:14px;color:#44403c;line-height:1.6;">
          <div><strong>Guest Name:</strong> ${validated.name}</div>
          <div><strong>Email:</strong> ${validated.email}</div>
          ${validated.phone ? `<div><strong>Phone:</strong> ${validated.phone}</div>` : ''}
          <div><strong>Category:</strong> ${categoryTitle}</div>
        </div>
        <p style="font-size:14px;color:#292524;line-height:1.6;white-space:pre-wrap;">${validated.message}</p>
      </div>
    </div>
  </body>
</html>`;

    const conciergeText = [
      'VINORA ESTATE CONCIERGE — NEW INQUIRY',
      `Subject: ${validated.subject}`,
      `Guest: ${validated.name} (${validated.email})`,
      `Phone: ${validated.phone || 'N/A'}`,
      `Category: ${categoryTitle}`,
      '',
      'Message:',
      validated.message,
    ].join('\n');

    // 2. Send acknowledgment to the guest
    const guestHtml = `<!doctype html>
<html>
  <body style="margin:0;padding:0;background-color:#faf8f5;">
    <div style="max-width:540px;margin:0 auto;padding:32px 16px;font-family:Georgia,'Times New Roman',serif;">
      <div style="background:#ffffff;border:1px solid #e7e5e4;border-radius:16px;padding:36px;">
        <div style="text-align:center;margin-bottom:24px;">
          <span style="font-size:11px;letter-spacing:0.25em;text-transform:uppercase;color:#c5a059;font-weight:600;">VINORA ESTATE</span>
          <h1 style="font-size:22px;font-weight:400;color:#1c1917;margin:8px 0 0;">Thank You for Contacting Us</h1>
        </div>
        <p style="font-size:15px;color:#57534e;line-height:1.6;margin:0 0 16px;">
          Dear ${validated.name},
        </p>
        <p style="font-size:15px;color:#57534e;line-height:1.6;margin:0 0 20px;">
          We have received your inquiry regarding <strong>&ldquo;${validated.subject}&rdquo;</strong>. Our estate concierge team will review your message and respond within 24 business hours.
        </p>
        <div style="background:#faf8f5;border:1px solid #e7e5e4;border-radius:12px;padding:16px;margin:20px 0;font-size:13px;color:#44403c;">
          <div style="font-weight:600;margin-bottom:6px;">Your Message:</div>
          <div style="color:#78716c;white-space:pre-wrap;">${validated.message}</div>
        </div>
        <p style="font-size:13px;color:#78716c;line-height:1.6;margin:24px 0 0;border-top:1px solid #f5f5f4;padding-top:16px;">
          Warm regards,<br/>
          <em>The Estate Concierge Team at VINORA</em><br/>
          <span style="font-size:11px;color:#a8a29e;">4800 Terrasses du Rêve, Coteaux de l&apos;Est</span>
        </p>
      </div>
    </div>
  </body>
</html>`;

    const guestText = [
      'VINORA ESTATE',
      '',
      `Dear ${validated.name},`,
      '',
      `Thank you for contacting us regarding "${validated.subject}". Our estate concierge team will review your inquiry and respond within 24 business hours.`,
      '',
      'Warm regards,',
      'The Estate Concierge Team at VINORA',
    ].join('\n');

    const emailProvider = getEmailProvider();

    await Promise.all([
      emailProvider.send({
        to: estateConciergeEmail,
        subject: `[Concierge Inquiry] ${validated.subject} — ${validated.name}`,
        html: conciergeHtml,
        text: conciergeText,
      }),
      emailProvider.send({
        to: validated.email,
        subject: `Inquiry Received: ${validated.subject} — VINORA Estate`,
        html: guestHtml,
        text: guestText,
      }),
    ]);

    return NextResponse.json({
      success: true,
      message: 'Your inquiry has been received. Our concierge team will reach out shortly.',
    });
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      const firstIssue = error.issues[0];
      const errorMessage = firstIssue ? firstIssue.message : 'Validation failed';
      return NextResponse.json(
        { success: false, error: errorMessage, details: error.issues },
        { status: 400 }
      );
    }
    const message = error instanceof Error ? error.message : 'Failed to send inquiry';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
