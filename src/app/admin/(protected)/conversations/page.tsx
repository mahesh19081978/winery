import React from 'react';
import { requirePagePermission } from '@/lib/auth/permissions';
import { ConversationsClient } from './ConversationsClient';

export const metadata = {
  title: 'Guest Conversations & Concierge Chat | VINORA Admin',
  description: 'AI sommelier chat interactions, guest queries, tasting recommendations, and concierge transcripts',
};

export default async function AdminConversationsPage() {
  await requirePagePermission('conversations.view');

  return <ConversationsClient />;
}
