# AI 챗 컨텍스트 시스템 설계

## 목적

AI 챗이 SVEHICLEPDB 스키마와 프로젝트 구현 내용(추적성, 공정이력, FPY 등)을 정확히 이해하고,
사용자 질의에 적절한 SQL을 생성할 수 있도록 **컨텍스트 문서 시스템**을 구축한다.

## 핵심 원칙

1. **토큰 효율** — catalog 요약(~2K토큰)만 항상 주입, 상세 문서는 질문에 맞춰 선별 로드
2. **재빌드 불필요** — `data/ai-context/` 마크다운/JSON 파일 편집만으로 컨텍스트 갱신
3. **현재 사이트 우선** — `config/database.json`의 activeProfile이 기본 DB. 사용자가 명시적으로 다른 사이트를 지칭할 때만 해당 프로필 사용
4. **확장성** — 사이트별 메타데이터로 향후 멀티 사이트 확장 가능

## 파일 구조

```
data/ai-context/
├── catalog.json              ← 전체 인덱스 (항상 주입, ~2K토큰)
├── tables/
│   ├── IP_PRODUCT_WORKSTAGE_IO.md
│   ├── LOG_AOI.md
│   └── ... (테이블별 1파일)
├── domains/
│   ├── traceability.md       ← 추적성 분석
│   ├── fpy.md                ← FPY 분석
│   ├── process-history.md    ← 공정통과이력
│   ├── production-kpi.md     ← 생산 KPI
│   ├── spc.md                ← SPC 관리도
│   ├── repair-status.md      ← 수리 현황
│   └── inspect-result.md     ← 검사 결과
└── sites/
    └── site-profiles.md      ← DB 사이트별 접속 정보·용도
```

## catalog.json 스키마

```json
{
  "tables": [
    {
      "name": "IP_PRODUCT_WORKSTAGE_IO",
      "site": "default",
      "summary": "공정별 입출고 실적 (투입/포장/검사)",
      "tags": ["생산", "실적", "IO", "공정"]
    }
  ],
  "domains": [
    {
      "name": "traceability",
      "summary": "바코드 기반 제품 추적성 분석 — 공정 타임라인, 자재 이력",
      "tags": ["추적", "바코드", "이력", "PID"]
    }
  ],
  "sites": [
    {
      "key": "default",
      "description": "현재 activeProfile (config/database.json)",
      "note": "사용자가 사이트를 명시하지 않으면 항상 이것 사용"
    },
    {
      "key": "멕시코VD외부",
      "description": "멕시코 VD 사이트 (SMMEXPDB)",
      "note": "사용자가 '멕시코VD', 'VD사이트' 등을 명시할 때"
    },
    {
      "key": "베트남VD외부",
      "description": "베트남 VD 사이트 (SMVNPDB)",
      "note": "사용자가 '베트남', '베트남VD' 등을 명시할 때"
    }
  ]
}
```

## 3단계 LLM 호출 흐름

```
사용자 질문
    │
    ▼
┌─────────────────────────────────────┐
│ Stage 0: 컨텍스트 선별 (신규)        │
│                                     │
│ 입력:                               │
│  - catalog.json 전체 (~2K토큰)       │
│  - 사용자 질문                       │
│                                     │
│ LLM 응답 (JSON):                    │
│  { "tables": ["테이블A", "테이블B"], │
│    "domains": ["도메인X"],           │
│    "site": "default" }              │
│                                     │
│ site 규칙:                          │
│  - 사용자가 사이트를 명시하지 않으면   │
│    항상 "default" 반환               │
│  - "베트남 FPY" → site: "베트남VD외부"│
│  - "오늘 생산량" → site: "default"   │
└──────────┬──────────────────────────┘
           │ 선별된 .md 파일 로드
           ▼
┌─────────────────────────────────────┐
│ Stage 1: SQL 생성 (기존 확장)        │
│                                     │
│ 주입 컨텍스트:                       │
│  - 도메인 용어 (기존 유지)            │
│  - SQL 규칙 (기존 유지)              │
│  - 선별된 테이블 .md (컬럼 명세)      │
│  - 선별된 도메인 .md (JOIN 패턴)      │
│  - site 정보                        │
│                                     │
│ 출력: SQL 쿼리                      │
└──────────┬──────────────────────────┘
           │ SQL 실행 (site별 프로필 분기)
           ▼
┌─────────────────────────────────────┐
│ SQL 실행 (변경)                      │
│                                     │
│ if (site === "default") {           │
│   executeQuery(sql, binds);         │
│ } else {                            │
│   executeQueryByProfile(site, ...); │
│ }                                   │
└──────────┬──────────────────────────┘
           ▼
┌─────────────────────────────────────┐
│ Stage 2: 분석/응답 (기존 유지)       │
└─────────────────────────────────────┘
```

## 테이블 마크다운 형식

```markdown
---
name: IP_PRODUCT_WORKSTAGE_IO
site: default
description: 공정별 입출고 실적. 투입(W310), 포장(W220), 검사 등 각 공정 통과 시 1행 기록.
related_tables: [IP_PRODUCT_LINE_TARGET, IP_PRODUCT_RUN_CARD]
---

## 주요 컬럼
| 컬럼 | 타입 | 설명 |
|---|---|---|
| LINE_CODE | VARCHAR2(10) | 라인코드 (F_GET_LINE_NAME으로 변환) |
| WORKSTAGE_CODE | VARCHAR2(10) | 공정코드: W310=투입, W220=포장 |
| IO_QTY | NUMBER | 입출고 수량 |
| ACTUAL_DATE | VARCHAR2(10) | 작업일자 |
| SHIFT_CODE | VARCHAR2(1) | 시프트: A=주간, B=야간 |

## 자주 쓰는 JOIN
- LINE_TARGET 조인: `JOIN IP_PRODUCT_LINE_TARGET t ON t.LINE_CODE = io.LINE_CODE AND t.PLAN_DATE = io.ACTUAL_DATE AND t.SHIFT_CODE = io.SHIFT_CODE`

## 예제 쿼리
-- 라인별 시프트별 오늘 실적
SELECT F_GET_LINE_NAME(LINE_CODE,1) AS LINE_NAME, SHIFT_CODE, SUM(IO_QTY)
  FROM IP_PRODUCT_WORKSTAGE_IO
 WHERE WORKSTAGE_CODE='W220' AND ACTUAL_DATE = F_GET_WORK_ACTUAL_DATE(SYSDATE,'A')
 GROUP BY LINE_CODE, SHIFT_CODE
```

## 도메인 마크다운 형식

```markdown
---
name: traceability
description: 바코드 기반 제품 추적성 분석
tables: [IP_PRODUCT_2D_BARCODE, IP_PRODUCT_RUN_CARD, LOG_AOI, LOG_ICT, LOG_EOL]
---

## 업무 설명
제품 바코드(PID)를 입력하면 해당 제품이 거쳐간 모든 공정 이벤트를 시간순으로 조회.

## 핵심 흐름
1. PID → IP_PRODUCT_2D_BARCODE에서 RUN_NO 조회
2. RUN_NO → IP_PRODUCT_RUN_CARD에서 모델 정보
3. 각 LOG_ 테이블에서 PID/BARCODE 매칭 이벤트 수집
4. 시간순 정렬하여 타임라인 구성

## JOIN 패턴
SELECT b.PID, r.RUN_NO, m.MODEL_NAME
  FROM IP_PRODUCT_2D_BARCODE b
  JOIN IP_PRODUCT_RUN_CARD r ON r.RUN_NO = b.RUN_NO
  JOIN IP_PRODUCT_MODEL_MASTER m ON m.MODEL_NAME = r.MODEL_NAME
 WHERE b.PID = :barcode

## 주의사항
- LOG_ 테이블마다 바코드 컬럼명이 다름 (PID, BARCODE, SERIAL_NO 등)
- LOG_ALARM, LOG_ERROR, LOG_MOUNTER, LOG_PROCESS는 추적성에서 제외
```

## 멀티 사이트 쿼리 실행 규칙

1. **기본값은 항상 현재 activeProfile** — Stage 0에서 site를 판별하지 못하면 `"default"` 반환
2. **명시적 지칭 시에만 다른 프로필 사용** — "베트남 FPY", "멕시코VD 생산량" 등
3. **Stage 0 시스템 프롬프트에 규칙 명시:**
   ```
   site 판별 규칙:
   - 사용자가 사이트를 명시하지 않으면 반드시 "default" 반환
   - "베트남", "SMVNPDB" → "베트남VD외부"
   - "멕시코VD", "SMMEXPDB" → "멕시코VD외부"  
   - "전장", "SVEHICLEPDB" → "default" (현재 접속 사이트)
   ```

## 코드 변경 범위

### 신규 파일
| 파일 | 역할 |
|---|---|
| `src/lib/ai/context/context-selector.ts` | Stage 0 LLM 호출 — catalog 기반 테이블/도메인 선별 |
| `src/lib/ai/context/context-loader.ts` | 선별된 .md 파일 로드 + frontmatter 파싱 |
| `data/ai-context/catalog.json` | 전체 인덱스 |
| `data/ai-context/tables/*.md` | 테이블별 컨텍스트 문서 |
| `data/ai-context/domains/*.md` | 도메인별 컨텍스트 문서 |
| `data/ai-context/sites/site-profiles.md` | 사이트 프로필 문서 |
| `scripts/generate-ai-catalog.mjs` | schema-context.ts에서 catalog.json + 테이블 .md 초기 생성 |

### 수정 파일
| 파일 | 변경 내용 |
|---|---|
| `src/lib/ai/context/prompt-builder.ts` | Stage 0 결과로 선별된 컨텍스트만 주입하도록 변경 |
| `src/app/api/ai-chat/stream/route.ts` | Stage 0 호출 추가 + site별 `executeQueryByProfile` 분기 |
| `src/lib/ai/schema-context.ts` | `buildSchemaSection`에 .md 파일 기반 로드 옵션 추가 (하위호환) |

## 마이그레이션 전략

1. 기존 `schema-context.ts`의 SCHEMA 데이터를 `scripts/generate-ai-catalog.mjs`로 테이블별 .md 파일 초기 생성
2. 도메인 .md는 현재 MXVC API 코드의 JSDoc + 쿼리 패턴을 참고하여 수동 작성
3. 기존 `buildSchemaSection` 함수는 하위호환 유지 — 새 시스템이 안정되면 deprecate
