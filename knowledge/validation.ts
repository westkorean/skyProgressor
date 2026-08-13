import { KNOWLEDGE_CATEGORIES, type KnowledgeConfidence, type KnowledgeSource, type KnowledgeValidationIssue, type KnowledgeValidationResult, type ManagedKnowledgeCategory, type ManagedKnowledgeEntry, type PatchKnowledgeEntry } from './schema.ts';

const categorySet = new Set<string>(KNOWLEDGE_CATEGORIES);
const idPattern = new RegExp(`^(${KNOWLEDGE_CATEGORIES.join('|')})\\.[a-z0-9]+(?:-[a-z0-9]+)*$`);
const datePattern = /^\d{4}-\d{2}-\d{2}$/;
const record = (value: unknown): Record<string, unknown> | null => value !== null && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : null;

function nonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function stringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every(nonEmptyString);
}

function sourceIssues(value: unknown, path: string): { source: KnowledgeSource | null; issues: KnowledgeValidationIssue[] } {
  const issues: KnowledgeValidationIssue[] = [];
  const source = record(value);
  if (!source || !nonEmptyString(source.title)) issues.push({ path: `${path}.title`, message: 'Expected a source title.' });
  if (!source || !nonEmptyString(source.url)) issues.push({ path: `${path}.url`, message: 'Expected a source URL.' });
  else { try { if (new URL(source.url).protocol !== 'https:') throw new Error(); } catch { issues.push({ path: `${path}.url`, message: 'Expected a valid HTTPS URL.' }); } }
  return { source: issues.length ? null : source as unknown as KnowledgeSource, issues };
}

function confidenceLabel(value: unknown): KnowledgeConfidence | null {
  if (value === 'High' || value === 'Medium' || value === 'Low') return value;
  if (typeof value === 'number' && Number.isInteger(value) && value >= 0 && value <= 100) {
    if (value >= 80) return 'High';
    if (value >= 50) return 'Medium';
    return 'Low';
  }
  return null;
}

function confidenceScore(value: unknown): number | null {
  if (typeof value === 'number' && Number.isInteger(value) && value >= 0 && value <= 100) return value;
  if (value === 'High') return 90;
  if (value === 'Medium') return 65;
  if (value === 'Low') return 35;
  return null;
}

function validDate(value: unknown): value is string {
  return nonEmptyString(value) && datePattern.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00Z`));
}

export function validateKnowledgeEntry(value: unknown, path = 'entry'): { entry: ManagedKnowledgeEntry | null; issues: KnowledgeValidationIssue[] } {
  const issues: KnowledgeValidationIssue[] = [];
  const item = record(value);
  if (!item) return { entry: null, issues: [{ path, message: 'Expected an object.' }] };
  const required = ['id', 'category', 'title', 'summary', 'recommendation', 'requirements', 'tags', 'lastVerified', 'confidence'];
  for (const field of required) if (!(field in item)) issues.push({ path: `${path}.${field}`, message: 'Required field is missing.' });

  if (!nonEmptyString(item.id) || !idPattern.test(item.id)) issues.push({ path: `${path}.id`, message: 'Use category.slug format with lowercase letters, numbers, and hyphens.' });
  if (!nonEmptyString(item.category) || !categorySet.has(item.category)) issues.push({ path: `${path}.category`, message: 'Unknown knowledge category.' });
  if (nonEmptyString(item.id) && nonEmptyString(item.category) && !item.id.startsWith(`${item.category}.`)) issues.push({ path: `${path}.id`, message: 'ID prefix must match the entry category.' });
  for (const field of ['title', 'summary', 'recommendation'] as const) if (!nonEmptyString(item[field])) issues.push({ path: `${path}.${field}`, message: 'Expected a non-empty string.' });
  if (!stringArray(item.requirements)) issues.push({ path: `${path}.requirements`, message: 'Expected an array of non-empty strings.' });

  const relatedSystems = item.relatedSystems === undefined ? [] : item.relatedSystems;
  if (!stringArray(relatedSystems)) issues.push({ path: `${path}.relatedSystems`, message: 'Expected an array of known systems.' });
  else for (const system of relatedSystems) if (!categorySet.has(system)) issues.push({ path: `${path}.relatedSystems`, message: `Unknown related system ${system}.` });

  if (!stringArray(item.tags) || item.tags.length === 0) issues.push({ path: `${path}.tags`, message: 'Expected at least one non-empty tag.' });
  else if (new Set(item.tags).size !== item.tags.length || item.tags.some((tag) => tag !== tag.toLowerCase().trim())) issues.push({ path: `${path}.tags`, message: 'Tags must be unique, lowercase, and trimmed.' });

  const rawSources = Array.isArray(item.sources) ? item.sources : item.source ? [item.source] : [];
  if (rawSources.length === 0) issues.push({ path: `${path}.sources`, message: 'Expected at least one source.' });
  const sources = rawSources.flatMap((rawSource, index) => {
    const result = sourceIssues(rawSource, `${path}.sources[${index}]`);
    issues.push(...result.issues);
    return result.source ? [result.source] : [];
  });

  if (!validDate(item.lastVerified)) issues.push({ path: `${path}.lastVerified`, message: 'Expected a valid YYYY-MM-DD date.' });
  const normalizedConfidence = confidenceLabel(item.confidence);
  const normalizedConfidenceScore = confidenceScore(item.confidenceScore ?? item.confidence);
  if (!normalizedConfidence || normalizedConfidenceScore === null) issues.push({ path: `${path}.confidence`, message: 'Expected High, Medium, Low, or a legacy integer from 0 to 100.' });

  if (issues.length) return { entry: null, issues };
  return {
    entry: {
      ...item,
      relatedSystems,
      sources,
      source: sources[0],
      patchVersion: nonEmptyString(item.patchVersion) ? item.patchVersion : 'unknown',
      confidence: normalizedConfidence,
      confidenceScore: normalizedConfidenceScore,
    } as unknown as ManagedKnowledgeEntry,
    issues,
  };
}

export function validateKnowledgeCatalog(categoryFiles: Readonly<Record<ManagedKnowledgeCategory, unknown>>): KnowledgeValidationResult {
  const entries: ManagedKnowledgeEntry[] = [];
  const issues: KnowledgeValidationIssue[] = [];
  const ids = new Set<string>();
  const recommendationByCategory = new Map<string, ManagedKnowledgeEntry>();
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

      const normalizedRecommendation = `${result.entry.category}:${result.entry.title}:${result.entry.recommendation}`.toLowerCase().replace(/\s+/g, ' ');
      const prior = recommendationByCategory.get(normalizedRecommendation);
      if (prior && prior.id !== result.entry.id) issues.push({ path: `${category}[${index}].recommendation`, message: `Potential duplicate or contradicting recommendation with ${prior.id}.` });
      recommendationByCategory.set(normalizedRecommendation, result.entry);
    });
  }
  return { valid: issues.length === 0, entries, issues };
}

export function assertValidKnowledgeCatalog(categoryFiles: Readonly<Record<ManagedKnowledgeCategory, unknown>>): ManagedKnowledgeEntry[] {
  const result = validateKnowledgeCatalog(categoryFiles);
  if (!result.valid) throw new Error(`Knowledge validation failed:\n${result.issues.map((issue) => `${issue.path}: ${issue.message}`).join('\n')}`);
  return result.entries;
}

export function validatePatchKnowledgeEntry(value: unknown, path = 'patch'): { entry: PatchKnowledgeEntry | null; issues: KnowledgeValidationIssue[] } {
  const issues: KnowledgeValidationIssue[] = [];
  const item = record(value);
  if (!item) return { entry: null, issues: [{ path, message: 'Expected an object.' }] };
  for (const field of ['id', 'date', 'patchVersion', 'title', 'source', 'majorAdditions', 'majorRemovals', 'balanceChanges', 'progressionImpact', 'metaImpact', 'itemChanges', 'newSystems', 'removedMechanics', 'extractedKnowledge', 'manualReviewRequired']) {
    if (!(field in item)) issues.push({ path: `${path}.${field}`, message: 'Required field is missing.' });
  }
  if (!nonEmptyString(item.id) || !/^patch\.\d{4}-\d{2}-\d{2}-[a-z0-9-]+$/.test(item.id)) issues.push({ path: `${path}.id`, message: 'Expected patch.YYYY-MM-DD-slug.' });
  if (!validDate(item.date)) issues.push({ path: `${path}.date`, message: 'Expected a valid YYYY-MM-DD date.' });
  if (!nonEmptyString(item.patchVersion)) issues.push({ path: `${path}.patchVersion`, message: 'Expected a patch version or Minor Patch.' });
  if (!nonEmptyString(item.title)) issues.push({ path: `${path}.title`, message: 'Expected a title.' });
  issues.push(...sourceIssues(item.source, `${path}.source`).issues);
  for (const field of ['majorAdditions', 'majorRemovals', 'balanceChanges', 'progressionImpact', 'metaImpact', 'itemChanges', 'newSystems', 'removedMechanics'] as const) {
    if (!stringArray(item[field])) issues.push({ path: `${path}.${field}`, message: 'Expected an array of strings.' });
  }
  if (typeof item.manualReviewRequired !== 'boolean') issues.push({ path: `${path}.manualReviewRequired`, message: 'Expected a boolean.' });
  if (!Array.isArray(item.extractedKnowledge)) issues.push({ path: `${path}.extractedKnowledge`, message: 'Expected an array.' });
  else item.extractedKnowledge.forEach((change, index) => {
    const patchChange = record(change);
    if (!patchChange) { issues.push({ path: `${path}.extractedKnowledge[${index}]`, message: 'Expected an object.' }); return; }
    const topic = patchChange.topic;
    if (topic !== 'general' && (!nonEmptyString(topic) || !categorySet.has(topic))) issues.push({ path: `${path}.extractedKnowledge[${index}].topic`, message: 'Unknown topic.' });
    if (!nonEmptyString(patchChange.change)) issues.push({ path: `${path}.extractedKnowledge[${index}].change`, message: 'Expected a change summary.' });
    if (!confidenceLabel(patchChange.confidence)) issues.push({ path: `${path}.extractedKnowledge[${index}].confidence`, message: 'Expected High, Medium, or Low.' });
  });
  return { entry: issues.length ? null : item as unknown as PatchKnowledgeEntry, issues };
}

export function validatePatchKnowledgeCatalog(entries: readonly unknown[]): { valid: boolean; entries: PatchKnowledgeEntry[]; issues: KnowledgeValidationIssue[] } {
  const ids = new Set<string>();
  const patches: PatchKnowledgeEntry[] = [];
  const issues: KnowledgeValidationIssue[] = [];
  entries.forEach((entry, index) => {
    const result = validatePatchKnowledgeEntry(entry, `patches[${index}]`);
    issues.push(...result.issues);
    if (!result.entry) return;
    if (ids.has(result.entry.id)) issues.push({ path: `patches[${index}].id`, message: `Duplicate patch ID ${result.entry.id}.` });
    ids.add(result.entry.id);
    patches.push(result.entry);
  });
  return { valid: issues.length === 0, entries: patches, issues };
}
