# Wiki 변경 로그

## [2026-04-18] init | Wiki 초기화
- `wiki/SCHEMA.md`, `wiki/index.md`, `wiki/log.md` 생성
- `wiki/ai-chat/` 서브트리 준비 (identity, rules, skeletons, formulas, joins)
- TS 하드코딩 → MD 전환 설계 (src/lib/ai/context/domain-*.ts, sql-*.ts 이사 대상)

## [2026-04-19] cleanup | ai-chat 구 시스템 잔재 전면 정리
- **삭제 — API**: `/api/ai-tables/{[site],domains,comment-history,register}/` + 구 목록 route (22개 route → 1개 `sync` 만 남김).
- **삭제 — lib**: `ai-draft, basecode-loader, domain-resolver, domain-suggester, example-matcher, feedback-queue, slot-extractor, sql-table-parser, tokenizer, validators, store, graphify-out/`.
- **삭제 — data**: `ai-context/domains/`, `ai-context/sites/`, `tables.json`, `column-domains.json`, `basecode-cache.json`.
- **재작성**: `types.ts` 230줄 → 38줄 (`SiteKey`, `SchemaCacheFile`, `CachedTableSchema`, `CachedColumn` 만 유지).
- **재작성**: `prompt-builder.ts` — `selectedContextDocs`·`buildSchemaFallbackSection` 제거. WIKI MD 본문을 유일한 테이블 지식 소스로. 선택 테이블 중 등록된 것 없으면 사용자 안내 메시지.
- **재작성**: `prompt-renderer.ts` — `renderTableForStage1`·`formatDecode` 삭제 (Stage 1 기계 렌더링 폐기). Stage 0 카탈로그 렌더만 유지. `domain-resolver`·`tables.json`·`ColumnDomain` 의존 제거.
- **재작성**: `merged-context.ts` — `buildStage1Prompt` 제거. Stage 0 만 담당. tables.json 의존 제거.
- **재작성**: `context-loader.ts` — `loadSelectedContext` 제거. `loadCatalog` 은 schema-cache + WIKI 기반.
- **정리**: `stream/route.ts` 의 `matchExamples` / `loadSelectedContext` / `loadTables` 호출 블록 전부 제거. prompt-builder 에 `selectedTables` 만 전달.
- **정리**: `feedback/route.ts` 의 `enqueueFeedback` 블록 제거.
- **효과**: 전체 `src/lib/ai-tables/` 1142줄만 유지 (이전 2000+ 줄 + graphify-out/ 제거). API route 22→1. data JSON 5→2.
- **유지 근거**: `db-schema.ts` + `mutex.ts` 는 `/api/ai-tables/sync` (schema-cache 재추출) 인프라로 필요.

## [2026-04-19] in-use-filter | 사용함 토글 + PB 잔재 제거
- UI: 좌측 목록 각 항목에 체크박스 (사용함/사용안함). 필터 드롭다운 "전체/사용함/사용안함" 으로 단순화.
- API: `PATCH /api/ai-context/wiki/:kind/:slug/toggle` 신규. MD 없으면 자동 초안 생성 후 `enabled` 설정해 저장, 있으면 frontmatter 만 교체.
- Prefilter: `enabledOnly` 옵션 추가. 사용함 테이블이 하나라도 있으면 해당 집합 내에서 키워드 매칭. 키워드 매칭 0개 → 사용함 전체로 fallback. 사용함 0개 → schema 전체 fallback.
- 자동 초안: `draftTable` 의 `## 개요` / 컬럼 설명에서 PB화면·DW 잔재(` | PB화면: ...`, ` | DW: ...`) 제거. `stripPbHints` 공통 유틸.
- draft 생성 로직을 `src/lib/ai-tables/wiki-draft.ts` 로 추출 (draft route + toggle route 공유).
- md-loader 의 `ctx.tables` 는 원래부터 `enabled=true` 만 로드 → merged-context 에서 그대로 `enabledOnly` Set 으로 활용.

## [2026-04-19] stage0-prefilter | Stage 0 로컬 prefilter 도입 (토큰 20배 감소)
- 636개 테이블 전체를 LLM 에 노출하는 대신, 서버사이드 키워드 매칭으로 **상위 30개만** LLM 카탈로그에 주입.
- `src/lib/ai-tables/table-prefilter.ts` 신규 — tokenize(불용어·밑줄 분해) + 한글↔영문 alias 사전 (품목↔item, 라인↔line, 불량↔bad/defect/ng 등 34쌍).
- 점수 규칙: 테이블명 포함 +5, PK 컬럼 +3, 상위 컬럼 +2, summary/태그 +2, category +1.
- 매칭 0개면 전체 카탈로그 fallback (질의에 인식 가능한 키워드 없을 때 안전망).
- `buildStage0Prompt(site, { query, topN })` 시그니처 확장 + `catalogToPrompt(site, query)` 연동 + `context-selector` 가 질의를 prefilter 에 전달.
- 효과 측정:
  - "ID_ITEM 조회해줘" → 30개, 3,686자 (ID_ITEM 1순위)
  - "라인별 FPY" → 5개, 799자 (IP_PRODUCT_LINE 계열 정확)
  - "품목 마스터 ABC" → 30개, 3,757자 (한글↔영문 alias 작동, ID_ITEM 1순위)
  - 전체: 72,352자 → 평균 3,500자 (약 **20배 감소**)
- renderer: `onlyNames` 옵션 추가 — 지정 이름만 렌더링하는 부분집합 모드.

## [2026-04-18] stage0-transition | Stage 0 를 schema-cache + WIKI 기반으로 전환
- `tables.json` 의 enabled 화이트리스트 개념 폐기. `schema-cache.json` 의 전체 테이블(636개)이 Stage 0 후보.
- WIKI MD 에 등록된 테이블은 MD frontmatter/본문의 summary·tags·category 우선 사용. 없으면 `schema.tableComment` + (있으면) tables.json 보조.
- `renderCatalogForStage0` 시그니처 변경: `(schema, site, { tablesJson?, wikiTables?, domains? })`. tables.json 은 과도기 보조.
- `trimSummary`: DBA 가 주석에 추가한 PB화면/DW 힌트는 `|` 이전만 사용, 120자 컷.
- `loadCatalog()` (context-loader) 도 schema-cache 기반으로 교체 — heuristicSelection 이 636개 전체 테이블 대상.
- 효과: "ID_ITEM 조회" 같은 미등록 테이블 질의가 이제 정상 선택됨 (이전엔 유사 이름 `IM_ITEM_ISSUE` 로 환각).
- Stage 0 프롬프트 크기: 약 72,352자 (114자×636줄). 후속 개선 후보: BM25 매칭으로 상위 N개만 LLM 노출.
- `rules/sql-writing.md` 규칙 0-b 신규: 바인드 변수 값 없을 때 리터럴/되묻기/집계로 전환 (NJS-098 방지).

## [2026-04-18] wiki-training | AI 학습 UI + 3종 MD 구조 도입
- DB 추출: `scripts/extract-db-objects.py` 로 759개(functions 534 + procedures 225) 메타를 `data/ai-context/db-objects-cache.json` 에 스냅샷
- 3종 서브트리 신설: `wiki/ai-chat/{tables,functions,procedures}/`
- 로더: `md-loader.ts` 가 3종 MD 스캔. `enabled=true` 만 AI 주입.
- API: `/api/ai-context/objects` 통합 목록, `/api/ai-context/wiki/[kind]/[slug]` CRUD + `/draft` 자동 초안
- API: `/api/ai-context/sync-objects` 런타임 DB 동기화 (`lib/ai-tables/db-object-extractor.ts` Node 포팅)
- UI: `AiTrainingPanel.tsx` 신규. display/18 "AI 학습" 탭에서 3종 라디오 + 목록(등록/미등록/활성) + frontmatter+마크다운 에디터
- 기존 `/settings/ai-tables/` 디렉터리 삭제 (DisplayOption 만 사용했던 중복 경로)
- 샘플 MD 등록: `F_GET_LINE_NAME`, `F_GET_WORK_ACTUAL_DATE`, `F_GET_BASECODE` 3개 함수 학습자료 (enabled=true)
- prompt-builder: 등록된 테이블·함수·프로시저 MD 본문을 Stage 1 프롬프트에 그대로 주입. 기존 기계 렌더링은 fallback 유지 (Phase D 에서 제거)

## [2026-04-18] hardening | SQL 환각 방지 개선
- `joins/common.md`: ORGANIZATION_ID=1 규칙을 "해당 테이블 blocks에 명시된 경우에만"으로 완화 + LOG_* 예외 명시
- `rules/sql-writing.md`: "컬럼 사용 제약" 규칙 0번 추가 (존재하지 않는 컬럼 사용 금지) + "컬럼 값 decode 준수" 규칙 0-a 추가 (RESULT/flag 등 매핑값 강제)
- `prompt-renderer.ts` Stage 1 `common:`: 이름 나열 → `컬럼명 타입 -- 코멘트` 강화
- `prompt-renderer.ts` Stage 0: 테이블별 `cols(PK*,...)` 미리보기 추가 (PK + priority='key' 우선, 최대 6개)
- `merged-context.ts#buildStage0Prompt`: schema + domains 를 렌더러로 전달
- 참고: `column-domains.json` 의 `line-code`/`shift-code`/`actual-date` 도메인 priority 가 'common' 으로 돼 있어 Stage 0 preview 앞쪽에 안 옴. 튜닝 시 'key' 로 변경 필요 (사용자 승인 대기).

## [2026-04-18] migration | TS → MD 전환 완료
- 레거시 TS 5개 삭제: `domain-glossary.ts`, `sql-rules.ts`, `sql-skeletons.ts`, `domain-formulas.ts`, `domain-joins.ts`
- 신규 MD 16개 생성 (identity 2, rules 1, skeletons 3, formulas 4, joins 6)
- `prompt-builder.ts` 가 `md-loader.ts` 를 통해 `wiki/ai-chat/` 을 읽도록 전환
- `/api/ai-chat/default-prompts` GET API 추가 (클라이언트 "기본값 불러오기" 버튼용)
- `SystemPromptPanel.tsx` 가 API fetch 로 기본 프롬프트 로드
- frontmatter 확장 필드: `stage`, `aliases`, `tables`, `tags` — 향후 selective injection 포석
