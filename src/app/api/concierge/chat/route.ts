import { NextResponse } from 'next/server';
import { GoogleGenAI, Type } from '@google/genai';
import { GuestAuth } from '@/lib/auth/guest';
import { prisma } from '@/lib/db';
import { z } from 'zod';
import { decrypt } from '@/lib/crypto';
import { ConciergeSession } from '@/lib/auth/concierge-session';

const chatRequestSchema = z.object({
  message: z.string().max(500),
  // Ignore client-provided history for auth, but they can still pass it, though we rely on DB.
});

const rateLimits = new Map<string, { count: number; resetTime: number }>();
const MAX_REQUESTS = 20;
const WINDOW_MS = 60 * 1000; // 1 minute

export async function GET() {
  try {
    const winery = await prisma.winery.findFirst();
    if (!winery) return NextResponse.json({ messages: [] });

    const sessionId = await ConciergeSession.getSessionId();
    const session = await GuestAuth.getSession();
    
    // Find conversation authorized by either guestProfileId (if logged in) or sessionId
    const conversation = await prisma.conversation.findFirst({
      where: {
        wineryId: winery.id,
        OR: [
          session ? { guestProfileId: session.guestProfileId } : { id: 'impossible' },
          { sessionId: sessionId }
        ]
      },
      include: {
        messages: {
          orderBy: { timestamp: 'asc' }
        }
      },
      orderBy: { startedAt: 'desc' }
    });

    if (!conversation) {
      return NextResponse.json({ messages: [] });
    }

    const messages = conversation.messages.map((m) => ({
      id: m.id,
      sender: m.role === 'user' ? 'user' : 'concierge',
      text: m.content,
      time: m.timestamp,
      ...((m.toolCallData && typeof m.toolCallData === 'object' && !Array.isArray(m.toolCallData)) ? (m.toolCallData as Record<string, unknown>) : {})
    }));

    return NextResponse.json({ messages, conversationId: conversation.id });
  } catch (error) {
    console.error('Failed to get conversation:', error);
    return NextResponse.json({ messages: [] });
  }
}

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
    const { message } = chatRequestSchema.parse(body);

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
    const authSession = await GuestAuth.getSession();
    if (authSession) {
      guestName = authSession.name;
      const profile = await prisma.guestProfile.findUnique({
        where: { id: authSession.guestProfileId },
        include: { winePreference: true },
      });
      if (profile?.winePreference) {
        preferences = `Preferences: ${profile.winePreference.favoriteVarietals.join(', ')}. Sweetness: ${profile.winePreference.preferredSweetness}. Body: ${profile.winePreference.preferredBody}.`;
      }
    }

    // Resolve or create Conversation
    const sessionId = await ConciergeSession.getSessionId();
    
    let conversation = await prisma.conversation.findFirst({
      where: {
        wineryId: winery.id,
        OR: [
          authSession ? { guestProfileId: authSession.guestProfileId } : { id: 'impossible' },
          { sessionId: sessionId }
        ]
      },
      include: {
        messages: {
          orderBy: { timestamp: 'asc' }
        }
      },
      orderBy: { startedAt: 'desc' }
    });

    if (!conversation) {
      conversation = await prisma.conversation.create({
        data: {
          wineryId: winery.id,
          sessionId: sessionId,
          guestProfileId: authSession?.guestProfileId || null,
        },
        include: { messages: true }
      });
    } else if (authSession && !conversation.guestProfileId) {
      // Link anonymous session to authenticated guest
      conversation = await prisma.conversation.update({
        where: { id: conversation.id },
        data: { guestProfileId: authSession.guestProfileId },
        include: { messages: true }
      });
    }

    // Save user message
    await prisma.conversationMessage.create({
      data: {
        conversationId: conversation.id,
        role: 'user',
        content: message
      }
    });

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

    // Format history from DB
    const formattedHistory = conversation.messages.map((msg) => ({
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

    // Save AI response
    const aiMsgData = {
        suggestions: data.suggestions,
        actionLink: data.actionLink
    };
    
    await prisma.conversationMessage.create({
      data: {
        conversationId: conversation.id,
        role: 'assistant',
        content: data.text,
        toolCallData: Object.keys(aiMsgData).length ? aiMsgData : undefined,
        metadata: {
           model: aiSettings.modelName || 'gemini-3.1-flash-lite',
           provider: 'GEMINI'
        }
      }
    });

    return NextResponse.json({ ...data, conversationId: conversation.id });
  } catch (error) {
    console.error('Concierge Error:', error);
    return NextResponse.json({
      text: 'Apologies, our concierge is momentarily indisposed. Please try again later.',
      suggestions: ['Try Again'],
    });
  }
}
