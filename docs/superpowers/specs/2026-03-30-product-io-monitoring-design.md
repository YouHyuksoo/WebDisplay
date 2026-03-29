# 제품투입/포장 모니터링 & 생산계획등록 설계서

> 작성일: 2026-03-30

## 1. 개요

PBA 모니터링 카테고리에 3개 화면을 추가한다:

| 메뉴 | screenId | 공정코드 | 유형 |
|---|---|---|---|
| 제품투입현황 | 22 | W310 | 모니터링 (읽기 전용) |
| 제품포장현황 | 23 | W220 | 모니터링 (읽기 전용) |
| 생산계획등록 | 20 | - | CRUD 등록 화면 |

## 2. DB 변경

### 2.1 IP_PRODUCT_LINE_TARGET — 컬럼 추가

기존 PK: `PLAN_DATE + LINE_CODE + ORGANIZATION_ID`

| 추가 컬럼 | 타입 | NULL | 용도 |
|---|---|---|---|
| MODEL_NAME | VARCHAR2(50) | Y | 모델명 (예: U8000F Power 43) |
| ITEM_CODE | VARCHAR2(20) | Y | 제품코드 (예: BF43FA120U0/VD) |
| UPH | NUMBER | Y | 시간당 생산능력 |
| LEADER_ID | VARCHAR2(20) | Y | 리더 사번 → ISYS_USERS 참조 |
| SUB_LEADER_ID | VARCHAR2(20) | Y | 부리더 사번 → ISYS_USERS 참조 |

기존 `COMMENTS` 컬럼을 NOTICE 메시지로 활용.

### 2.2 사용 테이블 요약

| 테이블 | 용도 |
|---|---|
| IP_PRODUCT_LINE_TARGET | 생산계획 (목표수량, 모델, 리더, NOTICE) |
| IP_PRODUCT_WORKSTAGE_IO | 실시간 실적 (건별 IO_QTY) |
| ICOM_WORKTIME_RANGES | Shift 시작/종료 시간 참조 (SHIFTTIME) |
| ISYS_USERS | 리더/부리더 사진 및 이름 조회 |

### 2.3 조인 조건

```
IP_PRODUCT_LINE_TARGET.LINE_CODE = IP_PRODUCT_WORKSTAGE_IO.LINE_CODE
IP_PRODUCT_LINE_TARGET.PLAN_DATE = IP_PRODUCT_WORKSTAGE_IO.ACTUAL_YYYMMDD (문자열 변환)
IP_PRODUCT_WORKSTAGE_IO.WORKSTAGE_CODE = 'W310' (투입) 또는 'W220' (포장)
```

## 3. 모니터링 화면 (투입 22 / 포장 23)

### 3.1 레이아웃

단일 라인 전체화면. 각 라인 전용 모니터에 개별 표시.

```
┌──────────────────────────────────────────────────────┐
│ Line: [P11]    Team: [Line 2A]    Shift: Day  12:52  │  헤더
│ Plan Q'ty: 5000    Finished: 3    Completion: 0.06%  │
├────────┬───────┬───────┬───────┬───────┬───────┬─────┤
│        │Time 1 │Time 2 │Time 3 │Time 4 │Time 5 │Total│  시간대 그리드
│        │08-10  │10-12  │12-14  │14-16  │16-18  │     │
│ Target │  833  │  833  │  834  │  833  │  833  │5000 │
│ Actual │    3  │    0  │    0  │    0  │    0  │   3 │
│Shortage│ -830  │ -833  │ -834  │ -833  │ -833  │-4997│  빨간색 음수
│ % Rate │ 0.4%  │ 0.0%  │ 0.0%  │ 0.0%  │ 0.0%  │0.1%│
├────────┴───────┴───────┴───────┴───────┴───────┴─────┤
│ MODEL: U8000F Power 43   UPH: 500                    │  모델 정보
│ Code: BF43FA120U0/VD   PlanQty: 5,000  Completed: 3  │
├──────────────────────┬────────────┬───────────────────┤
│ NOTICE: 주의사항...   │ Leader 📷  │ Sub Leader 📷    │  하단 바
│                      │ 이름/사번   │ 이름/사번         │
└──────────────────────┴────────────┴───────────────────┘
```

### 3.2 시간대 규칙

- 2시간 단위 묶음
- 주간(Shift A): 08-10, 10-12, 12-14, 14-16, 16-18, 18-20 → 6개
- 야간(Shift B): 20-22, 22-00, 00-02, 02-04, 04-06, 06-08 → 6개
- `WORK_TIME_ZONE` 기준 2개씩 그룹핑 (AA+AB → Time1, AC+AD → Time2 ...)

### 3.3 Target 산출

`PLAN_QTY ÷ 시간대 수 (6)` 균등 분배. 나머지는 마지막 시간대에 할당.

### 3.4 Actual 산출

```sql
SELECT WORK_TIME_ZONE, SUM(IO_QTY) AS QTY
  FROM IP_PRODUCT_WORKSTAGE_IO
 WHERE LINE_CODE = :lineCode
   AND WORKSTAGE_CODE = :workstageCode   -- 'W310' 또는 'W220'
   AND ACTUAL_YYYMMDD = :today
 GROUP BY WORK_TIME_ZONE
```

2개 time zone을 합산하여 2시간 단위 실적 산출.

### 3.5 공통 컴포넌트 설계

투입(22)과 포장(23)은 **동일 컴포넌트**, `workstageCode` prop만 다르게 전달:

```typescript
<ProductIoStatus screenId="22" workstageCode="W310" />  // 투입
<ProductIoStatus screenId="23" workstageCode="W220" />  // 포장
```

### 3.6 데이터 갱신

SWR polling (기존 패턴). `useDisplayTiming` 훅의 refreshInterval 사용.

## 4. 생산계획등록 화면 (20)

### 4.1 기능

사용자가 매일 라인별 생산계획을 수동 등록하는 CRUD 화면.

- 1라인 1일 = 1모델 (단일 레코드)
- 날짜 선택 → 라인 선택 → 정보 입력 → 저장

### 4.2 입력 필드

| 필드 | 소스 컬럼 | 필수 | 설명 |
|---|---|---|---|
| 계획일자 | PLAN_DATE | Y | 날짜 선택 |
| 라인 | LINE_CODE | Y | 드롭다운 |
| Shift | SHIFT_CODE | N | A(주간)/B(야간) |
| 모델명 | MODEL_NAME | N | 텍스트 입력 |
| 제품코드 | ITEM_CODE | N | 텍스트 입력 |
| UPH | UPH | N | 숫자 입력 |
| 계획수량 | PLAN_QTY | N | 숫자 입력 |
| 작업인원 | WORKER_QTY | N | 숫자 입력 |
| 리더 | LEADER_ID | N | 사용자 검색/선택 |
| 부리더 | SUB_LEADER_ID | N | 사용자 검색/선택 |
| NOTICE | COMMENTS | N | 텍스트 입력 |

### 4.3 API

| Method | 엔드포인트 | 기능 |
|---|---|---|
| GET | /api/display/20 | 계획 목록 조회 (날짜/라인 필터) |
| POST | /api/display/20 | 신규 등록 |
| PUT | /api/display/20 | 수정 |
| DELETE | /api/display/20 | 삭제 |

## 5. 파일 구조

```
src/
├── app/api/display/
│   ├── 20/route.ts                        # 생산계획 CRUD API
│   ├── 22/route.ts                        # 투입현황 조회 API
│   └── 23/route.ts                        # 포장현황 조회 API
├── components/display/screens/
│   ├── product-io/                        # 투입/포장 공통
│   │   ├── ProductIoStatus.tsx            # 메인 컴포넌트
│   │   └── ProductIoGrid.tsx              # 시간대 그리드
│   └── production-plan/                   # 생산계획등록
│       └── ProductionPlanRegister.tsx      # CRUD 폼
├── lib/queries/
│   └── product-io-status.ts               # 투입/포장 SQL 쿼리
└── screens.ts                             # 20, 22, 23 등록
```
