---
name: IMCN_MACHINE
site: default
description: PB SQL 사용 기준 추정 테이블 | PB화면: w_mat_baking_dehumi_scan_query, w_mat_baking_scan_query, w_mat_dehumi_scan_query, w_mat_vacuum_scan_query, w_mcn_machine_pm_master | DW: d_mat_material_baking_dehumi_query_lst, d_mat_material_dehumi_query_lst, d_mcn_inspect_machine_control_lst, d_mcn_machine_4_pm_lst, d_mcn_machine_4_repair_request_lst
related_tables: []
---

## 주요 컬럼
| 컬럼 | 타입 | 설명 |
|---|---|---|
| MACHINE_CODE | VARCHAR2(30) | 설비코드 |
| ORGANIZATION_ID | NUMBER | 조직ID |
| MACHINE_NAME | VARCHAR2(100) | 설비명 |
| MACHINE_TYPE | VARCHAR2(30) | 설비유형 |
| CAPACITY | NUMBER | 용량 |
| RESERVED_CAPACITY | NUMBER | 공수예약 |
| ACQUISITION_DATE | DATE | 취득일자 |
| ACQUISITION_TYPE | VARCHAR2(10) | 취득유형 |
| MACHINE_MODEL_NAME | VARCHAR2(86) | 설비모델명 |
| LINE_CODE | VARCHAR2(10) | 라인코드 |
| CUSTOMER_CODE | VARCHAR2(10) | 고객코드 |
| USE_STATUS | VARCHAR2(1) | 사용상태 |
| MANUAL_LOCATION_COMMENT | VARCHAR2(500) | 메뉴얼위치 |
| NATION_CODE | VARCHAR2(3) | 국가코드 |
| WORKSTAGE_CODE | VARCHAR2(30) | 공정명 |
| ENTER_BY | VARCHAR2(20) | 등록자 |
| ENTER_DATE | DATE | 등록일자 |
| LAST_MODIFY_BY | VARCHAR2(20) | 최종수정자 |
| LAST_MODIFY_DATE | DATE | 최종수정일자 |
| USE_RATE | NUMBER | 사용율 |
| UPH_VALUE | NUMBER | 시간당생산량 |
| CAPACITY_UOM | VARCHAR2(3) | 용량단위 |
| SUPPLIER_CODE | VARCHAR2(20) | 공급상/제작처 |
| MACHINE_STATUS | VARCHAR2(1) | 설비상태 |
| MOLD_CODE | VARCHAR2(20) | S-PARTS코드 |
| MOLD_VERSION | NUMBER | S-PARTS버젼 |
| MOLD_SET_SERIAL | NUMBER | S-PARTS시리얼 |
| MACHINE_IMAGE | BLOB |  |
| MACHINE_IMAGE_FILE_NAME | VARCHAR2(200) | 설비이미지파일명 |
| MES_DISPLAY_YN | VARCHAR2(1) | MES 표시유무 |
| MES_DISPLAY_SEQUENCE | NUMBER | 디스플레이순번 |
| MOLD_EXISTS_YN | VARCHAR2(1) | 지그존재유무 |
| MACHINE_STATUS_CODE | VARCHAR2(10) | 설비상태코드 |
| CALLING_PLC_ADDRESS | VARCHAR2(10) |  |
| ACTION_DATE | DATE | 발생일자 |
| ACTUAL_PLC_ADDRESS | VARCHAR2(10) | PLC 주소 |
| USE_TPM_YN | VARCHAR2(1) | 자주보전사용유무 |
| MACHINE_SPEC | VARCHAR2(1000) | 설비규격 |
| MODEL_NAME | VARCHAR2(50) | 모델명 |
| DEPARTMENT_CODE | VARCHAR2(20) | 부서코드 |
| IP_ADDRESS | VARCHAR2(30) | IP 주소 |
| PORT_NO | NUMBER | Port No |
| DIO_PORT | VARCHAR2(30) | Dio Port |
| SCANNER_PORT | VARCHAR2(30) | 스캐너통신포트 |
| EQUIPMENT_PORT | VARCHAR2(30) | 설비통신포트 |
| DIO_ADDRESS | VARCHAR2(30) | DIO 주소 |
| BCR_CODE | VARCHAR2(30) |  |
| BUFFER_TYPE | VARCHAR2(30) | 버퍼타입 |
| PROCESS_WAIT_TIME | VARCHAR2(30) | ICT신호대기시간 |
| JIG_TYPE | VARCHAR2(30) | 지그타입 |
| BREAK_VALUE | NUMBER | 한계수명 |
| HIT_VALUE | NUMBER | 사용횟수 |
| MAIN_POWER | VARCHAR2(20) | 메인파워 |
| MACHINE_LENGTH | VARCHAR2(20) | 설비전체길이 |
| POWER_CONSUMPTION | VARCHAR2(20) | 소모전력 |
| SCANNER_ADDRESS | VARCHAR2(10) | 스캐너주소 |
| MIN_TEMP_VALUE | NUMBER | 온도하한 |
| MAX_TEMP_VALUE | NUMBER | 온도상한 |
| STD_TEMP_VALUE | NUMBER | 표준온도 |
| MIN_HUMIDITY_VALUE | NUMBER | 습도하한 |
| MAX_HUMIDITY_VALUE | NUMBER | 습도상한 |
| STD_HUMIDITY_VALUE | NUMBER | Std Humidity Value |
| NSNP_MINUS_CHECK_YN | VARCHAR2(1) | NSNP 음수체크여부 |
| MACHINE_STATUS_DESCRIPTION | VARCHAR2(300) | 설비상태상세 |
| HUMIDITY_YN | VARCHAR2(1) | 습도관리여부 |
| PAYMENT_OCUMENT | VARCHAR2(20) |  |
| TEMP_OFFSET | NUMBER |  |
| HUMIDITY_OFFSET | NUMBER |  |
| TEMP_WARNING_OFFSET | NUMBER |  |
| HUMIDITY_WARNING_OFFSET | NUMBER |  |

## 자주 쓰는 JOIN


## 예제 쿼리

