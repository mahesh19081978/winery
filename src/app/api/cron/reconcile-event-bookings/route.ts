import { NextRequest, NextResponse } from 'next/server';
import { EventBookingService } from '@/server/services';

/**
 * Scheduled Cron Endpoint: Reconcile Expired Event Bookings
 *
 * Runs automatically (e.g. every 15 minutes via Vercel Cron or external scheduler).
 *
 * Security:
 * - Checks Authorization: Bearer <CRON_SECRET> header.
 * - In production environments, if CRON_SECRET is configured, requests without
 *   a valid Bearer token are rejected with 401 Unauthorized.
 * - In local development / preview where CRON_SECRET may not yet be defined in .env,
 *   a warning is logged or request is permitted for manual testing if CRON_SECRET is not set.
 */
export async function GET(request: Request | NextRequest) {
  return handleReconciliation(request);
}

export async function POST(request: Request | NextRequest) {
  return handleReconciliation(request);
}

async function handleReconciliation(request: Request | NextRequest) {
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret) {
    const authHeader = request.headers.get('authorization');
    if (!authHeader || authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: Invalid or missing CRON_SECRET' },
        { status: 401 }
      );
    }
  } else if (process.env.NODE_ENV === 'production') {
    // In production, CRON_SECRET must be configured
    return NextResponse.json(
      { success: false, error: 'Server misconfiguration: CRON_SECRET is not set' },
      { status: 500 }
    );
  }

  try {
    const { BookingService } = await import('@/server/services');
    const [eventResult, experienceResult] = await Promise.all([
      EventBookingService.reconcileAllWineries(),
      BookingService.reconcileAllWineries(),
    ]);

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      events: eventResult,
      experiences: experienceResult,
    });
  } catch (error) {
    console.error('[CRON /api/cron/reconcile-event-bookings] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal reconciliation error',
      },
      { status: 500 }
    );
  }
}
