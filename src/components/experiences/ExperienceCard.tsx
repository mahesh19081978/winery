import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Clock, Wine as WineIcon, ArrowRight } from 'lucide-react';
import { Experience } from '@/types';
import RatingStars from '../common/RatingStars';

interface ExperienceCardProps {
  experience: Experience;
}

export default function ExperienceCard({ experience }: ExperienceCardProps) {
  return (
    <div className="group bg-white border border-[#e6dece] rounded-2xl overflow-hidden hover:border-[#c5a059] transition-all duration-300 flex flex-col justify-between shadow-sm hover:shadow-md">
      {/* Media */}
      <div className="relative h-64 w-full bg-[#f4f0e8] overflow-hidden">
        <Image
          src={experience.image}
          alt={experience.title}
          fill
          sizes="(max-width: 768px) 100vw, 50vw"
          className="object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#1e0c10]/70 via-transparent to-transparent opacity-60 group-hover:opacity-40 transition-opacity" />

        {/* Badge & Category */}
        <div className="absolute top-4 left-4 flex items-center gap-2">
          {experience.badge && (
            <span className="px-2.5 py-1 rounded-full bg-[#c5a059] text-[#1e0c10] text-[10px] font-bold uppercase tracking-wider shadow-sm">
              {experience.badge}
            </span>
          )}
          <span className="px-2.5 py-1 rounded-full bg-[#1e0c10]/80 backdrop-blur-md text-[#faf8f5] text-[10px] font-semibold uppercase tracking-wider">
            {experience.category}
          </span>
        </div>

        {/* Starting Price Pill */}
        <div className="absolute bottom-3 right-4 bg-[#faf8f5]/95 backdrop-blur-md px-3 py-1 rounded-full text-xs font-semibold text-[#2d1117] shadow-sm">
          <span>From </span>
          <span className="text-sm font-bold text-[#8a3243]">${experience.price}</span>
          <span className="text-[10px] font-normal text-[#525960]"> / guest</span>
        </div>
      </div>

      {/* Content */}
      <div className="p-6 flex-1 flex flex-col justify-between">
        <div>
          {/* Metadata Bar */}
          <div className="flex items-center justify-between gap-2 text-xs text-[#525960] mb-3">
            <div className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-[#8a3243]" />
              <span>{experience.duration}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <WineIcon className="w-3.5 h-3.5 text-[#8a3243]" />
              <span>{experience.winesCount} Wines</span>
            </div>
            <div className="flex items-center gap-1">
              <RatingStars rating={experience.rating} size="sm" />
              <span className="font-semibold text-[#191c1f] text-[11px]">
                {experience.rating.toFixed(1)}
              </span>
            </div>
          </div>

          <h3 className="font-serif text-xl font-normal text-[#191c1f] group-hover:text-[#6c2432] transition-colors mb-2 leading-snug">
            <Link href={`/experiences/${experience.slug}`}>{experience.title}</Link>
          </h3>

          <p className="text-xs sm:text-sm text-[#525960] leading-relaxed line-clamp-2 mb-4">
            {experience.shortDescription}
          </p>

          {/* Highlights */}
          <ul className="space-y-1.5 mb-6 text-xs text-[#2a2e33]">
            {experience.highlights.slice(0, 2).map((item, idx) => (
              <li key={idx} className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-[#c5a059] mt-1 shrink-0" />
                <span className="line-clamp-1">{item}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Footer Actions */}
        <div className="pt-4 border-t border-[#e6dece] flex items-center justify-between">
          <Link
            href={`/experiences/${experience.slug}`}
            className="text-xs font-semibold uppercase tracking-widest text-[#8a3243] hover:text-[#2d1117] transition-colors flex items-center gap-1.5"
          >
            <span>View Experience</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>

          <Link
            href={`/book?experience=${experience.id}`}
            className="px-4 py-2 rounded-full bg-[#2d1117] hover:bg-[#461822] text-[#faf8f5] text-xs font-semibold uppercase tracking-wider transition-colors shadow-sm"
          >
            Book Now
          </Link>
        </div>
      </div>
    </div>
  );
}
