import React from 'react';
import { requirePagePermission } from '@/lib/auth/permissions';
import { NotificationsClient } from './NotificationsClient';

export const metadata = {
  title: 'Notifications & Dispatch Log | VINORA Admin',
  description: 'Transactional notifications, guest confirmation dispatches, and estate reminders',
};

export default async function AdminNotificationsPage() {
  await requirePagePermission('notifications.view');

  return <NotificationsClient />;
}
