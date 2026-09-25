import Razorpay from 'razorpay';
import crypto from 'crypto';

export interface RazorpayConfig {
  keyId: string;
  keySecret: string;
  webhookSecret?: string;
}

let razorpayClientInstance: Razorpay | null = null;

/**
 * Returns the configured Razorpay API credentials.
 * Throws in production if missing.
 */
export function getRazorpayConfig(): RazorpayConfig {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;

  if (!keyId || !keySecret) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error(
        'Razorpay configuration missing: RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET are required in production.'
      );
    }
  }

  return {
    keyId: keyId || '',
    keySecret: keySecret || '',
    webhookSecret: webhookSecret || '',
  };
}

/**
 * Returns a singleton instance of the Razorpay client.
 */
export function getRazorpayClient(customConfig?: Partial<RazorpayConfig>): Razorpay {
  if (customConfig?.keyId && customConfig?.keySecret) {
    return new Razorpay({
      key_id: customConfig.keyId,
      key_secret: customConfig.keySecret,
    });
  }

  if (razorpayClientInstance) {
    return razorpayClientInstance;
  }

  const config = getRazorpayConfig();
  if (!config.keyId || !config.keySecret) {
    throw new Error(
      'Cannot initialize Razorpay client: RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET environment variables are not set.'
    );
  }

  razorpayClientInstance = new Razorpay({
    key_id: config.keyId,
    key_secret: config.keySecret,
  });

  return razorpayClientInstance;
}

/**
 * Verifies Razorpay client-side payment completion signature (HMAC-SHA256).
 *
 * Razorpay algorithm:
 * expectedSignature = hmac_sha256(order_id + "|" + payment_id, secret)
 *
 * Uses constant-time comparison (crypto.timingSafeEqual) to prevent timing attacks.
 */
export function verifyPaymentSignature(params: {
  orderId: string;
  paymentId: string;
  signature: string;
  secret?: string;
}): boolean {
  const secret = params.secret || process.env.RAZORPAY_KEY_SECRET;
  if (!secret) {
    throw new Error('Razorpay key secret is required to verify payment signature.');
  }

  if (!params.orderId || !params.paymentId || !params.signature) {
    return false;
  }

  const payload = `${params.orderId}|${params.paymentId}`;
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');

  const expectedBuffer = Buffer.from(expectedSignature, 'utf8');
  const actualBuffer = Buffer.from(params.signature, 'utf8');

  if (expectedBuffer.length !== actualBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(expectedBuffer, actualBuffer);
}

/**
 * Verifies Razorpay server-to-server webhook signature (HMAC-SHA256).
 *
 * Razorpay algorithm:
 * expectedSignature = hmac_sha256(rawRequestBody, webhookSecret)
 *
 * Uses constant-time comparison (crypto.timingSafeEqual) to prevent timing attacks.
 */
export function verifyWebhookSignature(params: {
  rawBody: string | Buffer;
  signature: string;
  webhookSecret?: string;
}): boolean {
  const secret = params.webhookSecret || process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret) {
    throw new Error('Razorpay webhook secret is required to verify webhook signature.');
  }

  if (!params.rawBody || !params.signature) {
    return false;
  }

  const bodyBuffer = Buffer.isBuffer(params.rawBody)
    ? params.rawBody
    : Buffer.from(params.rawBody, 'utf8');

  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(bodyBuffer)
    .digest('hex');

  const expectedBuffer = Buffer.from(expectedSignature, 'utf8');
  const actualBuffer = Buffer.from(params.signature, 'utf8');

  if (expectedBuffer.length !== actualBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(expectedBuffer, actualBuffer);
}

/**
 * Converts a currency amount in standard decimal units (e.g. 150.00 USD)
 * to gateway subunits (e.g. 15000 cents/paise).
 */
export function toSubunits(amount: number | string): number {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (isNaN(num)) {
    throw new Error(`Invalid monetary amount: ${amount}`);
  }
  return Math.round(num * 100);
}

/**
 * Converts gateway subunits (e.g. 15000 cents/paise)
 * back to standard decimal units (e.g. 150.00).
 */
export function fromSubunits(subunits: number): number {
  return Number((subunits / 100).toFixed(2));
}
