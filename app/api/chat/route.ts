import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

const groq = new OpenAI({
  apiKey: process.env.GROQ_API_KEY,
  baseURL: 'https://api.groq.com/openai/v1',
});

async function searchWiki(query: string): Promise<string | null> {
  try {
    const baseUrl = 'https://hypixel-skyblock.fandom.com/api.php';

    const searchRes = await fetch(
      `${baseUrl}?action=query&list=search&srsearch=${encodeURIComponent(query)}&format=json&srlimit=1`
    );
    const searchData = await searchRes.json();
    const topResult = searchData?.query?.search?.[0];

    if (!topResult) return null;

    const contentRes = await fetch(
      `${baseUrl}?action=query&prop=extracts&explaintext=true&titles=${encodeURIComponent(
        topResult.title
      )}&format=json`
    );
    const contentData = await contentRes.json();
    const pages = contentData?.query?.pages;
    const page: any = pages ? Object.values(pages)[0] : null;

    if (!page?.extract) return null;

    return `Wiki page "${topResult.title}":\n${page.extract.slice(0, 2000)}`;
  } catch {
    return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    const { message, playerData } = await request.json();

    const wikiContext = await searchWiki(message);

    const systemPrompt = `You are a helpful Hypixel SkyBlock assistant. The player you're talking to has this current data:
${JSON.stringify(playerData, null, 2)}

${wikiContext ? `Here is relevant, current information from the Hypixel SkyBlock Wiki:\n${wikiContext}\n\nUse this wiki content as your source of truth for game mechanics, locations, and details — it is more reliable than your own training knowledge.` : 'No specific wiki content was found for this question — if you are not confident about a specific game detail, say so honestly rather than guessing.'}

Answer the player's question using this data where relevant. Keep answers concise and practical.

When describing skill/slayer/catacombs progress, always phrase it as "X% of the way from level N to level N+1" to avoid ambiguity about which level the player currently holds vs is progressing toward.

Respond in plain conversational text.`;

    const response = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      max_tokens: 500,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: message },
      ],
    });

    const reply = response.choices[0]?.message?.content ?? 'Sorry, I could not generate a response.';

    return NextResponse.json({ reply });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Chat request failed' }, { status: 500 });
  }
}