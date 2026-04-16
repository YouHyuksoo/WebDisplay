---
name: LOG_ICT
site: default
description: ICT(In-Circuit Test) 전기검사 로그. 회로 단선/단락/저항값 검사 결과 기록.
related_tables: [IP_PRODUCT_RUN_CARD, IP_PRODUCT_LINE]
---

## 주요 컬럼
| 컬럼 | 타입 | 설명 |
|---|---|---|
| LOG_ID | NUMBER | 자동 채번 PK |
| EQUIPMENT_ID | VARCHAR2(50) | 설비 ID |
| LOG_TIMESTAMP | TIMESTAMP(6) | 로그 타임스탬프 |
| BARCODE | VARCHAR2(500) | data.BARCODE |
| OPEN | VARCHAR2(500) | data.OPEN |
| SHORT | VARCHAR2(500) | data.SHORT |
| STEP | VARCHAR2(500) | data.STEP |
| BOARD | VARCHAR2(500) | data.BOARD |
| LOG_TYPE | VARCHAR2(500) | data.TYPE |
| DEVICE | VARCHAR2(500) | data.DEVICE |
| IDEAL | VARCHAR2(500) | data.IDEAL |
| CH_PLUS | VARCHAR2(500) | data.CH_PLUS |
| CH_MINUS | VARCHAR2(500) | data.CH_MINUS |
| LC | VARCHAR2(500) | data.LC |
| STD | VARCHAR2(500) | data.STD |
| T_PLUS | VARCHAR2(500) | data.T_PLUS |
| T_MINUS | VARCHAR2(500) | data.T_MINUS |
| MEAS | VARCHAR2(500) | data.MEAS |
| ERROR_PCT | VARCHAR2(500) | data.ERROR_PCT |
| RESULT | VARCHAR2(500) | data.RESULT: FAIL=FAIL, N=NG, NG=NG, OK=OK, PASS=PASS, Y=OK |
| LOG_ROWS | VARCHAR2(500) | data.ROWS |
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

