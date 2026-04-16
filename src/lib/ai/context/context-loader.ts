import fs from 'fs';
import path from 'path';

const CONTEXT_DIR = path.join(process.cwd(), 'data', 'ai-context');

export interface CatalogTable {
  name: string;
  site: string;
  summary: string;
  tags: string[];
}

export interface CatalogDomain {
  name: string;
  summary: string;
  tags: string[];
}

export interface CatalogSite {
  key: string;
  description: string;
  note: string;
}

export interface Catalog {
  tables: CatalogTable[];
  domains: CatalogDomain[];
  sites: CatalogSite[];
}

export interface LoadedDoc {
  meta: Record<string, unknown>;
  content: string;
}

let catalogCache: Catalog | null = null;

export function loadCatalog(): Catalog {
  if (catalogCache) return catalogCache;
  const raw = fs.readFileSync(path.join(CONTEXT_DIR, 'catalog.json'), 'utf-8');
  catalogCache = JSON.parse(raw) as Catalog;
  return catalogCache;
}

export function resetCatalogCache(): void {
  catalogCache = null;
}

export function catalogToPrompt(): string {
  const cat = loadCatalog();
  const tableLines = cat.tables
    .map((t) => `- ${t.name} [${t.site}]: ${t.summary} (${(t.tags || []).join(', ')})`)
    .join('\n');
  const domainLines = cat.domains
    .map((d) => `- ${d.name}: ${d.summary} (${(d.tags || []).join(', ')})`)
    .join('\n');
  const siteLines = cat.sites
    .map((s) => `- ${s.key}: ${s.description} - ${s.note}`)
    .join('\n');

  return `## 테이블 카탈로그\n${tableLines}\n\n## 도메인 카탈로그\n${domainLines}\n\n## 사이트\n${siteLines}`;
}

function parseFrontmatter(raw: string): LoadedDoc {
  if (!raw.startsWith('---\n')) {
    return { meta: {}, content: raw.trim() };
  }

  const end = raw.indexOf('\n---\n', 4);
  if (end < 0) {
    return { meta: {}, content: raw.trim() };
  }

  const fm = raw.slice(4, end).trim();
  const body = raw.slice(end + 5).trim();
  const meta: Record<string, unknown> = {};

  for (const line of fm.split(/\r?\n/)) {
    const idx = line.indexOf(':');
    if (idx < 0) continue;
    const key = line.slice(0, idx).trim();
    const valueRaw = line.slice(idx + 1).trim();

    if (valueRaw.startsWith('[') && valueRaw.endsWith(']')) {
      const inner = valueRaw.slice(1, -1).trim();
      meta[key] = inner
        ? inner
            .split(',')
            .map((v) => v.trim().replace(/^['"]|['"]$/g, ''))
            .filter(Boolean)
        : [];
      continue;
    }

    if (valueRaw === 'true' || valueRaw === 'false') {
      meta[key] = valueRaw === 'true';
      continue;
    }

    meta[key] = valueRaw.replace(/^['"]|['"]$/g, '');
  }

  return { meta, content: body };
}

export function loadTableDoc(tableName: string): LoadedDoc | null {
  const filePath = path.join(CONTEXT_DIR, 'tables', `${tableName}.md`);
  if (!fs.existsSync(filePath)) return null;
  return parseFrontmatter(fs.readFileSync(filePath, 'utf-8'));
}

export function loadDomainDoc(domainName: string): LoadedDoc | null {
  const filePath = path.join(CONTEXT_DIR, 'domains', `${domainName}.md`);
  if (!fs.existsSync(filePath)) return null;
  return parseFrontmatter(fs.readFileSync(filePath, 'utf-8'));
}

export function loadSelectedContext(tables: string[], domains: string[]): string {
  const parts: string[] = [];

  for (const t of tables) {
    const doc = loadTableDoc(t);
    if (doc) parts.push(`## ${t}\n${doc.content}`);
  }

  for (const d of domains) {
    const doc = loadDomainDoc(d);
    if (doc) parts.push(`## 도메인: ${d}\n${doc.content}`);
  }

  return parts.join('\n\n');
}
