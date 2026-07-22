import { Suggestion } from '@/lib/getSuggestions';

export default function SuggestionCard({ suggestion }: { suggestion: Suggestion }) {
  return (
    <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-4 mb-3">
      <div className="text-xs text-neutral-500 uppercase tracking-wide">{suggestion.category}</div>
      <div className="font-medium mt-1">{suggestion.message}</div>
    </div>
  );
}