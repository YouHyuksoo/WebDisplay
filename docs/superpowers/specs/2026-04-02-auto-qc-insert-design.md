# LOG 테이블 불량 자동 QC 등록 설계

## 목적

LOG_ 테이블에 INSERT 시 불량(FAIL)이면 IP_PRODUCT_WORK_QC에 자동 등록하는 프로시저 + 트리거 수정

## 대상 테이블 (13개)

| LOG 테이블 | WORKSTAGE_CODE | 공정명 |
|-----------|---------------|--------|
| LOG_AOI | W070 | SAOI |
| LOG_COATING1 | W120 | COATING 1 |
| LOG_COATING2 | W121 | COATING 2 |
| LOG_COATINGVISION | W122 | COATING V |
| LOG_DOWNLOAD | W130 | DOWNLOAD |
| LOG_EOL | W155 | EOL FCT |
| LOG_FCT | W135 | FCT |
| LOG_ICT | W110 | ICT |
| LOG_LOWCURRENT | W145 | LOW CURRENT |
| LOG_MAOI | W060 | MAOI |
| LOG_SPI | W030 | SPI |
| LOG_VISION_LEGACY | W150 | VISION TEST |
| LOG_VISION_NATIVE | W150 | VISION TEST |

## 불량 판정 기준

RESULT가 다음이 **아닌** 모든 건 = 불량:
- PASS, OK, GOOD, Y

## IP_PRODUCT_WORK_QC INSERT 값

| 컬럼 | 값 | 출처 |
|------|-----|------|
| SERIAL_NO | :NEW.BARCODE | LOG |
| LOG_ID | :NEW.LOG_ID | LOG |
| QC_DATE | SYSDATE | 시스템 |
| QC_SEQUENCE | 기존 MAX+1 | 자동채번 |
| QC_RESULT | 'O' | 기본값 (가성) |
| RECEIPT_DEFICIT | '1' | 기본값 (1입고) |
| QC_INSPECT_HANDLING | 'W' | 기본값 (대기) |
| BAD_REASON_CODE | 'B' | 기본값 (기능불량) |
| REPAIR_DIVISION | 'P' | 기본값 (PBA) |
| REPAIR_RESULT_CODE | NULL | 미수리 |
| WORKSTAGE_CODE | 테이블별 매핑 | 고정 매핑 |
| LINE_CODE | IP_PRODUCT_2D_BARCODE.LINE_CODE | 조회 |
| MACHINE_CODE | :NEW.EQUIPMENT_ID | LOG |
| MODEL_NAME | IP_PRODUCT_2D_BARCODE.MODEL_NAME | 조회 |
| ORGANIZATION_ID | 1 | 고정 |
| DEFECT_QTY | 1 | 고정 |
| BAD_QTY | 1 | 고정 |
| ENTER_BY | 'AUTO_QC' | 고정 |
| ENTER_DATE | SYSDATE | 시스템 |

## 구현 방식

1. **공통 프로시저** `P_AUTO_INSERT_QC(p_barcode, p_log_id, p_equipment_id, p_workstage_code)` 생성
   - IP_PRODUCT_2D_BARCODE에서 LINE_CODE, MODEL_NAME 조회
   - QC_SEQUENCE 자동채번 (MAX+1)
   - IP_PRODUCT_WORK_QC에 INSERT
   - 예외 처리 (BARCODE 없는 경우 등)

2. **기존 13개 IS_LAST 트리거 수정**
   - 불량 판정 조건 추가
   - 불량 시 P_AUTO_INSERT_QC 호출

## 중복 방지

없음 — 매번 등록, LOG_ID로 추적 가능

## ISYS_BASECODE 기본값 참조

| 컬럼 | CODE_TYPE | CODE_NAME | 의미 |
|------|-----------|-----------|------|
| QC_RESULT | QC RESULT | O | 가성 |
| RECEIPT_DEFICIT | RECEIPT DEFICIT | 1 | 1입고 |
| QC_INSPECT_HANDLING | QC INSPECT HANDLING | W | 대기 |
| BAD_REASON_CODE | BAD REASON CODE | B | 기능불량 |
| REPAIR_DIVISION | REPAIR DIVISION | P | PBA |
