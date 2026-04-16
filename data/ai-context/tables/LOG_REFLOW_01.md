---
name: LOG_REFLOW_01
site: default
description: LOG_REFLOW_01 테이블 (DB에서 자동 추출)
related_tables: []
---

## 주요 컬럼
| 컬럼 | 타입 | 설명 |
|---|---|---|
| LOG_ID | NUMBER NOT NULL | 자동 채번 PK (PK) |
| EQUIPMENT_ID | VARCHAR2(50) NOT NULL | 설비 ID |
| LOG_TIMESTAMP | TIMESTAMP(6) | 로그 타임스탬프 |
| JOB_NAME | VARCHAR2(500) | data.JOB_NAME |
| DATA_ID | VARCHAR2(100) | data.DATA_ID |
| DATE_TIME | VARCHAR2(100) | data.DATE_TIME |
| SP0 | VARCHAR2(500) | data.SP0 |
| PV0 | VARCHAR2(500) | data.PV0 |
| OP0 | VARCHAR2(500) | data.OP0 |
| SP1 | VARCHAR2(500) | data.SP1 |
| PV1 | VARCHAR2(500) | data.PV1 |
| OP1 | VARCHAR2(500) | data.OP1 |
| SP2 | VARCHAR2(500) | data.SP2 |
| PV2 | VARCHAR2(500) | data.PV2 |
| OP2 | VARCHAR2(500) | data.OP2 |
| SP3 | VARCHAR2(500) | data.SP3 |
| PV3 | VARCHAR2(500) | data.PV3 |
| OP3 | VARCHAR2(500) | data.OP3 |
| SP4 | VARCHAR2(500) | data.SP4 |
| PV4 | VARCHAR2(500) | data.PV4 |
| OP4 | VARCHAR2(500) | data.OP4 |
| SP5 | VARCHAR2(500) | data.SP5 |
| PV5 | VARCHAR2(500) | data.PV5 |
| OP5 | VARCHAR2(500) | data.OP5 |
| SP6 | VARCHAR2(500) | data.SP6 |
| PV6 | VARCHAR2(500) | data.PV6 |
| OP6 | VARCHAR2(500) | data.OP6 |
| SP7 | VARCHAR2(500) | data.SP7 |
| PV7 | VARCHAR2(500) | data.PV7 |
| OP7 | VARCHAR2(500) | data.OP7 |
| SP8 | VARCHAR2(500) | data.SP8 |
| PV8 | VARCHAR2(500) | data.PV8 |
| OP8 | VARCHAR2(500) | data.OP8 |
| SP9 | VARCHAR2(500) | data.SP9 |
| PV9 | VARCHAR2(500) | data.PV9 |
| OP9 | VARCHAR2(500) | data.OP9 |
| SP10 | VARCHAR2(500) | data.SP10 |
| PV10 | VARCHAR2(500) | data.PV10 |
| OP10 | VARCHAR2(500) | data.OP10 |
| SP11 | VARCHAR2(500) | data.SP11 |
| PV11 | VARCHAR2(500) | data.PV11 |
| OP11 | VARCHAR2(500) | data.OP11 |
| SP12 | VARCHAR2(500) | data.SP12 |
| PV12 | VARCHAR2(500) | data.PV12 |
| OP12 | VARCHAR2(500) | data.OP12 |
| SP13 | VARCHAR2(500) | data.SP13 |
| PV13 | VARCHAR2(500) | data.PV13 |
| OP13 | VARCHAR2(500) | data.OP13 |
| SP14 | VARCHAR2(500) | data.SP14 |
| PV14 | VARCHAR2(500) | data.PV14 |
| OP14 | VARCHAR2(500) | data.OP14 |
| SP15 | VARCHAR2(500) | data.SP15 |
| PV15 | VARCHAR2(500) | data.PV15 |
| OP15 | VARCHAR2(500) | data.OP15 |
| SP16 | VARCHAR2(500) | data.SP16 |
| PV16 | VARCHAR2(500) | data.PV16 |
| OP16 | VARCHAR2(500) | data.OP16 |
| SP17 | VARCHAR2(500) | data.SP17 |
| PV17 | VARCHAR2(500) | data.PV17 |
| OP17 | VARCHAR2(500) | data.OP17 |
| SP18 | VARCHAR2(500) | data.SP18 |
| PV18 | VARCHAR2(500) | data.PV18 |
| OP18 | VARCHAR2(500) | data.OP18 |
| SP19 | VARCHAR2(500) | data.SP19 |
| PV19 | VARCHAR2(500) | data.PV19 |
| OP19 | VARCHAR2(500) | data.OP19 |
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
<!-- 마지막 추출: 2026-04-16T19:20:26.225Z -->
