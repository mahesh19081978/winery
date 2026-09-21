import { NextRequest, NextResponse } from 'next/server';
import { ExperienceService } from '@/server/services';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await context.params;
    const experience = await ExperienceService.getExperienceBySlug(slug);
    return NextResponse.json({ success: true, data: experience });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Experience not found';
    return NextResponse.json({ success: false, error: message }, { status: 404 });
  }
}