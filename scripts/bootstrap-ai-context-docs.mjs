import fs from 'fs';
import path from 'path';

const root = process.cwd();
const contextDir = path.join(root, 'data', 'ai-context');
const tablesDir = path.join(contextDir, 'tables');
const domainsDir = path.join(contextDir, 'domains');
const catalogFile = path.join(contextDir, 'catalog.json');

const tableDocs = {
  'IP_PRODUCT_WORKSTAGE_IO': `---
name: IP_PRODUCT_WORKSTAGE_IO
site: default
description: 공정별 입출고 실적. 투입/포장/검사 공정에서 수량 이벤트를 기록.
related_tables: [IP_PRODUCT_LINE_TARGET, IP_PRODUCT_RUN_CARD, IP_PRODUCT_MODEL_MASTER]
---

## 주요 컬럼
| 컬럼 | 타입 | 설명 |
|---|---|---|
| LINE_CODE | VARCHAR2(10) | 라인코드 |
| WORKSTAGE_CODE | VARCHAR2(10) | 공정코드 (W110/W130/W210/W220/W310 등) |
| IO_QTY | NUMBER | 입출고 수량 |
| ACTUAL_DATE | VARCHAR2(10) | 작업일자 |
| SHIFT_CODE | VARCHAR2(1) | A=주간, B=야간 |
| IO_DATE | DATE | 실 이벤트 시각 |
| MODEL_NAME | VARCHAR2(50) | 모델명 |
| RUN_NO | VARCHAR2(30) | RUN 번호 |

## 자주 쓰는 JOIN
- 목표 대비 실적: IP_PRODUCT_LINE_TARGET by LINE_CODE + PLAN_DATE + SHIFT_CODE
- 모델 기준 집계: IP_PRODUCT_MODEL_MASTER by MODEL_NAME

## 예제 쿼리
\
SELECT F_GET_LINE_NAME(LINE_CODE,1) AS LINE_NAME,
       SHIFT_CODE,
       SUM(IO_QTY) AS QTY
  FROM IP_PRODUCT_WORKSTAGE_IO
 WHERE WORKSTAGE_CODE = 'W220'
   AND ACTUAL_DATE = F_GET_WORK_ACTUAL_DATE(SYSDATE, 'A')
 GROUP BY LINE_CODE, SHIFT_CODE
 ORDER BY LINE_NAME;
`,

  'IP_PRODUCT_LINE_TARGET': `---
name: IP_PRODUCT_LINE_TARGET
site: default
description: 라인/일자/시프트 단위 생산 목표(Plan) 테이블.
related_tables: [IP_PRODUCT_WORKSTAGE_IO]
---

## 주요 컬럼
| 컬럼 | 타입 | 설명 |
|---|---|---|
| LINE_CODE | VARCHAR2(10) | 라인코드 |
| PLAN_DATE | VARCHAR2(10) | 계획일자 |
| SHIFT_CODE | VARCHAR2(1) | 시프트 |
| TARGET_QTY | NUMBER | 목표수량 |

## 자주 쓰는 JOIN
- IP_PRODUCT_WORKSTAGE_IO와 LINE_CODE/PLAN_DATE/SHIFT_CODE 기준 결합

## 예제 쿼리
\
SELECT t.LINE_CODE, t.PLAN_DATE, t.SHIFT_CODE, t.TARGET_QTY,
       NVL(SUM(io.IO_QTY), 0) AS ACTUAL_QTY
  FROM IP_PRODUCT_LINE_TARGET t
  LEFT JOIN IP_PRODUCT_WORKSTAGE_IO io
    ON io.LINE_CODE = t.LINE_CODE
   AND io.ACTUAL_DATE = t.PLAN_DATE
   AND NVL(io.SHIFT_CODE,'X') = NVL(t.SHIFT_CODE,'X')
 WHERE t.PLAN_DATE = :planDate
 GROUP BY t.LINE_CODE, t.PLAN_DATE, t.SHIFT_CODE, t.TARGET_QTY;
`,

  'IP_PRODUCT_RUN_CARD': `---
name: IP_PRODUCT_RUN_CARD
site: default
description: RUN_NO 단위 생산 지시/실적 마스터.
related_tables: [IP_PRODUCT_2D_BARCODE, IP_PRODUCT_MODEL_MASTER, IP_PRODUCT_WORKSTAGE_IO]
---

## 주요 컬럼
| 컬럼 | 타입 | 설명 |
|---|---|---|
| RUN_NO | VARCHAR2(30) | 생산 RUN 번호 |
| RUN_DATE | DATE | RUN 일자 |
| MODEL_NAME | VARCHAR2(50) | 모델명 |
| LINE_CODE | VARCHAR2(10) | 라인코드 |

## 자주 쓰는 JOIN
- 바코드 마스터(IP_PRODUCT_2D_BARCODE)와 RUN_NO 연결
- 모델 마스터(IP_PRODUCT_MODEL_MASTER)와 MODEL_NAME 연결

## 예제 쿼리
\
SELECT RUN_NO, RUN_DATE, MODEL_NAME, LINE_CODE
  FROM IP_PRODUCT_RUN_CARD
 WHERE RUN_DATE BETWEEN TO_DATE(:fromDate,'YYYY-MM-DD')
                   AND TO_DATE(:toDate,'YYYY-MM-DD') + (86399/86400)
 ORDER BY RUN_DATE DESC;
`,

  'IP_PRODUCT_WORK_QC': `---
name: IP_PRODUCT_WORK_QC
site: default
description: 공정 불량/수리 이력. PID/SERIAL_NO 기준 리페어 흐름 추적에 사용.
related_tables: [IP_PRODUCT_2D_BARCODE, IQ_MACHINE_INSPECT_RESULT]
---

## 주요 컬럼
| 컬럼 | 타입 | 설명 |
|---|---|---|
| SERIAL_NO | VARCHAR2(100) | 제품 바코드 |
| WORKSTAGE_CODE | VARCHAR2(10) | 불량 발생 공정 |
| REPAIR_WORKSTAGE_CODE | VARCHAR2(10) | 수리 공정 |
| QC_DATE | DATE | 불량 등록 시각 |
| REPAIR_DATE | DATE | 수리 완료 시각 |
| RECEIPT_DEFICIT | VARCHAR2(10) | 불량 유형 |

## 자주 쓰는 JOIN
- PID/바코드 기준으로 추적성 타임라인에 합류

## 예제 쿼리
\
SELECT SERIAL_NO, WORKSTAGE_CODE, REPAIR_WORKSTAGE_CODE, QC_DATE, REPAIR_DATE
  FROM IP_PRODUCT_WORK_QC
 WHERE QC_DATE >= TO_DATE(:fromDate, 'YYYY-MM-DD')
   AND QC_DATE <  TO_DATE(:toDate,   'YYYY-MM-DD') + 1
 ORDER BY QC_DATE DESC;
`,

  'LOG_AOI': `---
name: LOG_AOI
site: default
description: AOI 검사 로그. SERIAL_NO/MASTER_BARCODE 기준 추적성 및 검사결과 조회에 사용.
related_tables: [IP_PRODUCT_2D_BARCODE, IQ_MACHINE_INSPECT_RESULT]
---

## 주요 컬럼
| 컬럼 | 타입 | 설명 |
|---|---|---|
| LOG_TIMESTAMP | TIMESTAMP | 검사 시각 |
| SERIAL_NO | VARCHAR2(500) | 제품/패널 식별자 |
| RESULT | VARCHAR2(50) | 검사 결과 |
| LINE_CODE | VARCHAR2(50) | 라인코드 |

## 자주 쓰는 JOIN
- 추적성에서는 SERIAL_NO 또는 MASTER_BARCODE 기준 단일 제품 이벤트 조회

## 예제 쿼리
\
SELECT LOG_TIMESTAMP, SERIAL_NO, RESULT, LINE_CODE
  FROM LOG_AOI
 WHERE LOG_TIMESTAMP >= TO_DATE(:dateFrom, 'YYYY-MM-DD')
   AND LOG_TIMESTAMP <  TO_DATE(:dateTo,   'YYYY-MM-DD') + 1;
`,

  'LOG_ICT': `---
name: LOG_ICT
site: default
description: ICT 검사 로그. 장비/바코드 단위 마스터-디테일 조회에 사용.
related_tables: [IQ_MACHINE_INSPECT_RESULT]
---

## 주요 컬럼
| 컬럼 | 타입 | 설명 |
|---|---|---|
| LOG_TIMESTAMP | TIMESTAMP | 검사 시각 |
| EQUIPMENT_ID | VARCHAR2(50) | 장비 ID |
| BARCODE | VARCHAR2(500) | 제품 바코드 |
| RESULT | VARCHAR2(500) | PASS/FAIL 등 결과 |
| FILE_NAME | VARCHAR2(500) | 원본 로그 파일 |

## 자주 쓰는 JOIN
- 별도 조인 없이 시간/라인/바코드 조건으로 직접 조회

## 예제 쿼리
\
SELECT EQUIPMENT_ID, BARCODE, RESULT, LOG_TIMESTAMP
  FROM LOG_ICT
 WHERE LOG_TIMESTAMP BETWEEN TO_DATE(:fromDate,'YYYY-MM-DD HH24:MI:SS')
                         AND TO_DATE(:toDate,  'YYYY-MM-DD HH24:MI:SS')
 ORDER BY LOG_TIMESTAMP DESC;
`,

  'LOG_EOL': `---
name: LOG_EOL
site: default
description: EOL 검사 로그. SPC/검사결과/FPY 계산의 핵심 소스.
related_tables: [IQ_MACHINE_INSPECT_RESULT]
---

## 주요 컬럼
| 컬럼 | 타입 | 설명 |
|---|---|---|
| LOG_TIMESTAMP | TIMESTAMP | 검사 시각 |
| MODEL | VARCHAR2(500) | 모델명 |
| BARCODE | VARCHAR2(500) | 제품 바코드 |
| STEP_RESULT | VARCHAR2(500) | 공정 결과 |
| MEAS_2 | VARCHAR2(500) | SPC 측정값 |

## 자주 쓰는 JOIN
- SPC에서는 단일 테이블 집계 중심, 조인보다 필터링/윈도우 함수 사용

## 예제 쿼리
\
SELECT TO_CHAR(LOG_TIMESTAMP,'YYYY-MM-DD HH24') AS HOUR_KEY,
       COUNT(*) AS TOTAL_CNT,
       SUM(CASE WHEN STEP_RESULT IN ('PASS','OK') THEN 1 ELSE 0 END) AS PASS_CNT
  FROM LOG_EOL
 WHERE LOG_TIMESTAMP >= TO_DATE(:dateFrom,'YYYY-MM-DD')
   AND LOG_TIMESTAMP <  TO_DATE(:dateTo,  'YYYY-MM-DD') + 1
 GROUP BY TO_CHAR(LOG_TIMESTAMP,'YYYY-MM-DD HH24')
 ORDER BY HOUR_KEY;
`,

  'LOG_SPI': `---
name: LOG_SPI
site: default
description: SPI 검사 로그. MASTER_BARCODE/ARRAY_BARCODE 기반 추적 및 검사결과 조회.
related_tables: [IP_PRODUCT_2D_BARCODE]
---

## 주요 컬럼
| 컬럼 | 타입 | 설명 |
|---|---|---|
| LOG_TIMESTAMP | TIMESTAMP | 검사 시각 |
| MASTER_BARCODE | VARCHAR2(500) | 제품 바코드 |
| ARRAY_BARCODE | VARCHAR2(500) | 패널 바코드 |
| PCB_RESULT | VARCHAR2(50) | PCB 판정 |
| PANEL_RESULT | VARCHAR2(50) | Panel 판정 |

## 자주 쓰는 JOIN
- traceability에서 MASTER_BARCODE로 LOG_SPI_VD와 함께 시간축 이벤트 구성

## 예제 쿼리
\
SELECT LOG_TIMESTAMP, MASTER_BARCODE, PCB_RESULT, PANEL_RESULT
  FROM LOG_SPI
 WHERE LOG_TIMESTAMP >= TO_DATE(:dateFrom, 'YYYY-MM-DD')
   AND LOG_TIMESTAMP <  TO_DATE(:dateTo,   'YYYY-MM-DD') + 1;
`,

  'IB_SMT_CHECKHIST': `---
name: IB_SMT_CHECKHIST
site: default
description: SMT 피딩 체크 이력. 자재 투입 추적과 MSL 분석에 사용.
related_tables: [IM_ITEM_RECEIPT_BARCODE, ID_ITEM]
---

## 주요 컬럼
| 컬럼 | 타입 | 설명 |
|---|---|---|
| CHECK_DATE | DATE | 체크 시각 |
| RUN_NO | VARCHAR2(30) | RUN 번호 |
| SCAN_PARTNAME | VARCHAR2(100) | 자재 바코드 |
| CHECK_STATUS | VARCHAR2(1) | 체크 상태 |
| CHECK_TYPE | VARCHAR2(10) | 체크 타입 (CCS/REEL 등) |
| LINE_CODE | VARCHAR2(10) | 라인코드 |

## 자주 쓰는 JOIN
- IM_ITEM_RECEIPT_BARCODE.ITEM_BARCODE = SCAN_PARTNAME
- ID_ITEM.ITEM_CODE = IB_SMT_CHECKHIST.ITEM_CODE

## 예제 쿼리
\
SELECT RUN_NO, SCAN_PARTNAME, CHECK_DATE, CHECK_STATUS, CHECK_TYPE
  FROM IB_SMT_CHECKHIST
 WHERE RUN_NO = :runNo
   AND CHECK_STATUS = 'P'
 ORDER BY CHECK_DATE DESC;
`,

  'ISYS_BASECODE': `---
name: ISYS_BASECODE
site: default
description: MES 공통 코드 마스터. 상태/유형 코드명 해석에 사용.
related_tables: []
---

## 주요 컬럼
| 컬럼 | 타입 | 설명 |
|---|---|---|
| BASE_TYPE | VARCHAR2(30) | 코드 그룹 |
| BASE_CODE | VARCHAR2(30) | 코드값 |
| BASE_NAME | VARCHAR2(100) | 코드명 |
| USE_YN | VARCHAR2(1) | 사용 여부 |

## 자주 쓰는 JOIN
- 업무 테이블의 상태 코드 컬럼과 BASE_TYPE+BASE_CODE 조건으로 조인

## 예제 쿼리
\
SELECT BASE_TYPE, BASE_CODE, BASE_NAME
  FROM ISYS_BASECODE
 WHERE BASE_TYPE = :baseType
   AND USE_YN = 'Y'
 ORDER BY BASE_CODE;
`,
};

const domainDocs = {
  'traceability.md': `---
name: traceability
description: 바코드(PID/SERIAL_NO) 기반 제품 추적성 분석 — 공정 타임라인/자재 이력
tables: [IP_PRODUCT_2D_BARCODE, IP_PRODUCT_RUN_CARD, IP_PRODUCT_MODEL_MASTER, IP_PRODUCT_WORK_QC, IP_PRODUCT_WORKSTAGE_IO, LOG_AOI, LOG_ICT, LOG_EOL, LOG_SPI, LOG_COATINGVISION, LOG_LCR, LOG_DOWNLOAD]
---

## 업무 설명
제품 바코드를 입력하면 마스터 정보 + 공정 이벤트를 시간순으로 반환한다.

## 핵심 흐름
1. 바코드로 IP_PRODUCT_2D_BARCODE에서 RUN_NO 조회
2. RUN_NO로 IP_PRODUCT_RUN_CARD 조회
3. MODEL_NAME으로 IP_PRODUCT_MODEL_MASTER 조회
4. LOG_* 이벤트를 바코드 컬럼 매칭으로 병렬 조회
5. WORK_QC/WORKSTAGE_IO 이벤트 포함
6. timestamp 기준 오름차순 정렬

## 주의사항
- LOG 테이블마다 바코드 컬럼명이 다름
- LOG_ALARM/LOG_ERROR/LOG_MOUNTER/LOG_PROCESS는 제외
- REFLOW는 바코드가 없어 AOI 시각 윈도우로 별도 조회
`,

  'process-history.md': `---
name: process-history
description: 공정통과이력 — PID별 각 공정 통과 여부 피벗 조회
tables: [IQ_MACHINE_INSPECT_RESULT]
---

## 업무 설명
날짜 범위와 PID 조건으로 검사이력을 조회하고, PID 행 + WORKSTAGE 열 형태로 피벗한다.

## 핵심 쿼리 패턴
- INSPECT_DATE 문자열 범위 비교
- IS_LAST(Y/N/all) 필터
- PID 부분일치 필터

## 주의사항
- INSPECT_DATE가 VARCHAR2이므로 형식 일관성 전제
- 서버 측 피벗 처리(동적 PIVOT 미사용)
`,

  'fpy.md': `---
name: fpy
description: First Pass Yield(1차 양품률) 분석
tables: [LOG_AOI, LOG_ICT, LOG_EOL, LOG_SPI, LOG_COATINGVISION, LOG_DOWNLOAD]
---

## 업무 설명
설비별 로그 테이블에서 PASS/FAIL 집계를 계산해 시간대별 FPY를 제공한다.

## 핵심 흐름
1. 대상 테이블별 결과 컬럼/바코드 컬럼 설정
2. 시간 조건(work day 또는 사용자 범위) 적용
3. groupedFpy 테이블은 바코드 단위 최종 PASS 판정
4. hourly/day bucket으로 집계
`,

  'production-kpi.md': `---
name: production-kpi
description: 생산 KPI — 목표 대비 실적, 달성률
tables: [IP_PRODUCT_WORKSTAGE_IO, IP_PRODUCT_LINE_TARGET, IP_PRODUCT_RUN_CARD]
---

## 업무 설명
라인/일자/시프트 기준으로 목표 대비 생산 실적과 달성률을 계산한다.

## 핵심 지표
- Actual Qty, Target Qty
- Achievement(%), Gap
- 라인별/시프트별 추이
`,

  'spc.md': `---
name: spc
description: SPC 관리도 — 통계적 공정 관리
tables: [LOG_EOL]
---

## 업무 설명
LOG_EOL 측정값(MEAS_2 등) 기반 Xbar-R/관리한계(UCL/LCL) 분석.

## 핵심 흐름
1. 모델/항목 필터
2. 유효 숫자값 정제(REGEXP_LIKE)
3. 샘플링 그룹별 통계 계산
4. 이상점(outlier) 탐지
`,

  'repair-status.md': `---
name: repair-status
description: 수리 현황 — 불량 유형별 수리 진행 상태
tables: [IP_PRODUCT_WORK_QC]
---

## 업무 설명
불량 접수/수리 데이터를 조회해 공정별 수리 현황과 진행 상태를 제공한다.

## 핵심 필터
- QC_DATE 범위
- WORKSTAGE_CODE/RECEIPT_DEFICIT
- 수리완료 여부(수리일자 존재)
`,

  'inspect-result.md': `---
name: inspect-result
description: 검사 결과 — AOI/ICT/EOL/SPI 공정별 검사 결과 조회
tables: [LOG_AOI, LOG_ICT, LOG_EOL, LOG_SPI, IQ_MACHINE_INSPECT_RESULT]
---

## 업무 설명
검사 로그를 공정/라인/시간 조건으로 조회하고 PASS/FAIL 분포를 분석한다.

## 핵심 흐름
1. 테이블별 시간 컬럼과 결과 컬럼 정규화
2. 공정 코드/라인 코드 필터
3. 결과 집계 및 상세 drill-down 제공
`,
};

const domainCatalog = [
  { name: 'traceability', summary: '바코드(PID) 기반 제품 추적성 분석 — 공정 타임라인, 자재 이력', tags: ['추적', '바코드', '이력', 'PID', '타임라인'] },
  { name: 'process-history', summary: '공정통과이력 — PID별 각 공정 통과 여부 피벗', tags: ['공정', '이력', '검사', 'PID', '피벗'] },
  { name: 'fpy', summary: 'First Pass Yield 1차 양품률 분석', tags: ['FPY', '양품률', '품질', '수율'] },
  { name: 'production-kpi', summary: '생산 KPI — 목표 대비 실적, 달성률', tags: ['생산', 'KPI', '목표', '실적', '달성률'] },
  { name: 'spc', summary: 'SPC 관리도 — 통계적 공정 관리', tags: ['SPC', '관리도', '통계', '공정관리'] },
  { name: 'repair-status', summary: '수리 현황 — 불량 유형별 수리 진행 상태', tags: ['수리', '불량', '리페어'] },
  { name: 'inspect-result', summary: '검사 결과 — AOI/ICT/EOL 등 공정별 검사 결과 조회', tags: ['검사', 'AOI', 'ICT', 'EOL', '결과'] },
];

const tableSummaryPatch = {
  IP_PRODUCT_WORKSTAGE_IO: {
    summary: '공정별 입출고 실적. 투입/포장/검사 이벤트를 수량 단위로 기록',
    tags: ['생산', '실적', 'IO', '공정', '포장', '투입'],
  },
  IP_PRODUCT_LINE_TARGET: {
    summary: '라인/일자/시프트 기준 생산 목표 계획',
    tags: ['생산', '목표', '계획', '라인'],
  },
  IP_PRODUCT_RUN_CARD: {
    summary: 'RUN 단위 생산 지시/실적 마스터',
    tags: ['생산', 'RUN', '모델', '라인'],
  },
  IP_PRODUCT_WORK_QC: {
    summary: '공정 불량/수리 이력',
    tags: ['품질', '불량', '수리', 'QC'],
  },
  LOG_AOI: { summary: 'AOI 검사 로그', tags: ['검사', 'AOI', '품질'] },
  LOG_ICT: { summary: 'ICT 검사 로그', tags: ['검사', 'ICT', '품질'] },
  LOG_EOL: { summary: 'EOL 검사 로그/SPC 소스', tags: ['검사', 'EOL', 'SPC'] },
  LOG_SPI: { summary: 'SPI 검사 로그', tags: ['검사', 'SPI', '품질'] },
  IB_SMT_CHECKHIST: { summary: 'SMT 피딩 체크 이력', tags: ['SMT', '자재', '피딩', '이력'] },
  ISYS_BASECODE: { summary: 'MES 공통 코드 마스터', tags: ['시스템', '코드', '기준정보'] },
};

for (const [name, content] of Object.entries(tableDocs)) {
  fs.writeFileSync(path.join(tablesDir, `${name}.md`), content, 'utf-8');
}

fs.mkdirSync(domainsDir, { recursive: true });
for (const [file, content] of Object.entries(domainDocs)) {
  fs.writeFileSync(path.join(domainsDir, file), content, 'utf-8');
}

const catalog = JSON.parse(fs.readFileSync(catalogFile, 'utf-8'));
catalog.domains = domainCatalog;

catalog.tables = (catalog.tables || []).map((t) => {
  const patch = tableSummaryPatch[t.name];
  if (!patch) return t;
  return { ...t, ...patch };
});

fs.writeFileSync(catalogFile, JSON.stringify(catalog, null, 2), 'utf-8');
console.log('Patched context docs and catalog.');
