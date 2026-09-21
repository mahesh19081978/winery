'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { Wine, X, Send, Mic, Sparkles, ArrowRight } from 'lucide-react';
import { useConcierge } from '@/context/ConciergeContext';
import VoiceConcierge from './VoiceConcierge';

export default function WineConcierge() {
  const {
    isOpen,
    openConcierge,
    closeConcierge,
    messages,
    sendMessage,
    openVoiceMode
  } = useConcierge();

  const [inputVal, setInputVal] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputVal.trim()) return;
    sendMessage(inputVal.trim());
    setInputVal('');
  };

  const handlePromptClick = (promptText: string) => {
    sendMessage(promptText);
  };

  return (
    <>
      {/* Floating Concierge Badge on public pages */}
      {!isOpen && (
        <button
          type="button"
          onClick={() => openConcierge()}
          className="fixed bottom-6 right-6 z-40 flex items-center gap-2.5 px-4 py-3 rounded-full bg-[#2d1117] text-[#faf8f5] shadow-xl border border-[#c5a059]/40 hover:bg-[#461822] hover:scale-105 transition-all duration-200 group focus:outline-none focus:ring-2 focus:ring-[#c5a059]"
          aria-label="Open Wine Concierge"
        >
          <div className="relative">
            <Wine className="w-5 h-5 text-[#c5a059] group-hover:rotate-12 transition-transform" />
            <span className="absolute -top-1 -right-1 w-2 h-2 bg-[#c5a059] rounded-full animate-ping" />
          </div>
          <span className="text-xs font-semibold uppercase tracking-widest text-[#faf8f5]">
            Wine Concierge
          </span>
        </button>
      )}

      {/* Slide-out Drawer */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-[#1e0c10]/60 backdrop-blur-sm transition-opacity"
            onClick={closeConcierge}
          />

          {/* Chat Panel */}
          <div className="relative w-full max-w-md bg-[#faf8f5] shadow-2xl flex flex-col justify-between z-10 h-full border-l border-[#e6dece] animate-in slide-in-from-right duration-300">
            {/* Header */}
            <div className="bg-[#2d1117] text-[#faf8f5] p-4 sm:p-5 flex items-center justify-between border-b border-[#461822]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[#461822] border border-[#c5a059]/50 flex items-center justify-center text-[#c5a059]">
                  <Wine className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-serif text-lg font-medium text-[#faf8f5]">
                      Wine Concierge
                    </h3>
                    <span className="px-2 py-0.5 rounded-full bg-[#461822] text-[9px] uppercase tracking-wider text-[#c5a059] border border-[#c5a059]/30">
                      AI Sommelier
                    </span>
                  </div>
                  <p className="text-xs text-[#e6dece]/80">
                    Your guide to tastings, terroir, & bottles
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={openVoiceMode}
                  className="p-2 rounded-full text-[#c5a059] hover:bg-white/10 transition-colors"
                  title="Talk with Voice Concierge"
                  aria-label="Talk with Voice Concierge"
                >
                  <Mic className="w-5 h-5" />
                </button>
                <button
                  type="button"
                  onClick={closeConcierge}
                  className="p-2 rounded-full text-[#e6dece]/80 hover:text-white hover:bg-white/10 transition-colors"
                  aria-label="Close concierge"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Quick Voice Bar Banner */}
            <div className="bg-[#f4f0e8] px-4 py-2 border-b border-[#e6dece] flex items-center justify-between text-xs text-[#461822]">
              <span className="flex items-center gap-1.5 font-medium">
                <Sparkles className="w-3.5 h-3.5 text-[#c5a059]" />
                Prefer speaking directly?
              </span>
              <button
                type="button"
                onClick={openVoiceMode}
                className="text-[11px] font-semibold text-[#8a3243] hover:underline flex items-center gap-1"
              >
                Talk to a Wine Concierge <ArrowRight className="w-3 h-3" />
              </button>
            </div>

            {/* Message Thread */}
            <div className="flex-1 p-4 overflow-y-auto space-y-4">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl p-4 text-sm leading-relaxed shadow-sm ${
                      msg.sender === 'user'
                        ? 'bg-[#2d1117] text-[#faf8f5] rounded-br-none'
                        : 'bg-white border border-[#e6dece] text-[#191c1f] rounded-bl-none'
                    }`}
                  >
                    <p className="whitespace-pre-line">{msg.text}</p>

                    {/* Action link if provided */}
                    {msg.actionLink && (
                      <div className="mt-3 pt-2.5 border-t border-[#e6dece]">
                        <Link
                          href={msg.actionLink.href}
                          onClick={closeConcierge}
                          className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#8a3243] hover:underline"
                        >
                          {msg.actionLink.label} <ArrowRight className="w-3 h-3" />
                        </Link>
                      </div>
                    )}
                  </div>

                  {/* Suggestion Chips */}
                  {msg.suggestions && msg.suggestions.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1.5 max-w-[90%]">
                      {msg.suggestions.map((sug, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => handlePromptClick(sug)}
                          className="px-3 py-1.5 rounded-full bg-white hover:bg-[#f4f0e8] text-xs text-[#461822] border border-[#e6dece] transition-colors text-left"
                        >
                          {sug}
                        </button>
                      ))}
                    </div>
                  )}

                  <span className="text-[10px] text-[#525960]/60 mt-1 px-1">
                    {msg.time}
                  </span>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Form */}
            <div className="p-4 bg-white border-t border-[#e6dece]">
              <form onSubmit={handleSubmit} className="flex items-center gap-2">
                <input
                  type="text"
                  value={inputVal}
                  onChange={(e) => setInputVal(e.target.value)}
                  placeholder="Ask about wines, terroir, or pairings..."
                  className="flex-1 bg-[#f4f0e8] border border-[#e6dece] rounded-full px-4 py-2.5 text-xs sm:text-sm text-[#191c1f] placeholder:text-[#525960]/70 focus:outline-none focus:border-[#8a3243] focus:bg-white transition-all"
                />
                <button
                  type="button"
                  onClick={openVoiceMode}
                  className="p-2.5 text-[#525960] hover:text-[#461822] rounded-full hover:bg-[#f4f0e8] transition-colors"
                  title="Voice input"
                >
                  <Mic className="w-4 h-4" />
                </button>
                <button
                  type="submit"
                  disabled={!inputVal.trim()}
                  className="p-2.5 rounded-full bg-[#2d1117] hover:bg-[#461822] disabled:opacity-50 text-[#faf8f5] transition-colors focus:outline-none"
                  aria-label="Send message"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Voice Concierge Modal Simulation */}
      <VoiceConcierge />
    </>
  );
}
