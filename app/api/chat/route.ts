import { streamText, convertToModelMessages, type UIMessage } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';
import { runRetrievalPipeline } from '@/lib/retrieval';

const groq = createOpenAI({
  apiKey: process.env.GROQ_API_KEY,
  baseURL: 'https://api.groq.com/openai/v1',
});

export async function POST(req: Request) {
  try {
    if (!process.env.GROQ_API_KEY) return new Response('Chat service is not configured.', { status: 503 });
    const body = (await req.json()) as { messages?: UIMessage[]; playerData?: unknown };
    if (!body || typeof body !== 'object' || !Array.isArray(body.messages)) return new Response('Invalid chat request.', { status: 400 });

    const messages = body.messages.slice(-6).map((message) => ({
      ...message,
      parts: message.parts.map((part) => part.type === 'text' ? { ...part, text: part.text.slice(0, 1_500) } : part),
    }));
    const lastMessage = messages[messages.length - 1];
    const latestUserMessage = (lastMessage?.role === 'user' ? lastMessage.parts?.find((part) => part.type === 'text')?.text : '')?.slice(0, 4_000).trim() ?? '';
    if (!latestUserMessage) return new Response('A user message is required.', { status: 400 });

    const retrieval = runRetrievalPipeline(latestUserMessage, body.playerData);
    console.info('[retrieval]', {
      systems: retrieval.systems,
      knowledgeIds: retrieval.knowledge.map((entry) => entry.id),
      tokensBefore: retrieval.tokenMetrics.before,
      tokensAfter: retrieval.tokenMetrics.after,
      reductionPercent: retrieval.tokenMetrics.reductionPercent,
    });

    const systemPrompt = `You are a Hypixel SkyBlock expert.

Use only the supplied retrieval context for profile-specific facts, exact mechanics, requirements, and recommendations. If it does not contain the answer, say that the local knowledge base does not cover it. Never invent locations, items, prices, mechanics, or profile facts.

Progression priorities come only from rankedRecommendations. Explain them in their supplied order. Never create, remove, reorder, or assign priorities. Preserve every supplied title, category, priority, explanation, evidence, expectedBenefit, estimatedEffort, confidence, suggestedAction, and knowledgeReferences. Explain those fields; do not generate or alter them.

deterministicPlannerGoals is the only allowed source for a progression plan. You may explain its sequence, prerequisites, costs, timing, rewards, and progress, but never add, remove, reorder, or generate planner goals.

The localKnowledge array contains only entries selected for the relevant systems. Follow its requirements and recommendations, prefer higher-confidence entries, and name the source title when attribution is useful. Do not claim access to any other knowledge database.

Retrieved context:
${retrieval.context}

Be concise and conversational.`;

    const result = streamText({
      model: groq('llama-3.3-70b-versatile'),
      maxOutputTokens: 700,
      system: systemPrompt,
      messages: await convertToModelMessages(messages),
    });

    return result.toUIMessageStreamResponse({
      headers: {
        'X-Retrieval-Tokens-Before': String(retrieval.tokenMetrics.before),
        'X-Retrieval-Tokens-After': String(retrieval.tokenMetrics.after),
        'X-Retrieval-Reduction-Percent': String(retrieval.tokenMetrics.reductionPercent),
        'X-Retrieval-Systems': retrieval.systems.join(','),
      },
      onError: (error) => {
        console.error('Chat model stream failed:', error);
        const message = error instanceof Error ? error.message.toLowerCase() : '';
        if (message.includes('request too large') || message.includes('tokens per minute')) return 'This request contains too much context for the chat service. Please narrow the question.';
        if (message.includes('rate limit') || message.includes('too many requests')) return 'The chat service is busy right now. Please try again in a moment.';
        return 'The chat service could not generate a response. Please try again.';
      },
    });
  } catch {
    return new Response('Unable to process the chat request.', { status: 500 });
  }
}
