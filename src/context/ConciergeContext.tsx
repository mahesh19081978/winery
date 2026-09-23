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

  const generateConciergeResponse = (userText: string): { text: string; suggestions?: string[]; actionLink?: { label: string; href: string } } => {
    const lower = userText.toLowerCase();

    if (lower.includes('dry red') || lower.includes('cabernet') || lower.includes('syrah')) {
      return {
        text: 'For lovers of structured, noble dry reds, our 2024 Domaine Élysée Cabernet Sauvignon and 2023 Val de Rêve Grand Cru Syrah are exceptional. They showcase velvet tannins, cassis, and black pepper minerals from our south-facing Parcel 7.',
        suggestions: ['View Cabernet Sauvignon', 'Explore Subterranean Cellar Tour', 'Book an Experience'],
        actionLink: { label: 'Explore Red Wines', href: '/wines' }
      };
    }

    if (lower.includes('experience') || lower.includes('tasting') || lower.includes('which tasting')) {
      return {
        text: 'For a first visit, our Signature Estate Wine Tasting ($65) offers a comprehensive 5-wine flight. If you desire something extraordinary, the Subterranean Cellar Tour ($95) lets you sample unreleased vintages directly from French oak barriques.',
        suggestions: ['Book Signature Tasting', 'Explore All Experiences', 'Tell me about the Picnic'],
        actionLink: { label: 'Browse Experiences', href: '/experiences' }
      };
    }

    if (lower.includes('saturday') || lower.includes('book') || lower.includes('reserve')) {
      return {
        text: 'We host tastings and vineyard experiences daily with prime slots at 10:00 AM, 12:00 PM, 2:00 PM, and 4:00 PM. Saturday sessions often fill quickly, so we encourage early reservation.',
        suggestions: ['Start a Reservation', 'See Available Experiences', 'Directions & Hours'],
        actionLink: { label: 'Go to Booking Engine', href: '/book' }
      };
    }

    if (lower.includes('event') || lower.includes('jazz') || lower.includes('harvest') || lower.includes('music')) {
      return {
        text: 'We have our celebrated Wine & Jazz Evening coming up on October 16 on the Grand Lawn, followed by the black-tie Harvest Solstice Gala on October 24.',
        suggestions: ['View Wine & Jazz Tickets', 'Explore All Events'],
        actionLink: { label: 'View Upcoming Events', href: '/events' }
      };
    }

    if (lower.includes('white') || lower.includes('chardonnay') || lower.includes('sparkling') || lower.includes('rose')) {
      return {
        text: 'Our 2024 Vieilles Vignes Chardonnay delivers crystalline lemon curd and flinty wet-stone minerality, while the Blanc de Blancs Millésimé has rested 42 months in our underground chalk caverns.',
        suggestions: ['View Blanc de Blancs', 'View Rosé Botanique', 'Book a Tasting Flight'],
        actionLink: { label: 'View Wine Collection', href: '/wines' }
      };
    }

    return {
      text: 'Our estate team would be delighted to welcome you. Would you like assistance selecting a wine, reserving an experience, or planning your route to the estate in the valley?',
      suggestions: ['Book an Experience', 'Explore Wines', 'Directions to Estate', 'View Events'],
      actionLink: { label: 'Plan Your Visit', href: '/visit' }
    };
  };

  const sendMessage = (text: string) => {
    const userMsg: ChatMessage = {
      id: 'msg-' + Date.now(),
      sender: 'user',
      text,
      time: 'Just now'
    };

    setMessages((prev) => [...prev, userMsg]);

    // Simulate concierge response delay
    setTimeout(() => {
      const resp = generateConciergeResponse(text);
      const botMsg: ChatMessage = {
        id: 'msg-' + (Date.now() + 1),
        sender: 'concierge',
        text: resp.text,
        time: 'Just now',
        suggestions: resp.suggestions,
        actionLink: resp.actionLink
      };
      setMessages((prev) => [...prev, botMsg]);
    }, 700);
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
