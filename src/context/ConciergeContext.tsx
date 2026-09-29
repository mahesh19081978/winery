'use client';

import React, { createContext, useContext, useState } from 'react';

export interface ChatMessage {
  id: string;
  sender: 'user' | 'concierge';
  text: string;
  time: string;
  suggestions?: string[];
  actionLink?: { label: string; href: string };
}

interface ConciergeContextType {
  isOpen: boolean;
  openConcierge: (initialQuery?: string) => void;
  closeConcierge: () => void;
  isVoiceMode: boolean;
  openVoiceMode: () => void;
  closeVoiceMode: () => void;
  messages: ChatMessage[];
  sendMessage: (text: string) => void;
  voiceState: 'idle' | 'listening' | 'thinking' | 'speaking';
  setVoiceState: (state: 'idle' | 'listening' | 'thinking' | 'speaking') => void;
}

const initialMessages: ChatMessage[] = [
  {
    id: 'msg-1',
    sender: 'concierge',
    text: 'Bonjour and welcome to VINORA. I am your personal Wine & Estate Concierge. How may I assist your journey through our terroir today?',
    time: 'Just now',
    suggestions: [
      'What wine should I try?',
      'Which tasting is right for me?',
      'What events are coming up?',
      'I like dry red wine',
      'Can I book for Saturday?'
    ]
  }
];

const ConciergeContext = createContext<ConciergeContextType | undefined>(undefined);

export function ConciergeProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isVoiceMode, setIsVoiceMode] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [voiceState, setVoiceState] = useState<'idle' | 'listening' | 'thinking' | 'speaking'>('idle');

  const openConcierge = (initialQuery?: string) => {
    setIsOpen(true);
    if (initialQuery) {
      sendMessage(initialQuery);
    }
  };

  const closeConcierge = () => {
    setIsOpen(false);
    setIsVoiceMode(false);
  };

  const openVoiceMode = () => {
    setIsVoiceMode(true);
    setVoiceState('listening');
  };

  const closeVoiceMode = () => {
    setIsVoiceMode(false);
    setVoiceState('idle');
  };



  const sendMessage = async (text: string) => {
    const userMsg: ChatMessage = {
      id: 'msg-' + Date.now(),
      sender: 'user',
      text,
      time: 'Just now'
    };

    setMessages((prev) => [...prev, userMsg]);

    try {
      const history = messages.map(m => ({
        role: m.sender === 'user' ? 'user' : 'assistant',
        content: m.text
      }));
      
      const res = await fetch('/api/concierge/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, history })
      });
      
      const data = await res.json();
      
      const botMsg: ChatMessage = {
        id: 'msg-' + (Date.now() + 1),
        sender: 'concierge',
        text: data.text || 'Our estate team would be delighted to welcome you.',
        time: 'Just now',
        suggestions: data.suggestions,
        actionLink: data.actionLink
      };
      setMessages((prev) => [...prev, botMsg]);
    } catch (error) {
      console.error('Concierge request failed:', error);
      const botMsg: ChatMessage = {
        id: 'msg-' + (Date.now() + 1),
        sender: 'concierge',
        text: 'Apologies, our concierge is momentarily indisposed. Please try again later.',
        time: 'Just now'
      };
      setMessages((prev) => [...prev, botMsg]);
    }
  };

  return (
    <ConciergeContext.Provider
      value={{
        isOpen,
        openConcierge,
        closeConcierge,
        isVoiceMode,
        openVoiceMode,
        closeVoiceMode,
        messages,
        sendMessage,
        voiceState,
        setVoiceState
      }}
    >
      {children}
    </ConciergeContext.Provider>
  );
}

export function useConcierge() {
  const context = useContext(ConciergeContext);
  if (!context) {
    throw new Error('useConcierge must be used within a ConciergeProvider');
  }
  return context;
}
