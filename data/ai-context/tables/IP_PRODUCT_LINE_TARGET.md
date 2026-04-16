---
name: IP_PRODUCT_LINE_TARGET
site: default
description: 라인별 시프트별 생산 목표(계획 수량). PLAN_DATE+LINE_CODE+SHIFT_CODE로 목표 조회.
related_tables: [IP_PRODUCT_LINE, IP_PRODUCT_WORKSTAGE_IO]
---

## 주요 컬럼
| 컬럼 | 타입 | 설명 |
|---|---|---|
| PLAN_DATE | DATE | 계획일자 |
| LINE_CODE | VARCHAR2(10) | 라인코드 |
| SHIFT_CODE | VARCHAR2(10) | 교대조: A=1교대, B=2교대, C=3교대 |
| WORKING_START_DATE | DATE |  |
| WORKING_END_DATE | DATE |  |
| WORKING_HOUR | NUMBER |  |
| WORKER_QTY | NUMBER | 인원수 |
| PLAN_QTY | NUMBER | 계획수량 |
| STD_ST | NUMBER |  |
| STD_TT | NUMBER |  |
| COMMENTS | VARCHAR2(2000) | 설명 |
| ORGANIZATION_ID | NUMBER | 조직ID |
| ENTER_DATE | DATE | 등록일자 |
| ENTER_BY | VARCHAR2(20) | 등록자 |
| LAST_MODIFY_DATE | DATE | 최종수정일자 |
| LAST_MODIFY_BY | VARCHAR2(20) | 최종수정자 |

## 자주 쓰는 JOIN


## 예제 쿼리

