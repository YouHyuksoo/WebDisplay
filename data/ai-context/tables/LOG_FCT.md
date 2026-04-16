---
name: LOG_FCT
site: default
description: LOG_FCT 테이블 (DB에서 자동 추출)
related_tables: []
---

## 주요 컬럼
| 컬럼 | 타입 | 설명 |
|---|---|---|
| LOG_ID | NUMBER NOT NULL |  (PK) |
| EQUIPMENT_ID | VARCHAR2(50) NOT NULL |  |
| LOG_TIMESTAMP | TIMESTAMP(6) |  |
| BARCODE | VARCHAR2(500) |  |
| DEVICE | VARCHAR2(500) |  |
| RESULT | VARCHAR2(500) | RESULT: FAIL=FAIL, N=NG, NG=NG, OK=OK, PASS=PASS, Y=OK |
| MODEL | VARCHAR2(500) |  |
| LOG_DATE | VARCHAR2(100) |  |
| LOG_TIME | VARCHAR2(100) |  |
| LOG_TYPE | VARCHAR2(500) |  |
| VOLT_INPUT_V | VARCHAR2(500) |  |
| VOLT_VALUE_V | VARCHAR2(500) |  |
| CURR_RESULT | VARCHAR2(50) |  |
| CURR_MIN_MA | VARCHAR2(500) |  |
| CURR_MAX_MA | VARCHAR2(500) |  |
| CURR_VALUE_MA | VARCHAR2(500) |  |
| LED_RESULT | VARCHAR2(50) |  |
| LED_NAME | VARCHAR2(500) |  |
| SCORE_MIN | VARCHAR2(500) |  |
| SCORE_MAX | VARCHAR2(500) |  |
| SCORE_VALUE | VARCHAR2(500) |  |
| SCORE_RESULT | VARCHAR2(50) |  |
| HUE_MIN | VARCHAR2(500) |  |
| HUE_MAX | VARCHAR2(500) |  |
| HUE_VALUE | VARCHAR2(500) |  |
| HUE_RESULT | VARCHAR2(50) |  |
| SAT_MIN | VARCHAR2(500) |  |
| SAT_MAX | VARCHAR2(500) |  |
| SAT_VALUE | VARCHAR2(500) |  |
| SAT_RESULT | VARCHAR2(50) |  |
| LUM_MIN | VARCHAR2(500) |  |
| LUM_MAX | VARCHAR2(500) |  |
| LUM_VALUE | VARCHAR2(500) |  |
| LUM_RESULT | VARCHAR2(50) |  |
| CREATED_AT | TIMESTAMP(6) |  |
| IS_LAST | VARCHAR2(1) |  |
| LINE_CODE | VARCHAR2(50) |  |
| FILE_NAME | VARCHAR2(500) |  |
| ACTUAL_DATE | DATE |  |
| SHIFT_CODE | VARCHAR2(2) |  |
| ZONE_CODE | VARCHAR2(2) |  |

## 자주 쓰는 JOIN
(필요 시 수기로 추가)

## 예제 쿼리
(필요 시 수기로 추가)

<!-- 이 파일은 generate-table-doc-from-db.mjs로 자동 생성됨. DB 실제 컬럼 기반 -->
<!-- 마지막 추출: 2026-04-16T19:20:25.965Z -->
