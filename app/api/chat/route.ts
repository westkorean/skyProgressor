import { streamText, convertToModelMessages } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';
import { retrieveKnowledge } from "@/lib/retrieveKnowledge";

const groq = createOpenAI({
  apiKey: process.env.GROQ_API_KEY,
  baseURL: 'https://api.groq.com/openai/v1',
});

// Simple memory cache (replace with Redis later)
const wikiCache = new Map<string, string>();

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
      `${baseUrl}?action=query&list=search&srsearch=${encodeURIComponent(query)}&format=json&srlimit=1`
    );

    const searchData = await searchRes.json();

    const result = searchData?.query?.search?.[0];

    if (!result) return null;


    const contentRes = await fetch(
      `${baseUrl}?action=query&prop=extracts&explaintext=true&titles=${encodeURIComponent(
        result.title
      )}&format=json`
    );


    const contentData = await contentRes.json();

    const pages = contentData?.query?.pages;

    const page: any = pages ? Object.values(pages)[0] : null;


    if (!page?.extract) return null;


    const content =
      `--- ${result.title} ---\n` +
      page.extract.slice(0, 800);


    wikiCache.set(query, content);

    return content;


  } catch {
    return null;
  }
}


function summarizePlayerData(playerData: any) {
  if (!playerData) return 'No player data available.';

  return JSON.stringify({
    skills: playerData.skills,
    slayers: playerData.slayers,
    catacombs: playerData.catacombs,
    skyblockLevel: playerData.skyblockLevel,
    pets: playerData.pets,
    accessories: playerData.accessories,
    dungeons: playerData.dungeons,
    collections: playerData.collections,
  }, null, 2);
}


export async function POST(req: Request) {

  try {

    const { messages, playerData } = await req.json();


    const lastMessage = messages[messages.length - 1];

    const latestUserMessage =
      lastMessage?.parts?.find((p: any) => p.type == 'text')?.text ?? '';

    const knowledge = retrieveKnowledge(`
    Question:
    ${latestUserMessage}

    Player:
    ${summarizePlayerData(playerData)}
    `);

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

      Player data:
      ${summarizePlayerData(playerData)}


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


    console.log("USER:", latestUserMessage);
    console.log("KNOWLEDGE CONTEXT:", knowledgeContext);

    const result = streamText({

      model: groq('llama-3.3-70b-versatile'),

      system: systemPrompt,

      messages: await convertToModelMessages(messages),

    });


    return result.toUIMessageStreamResponse();


  } catch(err) {

    console.error('Chat route error:', err);

    return new Response(
      'Error: ' + (err instanceof Error ? err.message : 'unknown'),
      { status:500 }
    );

  }

}