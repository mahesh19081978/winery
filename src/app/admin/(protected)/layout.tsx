import React from 'react';
import { redirect } from 'next/navigation';
import { AuthService } from '@/lib/auth';
import { AdminAuthService } from '@/server/services';
import { AdminShellClient } from '@/components/admin/AdminShellClient';

export const metadata = {
  title: 'VINORA | Estate Management Portal',
};

export default async function ProtectedAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Re-validates the session against the database (role, winery, isActive)
  // so deactivated or demoted accounts lose access before the JWT expires.
  const session = await AdminAuthService.getActiveSession();

  // Route protection fallback
  if (!session || !AuthService.isStaffRole(session.role)) {
    redirect('/admin/login?error=account_inactive');
  }

  return (
    <AdminShellClient adminEmail={session.email} adminRole={session.role}>
      {children}
    </AdminShellClient>
  );
}
