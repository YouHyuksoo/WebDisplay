# 후공정생산현황 대시보드 설계

**날짜:** 2026-04-12  
**페이지:** `/mxvc/post-process`  
**카테고리:** 멕시코전장모니터링 (cards.json layer: 8)

---

## 1. 개요

멕시코전장 후공정(검사/수리/재공) 현황을 종합적으로 모니터링하는 독립 대시보드.  
생산계획 달성율, 검사공정 직행율, 불량율, 재검사율, 수리 현황, 매거진 대기재공을 한 화면에 표시한다.

---

## 2. 화면 레이아웃

```
┌─ 상단 필터바 ─────────────────────────────────────────────┐
│ [기간 from~to] [오늘] [라인 선택]  [새로고침]              │
├─ KPI 카드 6개 (2행 3열) ──────────────────────────────────┤
│  [달성율%]       [계획수량]       [실적수량]               │
│  [불량율%]       [재검사율%]      [수리대기/완료]           │
├─ 검사공정 직행율 통합 차트 ───────────────────────────────┤
│  x축: 시간대, y축: 직행율(%)                               │
│  테이블별 색상 구분: ICT / EOL / COATING1 / COATING2 / DOWNLOAD │
├─ 매거진 대기재공 테이블 ──────────────────────────────────┤
│  라인코드 | 공정코드 | 매거진번호 | 재공수량               │
└───────────────────────────────────────────────────────────┘
```

---

## 3. 데이터 소스 & 쿼리 설계

### DB 프로필
- **모든 쿼리:** `executeQuery` (활성 프로필: `멕시코전장외부` = SVEHICLEPDBEXT)

### 3-1. 생산계획/실적 달성율
- **소스:** `IRPT_PRODUCT_LINE_TARGET_MONITORING`
- **컬럼:** `LINE_NAME`, `TARGET_PLAN` (계획), `ACTUAL_QTY` (실적)
- **집계:** `SUM(TARGET_PLAN)`, `SUM(ACTUAL_QTY)`
- **달성율 계산:** `ROUND(SUM(ACTUAL_QTY) / NULLIF(SUM(TARGET_PLAN), 0) * 100, 1)`
- **필터:** `ORGANIZATION_ID = 1`, 선택한 라인(LINE_CODE)

### 3-2. 불량율
- **소스:** LOG 5개 테이블 (ICT, EOL, COATING1, COATING2, DOWNLOAD)
- **계산:** `SUM(FAIL건수) / SUM(전체건수) × 100`
- **FAIL 판정:** 기존 FPY API의 PASS_VALUES 외 값 (`OK`, `PASS`, `GOOD`, `Good`, `Y`, `SKIP`, `OverKill`)
- **기간 필터:** 상단 dateFrom / dateTo 기준

### 3-3. 재검사율
- **소스:** LOG 5개 테이블 (ICT, EOL, COATING1, COATING2, DOWNLOAD)
- **정의:** 동일 바코드가 2회 이상 검사된 비율
- **계산:**
  ```sql
  SELECT COUNT(*) AS RETEST_CNT    -- 2회 이상 바코드 수
  FROM (
    SELECT barcode_col, COUNT(*) AS TEST_CNT
    FROM {TABLE}
    WHERE {기간조건}
      AND barcode_col IS NOT NULL
    GROUP BY barcode_col
    HAVING COUNT(*) > 1
  )
  ```
  `재검사율 = RETEST_CNT / 전체 고유 바코드 수 × 100`
- 테이블별 병렬 조회 후 합산

### 3-4. 수리 현황 (수리대기 / 수리완료)
- **소스:** `IP_PRODUCT_WORK_QC`
- **수리대기:** `QC_INSPECT_HANDLING = 'W'` COUNT
- **수리완료:** `QC_INSPECT_HANDLING = 'U'` COUNT
- **기간 필터:** `QC_DATE` 기준 dateFrom ~ dateTo
- **라인 필터:** `LINE_CODE`

### 3-5. 검사공정 직행율 차트
- **소스:** LOG 5개 테이블 (기존 FPY API 쿼리 패턴 재사용)
- **대상 테이블:** `LOG_ICT`, `LOG_EOL`, `LOG_COATING1`, `LOG_COATING2`, `LOG_DOWNLOAD`
- **x축:** 시간대 (`TO_CHAR(LOG_TIMESTAMP, 'HH24')`)
- **y축:** 직행율 (%)
- **표현:** 멀티라인 차트 또는 Grouped Bar — 테이블별 색상 구분
- **차트 라이브러리:** recharts (기존 FPY Dashboard와 동일)

### 3-6. 매거진 대기재공
- **소스:** `IP_PRODUCT_MAGAZINE`
- **컬럼:** `LINE_CODE`, `WORKSTAGE_CODE`, `MAGAZINE_NO`, `MAGAZINE_IN_QTY`
- **집계:** 라인 + 공정별 `SUM(MAGAZINE_IN_QTY)`
- **라인 필터:** `LINE_CODE`

---

## 4. API 설계

### `GET /api/mxvc/post-process`

**Query Parameters:**

| 파라미터 | 타입 | 기본값 | 설명 |
|---|---|---|---|
| `dateFrom` | string | 당일 08:00 | 조회 시작 (YYYY-MM-DDTHH:MM) |
| `dateTo` | string | 현재 | 조회 종료 |
| `lines` | string | `%` | 라인코드 콤마 구분 |

**Response:**
```typescript
{
  kpi: {
    targetPlan: number,       // 생산 계획 합계
    actualQty: number,        // 생산 실적 합계
    achievementRate: number,  // 달성율 (%)
    defectRate: number,       // 불량율 (%)
    retestRate: number,       // 재검사율 (%)
    repairWaiting: number,    // 수리대기 건수
    repairDone: number,       // 수리완료 건수
  },
  fpyChart: {
    [tableKey: string]: {     // LOG_ICT, LOG_EOL, ...
      hour: string,
      total: number,
      pass: number,
      yield: number,          // 직행율 (%)
    }[]
  },
  magazine: {
    lineCode: string,
    workstageCode: string,
    magazineNo: string,
    inQty: number,
  }[],
  lastUpdated: string,
}
```

---

## 5. 컴포넌트 구조

```
src/
├── app/(mxvc)/mxvc/post-process/page.tsx        ← 페이지 (< 80줄)
├── app/api/mxvc/post-process/route.ts           ← 통합 API
├── components/mxvc/
│   ├── PostProcessDashboard.tsx                 ← 메인 컨테이너 (필터바 + 레이아웃)
│   ├── PostProcessKpiCards.tsx                  ← KPI 카드 6개
│   ├── PostProcessFpyChart.tsx                  ← 직행율 통합 차트 (recharts)
│   └── PostProcessMagazineTable.tsx             ← 매거진 재공 테이블
└── types/mxvc/post-process.ts                  ← 타입 정의
```

**컴포넌트 파일 규칙:** 각 파일 200줄 이하.

---

## 6. 메뉴 카드 등록

`config/cards.json`에 다음 카드 추가:
```json
{
  "id": "menu-mxvc-post-process",
  "title": "후공정생산현황",
  "url": "/mxvc/post-process",
  "color": "#10b981",
  "icon": "svg:chart-bar",
  "layer": 8
}
```

---

## 7. screens.ts 등록

```typescript
'mxvc-post-process': {
  id: 'mxvc-post-process',
  title: 'Post-Process Production Status (MXVC)',
  titleKo: '후공정생산현황(멕시코전장)',
  titleEs: 'Estado de Producción Post-Proceso (MXVC)',
  window: '',
  group: 'mxvc',
}
```

---

## 8. 구현 제약

- 파일당 최대 200줄 (페이지는 80줄 이하)
- 모든 쿼리: `executeQuery` (멕시코전장외부 프로필)
- LOG_ 테이블 5개 병렬 조회 (`Promise.all`)
- 재검사율은 테이블별 개별 집계 후 합산
- 다크모드 필수 (`dark:` 클래스 + 기본값 함께)
- 자동 갱신: `useDisplayTiming` hook 사용
- JSDoc 주석 필수 (`@file`, `@description`)
