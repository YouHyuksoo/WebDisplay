# 멕시코전장 인터락호출이력 페이지 설계

## 개요

멕시코전장모니터링에 "인터락호출이력" 페이지를 신규 생성한다.
ICOM_WEB_SERVICE_LOG 테이블의 데이터를 실시간(10초 폴링)으로 조회하여
좌측에 로그 목록, 우측에 2x2 분석 차트를 표시하는 대시보드이다.

## 데이터 소스

### ICOM_WEB_SERVICE_LOG 테이블 (SVEHICLEPDB)

| 컬럼 | 타입 | 설명 |
|---|---|---|
| ADDR | VARCHAR2(100) | 호출 주소 (MOBIS, SOLDER, MARKING, SMT, SAVEMARKING) |
| REQ | VARCHAR2(4000) | 요청 내용 (예: PROCCHECK/51/SM-CT1-01) |
| CALL_DATE | DATE | 호출 시각 |
| LINE_CODE | VARCHAR2(20) | 라인 코드 (51, LINE_02, LINE01 등) |
| WORKSTAGE_CODE | VARCHAR2(20) | 공정 코드 (SM-ICT-01, SM-CT1-01 등) |
| RETURN | VARCHAR2(4000) | 응답 (OK,... 또는 NG,...) |

### 데이터 특성

- ADDR별: MOBIS 72%, SOLDER 17%, MARKING 6%, SAVEMARKING 3%, SMT 2%
- 요청 타입: PROCCHECK, SAVERESULT, S00600D1, GETARRAYPCBLIST 등
- 결과: OK 약 82% / NG 약 18%
- OK/NG 판별: RETURN 컬럼이 'OK'로 시작하면 OK, 그 외 NG

## 페이지 레이아웃

```
┌─────────────────────────────────────────────────────┐
│ DisplayHeader: "인터락호출이력"                        │
├────────────────┬────────────────────────────────────┤
│ 좌측 35%       │ 우측 65%                            │
│                │ ┌─────────────┐┌──────────────┐    │
│ 실시간 로그     │ │ 시간별       ││ OK/NG 비율    │    │
│ 테이블          │ │ 호출 건수    ││ (Donut)      │    │
│ (상세형 행)     │ │ (Bar Chart) ││              │    │
│                │ └─────────────┘└──────────────┘    │
│ 10초 폴링      │ ┌─────────────┐┌──────────────┐    │
│ 최근 200건     │ │ 공정별 NG    ││ ADDR별 호출   │    │
│ NG=빨간 강조   │ │ (가로 Bar)   ││ (가로 Bar)    │    │
│                │ └─────────────┘└──────────────┘    │
├────────────────┴────────────────────────────────────┤
│ DisplayFooter                                        │
└─────────────────────────────────────────────────────┘
```

- 경로: `/mxvc/interlock`
- 라우트 그룹: `(mxvc)` 기존 레이아웃 재사용
- 좌측 35% / 우측 65% — flex 레이아웃

## API 설계

### GET /api/mxvc/interlock

**쿼리 파라미터:**
- `limit`: 로그 최대 건수 (기본 200)

**응답:**
```typescript
{
  logs: Array<{
    addr: string;
    req: string;
    callDate: string;           // YYYY-MM-DD HH24:MI:SS
    lineCode: string;
    workstageCode: string;
    result: "OK" | "NG";       // RETURN 파싱
    returnMsg: string;          // RETURN 원본 (200자 제한)
  }>;
  charts: {
    hourly: Array<{             // 시간별 호출 건수 (OK/NG 구분 없음)
      hour: string;             // "08", "09", ...
      count: number;
    }>;
    okNgRatio: {
      ok: number;
      ng: number;
    };
    byWorkstage: Array<{        // 공정별 NG 건수 TOP 10
      workstageCode: string;
      total: number;
      ng: number;
    }>;
    byAddr: Array<{             // ADDR별 호출 건수
      addr: string;
      total: number;
      ok: number;
      ng: number;
    }>;
  };
  lastUpdated: string;          // ISO 8601
}
```

**DB 쿼리 전략:**
- 로그 조회 1개 + 차트 집계 3개를 Promise.all로 병렬 실행
- 기간: 당일 기준 TRUNC(SYSDATE) ~ TRUNC(SYSDATE) + 1 (멕시코 서버 시간, 자정 기준)
- RETURN 파싱: `RETURN LIKE 'OK%'` → OK, 그 외 → NG

## 컴포넌트 구조

```
src/app/(mxvc)/mxvc/interlock/page.tsx     ← 페이지
src/app/api/mxvc/interlock/route.ts        ← API
src/components/mxvc/InterlockLogTable.tsx   ← 좌측 로그 테이블
src/components/mxvc/InterlockCharts.tsx     ← 우측 2x2 차트 그리드
src/hooks/mxvc/useInterlock.ts             ← 폴링 훅
src/types/mxvc/interlock.ts                ← 타입 정의
```

### page.tsx
- 좌우 분할 레이아웃 (flex)
- DisplayHeader/Footer 사용
- useInterlock 훅으로 폴링 데이터 연결

### InterlockLogTable.tsx
- 테이블 컬럼: 시각 | ADDR | LINE | WORKSTAGE | REQ 요약 | 결과
- 고정 높이 + overflow-y 스크롤
- NG 행: bg-red-900/20 text-red-300 강조
- 최근 200건 표시

### InterlockCharts.tsx
- 2x2 그리드 레이아웃
- 좌상: 시간별 호출 건수 (Bar Chart, 세로)
- 우상: OK/NG 비율 (Donut Chart)
- 좌하: 공정별 NG 건수 TOP 10 (가로 Bar)
- 우하: ADDR별 호출 건수 (가로 Bar)
- 차트 라이브러리: recharts

### useInterlock.ts
- 10초 폴링 (useDisplayTiming의 refreshSeconds 사용)
- /api/mxvc/interlock fetch
- loading/error/data 상태 관리

### interlock.ts (타입)
- InterlockLog, InterlockChartData, InterlockResponse 타입 정의

## 에러 처리

- API 실패 시 이전 데이터 유지 + 상단에 에러 배너 (폴링은 계속)
- DB 연결 실패: { logs: [], charts: null } 반환 → 빈 상태 UI
- 개별 차트 쿼리 실패: 해당 차트만 빈 데이터 (safeQuery 패턴)

## 스타일

- 다크 모드 기본 (mxvc 레이아웃 따름)
- 로그 테이블: 고정 높이 + 스크롤, NG 행 빨간 강조
- 차트: 다크 배경 맞춤 색상
- 가독성: font-bold, dark:text-gray-200 이상 (LogTableSidebar 패턴 따름)

## 카드 등록

config/cards.json에 추가:
```json
{
  "id": "mex-interlock",
  "title": "인터락호출이력",
  "url": "/mxvc/interlock",
  "color": "#f59e0b",
  "icon": "svg:interlock",
  "layer": 8
}
```
