import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { AuthService } from '@/lib/auth';
import { prisma } from '@/lib/db';

const UpdateContactInquirySchema = z.object({
  status: z.enum(['NEW', 'IN_PROGRESS', 'RESOLVED', 'ARCHIVED']).optional(),
  assignedToId: z.string().uuid().optional().nullable(),
  internalNotes: z.string().max(4000).optional().nullable(),
});

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await AuthService.getSession();
    if (!session || !AuthService.isStaffRole(session.role)) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const inquiry = await prisma.contactInquiry.findUnique({
      where: { id },
      include: {
        assignedTo: {
          select: {
            id: true,
            email: true,
            role: true,
          },
        },
      },
    });

    if (!inquiry) {
      return NextResponse.json({ success: false, error: 'Contact inquiry not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: { inquiry },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch contact inquiry';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await AuthService.getSession();
    if (!session || !AuthService.isStaffRole(session.role)) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const json = await request.json();
    const validated = UpdateContactInquirySchema.parse(json);

    const existing = await prisma.contactInquiry.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json({ success: false, error: 'Contact inquiry not found' }, { status: 404 });
    }

    const updated = await prisma.contactInquiry.update({
      where: { id },
      data: {
        ...(validated.status !== undefined ? { status: validated.status } : {}),
        ...(validated.assignedToId !== undefined ? { assignedToId: validated.assignedToId } : {}),
        ...(validated.internalNotes !== undefined ? { internalNotes: validated.internalNotes } : {}),
      },
      include: {
        assignedTo: {
          select: {
            id: true,
            email: true,
            role: true,
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      data: { inquiry: updated },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ success: false, error: 'Validation failed', details: error.issues }, { status: 400 });
    }
    const message = error instanceof Error ? error.message : 'Failed to update contact inquiry';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await AuthService.getSession();
    if (!session || !AuthService.isStaffRole(session.role)) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const existing = await prisma.contactInquiry.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json({ success: false, error: 'Contact inquiry not found' }, { status: 404 });
    }

    await prisma.contactInquiry.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      message: 'Contact inquiry deleted successfully',
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to delete contact inquiry';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
