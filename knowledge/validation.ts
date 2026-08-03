import { KNOWLEDGE_CATEGORIES, type KnowledgeValidationIssue, type KnowledgeValidationResult, type ManagedKnowledgeCategory, type ManagedKnowledgeEntry } from './schema.ts';

const categorySet = new Set<string>(KNOWLEDGE_CATEGORIES);
const idPattern = /^(combat|dungeons|foraging|mining|farming|pets|accessories|rift|garden|hotm)\.[a-z0-9]+(?:-[a-z0-9]+)*$/;
const datePattern = /^\d{4}-\d{2}-\d{2}$/;
const record = (value: unknown): Record<string, unknown> | null => value !== null && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : null;

function nonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function stringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every(nonEmptyString);
}

export function validateKnowledgeEntry(value: unknown, path = 'entry'): { entry: ManagedKnowledgeEntry | null; issues: KnowledgeValidationIssue[] } {
  const issues: KnowledgeValidationIssue[] = [];
  const item = record(value);
  if (!item) return { entry: null, issues: [{ path, message: 'Expected an object.' }] };
  const required = ['id', 'category', 'title', 'summary', 'recommendation', 'requirements', 'tags', 'source', 'lastVerified', 'confidence'];
  for (const field of required) if (!(field in item)) issues.push({ path: `${path}.${field}`, message: 'Required field is missing.' });

  if (!nonEmptyString(item.id) || !idPattern.test(item.id)) issues.push({ path: `${path}.id`, message: 'Use category.slug format with lowercase letters, numbers, and hyphens.' });
  if (!nonEmptyString(item.category) || !categorySet.has(item.category)) issues.push({ path: `${path}.category`, message: 'Unknown knowledge category.' });
  if (nonEmptyString(item.id) && nonEmptyString(item.category) && !item.id.startsWith(`${item.category}.`)) issues.push({ path: `${path}.id`, message: 'ID prefix must match the entry category.' });
  for (const field of ['title', 'summary', 'recommendation'] as const) if (!nonEmptyString(item[field])) issues.push({ path: `${path}.${field}`, message: 'Expected a non-empty string.' });
  if (!stringArray(item.requirements)) issues.push({ path: `${path}.requirements`, message: 'Expected an array of non-empty strings.' });
  if (!stringArray(item.tags) || item.tags.length === 0) issues.push({ path: `${path}.tags`, message: 'Expected at least one non-empty tag.' });
  else if (new Set(item.tags).size !== item.tags.length || item.tags.some((tag) => tag !== tag.toLowerCase().trim())) issues.push({ path: `${path}.tags`, message: 'Tags must be unique, lowercase, and trimmed.' });

  const source = record(item.source);
  if (!source || !nonEmptyString(source.title)) issues.push({ path: `${path}.source.title`, message: 'Expected a source title.' });
  if (!source || !nonEmptyString(source.url)) issues.push({ path: `${path}.source.url`, message: 'Expected a source URL.' });
  else { try { if (new URL(source.url).protocol !== 'https:') throw new Error(); } catch { issues.push({ path: `${path}.source.url`, message: 'Expected a valid HTTPS URL.' }); } }

  if (!nonEmptyString(item.lastVerified) || !datePattern.test(item.lastVerified) || Number.isNaN(Date.parse(`${item.lastVerified}T00:00:00Z`))) issues.push({ path: `${path}.lastVerified`, message: 'Expected a valid YYYY-MM-DD date.' });
  if (typeof item.confidence !== 'number' || !Number.isInteger(item.confidence) || item.confidence < 0 || item.confidence > 100) issues.push({ path: `${path}.confidence`, message: 'Expected an integer from 0 to 100.' });
  return { entry: issues.length ? null : item as unknown as ManagedKnowledgeEntry, issues };
}

export function validateKnowledgeCatalog(categoryFiles: Readonly<Record<ManagedKnowledgeCategory, unknown>>): KnowledgeValidationResult {
  const entries: ManagedKnowledgeEntry[] = [];
  const issues: KnowledgeValidationIssue[] = [];
  const ids = new Set<string>();
  for (const category of KNOWLEDGE_CATEGORIES) {
    const raw = categoryFiles[category];
    if (!Array.isArray(raw)) { issues.push({ path: category, message: 'Category file must contain an array.' }); continue; }
    raw.forEach((value, index) => {
      const result = validateKnowledgeEntry(value, `${category}[${index}]`);
      issues.push(...result.issues);
      if (!result.entry) return;
      if (result.entry.category !== category) issues.push({ path: `${category}[${index}].category`, message: `Expected category ${category}.` });
      if (ids.has(result.entry.id)) issues.push({ path: `${category}[${index}].id`, message: `Duplicate ID ${result.entry.id}.` });
      else { ids.add(result.entry.id); entries.push(result.entry); }
    });
  }
  return { valid: issues.length === 0, entries, issues };
}

export function assertValidKnowledgeCatalog(categoryFiles: Readonly<Record<ManagedKnowledgeCategory, unknown>>): ManagedKnowledgeEntry[] {
  const result = validateKnowledgeCatalog(categoryFiles);
  if (!result.valid) throw new Error(`Knowledge validation failed:\n${result.issues.map((issue) => `${issue.path}: ${issue.message}`).join('\n')}`);
  return result.entries;
}
