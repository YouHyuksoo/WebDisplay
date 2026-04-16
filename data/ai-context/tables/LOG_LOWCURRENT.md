---
name: LOG_LOWCURRENT
site: default
description: LOG_LOWCURRENT 테이블 (DB에서 자동 추출)
related_tables: []
---

## 주요 컬럼
| 컬럼 | 타입 | 설명 |
|---|---|---|
| LOG_ID | NUMBER NOT NULL |  (PK) |
| EQUIPMENT_ID | VARCHAR2(50) NOT NULL |  |
| LOG_TIMESTAMP | TIMESTAMP(6) |  |
| BARCODE | VARCHAR2(500) |  |
| MODEL_NAME | VARCHAR2(500) |  |
| LOG_DATE | VARCHAR2(100) |  |
| START_TIME | VARCHAR2(100) |  |
| END_TIME | VARCHAR2(100) |  |
| CHANNEL | VARCHAR2(500) |  |
| LOG_MODE | VARCHAR2(500) |  |
| SET_CURRENT_UA | VARCHAR2(500) |  |
| SET_VOLTAGE_V | VARCHAR2(500) |  |
| MIN_RANGE | VARCHAR2(500) |  |
| MAX_RANGE | VARCHAR2(500) |  |
| MEASURED_VALUE | VARCHAR2(500) |  |
| MEASURE_RESULT | VARCHAR2(50) |  |
| DASH | VARCHAR2(500) |  |
| OVERALL_RESULT | VARCHAR2(50) |  |
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
<!-- 마지막 추출: 2026-04-16T19:20:26.034Z -->
