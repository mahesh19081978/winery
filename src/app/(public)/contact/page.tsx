import React from 'react';
import { WebsiteImageService } from '@/server/services';
import ContactClient from './ContactClient';

export default async function ContactPage() {
  const hero = await WebsiteImageService.resolvePublicImage('CONTACT_HERO');
  return <ContactClient hero={{ url: hero.url, alt: hero.alt }} />;
}
