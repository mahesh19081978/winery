import { NextResponse } from 'next/server';
import { ExperienceService } from '@/server/services';

export async function GET() {
  try {
    const experiences = await ExperienceService.getAllExperiences();
    return NextResponse.json({ success: true, data: experiences });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch experiences';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}