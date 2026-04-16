---
name: LOG_EOL
site: default
description: EOL(End-Of-Line) 최종검사 로그. 완제품 기능검사 결과 + 측정값 기록.
related_tables: [IP_PRODUCT_RUN_CARD, IP_PRODUCT_LINE]
---

## 주요 컬럼
| 컬럼 | 타입 | 설명 |
|---|---|---|
| LOG_ID | NUMBER | 자동 채번 PK |
| EQUIPMENT_ID | VARCHAR2(50) | 설비 ID |
| LOG_TIMESTAMP | TIMESTAMP(6) | 로그 타임스탬프 |
| BARCODE | VARCHAR2(500) | data.BARCODE |
| LABEL | VARCHAR2(500) | data.LABEL |
| ARRAY_RESULT | VARCHAR2(50) | data.ARRAY_RESULT |
| PCB_NO | VARCHAR2(500) | data.PCB_NO |
| STEP_RESULT | VARCHAR2(50) | data.STEP_RESULT |
| MODEL | VARCHAR2(500) | data.MODEL |
| START_TIME | VARCHAR2(100) | data.START_TIME |
| END_TIME | VARCHAR2(100) | data.END_TIME |
| IS_LAST | VARCHAR2(1) | 최종 데이터 여부 (Y/N) |
| IS_SAMPLE | VARCHAR2(1) | 샘플 데이터 여부 (Y/N) |
| CREATED_AT | TIMESTAMP(6) | 레코드 생성 시각 |
| NO | VARCHAR2(500) |  |
| NAME | VARCHAR2(500) |  |
| NAME_DETAIL | VARCHAR2(500) |  |
| VOLT_V | VARCHAR2(500) |  |
| MIN_1 | VARCHAR2(500) |  |
| TYP_1 | VARCHAR2(500) |  |
| MAX_2 | VARCHAR2(500) |  |
| MEAS_1 | VARCHAR2(500) |  |
| MIN_2 | VARCHAR2(500) |  |
| TYP_2 | VARCHAR2(500) |  |
| MAX_2_2 | VARCHAR2(500) |  |
| MEAS_2 | VARCHAR2(500) |  |
| CAN_STD | VARCHAR2(500) |  |
| MEAS_CAN | VARCHAR2(500) |  |
| DTC_CODE | VARCHAR2(500) |  |
| MEAS_DTC_CODE | VARCHAR2(500) |  |
| STEP_TIME | VARCHAR2(500) |  |
| CAN_TX_1 | VARCHAR2(500) |  |
| CAN_RX_1 | VARCHAR2(500) |  |
| CAN_TX_2 | VARCHAR2(500) |  |
| DATA_RX_2 | VARCHAR2(500) |  |
| LINE_CODE | VARCHAR2(50) |  |
| FILE_NAME | VARCHAR2(500) |  |
| ACTUAL_DATE | DATE |  |
| SHIFT_CODE | VARCHAR2(2) |  |
| ZONE_CODE | VARCHAR2(2) |  |

## 자주 쓰는 JOIN


## 예제 쿼리

