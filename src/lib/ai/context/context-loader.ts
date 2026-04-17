/**
 * @file src/lib/ai/context/context-loader.ts
 * @description AI 챗 컨텍스트 로더.
 *
 * 초보자 가이드:
 * - `loadCatalog()` / `catalogToPrompt()` 는 Phase 2부터 내부적으로
 *   `data/ai-context/tables.json` 을 읽어 기존 Catalog 형태로 변환한다.
 * - `loadTableDoc()` / `loadSelectedContext()` 는 Phase 4 레거시 정리 전까지
 *   기존 `data/ai-context/tables/*.md` 를 계속 읽는다.
 * - 외부 시그니처 호환: async 전환됐으므로 호출부는 `await` 필요.
 */
import fs from 'fs';
import path from 'path';
import { loadTables } from '@/lib/ai-tables/store';
import { buildStage0Prompt } from '@/lib/ai-tables/merged-context';
import type { SiteKey } from '@/lib/ai-tables/types';

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

/**
 * 신규 `tables.json` 을 읽어 기존 `Catalog` 형태로 변환 반환.
 * enabled === false 인 테이블은 자동 제외 → 호출부에서 별도 필터 불필요.
 * domains 는 과도기적으로 빈 배열 (Phase 3 에서 column-domains.json 매핑 추가 예정).
 */
export async function loadCatalog(): Promise<Catalog> {
  const tables = await loadTables();

  const catTables: CatalogTable[] = [];
  const siteKeys = new Set<string>();

  for (const [site, st] of Object.entries(tables.sites)) {
    siteKeys.add(site);
    for (const [name, meta] of Object.entries(st.tables)) {
      if (!meta.enabled) continue;
      catTables.push({
        name,
        site,
        summary: meta.summary ?? '',
        tags: meta.tags ?? [],
      });
    }
  }

  // sites: tables.json 에 실제로 등장한 site 만 반환. default 는 항상 포함.
  siteKeys.add('default');
  const sites: CatalogSite[] = [...siteKeys].map((key) => ({
    key,
    description: key === 'default' ? '기본 사이트' : key,
    note: '',
  }));

  return { tables: catTables, domains: [], sites };
}

/** 메모리 캐시 초기화 — invalidate 대체용 외부 인터페이스. */
export function resetCatalogCache(): void {
  // store.ts 의 invalidateTablesCache 로 위임.
  // 순환 참조 피하기 위해 동적 import (런타임 비용 거의 0).
  void import('@/lib/ai-tables/store').then((m) => m.invalidateTablesCache());
}

/**
 * Stage 0 프롬프트 문자열. 내부적으로 compact 포맷을 사용한다.
 * @param site 대상 사이트 키. 미지정 시 'default'.
 */
export async function catalogToPrompt(
  site: SiteKey = 'default',
): Promise<string> {
  return buildStage0Prompt(site);
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

/**
 * tables/{table}.md 파일 1개 로드. Phase 4 레거시 정리 전까지 유지.
 * Phase 3 에서 예제/힌트를 tables.json 으로 이관하는 중간 단계에서 사용됨.
 */
export function loadTableDoc(tableName: string): LoadedDoc | null {
  const filePath = path.join(CONTEXT_DIR, 'tables', `${tableName}.md`);
  if (!fs.existsSync(filePath)) return null;
  return parseFrontmatter(fs.readFileSync(filePath, 'utf-8'));
}

/** domains/{domain}.md 파일 1개 로드. (Phase 4 에서 제거 예정) */
export function loadDomainDoc(domainName: string): LoadedDoc | null {
  const filePath = path.join(CONTEXT_DIR, 'domains', `${domainName}.md`);
  if (!fs.existsSync(filePath)) return null;
  return parseFrontmatter(fs.readFileSync(filePath, 'utf-8'));
}

/**
 * 선택된 테이블/도메인의 MD 본문을 합쳐 문자열로 반환.
 * `/ai-chat` stream route 에서 Stage 1 프롬프트 보강에 사용.
 * Phase 4 에서는 `buildStage1Prompt` 로 대체 예정.
 */
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
