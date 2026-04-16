---
name: LOG_MARKING
site: default
description: LOG_MARKING 테이블 (DB에서 자동 추출)
related_tables: []
---

## 주요 컬럼
| 컬럼 | 타입 | 설명 |
|---|---|---|
| LOG_ID | NUMBER NOT NULL | 자동 채번 PK (PK) |
| EQUIPMENT_ID | VARCHAR2(50) NOT NULL | 설비 ID |
| LOG_TIMESTAMP | TIMESTAMP(6) | 로그 타임스탬프 |
| WORK_ORDER_NO | VARCHAR2(500) | data.WORK_ORDER_NO |
| MAIN_BARCODE | VARCHAR2(500) | data.MAIN_BARCODE |
| MARKED_BARCODE | VARCHAR2(500) | data.MARKED_BARCODE |
| MARKING_DT | VARCHAR2(500) | data.MARKING_DT |
| EQUIPMENT_CD | VARCHAR2(500) | data.EQUIPMENT_CD |
| ARRAY_NO | VARCHAR2(500) | data.ARRAY_NO |
| IS_LAST | VARCHAR2(1) | 최종 데이터 여부 (Y/N) |
| IS_SAMPLE | VARCHAR2(1) | 샘플 데이터 여부 (Y/N) |
| CREATED_AT | TIMESTAMP(6) | 레코드 생성 시각 |
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
<!-- 마지막 추출: 2026-04-16T19:20:26.167Z -->
