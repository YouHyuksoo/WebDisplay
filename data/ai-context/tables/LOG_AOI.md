---
name: LOG_AOI
site: default
description: AOI(자동광학검사) 로그. 설비별 검사결과(OK/NG/PASS/FAIL), 바코드(SERIAL_NO) 기록.
related_tables: [IP_PRODUCT_RUN_CARD, IP_PRODUCT_LINE]
---

## 주요 컬럼
| 컬럼 | 타입 | 설명 |
|---|---|---|
| LOG_ID | NUMBER | 자동 채번 PK |
| EQUIPMENT_ID | VARCHAR2(50) | 설비 ID |
| LOG_TIMESTAMP | TIMESTAMP(6) | 로그 타임스탬프 |
| INSPECTOR | VARCHAR2(500) | data.INSPECTOR |
| MODEL | VARCHAR2(500) | data.MODEL |
| LOT_ID | VARCHAR2(100) | data.LOT_ID |
| SERIAL_NO | VARCHAR2(500) | data.SERIAL_NO |
| RESULT | VARCHAR2(500) | data.RESULT: FAIL=FAIL, N=NG, NG=NG, OK=OK, PASS=PASS, Y=OK |
| START_DATE | VARCHAR2(100) | data.START_DATE |
| END_DATE | VARCHAR2(100) | data.END_DATE |
| OPERATOR | VARCHAR2(500) | data.OPERATOR |
| LANE | VARCHAR2(500) | data.LANE |
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

