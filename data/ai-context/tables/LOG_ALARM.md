---
name: LOG_ALARM
site: default
description: 설비 알람 로그 (JSON 형식)
related_tables: []
---

## 주요 컬럼
| 컬럼 | 타입 | 설명 |
|---|---|---|
| LOG_ID | NUMBER |  |
| EQUIPMENT_ID | VARCHAR2(50) |  |
| LOG_TIMESTAMP | TIMESTAMP(6) |  |
| ALARM_CODE | VARCHAR2(50) |  |
| ALARM_LEVEL | VARCHAR2(20) |  |
| ALARM_MESSAGE | VARCHAR2(4000) |  |
| OCCURRED_AT | VARCHAR2(100) |  |
| CREATED_AT | TIMESTAMP(6) |  |
| LINE_CODE | VARCHAR2(50) |  |
| FILE_NAME | VARCHAR2(500) |  |
| ACTUAL_DATE | DATE |  |
| SHIFT_CODE | VARCHAR2(2) |  |
| ZONE_CODE | VARCHAR2(2) |  |

## 자주 쓰는 JOIN


## 예제 쿼리

