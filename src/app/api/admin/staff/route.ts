import { NextRequest, NextResponse } from 'next/server';
import { StaffService } from '@/server/services';
import { StaffCreateSchema } from '@/server/validators';
import { staffErrorResponse } from './staff-error';

export async function GET() {
  try {
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
