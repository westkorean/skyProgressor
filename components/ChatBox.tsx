"use client";

import { useState } from 'react';
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import ReactMarkdown from 'react-markdown';

export default function ChatBox({ playerData }: { playerData: any }) {
  const [input, setInput] = useState('');

  const { messages, sendMessage, status } = useChat({
    transport: new DefaultChatTransport({
      api: '/api/chat',
      body: { playerData },
    }),
  });

  const isLoading = status == 'submitted' || status == 'streaming';

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    sendMessage({ text: input });
    setInput('');
  };

  console.log('messages:', messages);
  
  return (
    <section className="mb-8 bg-neutral-900 border border-neutral-800 rounded-xl p-5">
      <h2 className="text-xl font-semibold mb-4">Ask SkyProgressor</h2>

      <div className="mb-4 max-h-80 overflow-y-auto space-y-2">
        {messages.map((m) => (
          <div
            key={m.id}
            className={`p-2 rounded-lg text-sm ${
              m.role == 'user' ? 'bg-neutral-800 ml-8' : 'bg-neutral-950 border border-neutral-800 mr-8'
            }`}
          >
            <ReactMarkdown>
              {m.parts?.map((p: any) => (p.type == 'text' ? p.text : '')).join('') ?? ''}
            </ReactMarkdown>
          </div>
        ))}
        {isLoading && <div className="text-neutral-500 text-sm">Thinking...</div>}
      </div>

      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask about your SkyBlock progress..."
          className="flex-1 bg-neutral-950 border border-neutral-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-emerald-500"
        />
        <button
          type="submit"
          disabled={isLoading}
          className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 px-4 py-2 rounded-lg text-sm font-medium"
        >
          Send
        </button>
      </form>
    </section>
  );
}