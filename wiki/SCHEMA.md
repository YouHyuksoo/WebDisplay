# Wiki 스키마 (WebDisplay 프로젝트)

이 위키는 두 가지 용도를 갖는다.

1. **AI chat 런타임 컨텍스트** (`wiki/ai-chat/`) — SQL 생성·분석 LLM 프롬프트에 주입되는 도메인 지식.
2. **일반 knowledge base** (장래 `wiki/concepts/`, `wiki/entities/`, `wiki/sources/`, `wiki/synthesis/`) — 외부 자료·합의·연구 결과 축적.

두 용도는 **서브트리로 분리**되며 서로 간섭하지 않는다. AI chat 런타임은 `wiki/ai-chat/` 하위만 읽는다.

---

## 1. 페이지 타입 (type)

| type | 위치 | 용도 |
|---|---|---|
| `identity-prompt` | `wiki/ai-chat/identity/` | SQL 생성·분석 stage의 역할 프롬프트 |
| `sql-rule` | `wiki/ai-chat/rules/` | Oracle/MES SQL 작성 규칙 모음 |
| `skeleton` | `wiki/ai-chat/skeletons/` | 테이블 성격(category)별 SQL 골격 |
| `formula` | `wiki/ai-chat/formulas/` | 제조업 관용 계산식 |
| `join-recipe` | `wiki/ai-chat/joins/` | 공통 JOIN 축 레시피 |
| (`concept`, `entity`, `source`, `synthesis`) | (미래 `wiki/...`) | 일반 wiki 영역 — 현재 미사용 |

---

## 2. Frontmatter 스키마

모든 페이지는 다음 필수 필드를 갖는다.

```yaml
---
type: <페이지 타입>
title: "사람이 읽을 제목"
updated: YYYY-MM-DD
---
```

AI chat 전용 확장 필드 (선택적, 있으면 selective injection 힌트로 사용):

```yaml
stage: sql_generation | analysis | both      # 주입 대상 stage
aliases: ["대체 명칭 1", "영문명", "약어"]     # 자연어 질의 매칭용
tables: [TABLE_NAME_1, TABLE_NAME_2]          # 관련 테이블 (schema-cache.json 과 교차 검증)
tags: [tag1, tag2]                            # 카테고리 태그
```

**주의**: frontmatter는 **로더가 strip** 해서 시스템 프롬프트에 포함되지 않는다. 본문(`---` 이후)만 주입 대상.

---

## 3. 페이지 본문 규칙

- **크기 cap**: soft 400줄, hard 800줄.
- **아토믹**: 한 페이지 = 한 주제. 예: `formulas/yield.md` 는 수율/양품률 관련 공식만, 설비효율은 `formulas/equipment.md`.
- **섹션 헤더**: `## 제목` 수준부터 시작. `#` (h1)은 쓰지 않음 — 프롬프트 빌더가 페이지 제목을 위에 붙임.
- **코드블록**: SQL은 \`\`\`sql 펜스 사용.
- **한국어 주석**: 파일 내부에 `<!-- 주석 -->` 허용 (로더가 제거하지 않음 — LLM 컨텍스트에 포함됨).

---

## 4. 네이밍

- 파일명: 소문자 하이픈 (`sql-writing.md`, `line-code.md`, `first-pass-yield.md`).
- 프런트매터 `title` 은 자연스러운 한국어 또는 영한 혼용.

---

## 5. 로더 동작 (참고)

`src/lib/ai/context/md-loader.ts` 가 다음 순서로 로드한다.

1. 서버 프로세스 시작 시 또는 첫 호출 시 `wiki/ai-chat/` 전체 스캔.
2. 각 MD 파일에서 frontmatter 파싱 + 본문 분리.
3. 카테고리별로 본문을 집계 (identity·rules·skeletons·formulas·joins).
4. 메모리에 LRU 캐시로 상주 (프로덕션). dev 환경은 파일 변경 감지로 재로드.

자세한 내용은 `src/lib/ai/context/md-loader.ts` 주석 참고.

---

## 6. 변경 이력

- 2026-04-18: 최초 생성. TS 하드코딩(`domain-*.ts`, `sql-*.ts`) → MD 전환 설계.
