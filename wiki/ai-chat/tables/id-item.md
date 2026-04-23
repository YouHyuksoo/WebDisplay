---
object: ID_ITEM
kind: table
category: 
pk: [ITEM_CODE, ORGANIZATION_ID]
enabled: false
tags: []
updated: 2026-04-19
---

## 개요
Item Master | PB화면: w_com_interlock_inspect_condition_master, w_customer_complaints_master, w_des_item_master, w_smt_bom_create_master, w_smt_bom_replace_master | DW: d_com_interlock_inspect_condition_lst, d_customer_complaints_lst, d_customer_complaints_mst, d_des_bom_drawing_4_item_master_tree, d_des_bom_list_nup

## 용도
(사람 작성 — 이 테이블이 어떤 비즈니스 상황에 쓰이는지)

## 컬럼
| 컬럼 | 타입 | NULL | 설명 |
|---|---|---|---|
| ITEM_CODE | VARCHAR2(20) | N | 품목코드 |
| ORGANIZATION_ID | NUMBER | N | 조직ID |
| ITEM_SPEC | VARCHAR2(300) | N | 규격 |
| ITEM_UOM | VARCHAR2(3) | N | 단위: EA=EA, G=G, KG=KG, KP=KP, PC=PC, SET=SET |
| ITEM_CLASS | VARCHAR2(40) | N | 품목클래스: *=*, ASSY=ASSY, CAPACITOR=CAPACITOR, CONNECTOR=CONNECTOR, DIODE=DIODE, EPOXY=EPOXY, IC=IC, LED=LED, MEMORY=MEMORY, MICRO SWITCH=MICRO SWITCH, OF=최종제품, OTP=OTP, OTP-R=OTP-R, PCB=PCB, RANKLED=RANKLED, ... 외 7개 |
| ITEM_TYPE | VARCHAR2(10) | N | 폼목유형: M=무상, S=유상, T=자작, Y=유상 |
| VIRTUAL_RECEIPT_YN | VARCHAR2(1) | Y | 가입고YN: N=정상, Y=가입고 |
| ITEM_NAME | VARCHAR2(300) | N | 품명 |
| LINE_TYPE | VARCHAR2(10) | N | 구입유형: A=외부부품, D=도입(면세), F=무상구매, G=국내구매, L=도입로칼, M=무상사급, N=내부거래, O=OEM, P=도입(과세), T=자작, Y=유상사급 |
| ROUTE_NO | VARCHAR2(20) | Y | 라우팅번호 |
| BARCODE | VARCHAR2(100) | Y | 바코드 |
| ABC_GRADE | VARCHAR2(1) | N | 등급 |
| ENTER_DATE | DATE | Y | 등록일자 |
| RAW_MATERIAL | VARCHAR2(20) | Y | 재료: GOLD=GOLD, HASL=HASL, OSP=OSP, TIN=TIN |
| SAFETY_INVENTORY | NUMBER | Y | 안전재고 |
| WORK_BAD_RATE | NUMBER(3,1) | Y | 작업불량율 |
| TRANSFER_UOM | VARCHAR2(20) | Y | 인수인계단위: EA=EA, G=G, KEA=KEA, KG=KG |
| MANUFACTURE_LEADTIME | NUMBER | Y | 제조리드타임 |
| ORDER_CYCLE | VARCHAR2(10) | Y | 발주주기: D=매일, M=매월, S=안전재고, X=수시 |
| ORDER_RULE | VARCHAR2(10) | Y | 발주조건: A=자동, E=PO제외, M=수동, O=직주문 |
| HS_CODE | VARCHAR2(20) | Y | 세관 HS 코드 |
| ENTER_BY | VARCHAR2(20) | Y | 등록자 |
| SVC_CODE | VARCHAR2(10) | Y | 서비스코드: N=아니오, Y=예 |
| CAPACITY | NUMBER | Y | 용량 |
| LAST_MODIFY_DATE | DATE | Y | 최종수정일자 |
| LENGTH | NUMBER | Y | 길이 |
| LAST_MODIFY_BY | VARCHAR2(20) | Y | 최종수정자 |
| DATESET | DATE | Y | 시작일자 |
| DATEEND | DATE | Y | 종료일자 |
| SET_ITEM_YN | VARCHAR2(1) | N | 세트품목유무: M=MATERIAL, N=부품, Y=세트 |
| SPECIAL_PROPERTY | VARCHAR2(30) | Y | 특성 |
| LAYER | NUMBER | Y | 겹치기 |
| PART_NO | VARCHAR2(40) | Y | Part NO |
| HEIGHT | NUMBER | Y | 높이 |
| WEIGHT | NUMBER | Y | 중량 |
| DRAWING_NO | VARCHAR2(30) | Y | 도면번호 |
| GRADIENT | NUMBER | Y | 경사도 |
| DENSITY | NUMBER | Y | 밀도 |
| ITEM_DIVISION | VARCHAR2(1) | N | 품목구분: F=제품, R=원자재, W=반제품 |
| ISSUE_PACKING_QTY | NUMBER | Y | 포장수량 |
| INNER_DIAMETER | NUMBER | Y | 내경 |
| OUTER_DIAMETER | NUMBER | Y | 외경 |
| WIDTH | NUMBER | Y | 폭 |
| HS_NAME | VARCHAR2(100) | Y | 세관품목코드 |
| HS_SPEC | VARCHAR2(100) | Y | 세관규격 |
| HS_CODE_SCRAP | VARCHAR2(20) | Y | 세관스크렙품목코드 |
| HS_NAME_SCRAP | VARCHAR2(100) | Y | 세관스크렙명 |
| HS_SPEC_SCRAP | VARCHAR2(100) | Y | 세관스크렙규격 |
| TRANSFER_YN | VARCHAR2(1) | Y | 이동유무: N=아니오, Y=예 |
| LINE_CODE | VARCHAR2(10) | Y | 라인코드 |
| TARIFF_RATE | NUMBER | Y | 세율 |
| SUPPLIER_CODE | VARCHAR2(20) | Y | 공급상/제작처 |
| CUSTOMER_CODE | VARCHAR2(20) | Y | 고객코드 |
| MODEL_NAME | VARCHAR2(50) | Y | 모델명 |
| MODEL_SUFFIX | VARCHAR2(50) | Y | 모델서픽스 |
| AUTO_ISSUE_YN | VARCHAR2(1) | Y | 자동출고유무: N=수동출고, Y=자동출고 |
| AUTO_RECEIPT_YN | VARCHAR2(1) | Y | 자동입고유무: N=아니오, Y=예 |
| AUTO_ISSUE_PLAN_YN | VARCHAR2(1) | Y | 자동출고계획유무: N=아니오, Y=예 |
| BUY_PRICE | NUMBER | Y | 구매단가 |
| SALE_PRICE | NUMBER | Y | 판매단가 |
| SALE_PRICE_APPLY_TYPE | VARCHAR2(1) | Y | 판가단가적용유형 |
| GROSS_WEIGHT | NUMBER | Y | 총량 |
| CBM | NUMBER | Y | CBM |
| BARCODE2 | VARCHAR2(100) | Y | 바코드2 |
| EHMS_YN | VARCHAR2(1) | Y | Ehms Yn |
| EHMS_STATUS | VARCHAR2(1) | Y | Ehms Status |
| MATERIAL_TYPE | VARCHAR2(10) | Y | 자재유형 |
| PURCHASE_GROUP | VARCHAR2(10) | Y | Purchase Group |
| PHANTOM_CODE | VARCHAR2(1) | Y | Phantom Code |
| SUPPLY_TYPE | VARCHAR2(1) | Y | Supply Type |
| MES_DISPLAY_YN | VARCHAR2(1) | Y | MES 표시유무 |
| LOCATION_ADDRESS | VARCHAR2(20) | Y | 자재위치 |
| MATERIAL_QTY | NUMBER | Y | 자재수량 |
| HS_NAME_SALE | VARCHAR2(100) | Y | 세관판매모델명 |
| VENDOR_CODE | VARCHAR2(20) | Y | 밴더코드 |
| MATERIAL_QTY2 | NUMBER | Y | 자재수량2 |
| MSL_LEVEL | VARCHAR2(10) | Y | MSL 레벨: 1=1, 2=2, 2A=2A, 3=3, 4=4, 5=5, 5A=5A, 6=6 |
| CHECK_SUPPLIER_BARCODE | VARCHAR2(1) | Y | 거래처바코드체크 |
| MSL_MAX_TIME | NUMBER | Y | 관리기준시간 |
| IS_NEW_YN | VARCHAR2(1) | Y | 신규품목구분 |
| FEEDER_LAYOUT_COMMENTS | VARCHAR2(20) | Y | Feeder Layout Comments |
| SOLDER_TYPE | VARCHAR2(1) | Y | 솔더타입: F=무연, P=유연 |
| SOLDER_OPEN_LIMIT_TIME | NUMBER | Y | Solder Open Limit Time |
| SOLDER_AGITATION_TIME | NUMBER | Y | Solder Agitation Time |
| LIFE_CYCLE | NUMBER | Y | 유효수명기준 |
| ECO_CHECK_YN | VARCHAR2(1) | Y | 시방체크여부 |
| ECO_CHECK_COMMENTS | VARCHAR2(1000) | Y | 시방체크설명 |
| CUSTOMER_MODEL_NAME | VARCHAR2(100) | Y | 고객모델 |
| CARRIER_SIZE | NUMBER | Y | 연배열수: 1=1, 12=12, 2=2, 4=4, 5=5, 6=6, 8=8 |
| FEEDER_SIZE | VARCHAR2(50) | Y | Feeder Size |
| RECEIPT_LOT_CHECK_YN | VARCHAR2(1) | Y | 입고롯트체크여부: N=NO, Y=YES |
| COMMENTS | VARCHAR2(1000) | Y | 설명 |
| MATERIAL_QTY3 | NUMBER | Y | 자재수량3 |
| KEYITEM_YN | VARCHAR2(1) | Y | 주요자재여부 |
| VENDOR_CODE1 | VARCHAR2(15) | Y | 밴더코드1 |
| VENDOR_CODE2 | VARCHAR2(15) | Y | 밴더코드2 |
| VENDOR_CODE3 | VARCHAR2(15) | Y | 밴더코드3 |
| NO_CHECK_ORIGIN_SUPPLIER | VARCHAR2(1) | Y | 원공급상체크안함 |
| REEL_CHANGE_BLOCKED | VARCHAR2(1) | Y |  |
| MODEL_COLOR | VARCHAR2(20) | Y |  |
| PCB_COATING_TYPE | VARCHAR2(20) | Y | PCB 도금타입: GOLD=GOLD, HASL=HASL, OSP=OSP, TIN=TIN |
| PCB_COATING_MAX_DAY | NUMBER | Y | PCB 도금 유효일자 |
| CUSTOMER_PART_NO | VARCHAR2(50) | Y | 고객품목코드 |
| PCB_WORKING_MAX_DAY | NUMBER | Y |  |
| BAKING_TIME | NUMBER | Y | 베이킹기준시간 |
| PARTNO_DIVIDE_MARKER | VARCHAR2(20) | Y |  |
| PARTNO_MARKER_START | NUMBER | Y |  |
| PARTNO_MARKER_END | NUMBER | Y |  |
| PCB_ITEM | VARCHAR2(20) | Y | Top/Bottom: B=Bottom, S=PBA, T=Top |
| WIP_SUPPLY_TYPE | VARCHAR2(10) | Y | T : Tray, R:Reel, E:Etc: *=N/A, P=PCB, R=Reel, S=SOLDER, T=Tray |
| REEL_FORMAT | VARCHAR2(30) | Y |  |
| ORIGIN | VARCHAR2(50) | Y | 원산지 |
| WORKSTAGE_CODE | VARCHAR2(50) | Y | MFS 자재투입 지정 |
| ACCESSORY_FP_YN | VARCHAR2(1) | Y | MFS 자재투입 지정 |
| INPUT_FP_YN | VARCHAR2(1) | Y | MFS 자재투입 지정 |
| PACKING_FP_YN | VARCHAR2(1) | Y | MFS 자재투입 지정 |
| EPOXY_TYPE | VARCHAR2(1) | Y | 에폭시타입 |

## 자주 쓰는 JOIN
(사람 작성)

## 주의
(사람 작성)
