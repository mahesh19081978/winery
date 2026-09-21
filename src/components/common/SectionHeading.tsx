import React from 'react';

interface SectionHeadingProps {
  subtitle?: string;
  title: string;
  description?: string;
  centered?: boolean;
  theme?: 'light' | 'dark';
}

export default function SectionHeading({
  subtitle,
  title,
  description,
  centered = true,
  theme = 'light'
}: SectionHeadingProps) {
  const isDark = theme === 'dark';

  return (
    <div className={`mb-12 md:mb-16 ${centered ? 'text-center mx-auto max-w-3xl' : 'max-w-2xl'}`}>
      {subtitle && (
        <span
          className={`inline-block text-xs uppercase tracking-[0.25em] font-semibold mb-3 ${
            isDark ? 'text-[#c5a059]' : 'text-[#8a3243]'
          }`}
        >
          {subtitle}
        </span>
      )}
      <h2
        className={`font-serif text-3xl sm:text-4xl lg:text-5xl font-normal tracking-tight mb-4 ${
          isDark ? 'text-[#faf8f5]' : 'text-[#191c1f]'
        }`}
      >
        {title}
      </h2>
      {description && (
        <p
          className={`text-base sm:text-lg leading-relaxed ${
            isDark ? 'text-[#e6dece]/80' : 'text-[#525960]'
          }`}
        >
          {description}
        </p>
      )}
      <div className={`mt-6 flex items-center gap-3 ${centered ? 'justify-center' : ''}`}>
        <span className={`w-8 h-[1px] ${isDark ? 'bg-[#c5a059]/40' : 'bg-[#c5a059]'}`}></span>
        <span className={`w-1.5 h-1.5 rotate-45 ${isDark ? 'bg-[#c5a059]' : 'bg-[#6c2432]'}`}></span>
        <span className={`w-8 h-[1px] ${isDark ? 'bg-[#c5a059]/40' : 'bg-[#c5a059]'}`}></span>
      </div>
    </div>
  );
}
