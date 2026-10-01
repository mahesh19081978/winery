import { NextRequest, NextResponse } from 'next/server';
import { StaffService } from '@/server/services';
import { StaffCreateSchema } from '@/server/validators';
import { requireApiPermission } from '@/lib/auth/permissions';
import { staffErrorResponse } from './staff-error';

export async function GET() {
  try {
    const guard = await requireApiPermission('staff.view');
    if (!guard.ok) return guard.response;

    const data = await StaffService.list();

    return NextResponse.json({
      success: true,
      data,
    });
  } catch (error) {
    return staffErrorResponse(error, 'Failed to fetch staff members');
  }
}

export async function POST(request: NextRequest) {
  try {
    const guard = await requireApiPermission('staff.manage', request);
    if (!guard.ok) return guard.response;

    await StaffService.authorizeManage();
    const body = await request.json();
    const validated = StaffCreateSchema.parse(body);

    const staff = await StaffService.create(validated);

    return NextResponse.json(
      { success: true, data: { staff }, message: 'User created successfully' },
      { status: 201 }
    );
  } catch (error) {
    return staffErrorResponse(error, 'Failed to create user');
  }
}
