import { NextResponse } from 'next/server';
import { AuthService } from '@/lib/auth';
import { FrontDeskService } from '@/server/services';

export async function GET() {
  try {
    const session = await AuthService.getSession();
    if (!session || !AuthService.isStaffRole(session.role)) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const data = await FrontDeskService.getTodayOperations();
    return NextResponse.json({ success: true, data });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch front desk operations';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
