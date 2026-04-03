# 멕시코전장 추적성분석 페이지 설계

> 작성일: 2026-04-03

## 1. 개요

제품 BARCODE를 입력하면 해당 제품의 전체 제조 과정을 시간순 타임라인으로 보여주는 추적성 분석 페이지.
멕시코전장모니터링(카테고리 ID 8)에 "추적성분석" 카드로 추가.

## 2. 사용자 시나리오

1. 메뉴에서 "추적성분석" 카드 클릭 → `/mxvc/traceability` 이동
2. 바코드 입력란에 제품 바코드 입력 + 조회 버튼 클릭
3. 상단에 제품 마스터 정보(모델명, RUN_NO, 일자, 작업지시 등) 카드 표시
4. 하단에 타임라인으로 모든 LOG 테이블 + 공정이동 + 수리이력을 시간순 나열
5. 수리이력은 경고 아이콘 + "수리" 배지로 구분
6. 각 타임라인 카드 클릭 시 접기/펼치기로 전체 데이터 확인

## 3. 관련 테이블

| 테이블 | 용도 | 조인 키 |
|---|---|---|
| IP_PRODUCT_2D_BARCODE | 바코드 마스터 (모델, RUN_NO, 일자 등) | BARCODE 입력값 |
| IP_PRODUCT_RUN_CARD | 작업지시 정보 | RUN_NO |
| IP_PRODUCT_MODEL_MASTER | 모델 마스터 | MODEL_NAME |
| IP_PRODUCT_WORK_QC | 수리이력 (수리실 등록) | 바코드 |
| IP_PRODUCT_WORKSTAGE_IO | 공정간 이동 정보 | 바코드 |
| LOG_* (ALARM/ERROR 제외) | 설비 로그 데이터 | 바코드 컬럼 (PID, BARCODE, MASTER_BARCODE, SERIAL_NO 등) |

## 4. API 설계

### `GET /api/mxvc/traceability?barcode=XXXX`

**처리 흐름:**

1. `IP_PRODUCT_2D_BARCODE`에서 바코드로 마스터 정보 조회
2. 마스터 정보의 RUN_NO로 `IP_PRODUCT_RUN_CARD` 조회
3. 마스터 정보의 MODEL_NAME으로 `IP_PRODUCT_MODEL_MASTER` 조회
4. `USER_TAB_COLUMNS` 메타데이터로 각 LOG_ 테이블(ALARM/ERROR 제외)에서 바코드 컬럼 존재 여부 확인
5. 바코드 컬럼이 있는 LOG_ 테이블들 + IP_PRODUCT_WORK_QC + IP_PRODUCT_WORKSTAGE_IO를 Promise.all 병렬 조회
6. 모든 결과를 통합, 타임스탬프 기준 시간순 정렬해서 반환

**바코드 컬럼 매칭:**
```
BARCODE_COLUMNS = ['PID', 'BARCODE', 'MASTER_BARCODE', 'SERIAL_NO',
                   'PRODUCT_2D_BARCODE', '2D_BARCODE']
```
각 테이블의 USER_TAB_COLUMNS에서 위 컬럼명 중 하나라도 존재하면 해당 컬럼으로 WHERE 조건 생성. 여러 개 있으면 OR 조건.

**제외 테이블:** LOG_ALARM, LOG_ERROR

**응답 구조:**
```json
{
  "master": { "MODEL_NAME": "", "RUN_NO": "", "RUN_DATE": "", "..." : "..." },
  "runCard": { "..." : "..." },
  "modelMaster": { "..." : "..." },
  "timeline": [
    {
      "source": "LOG_SMD_PLACE",
      "type": "log",
      "timestamp": "2026-04-03T09:01:00",
      "data": { "...전체 row 데이터..." }
    },
    {
      "source": "IP_PRODUCT_WORKSTAGE_IO",
      "type": "stage_move",
      "timestamp": "2026-04-03T09:05:00",
      "data": { "..." }
    },
    {
      "source": "IP_PRODUCT_WORK_QC",
      "type": "repair",
      "timestamp": "2026-04-03T09:30:00",
      "data": { "..." }
    }
  ]
}
```

## 5. 페이지 레이아웃

```
┌─────────────────────────────────────────────────────┐
│ DisplayHeader "멕시코전장 추적성분석"                    │
├─────────────────────────────────────────────────────┤
│ [바코드 입력 ___________________________] [조회]      │
├─────────────────────────────────────────────────────┤
│ ┌─ 제품 마스터 카드 ──────────────────────────────┐  │
│ │ 모델명 | RUN_NO | 일자 | 작업지시 | 모델정보     │  │
│ └─────────────────────────────────────────────────┘  │
├─────────────────────────────────────────────────────┤
│ 타임라인 (시간순, 스크롤)                              │
│                                                       │
│  ● 09:01 [LOG_SMD_PLACE] 주요 데이터 요약             │
│  │       ▸ 클릭하면 전체 데이터 펼침                    │
│  │                                                    │
│  ● 09:05 [공정이동] SMD → AOI                         │
│  │                                                    │
│  ⚠ 09:30 [수리] 수리 배지 + 수리 내용                  │
│  │                                                    │
│  ● 09:45 [LOG_FINAL_TEST] 주요 데이터 요약            │
│                                                       │
├─────────────────────────────────────────────────────┤
│ DisplayFooter                                         │
└─────────────────────────────────────────────────────┘
```

## 6. 타임라인 이벤트 카드 디자인

| 유형 | 아이콘 | 색상 | 배지 |
|---|---|---|---|
| LOG_* (설비 로그) | ● 원형 | 파란/회색 계열 | 테이블명 |
| 공정이동 (WORKSTAGE_IO) | → 화살표 | 초록 계열 | "이동" |
| 수리이력 (WORK_QC) | ⚠ 경고 | 주황 계열 | "수리" |

- 각 카드에는 시간, 소스 테이블명, 주요 데이터 2~3개 표시
- 클릭 시 접기/펼치기로 해당 row의 전체 데이터 표시

## 7. 파일 구조

| 파일 | 역할 |
|---|---|
| `config/cards.json` | 카드 추가 (id: `mex-traceability`, layer: 8) |
| `src/app/(mxvc)/mxvc/traceability/page.tsx` | 페이지 컴포넌트 |
| `src/app/api/mxvc/traceability/route.ts` | API Route (병렬 조회 + 시간순 정렬) |
| `src/components/mxvc/TraceabilityMaster.tsx` | 상단 마스터 정보 카드 |
| `src/components/mxvc/TraceabilityTimeline.tsx` | 타임라인 컴포넌트 |
| `src/types/mxvc/traceability.ts` | 타입 정의 |

## 8. 기술 사항

- **다크모드**: 모든 컴포넌트에 `dark:` 클래스 대응
- **공통 헤더/푸터**: DisplayHeader, DisplayFooter 사용
- **DB 연결**: 기존 `lib/db.ts`의 executeQuery 사용
- **테이블명 검증**: LOG_ 접두사 + 화이트리스트 검증으로 SQL Injection 방지
- **바코드 컬럼명 검증**: USER_TAB_COLUMNS 메타데이터로 실제 존재하는 컬럼만 사용
