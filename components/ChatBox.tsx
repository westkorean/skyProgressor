'use client';
/* eslint-disable react-hooks/set-state-in-effect -- localStorage is an external browser store; profile changes must hydrate its saved session into React state. */

import { useEffect, useMemo, useRef, useState } from 'react';
import { useChat, type UIMessage } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import ReactMarkdown from 'react-markdown';

type HistoryEntry = { key: string; label: string; updatedAt: number };
const HISTORY_INDEX_KEY = 'skyprogressor:chat-history';
const CHAT_HINT_DISMISSED_KEY = 'skyprogressor:chat-hint-dismissed';
const MAX_HISTORIES = 12;

function storageKey(profileKey: string): string {
  return `skyprogressor:chat:${encodeURIComponent(profileKey)}`;
}

function readIndex(): HistoryEntry[] {
  try {
    const value = JSON.parse(localStorage.getItem(HISTORY_INDEX_KEY) ?? '[]') as unknown;
    return Array.isArray(value)
      ? value.filter((entry): entry is HistoryEntry => Boolean(entry && typeof entry === 'object' && typeof (entry as HistoryEntry).key === 'string' && typeof (entry as HistoryEntry).label === 'string' && typeof (entry as HistoryEntry).updatedAt === 'number')).slice(0, MAX_HISTORIES)
      : [];
  } catch { return []; }
}

function readMessages(profileKey: string): UIMessage[] {
  try {
    const value = JSON.parse(localStorage.getItem(storageKey(profileKey)) ?? '[]') as unknown;
    return Array.isArray(value) ? value as UIMessage[] : [];
  } catch { return []; }
}

export default function ChatBox({ playerData, profileKey, profileLabel, onVisitProfile }: { playerData: unknown; profileKey: string; profileLabel: string; onVisitProfile?: (ign: string) => void }) {
  const [input, setInput] = useState('');
  const [open, setOpen] = useState(false);
  const [showChatHint, setShowChatHint] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [selectedKey, setSelectedKey] = useState(profileKey);
  const [historicalMessages, setHistoricalMessages] = useState<UIMessage[]>([]);
  const hydratedKey = useRef<string | null>(null);
  const skipNextPersist = useRef(false);
  const lastPersistedMessages = useRef<string | null>(null);

  const transport = useMemo(
    () => new DefaultChatTransport({ api: '/api/chat', body: { playerData } }),
    [playerData]
  );

  const { messages, setMessages, sendMessage, status, error } = useChat({
    id: `profile-${profileKey}`,
    transport,
  });
  const isLoading = status === 'submitted' || status === 'streaming';
  const viewingCurrent = selectedKey === profileKey;
  const visibleMessages = viewingCurrent ? messages : historicalMessages;
  const selectedLabel = history.find((entry) => entry.key === selectedKey)?.label ?? profileLabel;

  useEffect(() => {
    try {
      setShowChatHint(localStorage.getItem(CHAT_HINT_DISMISSED_KEY) !== 'true');
    } catch {
      setShowChatHint(true);
    }
  }, []);

  useEffect(() => {
    const entries = readIndex();
    const updated = [{ key: profileKey, label: profileLabel, updatedAt: Date.now() }, ...entries.filter((entry) => entry.key !== profileKey)].slice(0, MAX_HISTORIES);
    localStorage.setItem(HISTORY_INDEX_KEY, JSON.stringify(updated));
    setHistory(updated);
    setSelectedKey(profileKey);
    setHistoricalMessages([]);
  }, [profileKey, profileLabel]);

  useEffect(() => {
    if (hydratedKey.current === profileKey) return;
    hydratedKey.current = profileKey;
    skipNextPersist.current = true;
    const savedMessages = readMessages(profileKey);
    lastPersistedMessages.current = JSON.stringify(savedMessages);
    setMessages(savedMessages);
  }, [profileKey, setMessages]);

  useEffect(() => {
    if (hydratedKey.current !== profileKey) return;
    if (isLoading) return;
    if (skipNextPersist.current) {
      skipNextPersist.current = false;
      return;
    }
    try {
      const serializedMessages = JSON.stringify(messages);
      if (serializedMessages === lastPersistedMessages.current) return;
      lastPersistedMessages.current = serializedMessages;
      localStorage.setItem(storageKey(profileKey), serializedMessages);
      const entries = readIndex();
      const updated = [{ key: profileKey, label: profileLabel, updatedAt: Date.now() }, ...entries.filter((entry) => entry.key !== profileKey)].slice(0, MAX_HISTORIES);
      localStorage.setItem(HISTORY_INDEX_KEY, JSON.stringify(updated));
      setHistory(updated);
    } catch { /* Storage can be unavailable or full; chat remains usable in memory. */ }
  }, [messages, profileKey, profileLabel, isLoading]);

  const messageCount = useMemo(() => history.reduce((sum, entry) => sum + readMessages(entry.key).length, 0), [history]);

  const selectHistory = (entry: HistoryEntry) => {
    setSelectedKey(entry.key);
    setHistoricalMessages(entry.key === profileKey ? [] : readMessages(entry.key));
    setShowHistory(false);
  };

  const dismissChatHint = () => {
    setShowChatHint(false);
    try {
      localStorage.setItem(CHAT_HINT_DISMISSED_KEY, 'true');
    } catch { /* The hint can still be dismissed for the current visit. */ }
  };

  const toggleChat = () => {
    dismissChatHint();
    setOpen((value) => !value);
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!viewingCurrent || !input.trim() || isLoading) return;
    void sendMessage({ text: input.trim() });
    setInput('');
  };

  return (
    <>
      {open && (
        <section aria-label="SkyProgressor advisor" className="fixed bottom-24 right-3 z-[80] flex h-[min(70vh,640px)] w-[min(94vw,760px)] overflow-hidden rounded-2xl border border-neutral-700 bg-neutral-950 shadow-2xl sm:right-6">
          {showHistory && (
            <aside className="absolute inset-y-0 left-0 z-20 w-64 border-r border-neutral-800 bg-neutral-950 p-3 shadow-xl sm:static sm:block">
              <div className="mb-3 flex items-center justify-between">
                <div><div className="text-sm font-semibold">Profile chats</div><div className="text-[10px] text-neutral-500">{messageCount} saved messages</div></div>
                <button type="button" onClick={() => setShowHistory(false)} className="rounded p-1 text-neutral-500 hover:bg-neutral-800 hover:text-white" aria-label="Close history">×</button>
              </div>
              <div className="space-y-1 overflow-y-auto">
                {history.map((entry) => {
                  const historyIgn = entry.label.split('·')[0]?.trim();
                  return (
                    <div key={entry.key} className={`rounded-lg p-1 ${selectedKey === entry.key ? 'bg-emerald-600/20 text-emerald-300' : 'text-neutral-400 hover:bg-neutral-900 hover:text-white'}`}>
                      <button type="button" onClick={() => selectHistory(entry)} className="w-full rounded px-1 py-1 text-left">
                        <div className="truncate text-xs font-medium">{entry.label}</div>
                        <div className="mt-0.5 text-[10px] text-neutral-600">{new Date(entry.updatedAt).toLocaleDateString()}</div>
                      </button>
                      {historyIgn && onVisitProfile && (
                        <button type="button" onClick={() => { setOpen(false); onVisitProfile(historyIgn); }} className="mt-1 w-full rounded border border-neutral-800 px-2 py-1 text-left text-[10px] text-neutral-500 hover:border-emerald-600 hover:text-emerald-300">↗ Visit {historyIgn}&apos;s profile</button>
                      )}
                    </div>
                  );
                })}
              </div>
            </aside>
          )}

          <div className="flex min-w-0 flex-1 flex-col">
            <header className="flex items-center justify-between border-b border-neutral-800 px-3 py-3 sm:px-4">
              <div className="flex min-w-0 items-center gap-2">
                <button type="button" onClick={() => setShowHistory((value) => !value)} className="rounded-lg border border-neutral-800 px-2 py-1.5 text-xs text-neutral-400 hover:bg-neutral-900 hover:text-white">History</button>
                <div className="min-w-0"><div className="truncate text-sm font-semibold">Ask SkyProgressor</div><div className="truncate text-[10px] text-neutral-500">{selectedLabel}</div></div>
              </div>
              <button type="button" onClick={() => setOpen(false)} className="rounded-lg px-2 py-1 text-xl text-neutral-500 hover:bg-neutral-900 hover:text-white" aria-label="Close chat">×</button>
            </header>

            <div className="flex-1 space-y-3 overflow-y-auto p-3 sm:p-4">
              {visibleMessages.length === 0 && <div className="mx-auto mt-12 max-w-sm text-center"><div className="text-sm font-medium text-neutral-300">Ask about this profile</div><p className="mt-1 text-xs text-neutral-500">Recommendations use the loaded profile and deterministic priority engine.</p></div>}
              {visibleMessages.map((message) => (
                <div key={message.id} className={`rounded-xl p-3 text-sm ${message.role === 'user' ? 'ml-8 bg-emerald-600/15' : 'mr-8 border border-neutral-800 bg-neutral-900'}`}>
                  <ReactMarkdown>{message.parts?.map((part) => part.type === 'text' ? part.text : '').join('') ?? ''}</ReactMarkdown>
                </div>
              ))}
              {isLoading && viewingCurrent && <div className="text-sm text-neutral-500">Thinking…</div>}
              {error && viewingCurrent && <div className="text-sm text-red-400">{error.message}</div>}
            </div>

            {!viewingCurrent && <div className="border-t border-amber-800/50 bg-amber-950/30 px-4 py-2 text-xs text-amber-300">Load this profile again to continue its chat with the correct player data.</div>}
            <form onSubmit={handleSubmit} className="flex gap-2 border-t border-neutral-800 p-3">
              <input value={input} onChange={(event) => setInput(event.target.value)} disabled={!viewingCurrent} placeholder={viewingCurrent ? 'Ask about your SkyBlock progress…' : 'Historical chat is read-only'} className="min-w-0 flex-1 rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none disabled:opacity-50" />
              <button type="submit" disabled={isLoading || !viewingCurrent || !input.trim()} className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium hover:bg-emerald-500 disabled:opacity-40">Send</button>
            </form>
          </div>
        </section>
      )}

      <div className="group fixed bottom-4 right-3 z-[79] sm:right-6">
        {showChatHint && !open && (
          <div role="status" className="absolute bottom-[calc(100%+18px)] right-0 w-64 rounded-xl border border-emerald-500/50 bg-neutral-950 p-3 pr-8 text-left shadow-[0_12px_35px_rgba(0,0,0,0.55)]">
            <button type="button" onClick={dismissChatHint} aria-label="Dismiss chatbot tip" className="absolute right-2 top-1.5 rounded p-1 text-neutral-500 hover:bg-neutral-800 hover:text-white">×</button>
            <div className="text-xs font-semibold text-emerald-300">Need help with this profile?</div>
            <p className="mt-1 text-[11px] leading-4 text-neutral-400">Ask the advisor about your gear, progression, or what to work on next.</p>
            <span aria-hidden="true" className="absolute -bottom-2 right-5 h-4 w-4 rotate-45 border-b border-r border-emerald-500/50 bg-neutral-950" />
          </div>
        )}
        {!showChatHint && <div className="pointer-events-none absolute bottom-full right-0 mb-2 whitespace-nowrap rounded-lg border border-neutral-700 bg-neutral-950 px-3 py-2 text-xs text-neutral-300 opacity-0 shadow-lg transition group-hover:opacity-100">Ask SkyProgressor</div>}
        <button type="button" onClick={toggleChat} aria-expanded={open} aria-label={open ? 'Close SkyProgressor chat' : 'Open SkyProgressor chat'} className={`flex h-14 w-14 items-center justify-center rounded-full border border-emerald-400/60 bg-emerald-600 text-2xl shadow-[0_0_28px_rgba(16,185,129,0.35)] transition hover:scale-105 hover:bg-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-300 ${showChatHint && !open ? 'animate-bounce' : ''}`}>{open ? '×' : '✦'}</button>
      </div>
    </>
  );
}
