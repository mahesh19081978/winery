import { mkdir, writeFile } from 'fs/promises';
import path from 'path';
import { randomUUID } from 'crypto';
import type { EmailMessage, EmailProvider } from './types';

export class ResendEmailProvider implements EmailProvider {
  constructor(
    private readonly apiKey: string,
    private readonly from: string
  ) {}

  async send(message: EmailMessage): Promise<void> {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: this.from,
        to: [message.to],
        subject: message.subject,
        html: message.html,
        text: message.text,
      }),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => 'unknown error');
      throw new Error(`Resend API request failed with status ${res.status}: ${body}`);
    }
  }
}

export class FileOutboxEmailProvider implements EmailProvider {
  constructor(private readonly outboxDir: string) {}

  async send(message: EmailMessage): Promise<void> {
    await mkdir(this.outboxDir, { recursive: true });
    const file = path.join(this.outboxDir, `${Date.now()}-${randomUUID()}.json`);
    await writeFile(
      file,
      JSON.stringify({ ...message, sentAt: new Date().toISOString() }, null, 2),
      'utf8'
    );
  }
}
