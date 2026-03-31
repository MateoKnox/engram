/**
 * Example: Integrating ENGRAM with OpenAI chat completions
 *
 * This example shows a pattern for using ENGRAM as memory for an AI assistant.
 * The OpenAI client is NOT required to run this file — it shows the pattern.
 *
 * To run for real:
 *   npm install openai
 *   OPENAI_API_KEY=sk-... npx tsx examples/with-openai.ts
 */

import { EngramEngine } from '../src/index.js';
import type { RecallResult } from '../src/types.js';

// Placeholder so the file is runnable without openai installed
interface ChatMessage { role: 'system' | 'user' | 'assistant'; content: string; }

/** Build a system prompt that includes relevant memories */
function buildSystemPrompt(memories: RecallResult): string {
  const sections: string[] = [
    'You are a helpful research assistant with persistent memory.',
  ];

  if (memories.entries.length > 0) {
    sections.push('\n## Relevant memories from your memory bank:');
    for (const entry of memories.entries) {
      sections.push(`- [${entry.layer.toUpperCase()}] ${entry.content}`);
    }
  }

  return sections.join('\n');
}

async function chat(
  engine: EngramEngine,
  userMessage: string,
  history: ChatMessage[]
): Promise<string> {
  // 1. Recall relevant memories
  const memories = await engine.recall(userMessage, {
    layers: ['core', 'skill', 'graph', 'episode', 'buffer'],
    limit: 8,
    minWeight: 0.2,
  });

  // 2. Build context-aware system prompt
  const systemPrompt = buildSystemPrompt(memories);

  // 3. In a real integration, call OpenAI here:
  // const openai = new OpenAI();
  // const response = await openai.chat.completions.create({
  //   model: 'gpt-4o',
  //   messages: [
  //     { role: 'system', content: systemPrompt },
  //     ...history,
  //     { role: 'user', content: userMessage },
  //   ],
  // });
  // const assistantReply = response.choices[0].message.content ?? '';

  // For this example, simulate a reply:
  const assistantReply = `[Simulated response to: "${userMessage}" with ${memories.entries.length} memories loaded]`;

  // 4. Store the interaction in memory
  await engine.store('episode', `User: ${userMessage}`, {
    tags: ['user-query'],
    importance: 0.6,
  });
  await engine.store('episode', `Assistant: ${assistantReply}`, {
    tags: ['assistant-reply'],
    importance: 0.5,
  });

  // 5. Store buffer context
  await engine.store('buffer', `Active topic: ${userMessage.slice(0, 50)}`, {
    tags: ['active-context'],
    importance: 1.0,
  });

  return assistantReply;
}

async function main() {
  const engine = new EngramEngine('./examples/engram.toml');
  await engine.init();

  // Seed core identity
  await engine.store('core', 'You are a biology research assistant.', {
    tags: ['identity'],
  });
  await engine.store('graph', 'Photosynthesis: sunlight + CO2 + water → glucose + oxygen', {
    key: 'photosynthesis',
    tags: ['biology'],
    importance: 0.9,
  });

  const history: ChatMessage[] = [];
  const questions = [
    'What do you know about photosynthesis?',
    'How does that relate to plant energy?',
    'Can you summarize what we discussed?',
  ];

  for (const question of questions) {
    console.log(`\nUser: ${question}`);
    const reply = await chat(engine, question, history);
    console.log(`Assistant: ${reply}`);
    history.push({ role: 'user', content: question });
    history.push({ role: 'assistant', content: reply });
  }

  console.log('\nFinal memory stats:', engine.stats());
}

main().catch(console.error);
