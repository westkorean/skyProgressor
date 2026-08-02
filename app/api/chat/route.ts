import { streamText, convertToModelMessages, type UIMessage } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';
import { retrieveKnowledge, retrieveKnowledgeByIds } from '@/lib/retrieveKnowledge';
import { recommendationKnowledgeReferences, summarizePlayerData } from '@/lib/chatContext';

const groq = createOpenAI({
  apiKey: process.env.GROQ_API_KEY,
  baseURL: 'https://api.groq.com/openai/v1',
});

// Simple memory cache (replace with Redis later)
const wikiCache = new Map<string, string>();
const MAX_WIKI_CACHE_ENTRIES = 100;
const EXTERNAL_FETCH_TIMEOUT_MS = 5_000;

type JsonRecord = Record<string, unknown>;
const asRecord = (value: unknown): JsonRecord | null =>
  value !== null && typeof value === 'object' && !Array.isArray(value)
    ? (value as JsonRecord)
    : null;

function needsWikiSearch(message: string): boolean {
  const keywords = [
    'how to get',
    'where',
    'location',
    'recipe',
    'craft',
    'requirement',
    'unlock',
    'upgrade',
    'cost',
    'price',
    'stats',
    'drop',
    'chance',
    'material',
    'npc',
    'item'
  ];

  const lower = message.toLowerCase();

  return keywords.some(keyword => lower.includes(keyword));
}

async function getSearchQuery(userMessage: string): Promise<string> {
  
  const result = streamText({
    model: groq('llama-3.1-8b-instant'),
    maxOutputTokens: 15,
    system:
      'Convert this Hypixel SkyBlock question into a 2-5 word wiki search query. Output ONLY the query.',
    prompt: userMessage,
  });

  return (await result.text).trim();
}


async function searchWiki(query: string): Promise<string | null> {

  if (wikiCache.has(query)) {
    return wikiCache.get(query)!;
  }

  try {
    const baseUrl = 'https://hypixel-skyblock.fandom.com/api.php';

    const searchRes = await fetch(
      `${baseUrl}?action=query&list=search&srsearch=${encodeURIComponent(query)}&format=json&srlimit=1`,
      { signal: AbortSignal.timeout(EXTERNAL_FETCH_TIMEOUT_MS) }
    );
    if (!searchRes.ok) return null;

    const searchData = await searchRes.json();

    const result = searchData?.query?.search?.[0];

    if (!result) return null;


    const contentRes = await fetch(
      `${baseUrl}?action=query&prop=extracts&explaintext=true&titles=${encodeURIComponent(
        result.title
      )}&format=json`,
      { signal: AbortSignal.timeout(EXTERNAL_FETCH_TIMEOUT_MS) }
    );
    if (!contentRes.ok) return null;


    const contentData = await contentRes.json();

    const pages = contentData?.query?.pages;

    const page = pages ? asRecord(Object.values(pages)[0]) : null;


    const extract = page?.extract;
    if (typeof extract !== 'string') return null;


    const content =
      `--- ${result.title} ---\n` +
      extract.slice(0, 800);


    if (wikiCache.size >= MAX_WIKI_CACHE_ENTRIES) {
      const oldestKey = wikiCache.keys().next().value;
      if (typeof oldestKey === 'string') wikiCache.delete(oldestKey);
    }
    wikiCache.set(query, content);

    return content;


  } catch {
    return null;
  }
}


export async function POST(req: Request) {

  try {

    if (!process.env.GROQ_API_KEY) {
      return new Response('Chat service is not configured.', { status: 503 });
    }

    const body = (await req.json()) as {
      messages?: UIMessage[];
      playerData?: unknown;
    };
    if (!body || typeof body !== 'object' || !Array.isArray(body.messages)) {
      return new Response('Invalid chat request.', { status: 400 });
    }
    const messages = body.messages.slice(-8).map((message) => ({
      ...message,
      parts: message.parts.map((part) =>
        part.type === 'text' ? { ...part, text: part.text.slice(0, 2_000) } : part
      ),
    }));
    const playerData = body.playerData;


    const lastMessage = messages[messages.length - 1];

    const latestUserMessage =
      (lastMessage?.role === 'user'
        ? lastMessage.parts?.find((part) => part.type === 'text')?.text
        : '')?.slice(0, 4000).trim() ?? '';
    if (!latestUserMessage) {
      return new Response('A user message is required.', { status: 400 });
    }

    const questionKnowledge = retrieveKnowledge(latestUserMessage, { limit: 5 });
    const referencedKnowledge = retrieveKnowledgeByIds(
      recommendationKnowledgeReferences(playerData),
      5
    );
    const knowledge = [...referencedKnowledge, ...questionKnowledge]
      .filter((chunk, index, chunks) => chunks.findIndex((candidate) => candidate.id === chunk.id) === index)
      .slice(0, 7);

    const knowledgeContext = knowledge
      .map(k=>`
    Topic:
    ${k.topic}

    Information:
    ${k.content}
    `)
      .join("\n");


    let wikiContext = null;
    let searchQuery = null;


    // Only retrieve information when necessary
    if (needsWikiSearch(latestUserMessage)) {

      searchQuery = await getSearchQuery(latestUserMessage);

      wikiContext = await searchWiki(searchQuery);

    }


    const systemPrompt = `
      You are a Hypixel SkyBlock expert.

      Never invent locations, items, mechanics, or resources.

      If a term is not in the provided knowledge, assume it may not exist.

      Prefer specific verified information over general game knowledge.

      Your job is to give personalized advice based on the player's profile.

      Progression priorities are determined only by the deterministic recommendation
      engine in Player data. Explain those recommendations conversationally and in
      their supplied order. Never create, remove, reorder, or assign priorities.
      Treat progressionIssues as evidence and suggested actions, not as permission
      to invent additional issues.

      Player data:
      ${summarizePlayerData(playerData)}

      ${wikiContext ? `Retrieved wiki context:\n${wikiContext}` : ''}


      ${
        knowledgeContext
          ? `
      Relevant Hypixel SkyBlock knowledge:
      ${knowledgeContext}

      The following knowledge base contains verified current Hypixel SkyBlock information.

      You MUST use this information when answering.

      Your internal knowledge may be outdated. If your memory conflicts with the knowledge base, your memory is wrong.

      NEVER recommend strategies, locations, items, or methods that contradict the knowledge base.
      If your memory conflicts with the provided knowledge, trust the knowledge.
      `
          : `
      No specific knowledge was retrieved.
      Use your general knowledge carefully.
      Do not invent exact recipes, requirements, locations, XP values, or item statistics.
      `
      }


      Rules:
      - Prioritize progression advice over generic information.
      - Explain why a recommendation fits the player's profile.
      - Consider the player's current level, gear, coins, and unlocked content.
      - Never recommend outdated strategies when newer information is provided.
      - If the knowledge base says an old method is inefficient, do not recommend it.
      - When describing skill/slayer/catacombs progress, phrase it as:
      "X% of the way from level N to level N+1".
      - Be concise and conversational.

      Known outdated information:

      - Mushroom Island is NOT a recommended Foraging XP method.
      - The Park and old tree locations are outdated for players with Galatea access.
      - Sugar Cane and Mushroom Blocks do not provide Foraging XP.
    `;


    const result = streamText({

      model: groq('llama-3.3-70b-versatile'),

      maxOutputTokens: 700,

      system: systemPrompt,

      messages: await convertToModelMessages(messages),

    });


    return result.toUIMessageStreamResponse({
      onError: (error) => {
        console.error('Chat model stream failed:', error);
        const message = error instanceof Error ? error.message.toLowerCase() : '';
        if (message.includes('request too large') || message.includes('tokens per minute')) {
          return 'This profile contains too much data for the chat service. Please try again.';
        }
        if (message.includes('rate limit') || message.includes('too many requests')) {
          return 'The chat service is busy right now. Please try again in a moment.';
        }
        return 'The chat service could not generate a response. Please try again.';
      },
    });


  } catch {
    return new Response('Unable to process the chat request.', { status: 500 });

  }

}
