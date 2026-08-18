import { generateText, Output } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';
import { z } from 'zod';
import { summarizePlayerData } from '@/lib/chatContext';
import { createCuratedProgressPlanner } from '@/lib/progressPlanner';

const groq = createOpenAI({ apiKey: process.env.GROQ_API_KEY, baseURL: 'https://api.groq.com/openai/v1' });
const categories = ['accessories', 'pets', 'hotm', 'hotf', 'collections', 'dungeons', 'garden', 'fishing', 'crimson', 'rift', 'skills', 'slayers'] as const;
const goalSchema = z.object({
  category: z.enum(categories),
  title: z.string().min(2).max(100),
  reason: z.string().min(2).max(240),
  estimatedTime: z.string().min(2).max(100),
  estimatedCost: z.string().min(2).max(100),
  expectedReward: z.string().min(2).max(180),
  progressPercent: z.number().min(0).max(100),
  prerequisiteGoalNumbers: z.array(z.number().int().min(1).max(8)).max(4),
});

export async function POST(request: Request) {
  if (!process.env.GROQ_API_KEY) return Response.json({ error: 'Chat service is not configured.' }, { status: 503 });
  try {
    const body = await request.json() as { preferences?: unknown; playerData?: unknown };
    const preferences = typeof body.preferences === 'string' ? body.preferences.trim().slice(0, 500) : '';
    if (!preferences) return Response.json({ error: 'Describe what you want the planner to prioritize.' }, { status: 400 });
    const profile = summarizePlayerData(body.playerData);
    const { output } = await generateText({
      model: groq('llama-3.3-70b-versatile'),
      maxOutputTokens: 1_500,
      output: Output.object({ schema: z.object({ goals: z.array(goalSchema).min(3).max(8) }) }),
      system: `You create curated Hypixel SkyBlock progress plans. Use only facts in the supplied parsed profile. Respect the user's priorities, but do not invent owned items, levels, prices, or game mechanics. Create 3-8 concrete goals in dependency order. A prerequisite goal number may only refer to an earlier goal. Progress must reflect current profile evidence; use 0 when evidence is absent. Costs must be qualitative unless an exact cost is supplied.`,
      prompt: `User priorities: ${preferences}\n\nParsed profile:\n${profile}`,
    });
    return Response.json({ planner: createCuratedProgressPlanner(output.goals) });
  } catch (error) {
    console.error('Curated planner generation failed:', error);
    return Response.json({ error: 'The advisor could not generate a planner. Please try again.' }, { status: 502 });
  }
}
