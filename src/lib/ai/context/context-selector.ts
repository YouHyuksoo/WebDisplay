/**
 * @file src/lib/ai/context/context-selector.ts
 * @description Stage 0 — 사용자 질문 + catalog.json을 LLM에 보내
 *   관련 테이블/도메인/사이트를 선별하는 경량 호출.
 *   LLM 실패 시 태그 기반 heuristic 폴백.
 */
import { catalogToPrompt, loadCatalog } from './context-loader';
import { getProviderForRuntime } from '@/lib/ai/provider-store';
import { getProvider } from '@/lib/ai/router';
import type { ProviderId } from '@/lib/ai/providers/types';

export interface ContextSelection {
  tables: string[];
  domains: string[];
  site: string;
}

const SELECTOR_SYSTEM_PROMPT = `당신은 MES 데이터베이스 컨텍스트 선별기입니다.
사용자 질문을 읽고 카탈로그에서 SQL 생성에 필요한 테이블과 도메인을 골라주세요.

규칙:
1. 반드시 JSON으로만 응답하세요. 다른 텍스트 없이.
2. tables: 질문에 관련된 테이블 이름 배열 (카탈로그에 있는 이름만, 최대 10개). 넉넉하게 선택하세요 — 관련성이 조금이라도 있으면 포함.
3. domains: 관련 도메인 이름 배열 (카탈로그에 있으면 추가, 없으면 빈 배열도 OK)
4. site:
   - 사용자가 사이트를 명시하지 않으면 반드시 "default"
   - "베트남", "SMVNPDB" → "베트남VD외부"
   - "멕시코VD", "SMMEXPDB" → "멕시코VD외부"
   - 그 외 → "default"
5. 질문이 단순해도 (예: "라인 목록") 관련 테이블은 반드시 1개 이상 선택.
6. 모르겠으면 가장 가까운 테이블 2-3개를 넓게 선택.

응답 형식:
{"tables":["TABLE_A","TABLE_B"],"domains":[],"site":"default"}`;

function parseSelectionJson(text: string): ContextSelection | null {
  const cleaned = text
    .replace(/```json\s*/gi, '')
    .replace(/```/g, '')
    .trim();

  const first = cleaned.indexOf('{');
  const last = cleaned.lastIndexOf('}');
  if (first < 0 || last < first) return null;

  try {
    const parsed = JSON.parse(cleaned.slice(first, last + 1)) as Partial<ContextSelection>;
    return {
      tables: Array.isArray(parsed.tables) ? parsed.tables.filter((v): v is string => typeof v === 'string') : [],
      domains: Array.isArray(parsed.domains) ? parsed.domains.filter((v): v is string => typeof v === 'string') : [],
      site: typeof parsed.site === 'string' ? parsed.site : 'default',
    };
  } catch {
    return null;
  }
}

function pickSite(question: string): string {
  const q = question.toLowerCase();
  if (q.includes('베트남') || q.includes('smvnpdb')) return '베트남VD외부';
  if (q.includes('멕시코vd') || q.includes('smmexpdb')) return '멕시코VD외부';
  return 'default';
}

/** catalog의 tags + summary 텍스트 매칭으로 관련 테이블을 넓게 찾는 폴백 */
function heuristicSelection(question: string): ContextSelection {
  const q = question.toLowerCase();
  const catalog = loadCatalog();
  const scored: { name: string; score: number }[] = [];

  for (const t of catalog.tables) {
    let score = 0;
    const summaryLower = (t.summary || '').toLowerCase();
    const tags = (t.tags || []).map((tag) => tag.toLowerCase());

    // 질문의 각 단어가 태그나 summary에 포함되면 점수 부여
    const words = q.split(/\s+/).filter((w) => w.length >= 2);
    for (const word of words) {
      if (tags.some((tag) => tag.includes(word) || word.includes(tag))) score += 3;
      if (summaryLower.includes(word)) score += 2;
      if (t.name.toLowerCase().includes(word)) score += 2;
    }

    // 테이블명 직접 언급 (대소문자 무시)
    if (q.includes(t.name.toLowerCase())) score += 10;

    // 핵심 키워드 보너스
    if ((q.includes('라인') || q.includes('line')) && t.name.includes('LINE')) score += 3;
    if ((q.includes('모델') || q.includes('model')) && t.name.includes('MODEL')) score += 3;
    if ((q.includes('자재') || q.includes('부품') || q.includes('item')) && t.name.includes('ITEM')) score += 3;
    if ((q.includes('설비') || q.includes('기계') || q.includes('machine')) && (t.name.includes('MACHINE') || t.name.includes('ICOM'))) score += 3;
    if ((q.includes('사용자') || q.includes('작업자') || q.includes('user')) && t.name.includes('USER')) score += 3;
    if ((q.includes('코드') || q.includes('basecode')) && t.name.includes('BASECODE')) score += 3;
    if ((q.includes('생산') || q.includes('실적') || q.includes('수량')) && t.name.includes('PRODUCT')) score += 2;
    if ((q.includes('검사') || q.includes('결과') || q.includes('ok') || q.includes('ng')) && t.name.startsWith('LOG_')) score += 2;
    if ((q.includes('불량') || q.includes('품질') || q.includes('qc')) && t.name.includes('QC')) score += 3;
    if ((q.includes('목표') || q.includes('계획') || q.includes('target')) && t.name.includes('TARGET')) score += 3;
    if ((q.includes('납땜') || q.includes('solder')) && t.name.includes('SOLDER')) score += 3;
    if ((q.includes('바코드') || q.includes('pid') || q.includes('추적')) && (t.name.includes('BARCODE') || t.name.includes('RUN_CARD'))) score += 3;
    if ((q.includes('온도') || q.includes('temperature') || q.includes('리플로우')) && t.name.includes('TEMPERATURE')) score += 3;
    if ((q.includes('매거진') || q.includes('magazine') || q.includes('재고')) && t.name.includes('MAGAZINE')) score += 3;
    if ((q.includes('포장') || q.includes('pack') || q.includes('시리얼')) && t.name.includes('PACK')) score += 3;
    if ((q.includes('공정') || q.includes('routing')) && t.name.includes('ROUTING')) score += 3;

    if (score > 0) scored.push({ name: t.name, score });
  }

  // 점수 높은 순 정렬, 상위 10개
  scored.sort((a, b) => b.score - a.score);
  const selectedTables = scored.slice(0, 10).map((s) => s.name);

  // 도메인도 태그 매칭
  const selectedDomains: string[] = [];
  for (const d of catalog.domains) {
    const dTags = (d.tags || []).map((tag) => tag.toLowerCase());
    const dSummary = (d.summary || '').toLowerCase();
    const match = q.split(/\s+/).some((w) =>
      w.length >= 2 && (dTags.some((tag) => tag.includes(w) || w.includes(tag)) || dSummary.includes(w)),
    );
    if (match) selectedDomains.push(d.name);
  }

  // 아무것도 안 걸리면 가장 범용적인 테이블 포함
  if (selectedTables.length === 0) {
    selectedTables.push('IP_PRODUCT_LINE', 'IP_PRODUCT_WORKSTAGE_IO', 'ISYS_BASECODE');
  }

  return {
    tables: selectedTables,
    domains: selectedDomains,
    site: pickSite(question),
  };
}

export async function selectContext(
  userQuestion: string,
  providerId: ProviderId,
  modelId?: string,
): Promise<ContextSelection> {
  const catalog = loadCatalog();
  const providerCfg = await getProviderForRuntime(providerId);

  const validTables = new Set(catalog.tables.map((t) => t.name));
  const validDomains = new Set(catalog.domains.map((d) => d.name));
  const validSites = new Set(catalog.sites.map((s) => s.key));

  const normalize = (selection: ContextSelection): ContextSelection => ({
    tables: selection.tables.filter((t) => validTables.has(t)).slice(0, 10),
    domains: selection.domains.filter((d) => validDomains.has(d)),
    site: validSites.has(selection.site) ? selection.site : 'default',
  });

  const fallback = normalize(heuristicSelection(userQuestion));

  if (!providerCfg?.apiKey) {
    return fallback;
  }

  const provider = getProvider(providerId);
  const model = modelId || providerCfg.defaultModelId || provider.listModels()[0];

  const userMsg = `# 카탈로그\n${catalogToPrompt()}\n\n# 사용자 질문\n${userQuestion}`;

  let responseText = '';
  try {
    const stream = provider.chatStream(
      {
        model,
        messages: [{ role: 'user', content: userMsg }],
        systemPrompt: SELECTOR_SYSTEM_PROMPT,
        temperature: 0,
      },
      providerCfg.apiKey,
    );

    for await (const chunk of stream) {
      if (chunk.type === 'token' && chunk.delta) responseText += chunk.delta;
    }
  } catch {
    return fallback;
  }

  const parsed = parseSelectionJson(responseText);
  if (!parsed) return fallback;

  const normalized = normalize(parsed);
  const forcedSite = pickSite(userQuestion);
  if (forcedSite !== 'default' && validSites.has(forcedSite)) {
    normalized.site = forcedSite;
  }

  // LLM 결과가 빈 경우 폴백 병합
  if (normalized.tables.length === 0) {
    return fallback;
  }

  // 폴백에서 추가로 높은 점수 테이블이 있으면 병합 (LLM이 놓친 것 보완)
  for (const t of fallback.tables.slice(0, 3)) {
    if (!normalized.tables.includes(t) && normalized.tables.length < 10) {
      normalized.tables.push(t);
    }
  }

  return normalized;
}
