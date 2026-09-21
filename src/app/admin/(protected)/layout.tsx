import React from 'react';
import { redirect } from 'next/navigation';
import { AuthService } from '@/lib/auth';
import { AdminShellClient } from '@/components/admin/AdminShellClient';

export const metadata = {
  title: 'Domaine Élysée | Estate Management Portal',
};

export default async function ProtectedAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await AuthService.getSession();

  // Route protection fallback
  if (!session || !AuthService.isStaffRole(session.role)) {
    redirect('/admin/login');
  }

  return (
    <AdminShellClient adminEmail={session.email} adminRole={session.role}>
      {children}
    </AdminShellClient>
  );
}
