"use client";

import { useState } from 'react';
import ReactMarkdown from 'react-markdown';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export default function ChatBox({ playerData }: { playerData: any }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  const sendMessage = async () => {
    if (!input.trim()) return;
    const userMessage: Message = { role: 'user', content: input };
    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: input, playerData }),
      });
      const data = await res.json();
      setMessages((prev) => [...prev, { role: 'assistant', content: data.reply }]);
    } catch {
      setMessages((prev) => [...prev, { role: 'assistant', content: 'Something went wrong.' }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="mb-8 bg-neutral-900 border border-neutral-800 rounded-xl p-5">
      <h2 className="text-xl font-semibold mb-4">Ask SkyProgressor</h2>

      <div className="mb-4 max-h-80 overflow-y-auto space-y-2">
        {messages.map((m, i) => (
          <div
            key={i}
            className={`p-2 rounded-lg text-sm ${
              m.role === 'user' ? 'bg-neutral-800 ml-8' : 'bg-neutral-950 border border-neutral-800 mr-8'
            }`}
          >
            <ReactMarkdown>{m.content}</ReactMarkdown>
          </div>
        ))}
        {loading && <div className="text-neutral-500 text-sm">Thinking...</div>}
      </div>

      <div className="flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
          placeholder="Ask about your SkyBlock progress..."
          className="flex-1 bg-neutral-950 border border-neutral-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-emerald-500"
        />
        <button
          onClick={sendMessage}
          disabled={loading}
          className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 px-4 py-2 rounded-lg text-sm font-medium"
        >
          Send
        </button>
      </div>
    </section>
  );
}