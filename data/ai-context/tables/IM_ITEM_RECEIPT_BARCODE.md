---
name: IM_ITEM_RECEIPT_BARCODE
site: default
description: PB SQL 사용 기준 추정 테이블 | PB화면: w_mat_mass_issue_cancel_master, w_qc_iqc_master, w_mat_other_issue_barcode_master, w_mat_other_issue_barcode_return_master, w_mat_other_mass_issue_barcode_return_master | DW: d_mat_issue_cancel_lst, d_mat_rceipt_barcode_4_iqc_cancel_lst, d_mat_rceipt_barcode_4_issue_return_lst, d_mat_rceipt_barcode_4_receipt_returnt_lst, d_mat_rceipt_barcode_4_receipt_wait_lst
related_tables: []
---

## 주요 컬럼
| 컬럼 | 타입 | 설명 |
|---|---|---|
| ITEM_BARCODE | VARCHAR2(50) | 품목바코드 |
| SUPPLIER_CODE | VARCHAR2(20) | 공급상/제작처 |
| ITEM_CODE | VARCHAR2(20) | 품목코드 |
| SCAN_DATE | DATE | 스캔일자 |
| LOT_NO | VARCHAR2(50) | 제조번호 |
| SCAN_QTY | NUMBER | 수량 |
| SUPPLIER_BARCODE | VARCHAR2(200) | 거래처바코드 |
| SUPPLIER_ITEM_CODE | VARCHAR2(20) | 공급상품목코드 |
| RECEIPT_COMPARE_YN | VARCHAR2(1) | 입고구분: N=입고대기, Y=입고완료 |
| RECEIPT_COMPARE_DATE | DATE | 입고비교일자 |
| RECEIPT_COMPARE_BY | VARCHAR2(20) | 입고비교자 |
| RECEIPT_SLIP_NO | VARCHAR2(20) | 입고전표 |
| ENTER_DATE | DATE | 등록일자 |
| ENTER_BY | VARCHAR2(20) | 등록자 |
| LAST_MODIFY_DATE | DATE | 최종수정일자 |
| LAST_MODIFY_BY | VARCHAR2(20) | 최종수정자 |
| ORGANIZATION_ID | NUMBER | 조직ID |
| ISSUE_COMPARE_YN | VARCHAR2(1) | 출고구분: N=출고대기, Y=출고완료 |
| ISSUE_COMPARE_DATE | DATE | 출고비교일자 |
| ISSUE_COMPARE_BY | VARCHAR2(20) | 출고비교자 |
| BARCODE_STATUS | VARCHAR2(1) | 바코드상태: H=홀딩, N=정상 |
| RECEIPT_TYPE | VARCHAR2(1) | 입고유형: B=B차용, E=E기타, I=I재고조정, N=N정상, R=R재사용, T=T자작 |
| ISSUE_TYPE | VARCHAR2(1) | 출고유형: A=자동, D=폐기판정, E=기타, I=재고조정, N=NORMAL, Q=품질검사, R=요청, T=공정 |
| FROM_SUPPLIER_CODE | VARCHAR2(20) | 발송거래처 |
| LOT_DIVIDE_YN | VARCHAR2(1) | 롯트분할유무 |
| ORIGIN_ITEM_BARCODE | VARCHAR2(100) | (원)바코드 |
| LABEL_TYPE | VARCHAR2(1) | 라벨타입: B=벌크, N=정상, R=리볼 |
| SUPPLIER_LOT_NO | VARCHAR2(100) | 공급상롯트 |
| ORIGIN_SUPPLIER_CODE | VARCHAR2(20) | (원)공급상코드 |
| RETURN_YN | VARCHAR2(1) | 반품유무: N=정상, Y=반납 |
| RETURN_DATE | DATE | 반품일자 |
| FEEDING_YN | VARCHAR2(1) | 장착유무 |
| FEEDING_DATE | DATE | 장착일자 |
| FEEDING_MODEL | VARCHAR2(1000) | 장착모델 |
| HOLDING_YN | VARCHAR2(1) | 홀딩 Yn |
| ISSUE_RETURN_YN | VARCHAR2(1) | 출고반품유무 |
| ISSUE_RETURN_DATE | DATE | 출고반품일자 |
| BAKING_START_DATE | DATE | 배이킹시작시간 |
| BAKING_END_DATE | DATE | 배이킹종료시간 |
| LINE_CODE | VARCHAR2(10) | 라인코드 |
| WORKSTAGE_CODE | VARCHAR2(10) | 공정명 |
| LOT_DIVIDE_DATE | DATE | 릴분할시간 |
| ORIGIN_LOT_NO | VARCHAR2(30) | (원)롯트번호 |
| TO_SUPPLIER_CODE | VARCHAR2(30) | 대상거래처코드 |
| COMMENTS | VARCHAR2(300) | 설명 |
| CHECK_STATUS | VARCHAR2(1) | 검사상태: C=처리중, E=오류, P=합격, R=대체, W=대기 |
| MANUFACTURE_DATE | DATE | 제조일자 |
| MSL_REMAIN_TIME | NUMBER | 잔여시간 |
| MSL_PASSED_TIME | NUMBER | 누적사용시간 |
| LOT_DIVIDE_SEQUENCE | NUMBER | 롯트분할항번 |
| INSPECT_DATE | DATE | 검사일자 |
| VALID_DATE | DATE | 유효기간 |
| LAST_ISSUE_COMPARE_BY | VARCHAR2(30) |  |
| LAST_ISSUE_COMPARE_DATE | DATE |  |
| LAST_SCAN_QTY | NUMBER |  |
| NEW_SCAN_QTY | NUMBER | 최종수량 |
| VENDOR_LOTNO | VARCHAR2(100) | Vendor Lotno |
| VENDOR_CODE | VARCHAR2(30) | 밴더코드 |
| LOCATION_CODE | VARCHAR2(10) | 로케이션(위치): M01=양품, M02=불량품, M03=폐기품, M04=리볼대기, M05=벌크, M06=리볼양품, M07=홀딩, M99=기타 |
| REAL_DIVIDE_REASON | VARCHAR2(1000) |  |
| FEEDING_GROUP_NO | VARCHAR2(10) | Feeding Group No |
| FEEDER_SHAFT | VARCHAR2(10) | 축 |
| ISSUE_DIVISION | VARCHAR2(1) | 출고구분: P=계획 |
| REEL_DIVIDE_COMPARE_YN | VARCHAR2(1) |  |
| REEL_DIVIDE_COMPARE_DATE | DATE |  |
| MANUFACTURE_WEEK | VARCHAR2(4) | 제조주차 |
| REEL_DESTROY_YN | VARCHAR2(1) | 공릴폐기여부 |
| REEL_DESTROY_DATE | DATE |  |
| LED_RANK_INFO | VARCHAR2(30) |  |
| PCB_ITEM | VARCHAR2(10) | Top/Bottom: B=Bottom, S=PBA, T=Top |
| INVENTORY_TYPE | VARCHAR2(20) | 재고유형: P=양산, S=샘플 |
| INSPECT_RESULT | VARCHAR2(1) | 검사결과: P=합격, R=불합격, U=재사용, W=대기 |
| PCB_COATING_DATE | DATE | PCB 코팅일자 |
| VACUUM_START_DATE | DATE |  |
| VACUUM_END_DATE | DATE |  |
| DEHUMIDIFY_START_DATE | DATE |  |
| DEHUMIDIFY_END_DATE | DATE |  |
| MSL_OPEN_DATE | DATE | MSL 시작일자 |
| LOCATION_ADDRESS_RACK | VARCHAR2(20) | 자재위치 |
| VER | VARCHAR2(20) |  |
| RUN_NO | VARCHAR2(30) |  |
| ORIGIN | VARCHAR2(50) | 원산지 |
| WH_CODE | VARCHAR2(20) | 창고코드 |
| REPACK_YN | VARCHAR2(1) | 재포장여부 |
| REEL_MERGE_YN | VARCHAR2(20) | 릴병합여부 |
| REEL_MERGE_DATE | DATE | 릴병합일자 |

## 자주 쓰는 JOIN


## 예제 쿼리

