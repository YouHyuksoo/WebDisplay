/**
 * @file src/lib/ai-tables/ai-draft.ts
 * @description LLM 으로 Example 초안을 생성하는 비동기 제너레이터.
 *
 * 초보자 가이드:
 * - `streamExampleDrafts(site, table, count, kinds)` 는 provider 토큰을 모두 모은 뒤
 *   JSON 배열을 파싱해 `draft` 이벤트를 하나씩 yield 한다.
 * - 실패(JSON 파싱, API 오류)는 `error` 이벤트로 한 번 yield 후 종료.
 * - 기본 provider 는 mistral. API 키가 없으면 'no provider configured' 에러.
 * - 토큰 수는 단순 근사 (문자 길이 / 3) — 정확한 billing 용이 아님.
 */

import { buildStage1Prompt } from './merged-context';
import { getProviderForRuntime } from '@/lib/ai/provider-store';
import { getProvider } from '@/lib/ai/router';
import { estimateTokens } from './tokenizer';
import type { Example, SiteKey, ExampleKind } from './types';
import type { ProviderId } from '@/lib/ai/providers/types';

const DRAFT_SYS = `당신은 MES SQL 예제 생성기입니다.
주어진 테이블 컨텍스트를 참고해 자연어 질문(question), 실행 가능한 Oracle SQL(sql), 그리고 이유(why)를 JSON 배열로 생성하세요.

출력 형식(반드시 JSON 배열, 코드블록 감싸기 금지):
[{"kind":"exact","question":"...","sql":"SELECT ...","why":"..."}, ...]

규칙:
- SQL 은 반드시 SELECT 또는 WITH 로 시작 (DML 금지)
- kind 는 "exact" | "template" | "skeleton" 중 하나
- template/skeleton 은 sql 대신 sqlTemplate 필드를 사용하고 :name 바인드 사용 (예: WHERE DT >= :from_date)
- question 은 한국어 자연어 (존댓말 불필요)
- why 는 이 SQL 이 질문에 맞는 이유를 한 문장으로
- 오직 JSON 배열만 응답. 설명·마크다운·코드블록 금지.`;

export type DraftStreamEvent =
  | { type: 'draft'; example: Partial<Example> }
  | { type: 'done'; totalTokens: number; count: number }
  | { type: 'error'; message: string };

/**
 * Example 초안 스트림 제너레이터.
 * provider 호출은 내부적으로 풀 응답을 모은 뒤 JSON.parse 하므로,
 * 스트리밍 UX 보다는 "3개 도착 → 한꺼번에 표시" 에 가깝다.
 * (LLM 이 JSON 배열 완성 전에 chunk 단위 파싱은 불안정해서 의도적 단순화)
 */
export async function* streamExampleDrafts(
  site: SiteKey,
  table: string,
  count: number,
  kinds: ExampleKind[],
  providerId: ProviderId = 'mistral',
): AsyncGenerator<DraftStreamEvent, void, unknown> {
  let ctx: string;
  try {
    ctx = await buildStage1Prompt(site, [table]);
  } catch (e) {
    yield {
      type: 'error',
      message: `context build failed: ${e instanceof Error ? e.message : String(e)}`,
    };
    return;
  }
  // buildStage1Prompt 는 enabled=false 또는 schema-cache 누락 시 빈 문자열을 돌려준다.
  // 컨텍스트 없이 호출하면 LLM 이 테이블과 무관한 SQL 을 추측하므로 즉시 에러.
  if (!ctx.trim()) {
    yield {
      type: 'error',
      message:
        'no context — Overview 탭에서 enabled 를 켜고 sync 를 실행한 뒤 다시 시도하세요.',
    };
    return;
  }

  const cfg = await getProviderForRuntime(providerId);
  if (!cfg?.apiKey || !cfg.defaultModelId) {
    yield { type: 'error', message: 'no provider configured (apiKey/defaultModelId missing)' };
    return;
  }

  const provider = getProvider(providerId);
  const userPrompt = `# 테이블 컨텍스트
${ctx}

# 요청
- 생성 개수: ${count}
- kinds 후보: ${kinds.join(', ')}
- 각 예제는 서로 다른 의도(집계/필터/최근 기록/상세 등)로 다양하게.
- JSON 배열만 출력.`;

  let full = '';
  try {
    for await (const chunk of provider.chatStream(
      {
        model: cfg.defaultModelId,
        messages: [{ role: 'user', content: userPrompt }],
        systemPrompt: DRAFT_SYS,
        temperature: 0.3,
        maxTokens: 4096,
      },
      cfg.apiKey,
    )) {
      if (chunk.type === 'token' && chunk.delta) full += chunk.delta;
      if (chunk.type === 'error') {
        yield { type: 'error', message: chunk.error ?? 'provider error' };
        return;
      }
    }
  } catch (e) {
    yield {
      type: 'error',
      message: `provider call failed: ${e instanceof Error ? e.message : String(e)}`,
    };
    return;
  }

  // 코드블록 fence 제거 + 배열 슬라이스 추출 (LLM 이 앞뒤 잡설을 붙이는 경우 대비)
  const cleaned = full
    .replace(/```json|```/g, '')
    .trim();
  const firstBracket = cleaned.indexOf('[');
  const lastBracket = cleaned.lastIndexOf(']');
  const jsonText =
    firstBracket >= 0 && lastBracket > firstBracket
      ? cleaned.slice(firstBracket, lastBracket + 1)
      : cleaned;

  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonText);
  } catch (e) {
    yield {
      type: 'error',
      message: `JSON parse failed: ${e instanceof Error ? e.message : String(e)}. raw: ${cleaned.slice(0, 200)}`,
    };
    return;
  }

  if (!Array.isArray(parsed)) {
    yield { type: 'error', message: 'response is not a JSON array' };
    return;
  }

  let emitted = 0;
  for (const raw of parsed) {
    if (!raw || typeof raw !== 'object') continue;
    const ex = raw as Partial<Example>;
    // 최소한의 형태 확인 — 자세한 검증은 클라이언트 저장 시 validators.ts 가 담당
    if (!ex.kind || !ex.question) continue;
    yield { type: 'draft', example: ex };
    emitted += 1;
  }

  yield {
    type: 'done',
    totalTokens: estimateTokens(full),
    count: emitted,
  };
}
