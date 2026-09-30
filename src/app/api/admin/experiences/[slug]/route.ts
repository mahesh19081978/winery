import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '@/lib/auth';
import { ExperienceService } from '@/server/services';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const session = await AuthService.getSession();
    if (!session || !AuthService.isStaffRole(session.role)) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { slug } = await params;
    const body = await request.json() as Record<string, unknown>;

    const payload: Record<string, unknown> = {
      title: body.title ? String(body.title).trim() : undefined,
      slug: body.slug ? String(body.slug).trim() : undefined,
      category: body.category as import('@prisma/client').ExperienceCategory,
      durationMinutes: body.durationMinutes ? Number(body.durationMinutes) : undefined,
      durationText: body.durationText ? String(body.durationText).trim() : undefined,
      price: body.price !== undefined ? Number(body.price) : undefined,
      currency: body.currency ? String(body.currency) : undefined,
      shortDescription: body.shortDescription ? String(body.shortDescription).trim() : undefined,
      description: body.description ? String(body.description).trim() : undefined,
      capacity: body.capacity !== undefined ? Number(body.capacity) : undefined,
      minGuests: body.minGuests !== undefined ? Number(body.minGuests) : undefined,
      maxGuests: body.maxGuests !== undefined ? Number(body.maxGuests) : undefined,
      foodPairing: body.foodPairing !== undefined ? (body.foodPairing ? String(body.foodPairing) : null) : undefined,
      badge: body.badge !== undefined ? (body.badge ? String(body.badge) : null) : undefined,
      featured: body.featured !== undefined ? Boolean(body.featured) : undefined,
      isActive: body.isActive !== undefined ? Boolean(body.isActive) : undefined,
      highlights: Array.isArray(body.highlights) ? (body.highlights as string[]) : undefined,
      includedItems: Array.isArray(body.includedItems) ? (body.includedItems as string[]) : undefined,
      guestExpectations: Array.isArray(body.guestExpectations) ? (body.guestExpectations as string[]) : undefined,
      importantInfo: Array.isArray(body.importantInfo) ? (body.importantInfo as string[]) : undefined,
    };

    // Remove undefined values
    Object.keys(payload).forEach(key => payload[key] === undefined && delete payload[key]);

    // Handle includedWines separately
    let includedWinesInput: unknown[] | undefined = undefined;
    if (body.includedWines !== undefined && Array.isArray(body.includedWines)) {
      includedWinesInput = body.includedWines;
    }
    
    // Handle images separately
    let imagesInput: unknown[] | undefined = undefined;
    if (body.images !== undefined && Array.isArray(body.images)) {
      imagesInput = body.images;
    }

    // Handle timelines separately
    let timelinesInput: unknown[] | undefined = undefined;
    if (body.timelines !== undefined && Array.isArray(body.timelines)) {
      timelinesInput = body.timelines;
    }

    // Handle faqs separately
    let faqsInput: unknown[] | undefined = undefined;
    if (body.faqs !== undefined && Array.isArray(body.faqs)) {
      faqsInput = body.faqs;
    }

    const result = await ExperienceService.updateExperienceAdmin(slug, payload, includedWinesInput, imagesInput, timelinesInput, faqsInput);

    return NextResponse.json({ success: true, data: result });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to update experience';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
