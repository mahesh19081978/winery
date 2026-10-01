import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '@/lib/auth';
import { AvailabilityService } from '@/server/services';
import { prisma } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const session = await AuthService.getSession();
    if (!session || !AuthService.isStaffRole(session.role)) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    let wineryId = session.wineryId;
    if (!wineryId) {
      const defaultWinery = await prisma.winery.findFirst();
      if (!defaultWinery) {
        return NextResponse.json({ success: false, error: 'No winery found in system' }, { status: 500 });
      }
      wineryId = defaultWinery.id;
    }

    const { searchParams } = new URL(request.url);
    const view = searchParams.get('view') || 'overview';

    if (view === 'schedule') {
      const startDate = searchParams.get('startDate');
      const endDate = searchParams.get('endDate');
      if (!startDate || !endDate) {
        return NextResponse.json(
          { success: false, error: 'startDate and endDate are required for schedule view' },
          { status: 400 }
        );
      }
      const schedule = await AvailabilityService.getScheduleView(wineryId, startDate, endDate);
      return NextResponse.json({ success: true, data: schedule });
    }

    const overview = await AvailabilityService.getAvailabilityOverview(wineryId);
    return NextResponse.json({ success: true, data: overview });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch availability';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
