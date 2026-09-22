import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '@/lib/auth';
import { WineService } from '@/server/services';
import { WineVintageCreateSchema } from '@/server/validators';
import { prisma } from '@/lib/db';

function authCheck(session: Awaited<ReturnType<typeof AuthService.getSession>>) {
  if (!session) return { status: 401 as const, error: 'Unauthorized' };
  if (!AuthService.isStaffRole(session.role)) return { status: 403 as const, error: 'Forbidden' };
  return null;
}

async function resolveWineId(slug: string): Promise<string> {
  // Allow both slug and id (client sends slug or uuid)
  // Try id first (uuid), then slug
  const byId = await prisma.wine.findUnique({ where: { id: slug }, select: { id: true } }).catch(() => null);
  if (byId) return byId.id;
  const bySlug = await prisma.wine.findFirst({ where: { slug }, select: { id: true } });
  if (bySlug) return bySlug.id;
  throw new Error(`Wine not found: ${slug}`);
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const session = await AuthService.getSession();
    const auth = authCheck(session);
    if (auth) return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });

    const { slug } = await params;
    const wineId = await resolveWineId(slug);
    const body = await request.json();
    if ('id' in body) delete body.id;
    if ('wineId' in body) delete body.wineId;
    if ('createdAt' in body) delete body.createdAt;
    if ('updatedAt' in body) delete body.updatedAt;

    const validated = WineVintageCreateSchema.parse(body);
    const vintage = await WineService.createVintage(wineId, validated);
    return NextResponse.json({ success: true, data: vintage }, { status: 201 });
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
    const message = error instanceof Error ? error.message : 'Failed to create vintage';
    if (message.includes('not found')) return NextResponse.json({ success: false, error: message }, { status: 404 });
    if (message.includes('already exists')) return NextResponse.json({ success: false, error: message }, { status: 409 });
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}
