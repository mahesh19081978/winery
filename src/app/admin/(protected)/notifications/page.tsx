import React from 'react';
import { NotificationsClient } from './NotificationsClient';

export const metadata = {
  title: 'Notifications & Dispatch Log | VINORA Admin',
  description: 'Transactional notifications, guest confirmation dispatches, and estate reminders',
};

export default function AdminNotificationsPage() {
  return <NotificationsClient />;
}
