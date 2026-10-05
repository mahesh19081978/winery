import React from 'react';
import { WebsiteImageService } from '@/server/services';
import ReviewsClient from './ReviewsClient';

export default async function ReviewsPage() {
  const hero = await WebsiteImageService.resolvePublicImage('REVIEWS_HERO');
  return <ReviewsClient hero={{ url: hero.url, alt: hero.alt }} />;
}
