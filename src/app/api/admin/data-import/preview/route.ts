import { NextRequest, NextResponse } from 'next/server';
import { requireApiPermission } from '@/lib/auth/permissions';
import {
  DataImportService,
  MAX_FILE_SIZE_BYTES,
} from '@/lib/data-import';
import { ImportEntityType } from '@/lib/data-import/types';

export async function POST(request: NextRequest) {
  try {
    const contentType = request.headers.get('content-type') || '';
    let entityType: ImportEntityType;
    let csvContent = '';

    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      const entityParam = formData.get('entityType') as string;
      const file = formData.get('file') as File | null;

      if (!entityParam || !['wines', 'experiences', 'events'].includes(entityParam)) {
        return NextResponse.json(
          { success: false, error: 'Invalid or missing entityType ("wines", "experiences", "events")' },
          { status: 400 }
        );
      }
      entityType = entityParam as ImportEntityType;

      if (!file) {
        return NextResponse.json(
          { success: false, error: 'CSV file is required.' },
          { status: 400 }
        );
      }

      if (file.size > MAX_FILE_SIZE_BYTES) {
        return NextResponse.json(
          { success: false, error: 'File size exceeds 5MB limit.' },
          { status: 400 }
        );
      }

      const buffer = await file.arrayBuffer();
      csvContent = new TextDecoder('utf-8').decode(buffer);
    } else {
      const body = await request.json();
      entityType = body.entityType;
      csvContent = body.csvContent;

      if (!entityType || !['wines', 'experiences', 'events'].includes(entityType)) {
        return NextResponse.json(
          { success: false, error: 'Invalid or missing entityType ("wines", "experiences", "events")' },
          { status: 400 }
        );
      }

      if (!csvContent || typeof csvContent !== 'string') {
        return NextResponse.json(
          { success: false, error: 'csvContent string is required.' },
          { status: 400 }
        );
      }

      if (Buffer.byteLength(csvContent, 'utf-8') > MAX_FILE_SIZE_BYTES) {
        return NextResponse.json(
          { success: false, error: 'CSV content exceeds 5MB limit.' },
          { status: 400 }
        );
      }
    }

    // Role verification: check specific entity permission
    let requiredPermission: 'wines.manage' | 'experiences.manage' | 'events.manage' = 'wines.manage';
    if (entityType === 'experiences') requiredPermission = 'experiences.manage';
    if (entityType === 'events') requiredPermission = 'events.manage';

    const guard = await requireApiPermission(requiredPermission);
    if (!guard.ok) return guard.response;

    const preview = await DataImportService.previewImport(entityType, csvContent);

    return NextResponse.json({
      success: true,
      data: preview,
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Failed to preview CSV import';
    return NextResponse.json({ success: false, error: msg }, { status: 400 });
  }
}
