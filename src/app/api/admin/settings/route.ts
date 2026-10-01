import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { encrypt } from '@/lib/crypto';
import { requireApiPermission } from '@/lib/auth/permissions';

export async function GET() {
  try {
    const guard = await requireApiPermission('settings.view');
    if (!guard.ok) return guard.response;

    // Tenant isolation: staff only read their own winery; SUPER_ADMIN may read any.
    const scope =
      guard.session.role === 'SUPER_ADMIN'
        ? {}
        : { id: guard.session.wineryId ?? '__no_tenant__' };

    const winery = await prisma.winery.findFirst({
      where: scope,
      include: {
        aiSettings: { select: { isEnabled: true, provider: true, modelName: true, apiKeyEncrypted: true } },
        closures: {
          orderBy: { startDate: 'asc' },
        },
        availabilityRules: {
          include: { experience: { select: { title: true } } },
          orderBy: { dayOfWeek: 'asc' },
        },
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        winery: {
          ...winery,
          aiSettings: winery?.aiSettings ? {
            ...winery.aiSettings,
            apiKeyEncrypted: winery.aiSettings.apiKeyEncrypted ? '********' : ''
          } : null
        },
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch estate settings';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const guard = await requireApiPermission('settings.manage');
    if (!guard.ok) return guard.response;

    const body = await req.json();
    const { wineryId: requestedWineryId, aiSettings } = body;

    // Never trust a client-supplied wineryId for normal staff. SUPER_ADMIN may
    // target any winery explicitly (existing cross-winery behaviour).
    let wineryId: string;
    if (guard.session.role === 'SUPER_ADMIN') {
      wineryId = requestedWineryId || guard.session.wineryId || '';
      if (!wineryId) {
        return NextResponse.json({ success: false, error: 'Missing winery ID' }, { status: 400 });
      }
    } else {
      if (!guard.session.wineryId) {
        return NextResponse.json({ success: false, error: 'Winery context missing' }, { status: 403 });
      }
      if (requestedWineryId && requestedWineryId !== guard.session.wineryId) {
        return NextResponse.json(
          { success: false, error: 'Forbidden: cannot modify settings of another winery' },
          { status: 403 }
        );
      }
      wineryId = guard.session.wineryId;
    }

    if (aiSettings) {
      const updateData: Record<string, string | boolean> = {
        isEnabled: aiSettings.isEnabled,
        provider: aiSettings.provider,
        modelName: aiSettings.modelName,
      };
      
      let newEncryptedKey: string | null = null;
      if (aiSettings.apiKey && aiSettings.apiKey !== '********') {
        newEncryptedKey = encrypt(aiSettings.apiKey);
        updateData.apiKeyEncrypted = newEncryptedKey;
      }
      
      await prisma.aISettings.upsert({
        where: { wineryId },
        update: updateData,
        create: {
          wineryId,
          isEnabled: aiSettings.isEnabled,
          provider: aiSettings.provider,
          modelName: aiSettings.modelName,
          apiKeyEncrypted: newEncryptedKey,
        },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Settings save error:', error);
    const message = error instanceof Error ? error.message : 'Failed to save settings';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
