---
name: IM_ITEM_BAKING_MASTER
site: default
description: PB SQL 사용 기준 추정 테이블 | PB화면: w_mat_baking_dehumi_scan_query, w_mat_baking_scan_query, w_mat_baking_dehumi_scan_master, w_mat_baking_scan_master, w_mat_dehumi_scan_query | DW: d_mat_material_baking_dehumi_query_lst, d_mat_material_baking_dehumi_scan_lst, d_mat_material_baking_scan_lst, d_mat_material_dehumi_query_lst
related_tables: []
---

## 주요 컬럼
| 컬럼 | 타입 | 설명 |
|---|---|---|
| CHAMBER_CODE | VARCHAR2(10) | 챔버코드 |
| INPUT_SCAN_DATE | DATE | 투입스캔일자 |
| OUTPUT_SCAN_DATE | DATE | 출고스캔일자 |
| SCAN_BY | VARCHAR2(20) | 스캔자 |
| ITEM_CODE | VARCHAR2(20) | 품목코드 |
| ITEM_BARCODE | VARCHAR2(100) | 품목바코드 |
| LOT_NO | VARCHAR2(30) | 제조번호 |
| LOT_QTY | NUMBER | 롯트수량 |
| ORGANIZATION_ID | NUMBER | 조직ID |
| ENTER_DATE | DATE | 등록일자 |
| ENTER_BY | VARCHAR2(20) | 등록자 |
| LAST_MODIFY_DATE | DATE | 최종수정일자 |
| LAST_MODIFY_BY | VARCHAR2(20) | 최종수정자 |
| CHAMBER_TYPE | VARCHAR2(30) |  |
| CHAMBER_LOCATION | VARCHAR2(30) |  |

## 자주 쓰는 JOIN


## 예제 쿼리

