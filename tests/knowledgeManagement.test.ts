import assert from 'node:assert/strict';
import test from 'node:test';
import { managedKnowledgeCatalog } from '../knowledge/catalog.ts';
import { KNOWLEDGE_CATEGORIES, type ManagedKnowledgeCategory } from '../knowledge/schema.ts';
import { validateKnowledgeCatalog, validateKnowledgeEntry } from '../knowledge/validation.ts';

test('managed knowledge catalog has valid entries in every required category', () => {
  assert.equal(managedKnowledgeCatalog.length >= KNOWLEDGE_CATEGORIES.length, true);
  for (const category of KNOWLEDGE_CATEGORIES) {
    assert.ok(managedKnowledgeCatalog.some((entry) => entry.category === category));
  }
});

test('entry validation rejects mismatched IDs, invalid dates, URLs, tags, and confidence', () => {
  const result = validateKnowledgeEntry({
    id: 'combat.Bad ID', category: 'combat', title: 'Title', summary: 'Summary',
    recommendation: 'Action', requirements: [], tags: ['Not Normalized', 'Not Normalized'],
    source: { title: 'Source', url: 'http://example.com' }, lastVerified: 'yesterday', confidence: 101,
  });
  assert.equal(result.entry, null);
  assert.ok(result.issues.length >= 5);
});

test('catalog validation detects duplicate IDs without accepting duplicate entries', () => {
  const sample = managedKnowledgeCatalog[0];
  const files = Object.fromEntries(KNOWLEDGE_CATEGORIES.map((category) => [category, []])) as Record<ManagedKnowledgeCategory, unknown>;
  files.combat = [sample, sample];
  const result = validateKnowledgeCatalog(files);
  assert.equal(result.valid, false);
  assert.match(result.issues.map((issue) => issue.message).join(' '), /Duplicate ID/);
});
