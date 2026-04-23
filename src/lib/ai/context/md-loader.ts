/**
 * @file src/lib/ai/context/md-loader.ts
 * @description wiki/ai-chat/ 하위 MD 파일을 읽어 AI chat 시스템 프롬프트 섹션으로 변환.
 *
 * 초보자 가이드:
 * - 기존 domain-*.ts / sql-*.ts 에 하드코딩되어 있던 도메인 지식을 MD로 전환하기 위한 로더.
 * - 서버 프로세스 시작 후 첫 호출 시 wiki/ai-chat/ 전체를 스캔해서 메모리 캐시에 상주.
 * - dev 환경에서 수정 즉시 반영이 필요하면 invalidateAiChatContext()를 호출 (또는 서버 재시작).
 *
 * 주의:
 * - Node.js fs 사용 → 서버 코드에서만 import 할 것 (API Route / Server Component).
 * - 경로는 process.cwd() 기준 → Next.js standalone 빌드 시 wiki/ 디렉터리가 배포 산출물에
 *   포함되는지 별도 확인 필요.
 * - frontmatter 파서는 최소 기능만 구현 (key: value, 문자열, 단순 배열, ISO 날짜).
 *   복잡한 YAML이 필요해지면 gray-matter 의존성 추가 고려.
 *
 * 사용처: src/lib/ai/context/prompt-builder.ts
 */

import fs from 'node:fs/promises';
import path from 'node:path';

const WIKI_ROOT = path.join(process.cwd(), 'wiki', 'ai-chat');

export interface AiChatFrontmatter {
  type?: 'identity-prompt' | 'sql-rule' | 'skeleton' | 'formula' | 'join-recipe';
  title?: string;
  updated?: string;
  stage?: 'sql_generation' | 'analysis' | 'both';
  aliases?: string[];
  tables?: string[];
  tags?: string[];
}

export interface LoadedAiChatPage {
  slug: string; // 예: "formulas/yield"
  fm: AiChatFrontmatter;
  body: string; // frontmatter 제거 후 본문 (trim)
}

/**
 * DB 객체(테이블/함수/프로시저)별 MD 학습자료.
 * wiki/ai-chat/{tables,functions,procedures}/<slug>.md 에서 파싱.
 * enabled=true 인 항목만 AI 프롬프트 주입 대상.
 */
export interface LoadedEntityMd {
  slug: string; // 파일 슬러그 (예: "log-ict", "f-get-line-name")
  objectName: string; // frontmatter.object — DB 객체 이름 (LOG_ICT, F_GET_LINE_NAME)
  enabled: boolean;
  fm: Record<string, unknown>;
  body: string; // MD 본문 (프롬프트 주입 대상)
}

export interface LoadedAiChatContext {
  identity: {
    sqlGeneration: string;
    analysis: string;
  };
  rules: string; // 모든 sql-rule 본문을 합친 블록
  skeletons: string; // 모든 skeleton 본문을 합친 블록
  formulas: string; // 모든 formula 본문을 합친 블록
  joins: string; // 모든 join-recipe 본문을 합친 블록
  /** key: DB 객체 이름 (대문자). enabled=true 만 포함. */
  tables: Record<string, LoadedEntityMd>;
  functions: Record<string, LoadedEntityMd>;
  procedures: Record<string, LoadedEntityMd>;
  pages: LoadedAiChatPage[]; // 전체 페이지 목록 (selective injection용 확장 여지)
}

let cache: LoadedAiChatContext | null = null;

/**
 * wiki/ai-chat/ 하위 MD 를 로드해 캐시한다.
 * 서버 프로세스 생애 동안 1회만 실제 파일 I/O 발생.
 */
export async function loadAiChatContext(): Promise<LoadedAiChatContext> {
  if (cache) return cache;

  const pages = await loadAllPages(WIKI_ROOT);

  const identity = {
    sqlGeneration: findBody(pages, 'identity/sql-generation') ?? '',
    analysis: findBody(pages, 'identity/analysis') ?? '',
  };
  const rules = concatByType(pages, 'sql-rule');
  const skeletons = concatByType(pages, 'skeleton');
  const formulas = concatByType(pages, 'formula');
  const joins = concatByType(pages, 'join-recipe');

  const tables = collectEntities(pages, 'tables');
  const functions = collectEntities(pages, 'functions');
  const procedures = collectEntities(pages, 'procedures');

  cache = {
    identity,
    rules,
    skeletons,
    formulas,
    joins,
    tables,
    functions,
    procedures,
    pages,
  };
  return cache;
}

/**
 * 특정 디렉터리(tables/functions/procedures) 아래 페이지들을 DB 객체 이름 키 맵으로 수집.
 * frontmatter.object 가 있고 enabled !== false 인 페이지만 포함.
 * enabled=false 인 미등록 초안은 AI 주입 대상 아님 — 맵에서 제외.
 */
function collectEntities(
  pages: LoadedAiChatPage[],
  dir: 'tables' | 'functions' | 'procedures',
): Record<string, LoadedEntityMd> {
  const result: Record<string, LoadedEntityMd> = {};
  const prefix = `${dir}/`;
  for (const p of pages) {
    if (!p.slug.startsWith(prefix)) continue;
    const fm = p.fm as Record<string, unknown>;
    const objectName =
      typeof fm.object === 'string' ? String(fm.object).toUpperCase() : null;
    if (!objectName) continue;
    const enabled = fm.enabled !== false; // 누락·true 는 활성, false 만 비활성
    if (!enabled) continue;
    result[objectName] = {
      slug: p.slug,
      objectName,
      enabled,
      fm,
      body: p.body,
    };
  }
  return result;
}

/**
 * 캐시를 무효화한다. 런타임 중 MD 수정 후 즉시 반영이 필요할 때 호출.
 * 운영 권장 트리거: 관리자 UI 저장 버튼, 파일 변경 웹훅 등.
 */
export function invalidateAiChatContext(): void {
  cache = null;
}

async function loadAllPages(root: string): Promise<LoadedAiChatPage[]> {
  const pages: LoadedAiChatPage[] = [];
  await walk(root, async (filePath) => {
    if (!filePath.endsWith('.md')) return;
    const raw = await fs.readFile(filePath, 'utf8');
    const { fm, body } = parseFrontmatter(raw);
    const slug = path
      .relative(root, filePath)
      .replace(/\\/g, '/')
      .replace(/\.md$/, '');
    pages.push({ slug, fm, body: body.trim() });
  });
  // category=type 순 + slug 알파벳 순으로 정렬 — 주입 결과의 결정론성 확보
  pages.sort((a, b) => {
    const ta = a.fm.type ?? '';
    const tb = b.fm.type ?? '';
    if (ta !== tb) return ta.localeCompare(tb);
    return a.slug.localeCompare(b.slug);
  });
  return pages;
}

async function walk(
  dir: string,
  fn: (filePath: string) => Promise<void>,
): Promise<void> {
  let entries;
  try {
    entries = await fs.readdir(dir, { withFileTypes: true });
  } catch {
    return; // 디렉터리 없으면 조용히 skip (부트스트랩 단계 허용)
  }
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) await walk(full, fn);
    else await fn(full);
  }
}

function concatByType(
  pages: LoadedAiChatPage[],
  type: AiChatFrontmatter['type'],
): string {
  return pages
    .filter((p) => p.fm.type === type)
    .map((p) => p.body)
    .join('\n\n');
}

function findBody(pages: LoadedAiChatPage[], slug: string): string | undefined {
  return pages.find((p) => p.slug === slug)?.body;
}

// ---------------------------------------------------------------------------
// Minimal frontmatter parser (의존성 없이 동작)
// ---------------------------------------------------------------------------

export function parseFrontmatter(raw: string): {
  fm: AiChatFrontmatter;
  body: string;
} {
  // 파일이 `---` 로 시작하지 않으면 frontmatter 없음
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
  if (!match) return { fm: {}, body: raw };
  const yamlText = match[1];
  const body = raw.slice(match[0].length);
  return { fm: parseSimpleYaml(yamlText), body };
}

function parseSimpleYaml(text: string): AiChatFrontmatter {
  const result: Record<string, unknown> = {};
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const colonIdx = trimmed.indexOf(':');
    if (colonIdx === -1) continue;

    const key = trimmed.slice(0, colonIdx).trim();
    const rawVal = trimmed.slice(colonIdx + 1).trim();
    result[key] = parseYamlValue(rawVal);
  }
  return result as AiChatFrontmatter;
}

function parseYamlValue(raw: string): unknown {
  if (!raw) return '';
  // 배열 (단일 라인 플로우 스타일만 지원)
  if (raw.startsWith('[') && raw.endsWith(']')) {
    const inner = raw.slice(1, -1).trim();
    if (!inner) return [];
    return inner
      .split(',')
      .map((s) => stripQuotes(s.trim()))
      .filter((s) => s.length > 0);
  }
  return stripQuotes(raw);
}

function stripQuotes(s: string): string {
  if (
    (s.startsWith('"') && s.endsWith('"')) ||
    (s.startsWith("'") && s.endsWith("'"))
  ) {
    return s.slice(1, -1);
  }
  return s;
}
