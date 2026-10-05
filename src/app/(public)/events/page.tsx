import React from 'react';
import { WebsiteImageService } from '@/server/services';
import EventsClient from './EventsClient';

export default async function EventsPage() {
  const hero = await WebsiteImageService.resolvePublicImage('EVENTS_HERO');
  return <EventsClient hero={{ url: hero.url, alt: hero.alt }} />;
}
