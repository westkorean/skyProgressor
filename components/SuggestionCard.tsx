import { Suggestion } from '@/lib/getSuggestions';

export default function SuggestionCard({ suggestion }: { suggestion: Suggestion }) {
  return (
    <div
      style={{
        padding: '1rem',
        border: '1px solid #333',
        borderRadius: '8px',
        marginBottom: '0.75rem',
        background: '#686868',
      }}
    >
      <div style={{ fontSize: '0.75rem', color: '#ffffff', textTransform: 'uppercase' }}>
        {suggestion.category}
      </div>
      <div style={{ fontWeight: 600, marginTop: '0.25rem' }}>{suggestion.message}</div>
    </div>
  );
}