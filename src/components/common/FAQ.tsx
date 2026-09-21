'use client';

import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';

interface FAQProps {
  items: { question: string; answer: string }[];
  title?: string;
  subtitle?: string;
}

export default function FAQ({ items, title = 'Frequently Asked Questions', subtitle = 'Planning Your Visit' }: FAQProps) {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const toggle = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  if (!items || items.length === 0) return null;

  return (
    <div className="max-w-3xl mx-auto my-12">
      {title && (
        <div className="text-center mb-8">
          {subtitle && (
            <span className="text-xs uppercase tracking-[0.2em] font-semibold text-[#8a3243] block mb-1">
              {subtitle}
            </span>
          )}
          <h3 className="font-serif text-2xl sm:text-3xl text-[#191c1f] font-normal">{title}</h3>
        </div>
      )}
      <div className="divide-y divide-[#e6dece] border-y border-[#e6dece]">
        {items.map((item, index) => {
          const isOpen = openIndex === index;
          return (
            <div key={index} className="py-4 sm:py-5">
              <button
                type="button"
                onClick={() => toggle(index)}
                className="w-full flex items-center justify-between text-left text-base sm:text-lg font-serif font-medium text-[#191c1f] hover:text-[#6c2432] transition-colors focus:outline-none"
                aria-expanded={isOpen}
              >
                <span>{item.question}</span>
                <ChevronDown
                  className={`w-5 h-5 text-[#8a3243] transition-transform duration-300 ml-4 shrink-0 ${
                    isOpen ? 'rotate-180' : ''
                  }`}
                />
              </button>
              {isOpen && (
                <div className="mt-3 text-sm sm:text-base text-[#525960] leading-relaxed pr-8">
                  {item.answer}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
