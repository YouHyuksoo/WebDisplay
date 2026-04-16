---
name: IM_ITEM_ISSUE
site: default
description: Item Issue Master | PB화면: w_mat_bad_issue_master, w_mat_other_issue_barcode_master, w_pln_product_pda_scan_query, w_mat_request_issue_master, w_mat_mass_issue_return_confirm_master | DW: d_mat_bad_issue_lst, d_mat_internal_arrival_lst, d_mat_internal_issue_cancel_lst, d_mat_issue_4_barcode_compare_lst, d_mat_issue_4_barcode_compare_view
related_tables: []
---

## 주요 컬럼
| 컬럼 | 타입 | 설명 |
|---|---|---|
| ISSUE_DATE | DATE | 출고일자 |
| ISSUE_SEQUENCE | NUMBER | 출고항번 |
| ORGANIZATION_ID | NUMBER | 조직ID |
| MFS | VARCHAR2(30) | 제조번호 |
| ITEM_CODE | VARCHAR2(20) | 품목코드 |
| LOCATION_CODE | VARCHAR2(20) | 로케이션(위치): M01=양품, M02=불량품, M03=폐기품, M04=리볼대기, M05=벌크, M06=리볼양품, M07=홀딩, M99=기타 |
| ITEM_TYPE | VARCHAR2(10) | 폼목유형: M=무상, S=유상, T=자작, Y=유상 |
| LINE_CODE | VARCHAR2(10) | 라인코드 |
| WORKSTAGE_CODE | VARCHAR2(10) | 공정명 |
| ISSUE_DEFICIT | VARCHAR2(1) | 출고구분: 3=3출고, 4=4출고반품 |
| ISSUE_QTY | NUMBER | 출고수량 |
| ISSUE_STATUS | VARCHAR2(1) | 출고상태: C=취소, N=정상 |
| ISSUE_AMT | NUMBER | 출고금액 |
| ISSUE_ACCOUNT | VARCHAR2(10) | 출고계정: M001=양산, M002=양산불량, M003=무상, M004=유상, M005=내부거래, M006=설계시작, M007=분실, M008=검사폐기, M009=재고조정, M010=위탁수리, M011=공정재작업, M012=서비스, M013=LOSS, M014=스크렙, M015=피드백재작업, ... 외 2개 |
| LINE_TYPE | VARCHAR2(10) | 구입유형: A=외부부품, D=도입(면세), F=무상구매, G=국내구매, L=도입로칼, M=무상사급, N=내부거래, O=OEM, P=도입(과세), T=자작, Y=유상사급 |
| COMMENTS | VARCHAR2(2000) | 설명 |
| ISSUE_PRICE | NUMBER | 출고단가 |
| VIRTUAL_RECEIPT_YN | VARCHAR2(1) | 가입고YN: N=정상, Y=가입고 |
| ISSUE_TYPE | VARCHAR2(1) | 출고유형: A=자동, D=폐기판정, E=기타, I=재고조정, N=NORMAL, Q=품질검사, R=요청, T=공정 |
| SUPPLIER_CODE | VARCHAR2(20) | 공급상/제작처 |
| WORK_ORDER_NO | VARCHAR2(20) | 작업지시번호 |
| ENTER_DATE | DATE | 등록일자 |
| ENTER_BY | VARCHAR2(20) | 등록자 |
| LAST_MODIFY_DATE | DATE | 최종수정일자 |
| LAST_MODIFY_BY | VARCHAR2(20) | 최종수정자 |
| MACHINE_CODE | VARCHAR2(30) | 설비코드 |
| INVOICE_NO | VARCHAR2(50) | 전표번호 |
| MADE_BY | VARCHAR2(20) | 작업자 |
| PARENT_ITEM_CODE | VARCHAR2(20) | 모품목코드 |
| MATERIAL_MFS | VARCHAR2(30) | 자재제조번호 |
| INTERFACE_YN | VARCHAR2(1) | 인터페이스YN: N=아니오, Y=예 |
| INTERFACE_DATE | DATE | 인터페이스일자 |
| SALE_PRICE | NUMBER | 판매단가 |
| SALE_AMT | NUMBER | 판매금액 |
| SALE_CURRENCY | VARCHAR2(3) | 판매통화: CNY=인민페, USD=달러, WON=원 |
| ARRIVAL_DATE | DATE | 도착일자 |
| ARRIVAL_SEQ_NO | NUMBER | 도착항번 |
| DEST_ORGANIZATION_ID | NUMBER | 대상조직 |
| INSPECT_NO | VARCHAR2(30) | 검사번호 |
| RETURN_REQUEST_DATE | DATE |  |
| RETURN_REQUEST_SEQUENCE | NUMBER |  |
| CLOSE_YN | VARCHAR2(1) | 닫임YN |
| CLOSE_DATE | DATE | 마감일자 |
| DEMAND_QTY | NUMBER | 수요량 |
| ISSUE_BASE | VARCHAR2(20) |  |
| BARCODE | VARCHAR2(200) | 바코드 |
| LOT_DIVIDE_SEQUENCE | NUMBER | 롯트분할항번 |
| ORIGIN_MFS | VARCHAR2(200) | 제조번호(원) |
| FEEDER_LOCATION_CODE | VARCHAR2(10) |  |
| ISSUE_DIVISION | VARCHAR2(1) | 출고구분: P=계획 |
| FEEDING_GROUP_NO | VARCHAR2(10) | Feeding Group No |
| FEEDER_SHAFT | VARCHAR2(2000) | 축 |
| MODEL_NAME | VARCHAR2(50) | 모델명 |
| PCB_ITEM | VARCHAR2(10) | Top/Bottom: B=Bottom, S=PBA, T=Top |
| HW_REVISION | VARCHAR2(20) | Hw 리비젼 |
| RECEIPT_DATE | DATE | 입고일자 |
| INVENTORY_TYPE | VARCHAR2(20) | 재고유형: P=양산, S=샘플 |
| MSL_PASSED_TIME | NUMBER | 누적사용시간 |
| RUN_NO | VARCHAR2(30) |  |

## 자주 쓰는 JOIN


## 예제 쿼리

