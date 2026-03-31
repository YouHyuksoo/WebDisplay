# ATE 분석 대시보드 설계서

## 개요

U1 전용 모니터링 카테고리에 ATE 검사 실적 분석 대시보드를 추가한다.
`IQ_MACHINE_ATE_U1_DATA_RAW` 테이블의 INSPECT_DATE, SHIFT_CODE, ZONE_CODE, LINE_CODE, MACHINE_CODE, INSPECT_RESULT 컬럼을 활용하여 6개 차트를 3x2 그리드로 구성한다.

## 기술 스택

- **차트 라이브러리**: recharts 3.7 (프로젝트에 이미 설치됨)
- **차트 유형**: 혼합형 (도넛, 바, 라인, 히트맵, 수평바)
- **레이아웃**: 3열 x 2행 균등 그리드
- **API 분리**: 기간별 3개 API (당일, 주간, 월간)

## 파일 구조

```
src/
├── app/(u1)/u1/ate-analysis/page.tsx        # 대시보드 페이지
├── app/api/u1/ate-analysis/
│   ├── daily/route.ts                       # 당일 데이터 (차트 #1, #2, #3, #6)
│   ├── weekly/route.ts                      # 주간 데이터 (차트 #4)
│   └── monthly/route.ts                     # 월간 데이터 (차트 #5)
├── components/u1/ate/
│   ├── AteDailyPassRate.tsx                 # #1 당일 라인별 합격률 (도넛)
│   ├── AteYesterdayCompare.tsx              # #2 전일 vs 당일 (그룹 바)
│   ├── AteHourlyTrend.tsx                   # #3 시간대별 추이 (면적 라인)
│   ├── AteWeeklyTrend.tsx                   # #4 주간 일별 추이 (라인)
│   ├── AteMonthlyHeatmap.tsx                # #5 월간 ZONE별 히트맵
│   └── AteMachineNg.tsx                     # #6 머신별 NG 분포 (수평 바)
└── types/u1/ate-analysis.ts                 # 타입 정의
```

## 메뉴 등록

`src/lib/menu/config.ts`의 DEFAULT_SHORTCUTS에 추가:

```typescript
{ id: 'u1-ate', title: 'ATE 분석', url: '/u1/ate-analysis', color: '#f59e0b', icon: 'svg:chart', layer: 7 }
```

layer 7 = U1 MONITORING 카테고리.

## API 설계

### API 1: `GET /api/u1/ate-analysis/daily` (폴링: 30초)

차트 #1, #2, #3, #6이 모두 사용. 전일+당일 데이터를 한 번에 조회.

```typescript
interface AteDailyResponse {
  lineStats: {
    lineCode: string;
    lineName: string;
    today: { total: number; pass: number; ng: number; rate: number };
    yesterday: { total: number; pass: number; ng: number; rate: number };
  }[];
  hourlyTrend: {
    hour: string;       // "08", "09", ...
    total: number;
    pass: number;
    rate: number;
    shift: "D" | "N";
  }[];
  machineNg: {
    machineCode: string;
    ngCount: number;
    total: number;
  }[];
  dateRange: { yesterday: string; today: string };
  lastUpdated: string;
}
```

**SQL 핵심**:
- `INSPECT_DATE`는 varchar → `TO_DATE(INSPECT_DATE, 'YYYY/MM/DD HH24:MI:SS')` 변환
- 근무일 경계: 10:00 기준 (기존 FPY의 `buildDateRange2Days` 패턴 재사용)
- lineStats: LINE_CODE별 GROUP BY, INSPECT_RESULT로 PASS/NG 카운트
- hourlyTrend: `TO_CHAR(TO_DATE(...), 'HH24')`로 시간대 추출, SHIFT_CODE 포함
- machineNg: MACHINE_CODE별 NG 건수 집계, 당일 한정

### API 2: `GET /api/u1/ate-analysis/weekly` (폴링: 5분)

차트 #4 전용. 최근 7일간 일별 x 라인별 합격률.

```typescript
interface AteWeeklyResponse {
  dailyTrend: {
    date: string;       // "2026-03-24"
    lineCode: string;
    total: number;
    pass: number;
    rate: number;
  }[];
  dateRange: { from: string; to: string };
}
```

### API 3: `GET /api/u1/ate-analysis/monthly` (폴링: 10분)

차트 #5 전용. 최근 30일간 ZONE별 x 일별 합격률 히트맵.

```typescript
interface AteMonthlyResponse {
  heatmapData: {
    date: string;       // "2026-03-01"
    zoneCode: string;
    total: number;
    pass: number;
    rate: number;
  }[];
  zones: string[];
  dateRange: { from: string; to: string };
}
```

## 차트 컴포넌트 상세

### #1 당일 라인별 합격률 — `AteDailyPassRate.tsx`

- **유형**: 라인별 미니 도넛 + 중앙에 합격률(%) 수치
- **데이터**: `lineStats[].today`
- **색상**: 합격률 95%↑ 초록, 90~95% 노랑, 90%↓ 빨강
- **인터랙션**: 도넛 hover 시 PASS/NG 건수 툴팁

### #2 전일 vs 당일 비교 — `AteYesterdayCompare.tsx`

- **유형**: 그룹 바 차트 (전일=회색, 당일=파란색)
- **데이터**: `lineStats[].yesterday` vs `lineStats[].today`
- **X축**: LINE_CODE, **Y축**: 합격률(%)
- **추가**: 바 위에 증감 화살표(▲▼) + 차이값 표시

### #3 시간대별 검사 추이 — `AteHourlyTrend.tsx`

- **유형**: 면적 라인 차트 (검사수량) + 점선 라인 (합격률)
- **데이터**: `hourlyTrend[]`
- **X축**: 시간대(08~07), **Y축 좌**: 검사수량, **Y축 우**: 합격률(%)
- **추가**: SHIFT 경계(D/N)를 수직 참조선으로 표시

### #4 주간 일별 합격률 추이 — `AteWeeklyTrend.tsx`

- **유형**: 멀티라인 차트 (LINE별 색상 구분)
- **데이터**: `dailyTrend[]`
- **X축**: 날짜(7일), **Y축**: 합격률(%)
- **추가**: 90% 기준선(빨간 점선) 표시

### #5 월간 ZONE별 히트맵 — `AteMonthlyHeatmap.tsx`

- **유형**: 커스텀 SVG 셀 그리드 (recharts에 네이티브 히트맵 없음)
- **데이터**: `heatmapData[]`
- **X축**: 날짜(30일), **Y축**: ZONE_CODE
- **색상**: 합격률 높을수록 진한 초록, 낮을수록 진한 빨강
- **인터랙션**: 셀 hover 시 날짜/ZONE/합격률 툴팁

### #6 머신별 NG 분포 — `AteMachineNg.tsx`

- **유형**: 수평 바 차트 (NG 건수 내림차순, TOP 10)
- **데이터**: `machineNg[]`
- **Y축**: MACHINE_CODE, **X축**: NG 건수
- **색상**: NG 건수에 따라 그라데이션 (많을수록 빨강)

## 공통 사항

- **다크 모드**: 모든 차트에 `dark:` 클래스 + recharts 테마 색상 분기
- **로딩 상태**: 스켈레톤 UI (차트 영역 크기 유지)
- **에러 상태**: 차트 영역에 인라인 에러 메시지
- **차트 카드**: 제목 + 기간 뱃지(당일/주간/월간) + 차트 영역
- **폴링 주기**: daily=30초, weekly=5분, monthly=10분
- **다국어**: i18n 메시지 파일에 차트 제목/레이블 추가

## 차트 목적별 분류

| 목적 | 차트 |
|------|------|
| 현황 파악 | #1 당일 합격률, #2 전일 비교 |
| 실시간 흐름 | #3 시간대별 추이 |
| 추세 분석 | #4 주간 추이, #5 월간 히트맵 |
| 원인 추적 | #6 머신별 NG 분포 |
