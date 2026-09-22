import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '@/lib/auth';
import { WineService } from '@/server/services';
import { WineVintageUpdateSchema } from '@/server/validators';
import { prisma } from '@/lib/db';

function authCheck(session: Awaited<ReturnType<typeof AuthService.getSession>>) {
  if (!session) return { status: 401 as const, error: 'Unauthorized' };
  if (!AuthService.isStaffRole(session.role)) return { status: 403 as const, error: 'Forbidden' };
  return null;
}

async function resolveWineId(slug: string): Promise<string> {
  const byId = await prisma.wine.findUnique({ where: { id: slug }, select: { id: true } }).catch(() => null);
  if (byId) return byId.id;
  const bySlug = await prisma.wine.findFirst({ where: { slug }, select: { id: true } });
  if (bySlug) return bySlug.id;
  throw new Error(`Wine with id '${slug}' not found`);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string; vintageId: string }> }
) {
  try {
    const session = await AuthService.getSession();
    const auth = authCheck(session);
    if (auth) return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });

    const { slug, vintageId } = await params;
    const wineId = await resolveWineId(slug);
    const body = await request.json();
    if ('id' in body) delete body.id;
    if ('wineId' in body) delete body.wineId;
    if ('createdAt' in body) delete body.createdAt;
    if ('updatedAt' in body) delete body.updatedAt;

    const validated = WineVintageUpdateSchema.parse(body);
    const vintage = await WineService.updateVintage(wineId, vintageId, validated);
    return NextResponse.json({ success: true, data: vintage });
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'name' in error && (error as { name: string }).name === 'ZodError') {
      const zod = error as { issues?: unknown };
      return NextResponse.json({ success: false, error: 'Validation failed', details: zod.issues }, { status: 400 });
    }
    if (error && typeof error === 'object' && 'statusCode' in error) {
      const sc = (error as { statusCode: number }).statusCode;
      const msg = error instanceof Error ? error.message : 'Failed';
      return NextResponse.json({ success: false, error: msg }, { status: sc });
    }
    const message = error instanceof Error ? error.message : 'Failed to update vintage';
    if (message.includes('not found')) return NextResponse.json({ success: false, error: message }, { status: 404 });
    if (message.includes('already exists') || message.includes('Cannot change')) return NextResponse.json({ success: false, error: message }, { status: 409 });
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string; vintageId: string }> }
) {
  try {
    const session = await AuthService.getSession();
    const auth = authCheck(session);
    if (auth) return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });

    const { slug, vintageId } = await params;
    const wineId = await resolveWineId(slug);
    await WineService.deleteVintage(wineId, vintageId);
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'statusCode' in error) {
      const sc = (error as { statusCode: number }).statusCode;
      const msg = error instanceof Error ? error.message : 'Failed';
      return NextResponse.json({ success: false, error: msg }, { status: sc });
    }
    const message = error instanceof Error ? error.message : 'Failed to delete vintage';
    if (message.includes('not found')) return NextResponse.json({ success: false, error: message }, { status: 404 });
    if (message.includes('Cannot delete')) return NextResponse.json({ success: false, error: message }, { status: 409 });
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}
