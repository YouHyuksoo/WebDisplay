---
name: IP_PRODUCT_ROUTING_MODEL
site: default
description: IP_PRODUCT_ROUTING_MODEL 테이블
related_tables: []
---

## 주요 컬럼
| 컬럼 | 타입 | 설명 |
|---|---|---|
| MODEL_NAME | VARCHAR2(50) | 모델 |
| WORKSTAGE_CODE | VARCHAR2(10) | 공정명 |
| ORGANIZATION_ID | NUMBER | 조직ID |
| DATESET | DATE | 시작일자 |
| DATEEND | DATE | 종료일자 |
| PRE_WORKSTAGE_CODE | VARCHAR2(10) | 상위작업장코드 |
| WORKSTAGE_SORT_ORDER | NUMBER | 정렬순서 |
| ENTER_BY | VARCHAR2(20) | 등록자 |
| ENTER_DATE | DATE | 등록일자 |
| LAST_MODIFY_BY | VARCHAR2(20) | 최종수정자 |
| LAST_MODIFY_DATE | DATE | 최종수정일자 |
| TRANS_WORKSTAGE_CODE | VARCHAR2(20) | 인수인계공정코드 |
| TRANSFER_TYPE | VARCHAR2(1) | 이동 유형: C=공정연결, L=최종인계, M=재고이동, S=재료배재, T=인수인계 |
| IO_TYPE | VARCHAR2(1) | 투입/완성 유형 |
| ATTR_OPTION1 | VARCHAR2(100) | 옵션1 |
| ATTR_OPTION2 | VARCHAR2(100) | 옵션2 |
| ATTR_OPTION3 | VARCHAR2(100) | 옵션3 |
| USE_YN | VARCHAR2(1) | 사용여부 Y/N: N=미사용, Y=사용 |
| LINE_CODE | VARCHAR2(10) | 라인코드 |

## 자주 쓰는 JOIN


## 예제 쿼리

