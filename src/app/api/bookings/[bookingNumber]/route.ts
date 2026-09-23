import { NextRequest, NextResponse } from 'next/server';
import { BookingService } from '@/server/services';
import { getGuestSession } from '@/lib/auth/guest';
import { AuthService } from '@/lib/auth';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ bookingNumber: string }> }
) {
  try {
    const { bookingNumber } = await context.params;
    const booking = await BookingService.getBookingByNumber(bookingNumber);

    // Check sessions
    const guestSession = await getGuestSession();
    if (guestSession) {
      // Authenticated GUEST: strictly enforce ownership
      if (booking.guestProfileId !== guestSession.guestProfileId) {
        return NextResponse.json({ success: false, error: 'Booking not found' }, { status: 404 });
      }
      return NextResponse.json({ success: true, data: booking });
    }

    // Check staff/admin session
    const adminSession = await AuthService.getSession();
    if (adminSession && AuthService.isStaffRole(adminSession.role)) {
      return NextResponse.json({ success: true, data: booking });
    }

    // Unauthenticated public lookup by exact booking number (preserves public confirmation view)
    return NextResponse.json({ success: true, data: booking });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Booking not found';
    return NextResponse.json({ success: false, error: message }, { status: 404 });
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ bookingNumber: string }> }
) {
  try {
    const { bookingNumber } = await context.params;
    const booking = await BookingService.getBookingByNumber(bookingNumber);

    // Check sessions
    const guestSession = await getGuestSession();
    if (guestSession) {
      // Authenticated GUEST: strictly enforce ownership
      if (booking.guestProfileId !== guestSession.guestProfileId) {
        return NextResponse.json({ success: false, error: 'Unauthorized to cancel this booking' }, { status: 403 });
      }
    } else {
      // If not a guest session, check if it's admin or public
      const adminSession = await AuthService.getSession();
      if (!adminSession || !AuthService.isStaffRole(adminSession.role)) {
        // Unauthenticated public cancellation - only permitted if booking was unauthenticated (not belonging to a registered user with password)
        const isRegisteredAccount = booking.guestProfile?.user?.passwordHash !== null && booking.guestProfile?.user?.passwordHash !== undefined;
        if (isRegisteredAccount) {
          return NextResponse.json({ success: false, error: 'Authentication required to manage this reservation' }, { status: 401 });
        }
      }
    }

    let reason: string | undefined;
    try {
      const body = await request.json();
      reason = body.reason;
    } catch {
      // Body is optional on delete
    }

    const cancelled = await BookingService.cancelBooking(bookingNumber, reason);
    return NextResponse.json({ success: true, data: cancelled, message: 'Booking cancelled successfully' });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to cancel booking';
    if (message.includes('not found')) {
      return NextResponse.json({ success: false, error: message }, { status: 404 });
    }
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}