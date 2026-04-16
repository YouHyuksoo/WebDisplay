---
name: LOG_PROCESS
site: default
description: 공정 단계 로그 (CSV 형식)
related_tables: []
---

## 주요 컬럼
| 컬럼 | 타입 | 설명 |
|---|---|---|
| LOG_ID | NUMBER |  |
| EQUIPMENT_ID | VARCHAR2(50) |  |
| LOG_TIMESTAMP | TIMESTAMP(6) |  |
| PROCESS_STEP | VARCHAR2(200) |  |
| STEP_STATUS | VARCHAR2(50) |  |
| START_TIME | VARCHAR2(100) |  |
| END_TIME | VARCHAR2(100) |  |
| DURATION_MS | VARCHAR2(50) |  |
| CREATED_AT | TIMESTAMP(6) |  |
| LINE_CODE | VARCHAR2(50) |  |
| FILE_NAME | VARCHAR2(500) |  |
| ACTUAL_DATE | DATE |  |
| SHIFT_CODE | VARCHAR2(2) |  |
| ZONE_CODE | VARCHAR2(2) |  |

## 자주 쓰는 JOIN


## 예제 쿼리

