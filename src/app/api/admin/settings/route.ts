import { NextResponse } from 'next/server';
import { AuthService } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { encrypt } from '@/lib/crypto';

export async function GET() {
  try {
    const session = await AuthService.getSession();
    if (!session || !AuthService.isStaffRole(session.role)) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const winery = await prisma.winery.findFirst({
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
    const session = await AuthService.getSession();
    if (!session || !AuthService.isStaffRole(session.role)) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { wineryId, aiSettings } = body;
    
    if (!wineryId) return NextResponse.json({ success: false, error: 'Missing winery ID' }, { status: 400 });

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
