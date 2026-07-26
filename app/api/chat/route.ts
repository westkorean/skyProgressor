import { streamText, convertToModelMessages  } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';

const groq = createOpenAI({
  apiKey: process.env.GROQ_API_KEY,
  baseURL: 'https://api.groq.com/openai/v1',
});

async function getSearchQuery(userMessage: string): Promise<string> {
  const result = await streamText({
    model: groq('llama-3.3-70b-versatile'),
    maxOutputTokens: 30,
    system:
      'You turn a player question into a short Hypixel SkyBlock Wiki search query (2-5 words, just the topic, no extra words). Reply with ONLY the search query, nothing else.',
    prompt: userMessage,
  });
  return (await result.text).trim();
}

async function searchWiki(query: string): Promise<string | null> {
  try {
    const baseUrl = 'https://hypixel-skyblock.fandom.com/api.php';
    const searchRes = await fetch(
      `${baseUrl}?action=query&list=search&srsearch=${encodeURIComponent(query)}&format=json&srlimit=3`
    );
    const searchData = await searchRes.json();
    const results = searchData?.query?.search ?? [];
    if (results.length == 0) return null;

    const extracts = await Promise.all(
      results.map(async (r: any) => {
        const contentRes = await fetch(
          `${baseUrl}?action=query&prop=extracts&explaintext=true&titles=${encodeURIComponent(
            r.title
          )}&format=json`
        );
        const contentData = await contentRes.json();
        const pages = contentData?.query?.pages;
        const page: any = pages ? Object.values(pages)[0] : null;
        return page?.extract ? `--- "${r.title}" ---\n${page.extract.slice(0, 1200)}` : null;
      })
    );

    return extracts.filter(Boolean).join('\n\n') || null;
  } catch {
    return null;
  }
}

export async function POST(req: Request) {
  try {
    const { messages, playerData } = await req.json();

    const lastMessage = messages[messages.length - 1];
    const latestUserMessage =
      lastMessage?.parts?.find((p: any) => p.type == 'text')?.text ?? '';

    const searchQuery = await getSearchQuery(latestUserMessage);
    const wikiContext = await searchWiki(searchQuery);

    const systemPrompt = `You are a helpful Hypixel SkyBlock assistant. The player you're talking to has this current data:
${JSON.stringify(playerData, null, 2)}

${
  wikiContext
    ? `Here is current information from the Hypixel SkyBlock Wiki (searched using: "${searchQuery}"):\n${wikiContext}\n\nUse this wiki content as your primary source of truth.`
    : 'No specific wiki content was found. If unsure about a specific game detail, say so honestly rather than guessing.'
}

When describing skill/slayer/catacombs progress, always phrase it as "X% of the way from level N to level N+1".

Respond in plain conversational text.`;

    const result = streamText({
      model: groq('llama-3.3-70b-versatile'),
      system: systemPrompt,
      messages: await convertToModelMessages(messages),
    });

    return result.toUIMessageStreamResponse();
  } catch (err) {
    console.error('Chat route error:', err);
    return new Response('Error: ' + (err instanceof Error ? err.message : 'unknown'), { status: 500 });
  }
}