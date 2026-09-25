'use client';

import { useState, useCallback } from 'react';

export interface RazorpayPaymentSuccessResponse {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
}

export interface ClientPaymentDTO {
  id: string;
  bookingNumber: string;
  bookingType: string;
  amount: string | number;
  currency: string;
  status: string;
  provider: string;
  providerOrderId: string | null;
  providerPaymentId: string | null;
  paymentMethod: string | null;
  errorCode?: string | null;
  errorMessage?: string | null;
  createdAt: string | Date;
  updatedAt?: string | Date;
}

export interface RazorpayOptions {
  key: string;
  amount: number;
  currency: string;
  name: string;
  description?: string;
  image?: string;
  order_id: string;
  handler: (response: RazorpayPaymentSuccessResponse) => void | Promise<void>;
  prefill?: {
    name?: string;
    email?: string;
    contact?: string;
  };
  notes?: Record<string, string>;
  theme?: {
    color?: string;
    backdrop_color?: string;
  };
  modal?: {
    ondismiss?: () => void | Promise<void>;
    escape?: boolean;
    backdropclose?: boolean;
    handleback?: boolean;
    confirm_close?: boolean;
  };
}

export interface RazorpayInstance {
  open: () => void;
  close: () => void;
  on: (event: string, handler: (response: unknown) => void) => void;
}

declare global {
  interface Window {
    Razorpay?: new (options: RazorpayOptions) => RazorpayInstance;
  }
}

/**
 * Dynamically loads the official Razorpay Checkout SDK (checkout.js).
 * Returns true if loaded successfully, false otherwise.
 */
export function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined') {
      resolve(false);
      return;
    }
    if (window.Razorpay) {
      resolve(true);
      return;
    }
    const existing = document.querySelector('script[src="https://checkout.razorpay.com/v1/checkout.js"]');
    if (existing) {
      existing.addEventListener('load', () => resolve(true));
      existing.addEventListener('error', () => resolve(false));
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

export interface LaunchCheckoutParams {
  bookingType: 'EXPERIENCE' | 'EVENT';
  bookingNumber: string;
  guestName: string;
  guestEmail: string;
  guestPhone?: string;
  title?: string;
  onSuccess?: (data: unknown) => void;
  onFailure?: (error: string) => void;
  onDismiss?: () => void;
}

export interface CheckoutResult {
  success: boolean;
  data?: unknown;
  error?: string;
  dismissed?: boolean;
}

/**
 * Reusable coordinator to launch Razorpay Checkout for a reservation,
 * handle modal dismissals, report failures, and cryptographically verify payment.
 */
export async function openRazorpayCheckout({
  bookingType,
  bookingNumber,
  guestName,
  guestEmail,
  guestPhone,
  title,
  onSuccess,
  onFailure,
  onDismiss,
}: LaunchCheckoutParams): Promise<CheckoutResult> {
  // 1. Create or retrieve active Razorpay order from server
  let orderData: {
    keyId: string;
    orderId: string;
    amountSubunits: number;
    currency: string;
    amount: number;
    bookingNumber: string;
    bookingType: string;
    alreadyCreated?: boolean;
  };

  try {
    const res = await fetch('/api/payments/create-order', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bookingType, bookingNumber }),
    });

    const json = await res.json();
    if (!res.ok || !json.success) {
      const errorMsg = json.error || 'Failed to initialize payment gateway order';
      onFailure?.(errorMsg);
      return { success: false, error: errorMsg };
    }
    orderData = json.data;
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Network error during order creation';
    onFailure?.(errorMsg);
    return { success: false, error: errorMsg };
  }

  // 2. Ensure checkout.js script is loaded
  const scriptLoaded = await loadRazorpayScript();
  if (!scriptLoaded || !window.Razorpay) {
    const errorMsg = 'Failed to load Razorpay payment SDK. Please disable ad-blockers and try again.';
    onFailure?.(errorMsg);
    return { success: false, error: errorMsg };
  }

  // 3. Open modal and await user action
  return new Promise<CheckoutResult>((resolve) => {
    let resolved = false;

    const options: RazorpayOptions = {
      key: orderData.keyId,
      amount: orderData.amountSubunits,
      currency: orderData.currency || 'USD',
      name: 'Domaine de VINORA',
      description: title || `${bookingType === 'EXPERIENCE' ? 'Experience' : 'Event'} Reservation #${bookingNumber}`,
      image: '/logo.png',
      order_id: orderData.orderId,
      prefill: {
        name: guestName,
        email: guestEmail,
        contact: guestPhone || '',
      },
      notes: {
        bookingNumber,
        bookingType,
      },
      theme: {
        color: '#722F37', // Vinora Burgundy
      },
      handler: async (response: RazorpayPaymentSuccessResponse) => {
        if (resolved) return;
        try {
          const verifyRes = await fetch('/api/payments/verify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              bookingType,
              bookingNumber,
              razorpayOrderId: response.razorpay_order_id,
              razorpayPaymentId: response.razorpay_payment_id,
              razorpaySignature: response.razorpay_signature,
            }),
          });

          const verifyData = await verifyRes.json();
          if (!verifyRes.ok || !verifyData.success) {
            const err = verifyData.error || 'Payment verification failed';
            resolved = true;
            onFailure?.(err);
            resolve({ success: false, error: err });
            return;
          }

          resolved = true;
          onSuccess?.(verifyData.data);
          resolve({ success: true, data: verifyData.data });
        } catch (err: unknown) {
          const errorMsg = err instanceof Error ? err.message : 'Payment verification network error';
          resolved = true;
          onFailure?.(errorMsg);
          resolve({ success: false, error: errorMsg });
        }
      },
      modal: {
        ondismiss: async () => {
          if (resolved) return;
          resolved = true;
          try {
            await fetch('/api/payments/failure', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                bookingType,
                bookingNumber,
                providerOrderId: orderData.orderId,
                errorCode: 'USER_DISMISSED',
                errorMessage: 'Payment checkout closed by guest before completion',
              }),
            });
          } catch {
            // Non-blocking telemetry
          }
          onDismiss?.();
          resolve({ success: false, dismissed: true, error: 'Payment modal closed before completion' });
        },
      },
    };

    try {
      // window.Razorpay is guaranteed to be defined by the check at line 148
      const RazorpayConstructor = window.Razorpay!;
      const rzp = new RazorpayConstructor(options);

      rzp.on('payment.failed', async (failureResponse: unknown) => {
        const failure = (failureResponse as { error?: { code?: string; description?: string } })?.error || {};
        try {
          await fetch('/api/payments/failure', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              bookingType,
              bookingNumber,
              providerOrderId: orderData.orderId,
              errorCode: failure.code || 'GATEWAY_ERROR',
              errorMessage: failure.description || 'Payment failed at gateway',
            }),
          });
        } catch {
          // Non-blocking
        }
      });

      rzp.open();
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to launch Razorpay checkout modal';
      resolved = true;
      onFailure?.(errorMsg);
      resolve({ success: false, error: errorMsg });
    }
  });
}

/**
 * Custom React hook for seamless Razorpay checkout state management in components.
 */
export function useRazorpayCheckout() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [successData, setSuccessData] = useState<unknown>(null);

  const checkout = useCallback(
    async (params: LaunchCheckoutParams): Promise<CheckoutResult> => {
      setIsProcessing(true);
      setError(null);
      setDismissed(false);

      const result = await openRazorpayCheckout({
        ...params,
        onSuccess: (data) => {
          setSuccessData(data);
          params.onSuccess?.(data);
        },
        onFailure: (err) => {
          setError(err);
          params.onFailure?.(err);
        },
        onDismiss: () => {
          setDismissed(true);
          params.onDismiss?.();
        },
      });

      setIsProcessing(false);
      return result;
    },
    []
  );

  const reset = useCallback(() => {
    setIsProcessing(false);
    setError(null);
    setDismissed(false);
    setSuccessData(null);
  }, []);

  return {
    checkout,
    reset,
    isProcessing,
    error,
    dismissed,
    successData,
    isSuccess: Boolean(successData),
  };
}
