import React from 'react';
import { StaffClient } from './StaffClient';

export const metadata = {
  title: 'Staff & Roles Access Control | VINORA Admin',
  description: 'Estate staff access control, role hierarchy, sommelier privileges, and cellar permissions',
};

export default function AdminStaffPage() {
  return <StaffClient />;
}
