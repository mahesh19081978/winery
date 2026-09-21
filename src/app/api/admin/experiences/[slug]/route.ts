import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '@/lib/auth';
import { ExperienceService } from '@/server/services';

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
    const experience = await ExperienceService.getExperienceBySlugAdmin(slug);
    return NextResponse.json({ success: true, data: experience });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Experience not found';
    return NextResponse.json({ success: false, error: message }, { status: 404 });
  }
}
