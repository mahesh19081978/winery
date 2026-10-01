import React from 'react';
import { requirePagePermission } from '@/lib/auth/permissions';
import { ContactInquiriesClient } from './ContactInquiriesClient';

export default async function AdminContactInquiriesPage() {
  await requirePagePermission('inquiries.view');

  return <ContactInquiriesClient />;
}
