---
name: IP_PRODUCT_MODEL_MASTER
site: default
description: PB SQL 사용 기준 추정 테이블 | PB화면: w_com_document_master, w_pln_product_model_master, w_des_mfs_bom_master, w_des_apply_item_master, w_pln_product_model_st_master | DW: d_com_document_lst, d_com_model_master_4_batender_popup, d_pln_product_model_master_4_interlock_mst, d_pln_product_model_master_4_label_lst, d_pln_product_model_master_4_mfs_bom_lst
related_tables: []
---

## 주요 컬럼
| 컬럼 | 타입 | 설명 |
|---|---|---|
| MODEL_NAME | VARCHAR2(50) | 모델명 |
| MODEL_SPEC | VARCHAR2(100) | 모델규격 |
| MODEL_TYPE | VARCHAR2(10) | 모델타입: *=*, F=제품, W=반제품 |
| PART_NO | VARCHAR2(40) | Part NO |
| VERSION | NUMBER | 버젼 |
| SITE_CODE | VARCHAR2(10) | 싸이트코드: EB4N=솔루엠, MX02=솔루엠 SOMOS |
| COMPANY_NO | NUMBER | 회사번호: 0=솔루엠 |
| COMPANY_CODE | VARCHAR2(10) | 회사코드: *=*, EB4N=EB4N, PCSZ=PCSZ |
| CARRIER_SIZE | NUMBER | 연배열수: 1=1, 12=12, 2=2, 4=4, 5=5, 6=6, 8=8 |
| PCB_TOTAL_QTY | NUMBER | PCB 총수량 |
| CUSTOMER_CODE | VARCHAR2(20) | 고객코드 |
| CUSTOMER_NAME | VARCHAR2(100) | 회사명 |
| MARKING_CONDITION | VARCHAR2(10) | 대표바코드출력: N=N, Y=Y |
| MARKING_YN | VARCHAR2(1) | 마킹유무: N=N, Y=Y |
| MODEL_DIVISION | VARCHAR2(1) | 모델형식: B=BOT, F=FG, M=MI, P=PHENTOM, S=PBA, T=TOP |
| BARCODE_TYPE | VARCHAR2(10) | 바코드타입: 1=Code 11, 102=HIBC Data Matrix, 104=HIBC QR Code, 106=HIBC PDF417, 108=HIBC MicroPDF417, 112=HIBC Aztec Code, 128=Aztec Runes, 129=Code 32, 13=EAN, 130=Composite Symbol with EAN linear component, 131=Composite Symbol with GS1-128 linear component, 132=Composite Symbol with GS1 DataBar-14 linear component, 133=Composite Symbol with GS1 DataBar Limited component, 134=Composite Symbol with GS1 DataBar Extended component, 135=Composite Symbol with UPC A linear component, ... 외 67개 |
| PACKING_PCS_QTY | NUMBER | 패킹단위수량 ( 제품 Box 수량 ) |
| PACKING_TRAY_BOX_QTY | NUMBER | 박스당트레이수량 ( SMD Magazine QTY ) |
| ARRAY_TYPE | VARCHAR2(10) | 에레이타입: A=단일품, B=조합품 |
| DATESET | DATE | 시작일자 |
| DATEEND | DATE | 종료일자 |
| CONFIRM_DATE | DATE | 승인일자 |
| SERIAL_NO_LENGTH | NUMBER | 시리얼번호길이 |
| PACKING_BOX_MAX_PSC_QTY | NUMBER | 패킹박스최대량 |
| PACKING_BOX_MIN_PSC_QTY | NUMBER | 패킹박스최소량 |
| ORGANIZATION_ID | NUMBER | 조직ID |
| ENTER_BY | VARCHAR2(20) | 등록자 |
| ENTER_DATE | DATE | 등록일자 |
| LAST_MODIFY_BY | VARCHAR2(20) | 최종수정자 |
| LAST_MODIFY_DATE | DATE | 최종수정일자 |
| SPI_CHECK_YN | VARCHAR2(1) | Spi Check Yn |
| MARKING_CHECK_YN | VARCHAR2(1) | 마킹검사여부 |
| AOI_CHECK_YN | VARCHAR2(1) | Aoi 검사여부 |
| REFLOW_CHECK_YN | VARCHAR2(1) | 리플로우체크여부 |
| FUNCTION_CHECK_YN | VARCHAR2(1) | ODC체크여부 |
| ICT_CHECK_YN | VARCHAR2(1) | 성능검사 |
| POWER_CHECK_YN | VARCHAR2(1) | 전원체크여부 |
| CARRIER_BARCODE_YN | VARCHAR2(1) | 캐리어바코드유무 |
| SORDER_CREAM_CHECK_YN | VARCHAR2(1) | 솔더크림체크 |
| NG_PROCESS | VARCHAR2(1) | Ng Process |
| SERIAL_ARRAY_LENGTH | NUMBER | 시리얼에레이길이 |
| CARRIER_BARCODE_POSITION | VARCHAR2(10) | 캐리어바코드위치 |
| REVISION | VARCHAR2(30) | 리비젼 |
| ITEM_CODE | VARCHAR2(20) | 품목코드 |
| MAGAZINE_PRINT_X | NUMBER |  |
| MAGAZINE_PRINT_Y | NUMBER |  |
| MAGAZINE_NO_LENGTH | NUMBER | 매거진번호자리수 |
| USE_CALENDAR | VARCHAR2(1) | 월력사용 |
| CUSTOMER_MODEL_NAME | VARCHAR2(100) | 고객모델 |
| EC_NO | VARCHAR2(30) | 시방번호 |
| MODEL_SUFFIX | VARCHAR2(50) | 모델서픽스 |
| SW_VERSION | VARCHAR2(100) | Sw버젼 |
| HW_VERSION | VARCHAR2(100) | Hw 버젼 |
| SW_FILENAME | VARCHAR2(200) | Sw Filename |
| PID_PRINT_X | NUMBER |  |
| PID_PRINT_Y | NUMBER |  |
| TOP_ITEM_CODE | VARCHAR2(30) | TOP 품목코드 |
| BOTTOM_ITEM_CODE | VARCHAR2(30) | BOTTOM 품목코드 |
| INSERT_ITEM_CODE | VARCHAR2(30) | Insert Item Code |
| PCB_ITEM_CODE | VARCHAR2(30) | PCB 품목코드 |
| SOLDER_TYPE | VARCHAR2(1) | 솔더타입: F=무연, P=유연 |
| SOLDER_ITEM_CODE | VARCHAR2(30) | 솔더품목코드 |
| INSPECT_CHANNEL1 | VARCHAR2(4) |  |
| INSPECT_CHANNEL2 | VARCHAR2(1) |  |
| INSPECT_CHANNEL3 | VARCHAR2(1) |  |
| LOWER_CONTROL_VALUE | NUMBER |  |
| UNDERFILL_ITEM_CODE | VARCHAR2(30) | 언더필품목코드 |
| SMT_MODEL_NAME | VARCHAR2(50) | SMT 모델명 |
| MASTER_MODEL_NAME | VARCHAR2(50) | 대표모델명 |
| MASTER_SAMPLE_PID1 | VARCHAR2(30) | 마스터샘플 PID1 |
| MASTER_SAMPLE_PID2 | VARCHAR2(30) | 마스터샘플 PID2 |
| MASTER_SAMPLE_PID3 | VARCHAR2(30) | 마스터샘플 PID3 |
| SERIAL_NO_POSITION | NUMBER |  |
| MAGAZINE_SIZE | NUMBER | 매거진싸이즈 |
| PCB_COATING_TYPE | VARCHAR2(10) | PCB 도금타입: GOLD=GOLD, HASL=HASL, OSP=OSP, TIN=TIN |
| MODEL_DESC | VARCHAR2(200) | 모델상세설명 |
| PRODUCT_CLASS | VARCHAR2(20) | 제픔유형: *=*, ME1A=ME1A, MV1A=MV1A, MX5A=MX5A, NE1A=NE1A |
| COUNTRY_CODE | VARCHAR2(20) |  |
| MARKING_TYPE1 | VARCHAR2(20) |  |
| MAKRING_START1 | NUMBER |  |
| MARKING_LENGTH1 | NUMBER |  |
| MARKING_TYPE2 | VARCHAR2(20) |  |
| MAKRING_START2 | NUMBER |  |
| MARKING_LENGTH2 | NUMBER |  |
| MARKING_TYPE3 | VARCHAR2(20) |  |
| MAKRING_START3 | NUMBER |  |
| MARKING_LENGTH3 | NUMBER |  |
| MARKING_TYPE4 | VARCHAR2(20) |  |
| MAKRING_START4 | NUMBER |  |
| MARKING_LENGTH4 | NUMBER |  |
| MARKING_TYPE5 | VARCHAR2(20) |  |
| MAKRING_START5 | NUMBER |  |
| MARKING_LENGTH5 | NUMBER |  |
| SMPS_ITEM_CODE | VARCHAR2(30) |  |
| PBA_SW_VERSION_MAIN | VARCHAR2(20) | PBA SW Version Main |
| PBA_SW_VERSION_SUB_OTP | VARCHAR2(20) | PBA SW Version Sub OTP |
| PBA_SW_VERSION_SUB_MICOM | VARCHAR2(20) | PBA SW Version Sub Micom |
| PBA_CAN_ON_OFF | VARCHAR2(20) | PBA CAN ON / OFF |
| PID_CREATION_TYPE | VARCHAR2(30) | PID 생성 방법: KTC01=KTC SMD CORE TYPE1, KTC02=KTC SMD MAIN, KTC03=KTC SMD PJT TYPE1, SOLUM01=SOLUM TYPE1 |
| CUSTOMER_MODEL_CLASS | VARCHAR2(20) | KTC Projector Model Class (PID 생성) |
| PROD_LBL_PART_NAME | VARCHAR2(50) | Product Label Part name |
| PROD_LBL_CERTIFICATION_MARKS | VARCHAR2(50) | Product Label Certification Regulation marks |
| FWDN_CRC_VALUE | VARCHAR2(50) | FWDN CRC value |
| FWDN_FILE_LOCATION | VARCHAR2(100) | FWDN File location |
| MODEL_CODE | VARCHAR2(20) | Model Code |
| FACTORY_CODE | VARCHAR2(20) | Factory  Code: H=Automotive |

## 자주 쓰는 JOIN


## 예제 쿼리

