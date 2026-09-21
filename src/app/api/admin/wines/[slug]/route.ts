import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '@/lib/auth';
import { WineService } from '@/server/services';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ slug: string }> }
) {
  try {
    const session = await AuthService.getSession();
    if (!session || !AuthService.isStaffRole(session.role)) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { slug } = await context.params;
    const wine = await WineService.getWineBySlugAdmin(slug);
    return NextResponse.json({ success: true, data: wine });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Wine not found';
    return NextResponse.json({ success: false, error: message }, { status: 404 });
  }
}
