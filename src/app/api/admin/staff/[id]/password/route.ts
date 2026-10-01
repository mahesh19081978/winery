import { NextRequest, NextResponse } from 'next/server';
import { StaffService } from '@/server/services';
import { StaffPasswordChangeSchema } from '@/server/validators';
import { requireApiPermission } from '@/lib/auth/permissions';
import { staffErrorResponse } from '../../staff-error';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const guard = await requireApiPermission('staff.manage', request);
    if (!guard.ok) return guard.response;

    await StaffService.authorizeManage();
    const { id } = await params;
    const body = await request.json();
    const validated = StaffPasswordChangeSchema.parse(body);

    const result = await StaffService.changePassword(id, validated);

    return NextResponse.json({
      success: true,
      data: result,
      message: 'Password updated successfully',
    });
  } catch (error) {
    return staffErrorResponse(error, 'Failed to update password');
  }
}
