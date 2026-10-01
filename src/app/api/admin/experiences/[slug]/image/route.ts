import { NextRequest, NextResponse } from 'next/server';
import { ExperienceService } from '@/server/services';
import { prisma } from '@/lib/db';
import { Prisma } from '@prisma/client';
import { requireApiPermission } from '@/lib/auth/permissions';

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ slug: string }> }
) {
  try {
    const guard = await requireApiPermission('experiences.manage', request);
    if (!guard.ok) return guard.response;

    const { slug } = await context.params;
    const body = await request.json() as { url?: string };
    const url = body.url?.trim() || '';

    const experience = await ExperienceService.getExperienceBySlugAdmin(slug);
    if (!experience) {
      return NextResponse.json({ success: false, error: 'Experience not found' }, { status: 404 });
    }

    await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      await tx.experienceImage.deleteMany({
        where: { experienceId: experience.id },
      });

      if (url) {
        await tx.experienceImage.create({
          data: {
            experienceId: experience.id,
            url,
            isPrimary: true,
            sortOrder: 0,
          },
        });
      }
    });

    return NextResponse.json({ success: true, data: { url } });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to set experience image';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
