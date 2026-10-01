import { NextRequest, NextResponse } from 'next/server';
import { StaffService } from '@/server/services';
import { StaffUpdateSchema } from '@/server/validators';
import { requireApiPermission } from '@/lib/auth/permissions';
import { staffErrorResponse } from '../staff-error';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const guard = await requireApiPermission('staff.view');
    if (!guard.ok) return guard.response;

    const { id } = await params;
    const staff = await StaffService.getById(id);

    return NextResponse.json({ success: true, data: { staff } });
  } catch (error) {
    return staffErrorResponse(error, 'Failed to fetch user');
  }
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const guard = await requireApiPermission('staff.manage', request);
    if (!guard.ok) return guard.response;

    await StaffService.authorizeManage();
    const { id } = await params;
    const body = await request.json();
    const validated = StaffUpdateSchema.parse(body);

    const staff = await StaffService.update(id, validated);

    return NextResponse.json({
      success: true,
      data: { staff },
      message: 'User updated successfully',
    });
  } catch (error) {
    return staffErrorResponse(error, 'Failed to update user');
  }
}

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  try {
    const guard = await requireApiPermission('staff.manage');
    if (!guard.ok) return guard.response;

    const { id } = await params;
    const result = await StaffService.remove(id);

    return NextResponse.json({
      success: true,
      data: result,
      message: 'User deleted successfully',
    });
  } catch (error) {
    return staffErrorResponse(error, 'Failed to delete user');
  }
}
