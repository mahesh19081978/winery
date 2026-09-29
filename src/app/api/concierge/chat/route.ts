import { NextResponse } from 'next/server';
import { GoogleGenAI, Type } from '@google/genai';
import { GuestAuth } from '@/lib/auth/guest';
import { prisma } from '@/lib/db';
import { z } from 'zod';
import { decrypt } from '@/lib/crypto';

const chatRequestSchema = z.object({
  message: z.string().max(500),
  history: z
    .array(
      z.object({
        role: z.enum(['user', 'assistant', 'system']),
        content: z.string(),
      })
    )
    .optional()
    .default([]),
});

const rateLimits = new Map<string, { count: number; resetTime: number }>();
const MAX_REQUESTS = 20;
const WINDOW_MS = 60 * 1000; // 1 minute

export async function POST(req: Request) {
  try {
    const ip = req.headers.get('x-forwarded-for') || '127.0.0.1';
    const now = Date.now();
    const limit = rateLimits.get(ip);
    
    if (limit && now < limit.resetTime) {
      if (limit.count >= MAX_REQUESTS) {
        return NextResponse.json(
          { text: 'You are sending too many requests. Please pause for a moment.', suggestions: [] },
          { status: 429 }
        );
      }
      limit.count += 1;
    } else {
      rateLimits.set(ip, { count: 1, resetTime: now + WINDOW_MS });
    }

    const body = await req.json();
    const { message, history } = chatRequestSchema.parse(body);

    const winery = await prisma.winery.findFirst({
      include: { aiSettings: true },
    });
    
    if (!winery) {
      return NextResponse.json({ error: 'Winery configuration not found' }, { status: 500 });
    }

    const aiSettings = winery.aiSettings;
    if (!aiSettings?.isEnabled) {
      return NextResponse.json({
        text: 'Our AI Concierge is currently resting. Please contact the estate directly for assistance.',
        suggestions: ['Contact Us'],
      });
    }

    let apiKey = process.env.GEMINI_API_KEY;
    if (aiSettings.apiKeyEncrypted) {
      try {
        apiKey = decrypt(aiSettings.apiKeyEncrypted);
      } catch (err) {
        console.error('Failed to decrypt AI API key:', err);
      }
    }

    if (!apiKey) {
      return NextResponse.json({ error: 'AI configuration error' }, { status: 500 });
    }

    let guestName = 'Guest';
    let preferences = '';
    const session = await GuestAuth.getSession();
    if (session) {
      guestName = session.name;
      const profile = await prisma.guestProfile.findUnique({
        where: { id: session.guestProfileId },
        include: { winePreference: true },
      });
      if (profile?.winePreference) {
        preferences = `Preferences: ${profile.winePreference.favoriteVarietals.join(', ')}. Sweetness: ${profile.winePreference.preferredSweetness}. Body: ${profile.winePreference.preferredBody}.`;
      }
    }

    const wines = await prisma.wine.findMany({ select: { name: true, slug: true, category: true, description: true } });
    const experiences = await prisma.experience.findMany({ select: { title: true, slug: true, description: true, price: true } });

    const systemInstruction = `You are the VINORA Estate Concierge. Your tone is elegant, hospitable, and knowledgeable.
The user's name is ${guestName}. ${preferences}
You must ONLY recommend wines and experiences from our catalog below. NEVER invent facts.
If something is not in the catalog, politely clarify.

Current Wines:
${wines.map((w) => `- ${w.name} (${w.category}): ${w.description} (Link: /wines/${w.slug})`).join('\n')}

Current Experiences:
${experiences.map((e) => `- ${e.title} ($${e.price}): ${e.description} (Link: /experiences/${e.slug})`).join('\n')}

Return a valid JSON object matching this schema:
{
  "text": "Your conversational response",
  "suggestions": ["Suggestion 1", "Suggestion 2"],
  "actionLink": { "label": "Button text", "href": "/relative/link" } // optional
}`;

    const ai = new GoogleGenAI({ apiKey });

    // The genai sdk uses "user" and "model" roles
    const formattedHistory = history.map((msg) => ({
      role: msg.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: msg.content }],
    }));

    const response = await ai.models.generateContent({
      model: aiSettings.modelName || 'gemini-3.1-flash-lite',
      contents: [...formattedHistory, { role: 'user', parts: [{ text: message }] }],
      config: {
        systemInstruction: systemInstruction,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            text: { type: Type.STRING },
            suggestions: { type: Type.ARRAY, items: { type: Type.STRING } },
            actionLink: {
              type: Type.OBJECT,
              properties: {
                label: { type: Type.STRING },
                href: { type: Type.STRING },
              },
              required: ['label', 'href'],
            },
          },
          required: ['text'],
        },
      },
    });

    const responseText = response.text;
    if (!responseText) {
       throw new Error("Empty response from model");
    }
    
    const data = JSON.parse(responseText);

    return NextResponse.json(data);
  } catch (error) {
    console.error('Concierge Error:', error);
    return NextResponse.json({
      text: 'Apologies, our concierge is momentarily indisposed. Please try again later.',
      suggestions: ['Try Again'],
    });
  }
}
