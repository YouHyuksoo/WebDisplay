---
name: LOG_ERROR
site: default
description: DB 삽입 실패 시 에러 정보 및 원본 데이터 보관
related_tables: []
---

## 주요 컬럼
| 컬럼 | 타입 | 설명 |
|---|---|---|
| ERROR_ID | NUMBER |  |
| SOURCE_TABLE | VARCHAR2(100) |  |
| EQUIPMENT_ID | VARCHAR2(50) |  |
| ERROR_MESSAGE | VARCHAR2(4000) |  |
| RAW_DATA | CLOB |  |
| CREATED_AT | TIMESTAMP(6) |  |
| STAGE | VARCHAR2(50) |  |
| LINE_CODE | VARCHAR2(50) |  |
| FILE_NAME | VARCHAR2(500) |  |
| ACTUAL_DATE | DATE |  |
| SHIFT_CODE | VARCHAR2(2) |  |
| ZONE_CODE | VARCHAR2(2) |  |

## 자주 쓰는 JOIN


## 예제 쿼리

