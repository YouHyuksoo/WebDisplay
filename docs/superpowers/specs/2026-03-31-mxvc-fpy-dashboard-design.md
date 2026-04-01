# 멕시코전장 직행율(FPY) 대시보드 설계

## 개요

멕시코전장모니터링 카테고리(layer: 8)에 **직행율(First Pass Yield)** 모니터링 페이지를 추가한다.
SVEHICLEPDB의 13개 LOG 테이블에서 시간대별 직행율을 계산하여 한 페이지에 차트로 표시한다.

## 핵심 결정사항

| 항목 | 결정 |
|---|---|
| 레이아웃 | 스크롤 대시보드 + 사이드바 (quality-dashboard 패턴) |
| 차트 단위 | 1시간 단위 바 차트 |
| 대상 테이블 | 13개 (MARKING, SELECTIVE, REFLOW_01/02 제외) |
| 필터 조건 | EQUIPMENT_ID 기반 |
| PASS 판정 | `OK`, `PASS`, `GOOD`, `Y` |
| NG 판정 | `FAIL`, `N`, `NULL`, `SKIP`, 기타 |
| 작업일 기준 | 08:00 시작 (07시 조회 시 → 전일 08:00~현재) |
| API 방식 | 단일 통합 API, 서버에서 13개 테이블 Promise.all 병렬 쿼리 |
| DB 사이트 | SVEHICLEPDB |

## 대상 테이블 매핑

| 테이블 | 결과 컬럼 | 바코드 컬럼 |
|---|---|---|
| LOG_FCT | `RESULT` | `BARCODE` |
| LOG_VISION_LEGACY | `DEVICE_RESULT` | `BARCODE` |
| LOG_DOWNLOAD | `RESULT` | `BARCODE` |
| LOG_LOWCURRENT | `OVERALL_RESULT` | `BARCODE` |
| LOG_VISION_NATIVE | `RESULT` | `BARCODE` |
| LOG_EOL | `ARRAY_RESULT` | `BARCODE` |
| LOG_COATING1 | `RESULT` | `BARCODE` |
| LOG_COATING2 | `RESULT` | `BARCODE` |
| LOG_COATINGREVIEW | `FINAL_RESULT` | `MAIN_BARCODE` |
| LOG_COATINGVISION | `FINAL_RESULT` | `MAIN_BARCODE` |
| LOG_ICT | `RESULT` | `BARCODE` |
| LOG_AOI | `RESULT` | `SERIAL_NO` |
| LOG_SPI | `PCB_RESULT` | `MASTER_BARCODE` |

### 제외 테이블 (4개)

- `LOG_MARKING` — RESULT 컬럼 없음 (마킹 이력만)
- `LOG_SELECTIVE` — RESULT 컬럼 없음 (솔더 온도/RPM 파라미터만)
- `LOG_REFLOW_01` — RESULT/바코드 없음 (리플로우 존 온도 데이터)
- `LOG_REFLOW_02` — RESULT/바코드 없음 (리플로우 존 온도 데이터)

## 페이지 구조

```
┌─────────────────────────────────────────────────┐
│  DisplayHeader  "멕시코전장 직행율"              │
├────────┬────────────────────────────────────────┤
│ 사이드바 │  차트 영역 (스크롤)                    │
│ 260px   │  ┌──────────┐ ┌──────────┐            │
│         │  │ LOG_FCT   │ │LOG_V_LEG │            │
│ ▸프리셋  │  │ 시간별 바 │ │ 시간별 바│            │
│ ▸레이아웃│  └──────────┘ └──────────┘            │
│ ▸차트높이│  ┌──────────┐ ┌──────────┐            │
│ ▸팔레트  │  │LOG_DOWNL │ │LOG_LOWCU │            │
│ ▸설비필터│  │ 시간별 바 │ │ 시간별 바│            │
│ ▸차트토글│  └──────────┘ └──────────┘            │
│         │  ... (13개 차트 스크롤)                 │
├────────┴────────────────────────────────────────┤
│  DisplayFooter                                   │
└─────────────────────────────────────────────────┘
```

## 차트 카드 구성

각 차트 카드는 다음을 포함:

- **제목**: 테이블명 (LOG_ 접두사 제거하여 표시, 예: "FCT", "VISION LEGACY")
- **요약 라인**: 전체 직행율 % + PASS/Total 수치
- **바 차트**: X축 = 시간(08, 09, ...), Y축 = 직행율(0~100%)
- **90% 기준선**: 빨간 점선
- **바 색상**: 95%+ → 초록(#4ade80), 90~95% → 노란(#facc15), 90% 미만 → 빨간(#f87171)

## 사이드바 설정

| 항목 | 설명 |
|---|---|
| 프리셋 | 기본 / 전체 / SMT공정 / 코팅공정 / 검사공정 |
| 레이아웃 | 2열(`grid-cols-2`) / 3열(`grid-cols-3`) / 2+1열 |
| 차트 높이 | 슬라이더 120~350px |
| 색상 팔레트 | blue / rainbow / warm / cool (PALETTES 재사용) |
| 설비 필터 | EQUIPMENT_ID 체크박스 (API에서 가용 목록 제공) |
| 차트 토글 | 13개 테이블 각각 체크박스로 표시/숨김 |
| 새로고침 | 수동 새로고침 버튼 |

### 프리셋 정의

- **기본**: FCT, VISION_LEGACY, EOL, ICT, LOWCURRENT, SPI, AOI ON
- **전체**: 13개 전부 ON
- **SMT공정**: SPI, AOI ON
- **코팅공정**: COATING1, COATING2, COATINGREVIEW, COATINGVISION ON
- **검사공정**: FCT, ICT, EOL, LOWCURRENT, DOWNLOAD, VISION_LEGACY, VISION_NATIVE ON

## API 설계

### GET /api/mxvc/fpy

**쿼리 파라미터:**
- `equipments` — 콤마 구분 EQUIPMENT_ID (생략 시 전체)

**SQL 패턴 (각 테이블):**
```sql
SELECT
  TO_CHAR(LOG_TIMESTAMP, 'HH24') AS HOUR,
  COUNT(*) AS TOTAL_CNT,
  SUM(CASE WHEN {resultCol} IN ('OK','PASS','GOOD','Y') THEN 1 ELSE 0 END) AS PASS_CNT
FROM {tableName}
WHERE LOG_TIMESTAMP >= :workDayStart
  AND LOG_TIMESTAMP < :workDayEnd
  AND {resultCol} IS NOT NULL
  {equipmentFilter}
GROUP BY TO_CHAR(LOG_TIMESTAMP, 'HH24')
ORDER BY HOUR
```

**작업일 경계 로직 (08:00 기준):**
```
현재 시각 >= 08:00 → workDayStart = 오늘 08:00
현재 시각 <  08:00 → workDayStart = 어제 08:00
workDayEnd = 현재 시각
```

Oracle SQL:
```sql
CASE WHEN TO_NUMBER(TO_CHAR(SYSDATE, 'HH24')) >= 8
  THEN TRUNC(SYSDATE) + 8/24
  ELSE TRUNC(SYSDATE) - 1 + 8/24
END
```

**응답 형태:**
```typescript
interface MxvcFpyResponse {
  tables: Record<string, {
    hourly: Array<{ hour: string; total: number; pass: number; yield: number }>;
    summary: { total: number; pass: number; yield: number };
  }>;
  equipments: string[];
  workDay: { start: string; end: string };
  lastUpdated: string;
}
```

## 파일 구조

```
src/
├── app/(mxvc)/mxvc/fpy/page.tsx          ← 페이지
├── app/api/mxvc/fpy/route.ts             ← 통합 API (SVEHICLEPDB)
├── components/mxvc/
│   ├── FpyDashboard.tsx                  ← 차트 영역
│   ├── FpySidebar.tsx                    ← 사이드바
│   └── FpyChartCard.tsx                  ← 개별 차트 카드 (Recharts)
├── types/mxvc/fpy.ts                     ← 타입 정의
└── hooks/mxvc/useMxvcFpy.ts             ← 데이터 fetch 훅
```

## 메뉴 카드 추가

`src/lib/menu/config.ts`의 `DEFAULT_SHORTCUTS`에 추가:
```typescript
{ id: 'mex-fpy', title: '직행율', url: '/mxvc/fpy', color: '#22c55e', icon: 'svg:target', layer: 8 }
```

## DB 연결

기존 `lib/db.ts`의 `executeQuery`는 SOLUM(SMMEXPDB)에 연결되어 있다.
SVEHICLEPDB 연결을 위해 별도 connection 설정이 필요하며, 기존 mxvc API(`/api/mxvc/data`, `/api/mxvc/tables`)의 DB 연결 방식을 따른다.

## 참조

- 기존 quality-dashboard: `src/app/(ctq)/ctq/quality-dashboard/page.tsx`
- 기존 CTQ FPY: `src/app/api/ctq/fpy/route.ts`
- DashboardSidebar: `src/components/ctq/DashboardSidebar.tsx`
- DashboardCharts: `src/components/ctq/DashboardCharts.tsx`
