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

    const winery = await prisma.winery.findFirst({ where: { slug: 'domaine-elysee' } });
    if (!winery) {
      return NextResponse.json({ success: false, error: 'Winery not found' }, { status: 500 });
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
      const schedule = await AvailabilityService.getScheduleView(winery.id, startDate, endDate);
      return NextResponse.json({ success: true, data: schedule });
    }

    const overview = await AvailabilityService.getAvailabilityOverview(winery.id);
    return NextResponse.json({ success: true, data: overview });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch availability';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
