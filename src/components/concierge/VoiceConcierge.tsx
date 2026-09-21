'use client';

import React, { useEffect, useState } from 'react';
import { Mic, Volume2, X, Sparkles } from 'lucide-react';
import { useConcierge } from '@/context/ConciergeContext';

export default function VoiceConcierge() {
  const { isVoiceMode, closeVoiceMode, voiceState, setVoiceState } = useConcierge();
  const [pulseCount, setPulseCount] = useState(0);

  useEffect(() => {
    if (!isVoiceMode) return;

    // Simulate conversational turn-taking
    const interval = setInterval(() => {
      setPulseCount((p) => (p + 1) % 100);
    }, 150);

    let timer: NodeJS.Timeout;
    if (voiceState === 'listening') {
      timer = setTimeout(() => {
        setVoiceState('thinking');
        setTimeout(() => {
          setVoiceState('speaking');
          setTimeout(() => {
            setVoiceState('listening');
          }, 4500);
        }, 1200);
      }, 3500);
    }

    return () => {
      clearInterval(interval);
      clearTimeout(timer);
    };
  }, [isVoiceMode, voiceState, setVoiceState]);

  if (!isVoiceMode) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#1e0c10]/85 backdrop-blur-md transition-all">
      <div className="relative w-full max-w-md bg-[#2d1117] border border-[#c5a059]/40 rounded-3xl p-8 text-center text-[#faf8f5] shadow-2xl overflow-hidden">
        {/* Ambient Glow */}
        <div className="absolute -top-24 -left-24 w-48 h-48 bg-[#6c2432]/40 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-[#c5a059]/20 rounded-full blur-3xl pointer-events-none" />

        {/* Close Button */}
        <button
          onClick={closeVoiceMode}
          className="absolute top-5 right-5 p-2 rounded-full text-[#e6dece]/60 hover:text-white hover:bg-white/10 transition-colors focus:outline-none"
          aria-label="Close voice conversation"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Heading */}
        <div className="mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#461822] border border-[#c5a059]/30 text-[11px] font-medium tracking-widest uppercase text-[#c5a059] mb-3">
            <Sparkles className="w-3.5 h-3.5" />
            <span>AI Voice Sommelier</span>
          </div>
          <h3 className="font-serif text-2xl font-normal tracking-wide text-[#faf8f5]">
            Domaine Élysée Concierge
          </h3>
          <p className="text-xs text-[#e6dece]/70 uppercase tracking-widest mt-1">
            {voiceState === 'listening' && 'Listening to your voice...'}
            {voiceState === 'thinking' && 'Consulting cellar archives...'}
            {voiceState === 'speaking' && 'Estate Sommelier speaking...'}
            {voiceState === 'idle' && 'Ready to assist'}
          </p>
        </div>

        {/* Audio Waveform Animation */}
        <div className="h-24 flex items-center justify-center gap-1.5 mb-8">
          {[24, 48, 72, 96, 64, 40, 80, 56, 32].map((height, i) => {
            const dynamicScale =
              voiceState === 'speaking' || voiceState === 'listening'
                ? Math.sin((pulseCount + i * 12) * 0.25) * 0.45 + 0.7
                : 0.25;

            return (
              <div
                key={i}
                className="w-1.5 rounded-full transition-all duration-150"
                style={{
                  height: `${height * dynamicScale}px`,
                  backgroundColor:
                    voiceState === 'speaking'
                      ? '#c5a059'
                      : voiceState === 'thinking'
                      ? '#8a3243'
                      : '#faf8f5'
                }}
              />
            );
          })}
        </div>

        {/* Central Mic Visualizer */}
        <div className="relative inline-flex items-center justify-center mb-6">
          <div
            className={`absolute inset-0 rounded-full transition-all duration-700 ${
              voiceState === 'speaking'
                ? 'bg-[#c5a059]/30 scale-150 animate-ping'
                : voiceState === 'listening'
                ? 'bg-white/20 scale-125 animate-pulse'
                : 'bg-transparent'
            }`}
          />
          <div className="relative w-20 h-20 rounded-full bg-gradient-to-br from-[#461822] to-[#1e0c10] border-2 border-[#c5a059] flex items-center justify-center text-[#faf8f5] shadow-lg">
            {voiceState === 'speaking' ? (
              <Volume2 className="w-8 h-8 text-[#c5a059] animate-bounce" />
            ) : (
              <Mic className="w-8 h-8 text-[#c5a059]" />
            )}
          </div>
        </div>

        {/* Real-time speech transcript placeholder */}
        <div className="min-h-[48px] px-4 flex items-center justify-center mb-8">
          {voiceState === 'speaking' && (
            <p className="font-serif italic text-base sm:text-lg text-[#e6dece] leading-relaxed">
              &ldquo;I recommend our 2024 Cabernet Sauvignon for its rich cassis, velvety tannins, and cellaring pedigree.&rdquo;
            </p>
          )}
          {voiceState === 'listening' && (
            <p className="font-serif italic text-sm text-[#e6dece]/80">
              &ldquo;Try asking: Which tasting includes the underground cellar?&rdquo;
            </p>
          )}
          {voiceState === 'thinking' && (
            <p className="text-xs text-[#c5a059] tracking-widest uppercase animate-pulse">
              Selecting recommendation...
            </p>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center justify-center gap-4">
          <button
            type="button"
            onClick={closeVoiceMode}
            className="px-6 py-2.5 rounded-full bg-white/10 hover:bg-white/20 text-[#faf8f5] text-xs font-semibold uppercase tracking-wider transition-colors border border-white/20"
          >
            End Conversation
          </button>
        </div>
      </div>
    </div>
  );
}
