import React from 'react';
import { requirePagePermission } from '@/lib/auth/permissions';
import { ReviewsListClient } from './ReviewsListClient';

export default async function AdminReviewsPage() {
  await requirePagePermission('reviews.view');

  return <ReviewsListClient />;
}
