# Reverse Trace Wizard — 설계 문서

**작성일**: 2026-04-14
**대상 화면**: `http://localhost:3000/mxvc/reverse-trace`
**작성자**: hsyou@jisheng.co.kr + Claude

## 1. 목적

현재 `mxvc/reverse-trace` 페이지는 **자재릴번호(ReelCd, 자재바코드롯트)**를 직접 입력하는 단일 경로로만 역추적이 가능하다. 실제 사용 현장에서는 "릴번호를 모르지만 **어떤 조건**으로 릴번호를 찾아서 추적해야 하는" 시나리오가 자주 발생한다.

이 설계는 **5가지 진입 경로를 지원하는 위자드**를 추가해 동일한 추적 코어(3D 그래프 + 5개 테이블)를 다양한 시작점에서 사용할 수 있게 한다.

## 2. 용어 정의

| 용어 | 실제 값/컬럼 | 설명 |
|---|---|---|
| **자재바코드롯트** | `IM_ITEM_RECEIPT_BARCODE.ITEM_BARCODE` | 자재 입고 시 스캔되는 바코드 |
| **ReelCd** | `HW_ITS_REEL.ReelCd` | SMT 릴 식별자 (SQL Server) |
| **LOT_NO** | `IM_ITEM_ISSUE.MATERIAL_MFS` | 출고 시의 LOT 번호 |
| **RUN_NO** | `IM_ITEM_ISSUE.RUN_NO` (확인 필요) | 작업지시 번호 |
| **FeederCd** | `HW_ITS_REELCHANGEHISTORY.FeederCd` | 피더(장착 슬롯) 식별자 |
| **EqpCd** | `HW_ITS_REELCHANGEHISTORY.EqpCd` | SMT 설비 식별자 |

> **핵심**: 본 설계에서 "자재바코드롯트번호 == ReelCd == ITEM_BARCODE"로 동일한 값을 가리킨다. 모든 UI/API/쿼리에서 `ReelCd` 문자열로 통일한다.

## 3. 추적 모드 (5가지)

### A. 즉시입력 (Immediate)
기존 동작 그대로. 릴번호 입력 → Enter/조회 → 결과 표시.

### B. 출고기준 (Issue)
**입력**: `dateFrom`, `dateTo`, `itemCode` (모두 필수)
**쿼리 대상**: `IM_ITEM_ISSUE` + `IM_ITEM_RECEIPT_BARCODE` 조인
**결과**: 해당 기간·품목으로 출고된 DISTINCT 릴번호 리스트
**리스트 컬럼**: ReelCd, 출고일, 품목명, 수량, LOT_NO

### C. 런번호 추적 (Run)
**입력**: `runNo` (필수)
**쿼리 대상**: `IM_ITEM_ISSUE WHERE RUN_NO = :runNo`
**결과**: 해당 런번호로 출고된 DISTINCT 릴번호 리스트
**리스트 컬럼**: ReelCd, 품목코드, 품목명, 출고일, 수량

### D. 피더번호 추적 (Feeder)
**입력**: `date`, `eqpCd`, `feederCd` (모두 필수)
**쿼리 대상**: `HW_ITS_REELCHANGEHISTORY` (기간 중첩 조건)
```sql
WHERE "EqpCd" = :eqpCd AND "FeederCd" = :feederCd
  AND "ReelInstallDt" < TRUNC(:date) + 1
  AND ("ReelUninstallDt" IS NULL OR "ReelUninstallDt" >= TRUNC(:date))
```
**결과**: 지정일에 해당 장비-피더에 걸려있던 DISTINCT 릴번호 리스트
**리스트 컬럼**: ReelCd, PartNo, 설치일시, 분리일시

### E. 엑셀 업로드 (Excel)
**입력**: `.xlsx` 파일 (자재바코드롯트 1열)
**처리**: 클라이언트 파싱 (`xlsx` 라이브러리) — API 없음
**제약**: 1행 헤더 (예: "ReelCd" 또는 "바코드롯트"), 최대 1000행
**결과**: 업로드된 릴번호 리스트 (중복 제거)
**리스트 컬럼**: ReelCd, 행 번호

## 4. UX — 하이브리드 위자드 (Q1 답변 반영)

### 4.1 진입
결과가 없는 초기 상태 화면에 중앙 정렬 CTA:
```
┌────────────────────────────────────┐
│       🔍 역추적을 시작하려면        │
│                                    │
│        [ 추적 시작 ]               │
│                                    │
│  릴번호를 모르면 5가지 방법으로     │
│  찾아서 추적할 수 있습니다.         │
└────────────────────────────────────┘
```

### 4.2 모달 (Wizard)
[추적 시작] 클릭 → 모달 오픈. 모달 내부만 단계 전환:

**Step 1 — 모드 선택** (5개 카드형 버튼)
```
┌──────┬──────┬──────┬──────┬──────┐
│즉시  │출고  │런번호│피더  │엑셀  │
│입력  │기준  │추적  │추적  │업로드│
└──────┴──────┴──────┴──────┴──────┘
```

**Step 2 — 모드별 입력 폼**
- A: 릴번호 입력 (Enter → 바로 결과)
- B: 기간 + 품목코드
- C: 런번호
- D: 일자 + 장비코드 + 피더번호
- E: 엑셀 파일 선택

[◀ 뒤로] [조회 →] 버튼

**Step 3 — 결과** (모달 닫고 메인 화면에 표시)
- 모드 A: 바로 3D 그래프 + 5개 테이블 표시
- 모드 B~E: 메인 화면에 좌측 릴 리스트 사이드바 + 우측 결과 영역

### 4.3 결과 화면 레이아웃 (모드 B~E)
```
┌────────────────────────────────────────────┐
│ [현재 모드: 출고기준]  [추적 시작(모드변경)]│ ← 상단 모드 표시
├──────────┬─────────────────────────────────┤
│릴 목록   │  3D 그래프                      │
│──────────│                                 │
│[ReelA]★ │                                 │
│[ReelB]   │  (선택 릴 추적 결과)            │
│[ReelC]   │                                 │
│...       │                                 │
│          ├─────────────────────────────────┤
│[조회]    │  입고 / 출고 / 릴마스터 /       │
│          │  릴교환 / 사용보드 테이블       │
└──────────┴─────────────────────────────────┘
```

### 4.4 모드 변경 / 다른 릴 선택 (Q6 답변 반영)
- 상단 [추적 시작] 버튼 다시 누르면 위자드 모달 재진입 → 모드/조건 재설정
- 좌측 릴 리스트에서 다른 릴 클릭만으로는 **즉시 전환하지 않음**.
- 선택된 릴 하이라이트 + 리스트 하단 **[조회]** 버튼 클릭 시에만 추적 쿼리 실행

## 5. API 설계

### 5.1 기존 API (변경 없음)
- `GET /api/mxvc/reverse-trace?reelCd=XX` — 릴번호 주면 5개 테이블 병렬 조회 (재사용)
- `GET /api/mxvc/reverse-trace?reelCd=XX&mode=detail&boardSN=YY` — BoardSN 상세

### 5.2 신규 API (3개)

#### `GET /api/mxvc/reverse-trace/candidates`
위자드에서 릴 후보 리스트를 조회하는 통합 엔드포인트. `mode` 파라미터로 분기.

**공통 응답**:
```ts
{
  mode: 'issue' | 'run' | 'feeder',
  candidates: ReelCandidate[],
  total: number,
}
interface ReelCandidate {
  reelCd: string;
  // 모드별 추가 필드 (union)
}
```

**모드별 파라미터·쿼리**:

1. `mode=issue&dateFrom=YYYY-MM-DD&dateTo=YYYY-MM-DD&itemCode=XX`
```sql
SELECT DISTINCT rb.ITEM_BARCODE AS reelCd, iss.ITEM_CODE, iss.MODEL_NAME,
                iss.ISSUE_DATE, iss.ISSUE_QTY, iss.MATERIAL_MFS AS lotNo
  FROM IM_ITEM_ISSUE iss
  JOIN IM_ITEM_RECEIPT_BARCODE rb
    ON rb.LOT_NO = iss.MATERIAL_MFS AND rb.ITEM_CODE = iss.ITEM_CODE
 WHERE iss.ISSUE_DATE >= TO_DATE(:dateFrom, 'YYYY-MM-DD')
   AND iss.ISSUE_DATE <  TO_DATE(:dateTo,   'YYYY-MM-DD') + 1
   AND iss.ITEM_CODE = :itemCode
 ORDER BY iss.ISSUE_DATE DESC
 FETCH FIRST 500 ROWS ONLY
```

2. `mode=run&runNo=XX`
```sql
SELECT DISTINCT rb.ITEM_BARCODE AS reelCd, iss.ITEM_CODE, iss.MODEL_NAME,
                iss.ISSUE_DATE, iss.ISSUE_QTY
  FROM IM_ITEM_ISSUE iss
  JOIN IM_ITEM_RECEIPT_BARCODE rb
    ON rb.LOT_NO = iss.MATERIAL_MFS AND rb.ITEM_CODE = iss.ITEM_CODE
 WHERE iss.RUN_NO = :runNo
 ORDER BY iss.ISSUE_DATE DESC
```
> ⚠️ `RUN_NO` 컬럼 존재 확인 필요 (구현 1단계에서 DB 스키마 확인).

3. `mode=feeder&date=YYYY-MM-DD&eqpCd=XX&feederCd=YY`
```sql
SELECT DISTINCT CAST("ReelCd" AS VARCHAR2(200))  AS reelCd,
                CAST("PartNo" AS VARCHAR2(100))  AS partNo,
                CAST("ReelInstallDt" AS TIMESTAMP)   AS installDt,
                CAST("ReelUninstallDt" AS TIMESTAMP) AS uninstallDt
  FROM HW_ITS_REELCHANGEHISTORY
 WHERE "EqpCd" = :eqpCd AND "FeederCd" = :feederCd
   AND "ReelInstallDt" < TRUNC(TO_DATE(:date, 'YYYY-MM-DD')) + 1
   AND ("ReelUninstallDt" IS NULL
        OR "ReelUninstallDt" >= TRUNC(TO_DATE(:date, 'YYYY-MM-DD')))
 ORDER BY "ReelInstallDt" DESC
```

## 6. 컴포넌트 구조

```
src/
├── app/(mxvc)/mxvc/reverse-trace/page.tsx  (리팩토링 — 상태 관리 + 레이아웃만)
├── app/api/mxvc/reverse-trace/
│   ├── route.ts                     (기존 유지)
│   └── candidates/route.ts          (신규)
└── components/mxvc/reverse-trace/
    ├── TraceStartScreen.tsx         (초기 CTA 화면)
    ├── TraceWizardModal.tsx         (모달 + 단계 관리)
    ├── modes/
    │   ├── ModeImmediate.tsx
    │   ├── ModeIssue.tsx
    │   ├── ModeRun.tsx
    │   ├── ModeFeeder.tsx
    │   └── ModeExcel.tsx
    ├── ReelListSidebar.tsx          (좌측 릴 리스트, B~E 공통)
    └── TraceResultPanel.tsx         (기존 그래프+테이블 영역 리팩토링)
```

## 7. 상태 관리

```ts
type TraceMode = 'immediate' | 'issue' | 'run' | 'feeder' | 'excel';

interface WizardResult {
  mode: TraceMode;
  candidates: ReelCandidate[];   // mode B~E, A는 []
  selectedReelCd?: string;       // 리스트 선택된 릴 (조회 버튼 누르기 전)
  tracedReelCd?: string;         // 실제 추적된 릴 (결과 표시용)
}

// 메인 페이지 상태
const [wizard, setWizard] = useState<WizardResult | null>(null);
const [isWizardOpen, setIsWizardOpen] = useState(false);
```

- 위자드 조회 완료 → `setWizard({ mode, candidates, tracedReelCd? })` + `setIsWizardOpen(false)`
- 모드 A: `candidates=[]`, `tracedReelCd=입력한 릴` → 기존 추적 API 호출
- 모드 B~E: candidates 채움, 사용자 리스트에서 선택 → `selectedReelCd` → [조회] 클릭 시 `tracedReelCd = selectedReelCd` 승격 후 추적 API 호출

## 8. 에러/엣지 케이스

| 케이스 | 처리 |
|---|---|
| 출고기준 기간이 90일 초과 | 경고 배너 표시 (DB 부하 방지). 사용자가 "그래도 조회" 누르면 진행 |
| 런번호/피더 조회 결과 0건 | 위자드 Step 2에 "해당 조건으로 찾은 릴이 없습니다" 메시지 + 뒤로 버튼 |
| 엑셀 1000행 초과 | 파일 선택 직후 파싱 중단, "1000행 이하만 지원" 경고 |
| 엑셀 릴번호 컬럼 식별 실패 | 1열 값을 릴번호로 가정. 빈 값/숫자형은 제외 |
| 릴 리스트에서 선택하지 않고 [조회] | 버튼 비활성화 |
| 동일 모달 재진입 | 이전 모드/입력값 프리필 (UX 편의) |

## 9. 스코프 / 비범위 (YAGNI)

**스코프에 포함**:
- 5가지 모드 진입
- 릴 후보 리스트 + 선택 + 추적 실행
- 기존 추적 코어(3D 그래프 + 5개 테이블) 재사용

**명시적 비범위**:
- 릴 후보의 **일괄 추적** (리스트 모든 릴을 동시 조회) — 현재는 1개씩만 추적
- 추적 결과의 **다중 비교 뷰**
- 위자드 상태의 URL 공유/복원
- 업로드한 엑셀의 **서버 저장** — 세션 내에서만 유효

## 10. 구현 순서 (후속 writing-plans에서 상세화)

1. **DB 스키마 확인**: `IM_ITEM_ISSUE.RUN_NO` 컬럼 존재 확인 (oracle-db 스킬)
2. 기존 page.tsx를 `TraceResultPanel` + 메인 페이지로 분리 (리팩토링, 동작 동일)
3. `TraceStartScreen` + `TraceWizardModal` 뼈대
4. 5개 ModeXxx 컴포넌트 개별 구현
5. `/api/mxvc/reverse-trace/candidates` 엔드포인트 (모드별 SQL)
6. `ReelListSidebar` + 선택→조회 통합
7. 에러/엣지 케이스 처리
8. 기존 페이지 UX 동등성 검증 (즉시입력 모드로 이전 시나리오 재현)

## 11. 검증 계획

- 모드 A: 기존 URL로 릴번호 입력 → 기존 결과와 동일해야 함
- 모드 B: 최근 출고된 실제 릴번호로 역검증 (기간+품목 → 리스트에 그 릴이 나오는가)
- 모드 D: `HW_ITS_REELCHANGEHISTORY`의 특정 레코드의 `EqpCd`/`FeederCd`/`ReelInstallDt` 로 재구성 → 그 레코드의 릴이 리스트에 나오는가
- 모드 E: 10행짜리 샘플 엑셀 업로드 → 리스트 10행 + 중복 제거 확인

