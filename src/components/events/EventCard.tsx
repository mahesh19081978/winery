import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Calendar, Clock, MapPin, ArrowRight } from 'lucide-react';
import { WineryEvent } from '@/types';
import StatusBadge from '../common/StatusBadge';

interface EventCardProps {
  event: WineryEvent;
}

export default function EventCard({ event }: EventCardProps) {
  return (
    <div className="group bg-white border border-[#e6dece] rounded-2xl overflow-hidden hover:border-[#c5a059] transition-all duration-300 flex flex-col justify-between shadow-sm hover:shadow-md">
      {/* Media */}
      <div className="relative h-60 w-full bg-[#f4f0e8] overflow-hidden">
        <Image
          src={event.image}
          alt={event.title}
          fill
          sizes="(max-width: 768px) 100vw, 33vw"
          className="object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#1e0c10]/70 via-transparent to-transparent opacity-60 group-hover:opacity-40 transition-opacity" />

        {/* Availability Badge */}
        <div className="absolute top-4 left-4">
          <StatusBadge status={event.availability} />
        </div>

        {/* Date Overlay Pill */}
        <div className="absolute bottom-3 left-4 bg-white/95 backdrop-blur-md px-3 py-1 rounded-full text-xs font-semibold text-[#2d1117] shadow-sm flex items-center gap-1.5">
          <Calendar className="w-3.5 h-3.5 text-[#8a3243]" />
          <span>{event.date}</span>
        </div>
      </div>

      {/* Content */}
      <div className="p-6 flex-1 flex flex-col justify-between">
        <div>
          <div className="flex items-center gap-4 text-xs text-[#525960] mb-3">
            <span className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-[#8a3243]" />
              {event.time}
            </span>
            <span className="flex items-center gap-1 truncate">
              <MapPin className="w-3.5 h-3.5 text-[#8a3243] shrink-0" />
              {event.venue}
            </span>
          </div>

          <h3 className="font-serif text-xl font-normal text-[#191c1f] group-hover:text-[#6c2432] transition-colors mb-2 leading-snug">
            <Link href={`/events/${event.slug}`}>{event.title}</Link>
          </h3>

          <p className="text-xs sm:text-sm text-[#525960] leading-relaxed line-clamp-2 mb-4">
            {event.shortDescription}
          </p>
        </div>

        {/* Footer Actions */}
        <div className="pt-4 border-t border-[#e6dece] flex items-center justify-between">
          <div>
            <span className="text-base font-bold text-[#8a3243]">${event.price}</span>
            <span className="text-xs text-[#525960]"> / ticket</span>
          </div>

          <Link
            href={`/events/${event.slug}`}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#2d1117] hover:bg-[#461822] text-[#faf8f5] text-xs font-semibold uppercase tracking-wider transition-colors shadow-sm"
          >
            <span>{event.isPast ? 'View Retrospective' : 'Reserve Place'}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    </div>
  );
}
