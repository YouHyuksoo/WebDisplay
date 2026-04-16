---
name: LOG_COATINGVISION
site: default
description: LOG_COATINGVISION 테이블
related_tables: []
---

## 주요 컬럼
| 컬럼 | 타입 | 설명 |
|---|---|---|
| LOG_ID | NUMBER | 자동 채번 PK |
| EQUIPMENT_ID | VARCHAR2(50) | 설비 ID |
| LOG_TIMESTAMP | TIMESTAMP(6) | 로그 타임스탬프 |
| SAVE_DATE | VARCHAR2(100) | data.SAVE_DATE |
| PROGRAM_NAME | VARCHAR2(500) | data.PROGRAM_NAME |
| MAIN_BARCODE | VARCHAR2(500) | data.MAIN_BARCODE |
| SUB_BARCODE | VARCHAR2(500) | data.SUB_BARCODE |
| AREA_NAME | VARCHAR2(500) | data.AREA_NAME |
| RESULT | VARCHAR2(500) | data.RESULT: FAIL=FAIL, N=NG, NG=NG, OK=OK, PASS=PASS, Y=OK |
| FINAL_RESULT | VARCHAR2(50) | data.FINAL_RESULT |
| COATING_RESULTS | VARCHAR2(500) | data.COATING_RESULTS |
| IS_LAST | VARCHAR2(1) | 최종 데이터 여부 (Y/N) |
| IS_SAMPLE | VARCHAR2(1) | 샘플 데이터 여부 (Y/N) |
| CREATED_AT | TIMESTAMP(6) | 레코드 생성 시각 |
| LINE_CODE | VARCHAR2(50) |  |
| FILE_NAME | VARCHAR2(500) |  |
| ACTUAL_DATE | DATE |  |
| SHIFT_CODE | VARCHAR2(2) |  |
| ZONE_CODE | VARCHAR2(2) |  |

## 자주 쓰는 JOIN


## 예제 쿼리

