---
name: IP_PRODUCT_PACK_SERIAL
site: default
description: PB SQL 사용 기준 추정 테이블 | PB화면: w_pln_product_packing_dupulicate_check_master, w_prd_product_packing_history | DW: d_pln_product_pack_dupulicate_hst, d_pln_product_pack_dupulicate_lst, d_prd_cell_biz_pack_serial_hisory
related_tables: []
---

## 주요 컬럼
| 컬럼 | 타입 | 설명 |
|---|---|---|
| BARCODE | VARCHAR2(100) | 바코드 |
| PACK_BARCODE | VARCHAR2(100) | 포장바코드 |
| WORKSTAGE_CODE | VARCHAR2(10) | 공정명 |
| LINE_CODE | VARCHAR2(10) | 라인코드 |
| RUN_NO | VARCHAR2(30) | 런번호 |
| ATTR1 | VARCHAR2(50) | 속성1 Model |
| ATTR2 | VARCHAR2(50) | 속성2 |
| ATTR3 | VARCHAR2(50) | 속성3 |
| ATTR4 | VARCHAR2(50) | 속성4 |
| ATTR5 | VARCHAR2(50) | 속성5 |
| ATTR6 | VARCHAR2(5) | 속성6 |
| ATTR7 | VARCHAR2(50) | 속성7 |
| ATTR8 | VARCHAR2(50) | 속성8 |
| ATTR9 | VARCHAR2(50) | Attr9 |
| ATTR10 | VARCHAR2(50) | Attr10 |
| ATTR11 | VARCHAR2(50) | Attr11 |
| ATTR12 | VARCHAR2(50) | 인터페이스를 위한 집계용 FLAG |
| FINAL_INSPECT_DATE | DATE | 최종검사일자 |
| FINAL_INSPECT_FLAG | VARCHAR2(2) | 검사구분 |
| SCAN_DATE | DATE | 스캔일자 |
| ORGANIZATION_ID | NUMBER | 조직ID |
| ENTER_DATE | DATE | 등록일자 |
| ENTER_BY | VARCHAR2(20) | 등록자 |
| LAST_MODIFY_DATE | DATE | 최종수정일자 |
| LAST_MODIFY_BY | VARCHAR2(20) | 최종수정자 |
| BARCODE_QTY | NUMBER | 바코드수량 |
| MASTER_BARCODE | VARCHAR2(100) |  |
| CRIPTO_CODE | VARCHAR2(40) |  |
| ACTUAL_DATE | DATE | 실적일자 |
| SHIFT_CODE | VARCHAR2(2) | 교대조: A=1교대, B=2교대, C=3교대 |
| ZONE_CODE | VARCHAR2(2) | 시간 ZOne COde |

## 자주 쓰는 JOIN


## 예제 쿼리

