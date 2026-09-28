import React from 'react';
import { ConversationsClient } from './ConversationsClient';

export const metadata = {
  title: 'Guest Conversations & Concierge Chat | VINORA Admin',
  description: 'AI sommelier chat interactions, guest queries, tasting recommendations, and concierge transcripts',
};

export default function AdminConversationsPage() {
  return <ConversationsClient />;
}
