---
name: LOG_COATING1
site: default
description: LOG_COATING1 테이블 (DB에서 자동 추출)
related_tables: []
---

## 주요 컬럼
| 컬럼 | 타입 | 설명 |
|---|---|---|
| LOG_ID | NUMBER NOT NULL | 자동 채번 PK (PK) |
| EQUIPMENT_ID | VARCHAR2(50) NOT NULL | 설비 ID |
| LOG_TIMESTAMP | TIMESTAMP(6) | 로그 타임스탬프 |
| DATE_TIME | VARCHAR2(100) | data.DATE_TIME |
| BARCODE | VARCHAR2(500) | data.BARCODE |
| FLOW_METER_G | VARCHAR2(500) | data.FLOW_METER_G |
| FLOW_MIN_G | VARCHAR2(500) | data.FLOW_MIN_G |
| FLOW_MAX_G | VARCHAR2(500) | data.FLOW_MAX_G |
| RESULT | VARCHAR2(500) | data.RESULT: FAIL=FAIL, N=NG, NG=NG, OK=OK, PASS=PASS, Y=OK |
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
<!-- 마지막 추출: 2026-04-16T19:20:25.761Z -->
