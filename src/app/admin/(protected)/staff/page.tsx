import React from 'react';
import { requirePagePermission, getRoleMatrix } from '@/lib/auth/permissions';
import { StaffClient } from './StaffClient';

export const metadata = {
  title: 'Staff & Roles Access Control | VINORA Admin',
  description: 'Estate staff access control, role hierarchy, sommelier privileges, and cellar permissions',
};

export default async function AdminStaffPage() {
  await requirePagePermission('staff.view');
  const roleMatrix = getRoleMatrix();
  return <StaffClient roleMatrix={roleMatrix} />;
}
