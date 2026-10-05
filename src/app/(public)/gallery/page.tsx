import React from 'react';
import { WebsiteImageService } from '@/server/services';
import GalleryClient from './GalleryClient';

export default async function GalleryPage() {
  const hero = await WebsiteImageService.resolvePublicImage('GALLERY_HERO');
  return <GalleryClient hero={{ url: hero.url, alt: hero.alt }} />;
}
