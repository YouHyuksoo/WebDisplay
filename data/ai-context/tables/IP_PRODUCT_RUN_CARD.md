---
name: IP_PRODUCT_RUN_CARD
site: default
description: RUN(로트) 카드. RUN_NO별 모델명/품목/라인/수량 등 로트 단위 생산 정보.
related_tables: [IP_PRODUCT_2D_BARCODE, IP_PRODUCT_MODEL_MASTER, IP_PRODUCT_LINE]
---

## 주요 컬럼
| 컬럼 | 타입 | 설명 |
|---|---|---|
| RUN_NO | VARCHAR2(30) | 런번호 |
| RUN_DATE | DATE | 롯트 계획일자 |
| LOT_NO | VARCHAR2(30) | 제조번호 |
| ITEM_CODE | VARCHAR2(20) | 품목코드 |
| MODEL_NAME | VARCHAR2(50) | 모델명 |
| LINE_CODE | VARCHAR2(10) | 라인코드 |
| MARKING_NO | VARCHAR2(30) | 마킹번호 |
| LOT_SIZE | NUMBER | 롯트수량 |
| PCB_SUPPLIER_CODE | VARCHAR2(30) | PCB 공급상 |
| CHARGER | VARCHAR2(30) | 담당자 |
| ORGANIZATION_ID | NUMBER | 조직ID |
| ENTER_DATE | DATE | 등록일자 |
| ENTER_BY | VARCHAR2(20) | 등록자 |
| LAST_MODIFY_DATE | DATE | 최종수정일자 |
| LAST_MODIFY_BY | VARCHAR2(20) | 최종수정자 |
| RUN_STATUS | VARCHAR2(1) | 롯트상태: 1=대기, 10=출하, 2=준비완료, 3=키팅스캔, 4=SMT투입, 5=AOI, 5.1=PBA FT, 5.2=TVSET, 6=QC, 7=포장, 8=OBA, 9=입고 |
| CARRIER_SIZE | NUMBER | 연배열수: 1=1, 12=12, 2=2, 4=4, 5=5, 6=6, 8=8 |
| KITTING_DATE | DATE | 키팅일자 |
| PRODUCT_RUN_TYPE | VARCHAR2(1) | 제조유형: B=반품, D=개발, G=골드샘플, J=JTR, P=양산, S=샘플, T=실험, V=실버샘플 |
| METALMASK_CODE | VARCHAR2(20) | 메탈마스크코드 |
| ARRAY_TYPE | VARCHAR2(20) | 에레이타입: A=단일품, B=조합품 |
| LOT_TRUNC_QTY | NUMBER | 롯트절삭수량 |
| ACTIVE_YN | VARCHAR2(1) | 활성유무: N=대기, P=선행, Y=활성 |
| REPAIR_WORKSTAGE_CODE | VARCHAR2(30) | 검출공정코드 |
| COMMENTS | VARCHAR2(2000) | 설명 |
| RUN_TYPE_CODE | VARCHAR2(10) | 런타입 |
| PARENT_ITEM_CODE | VARCHAR2(30) | 모품목코드 |
| PCB_ITEM | VARCHAR2(10) | Top/Bottom: B=Bottom, S=PBA, T=Top |
| MASTER_MODEL_NAME | VARCHAR2(50) | 대표모델명 |
| MFS_GROUP_NO | VARCHAR2(20) | 제조그룹번호 |
| SHIFT_CODE | VARCHAR2(20) | 교대조: A=1교대, B=2교대, C=3교대 |
| REVISION | VARCHAR2(30) | 리비젼 SoluM ( OTP Version ) |
| MODEL_CLASS | VARCHAR2(20) | 모델클래스: D=DA, H=HYBRID, IFPD=IFPD, O=OEM, P=PRAME, PJT=PJT |
| QC_COMMENTS | VARCHAR2(100) | 품질의견 |
| CONNECTOR_ITEM_CODE | VARCHAR2(30) | 컨넥터품목코드 |
| MRM_NO | VARCHAR2(50) |  |
| B_RANK_NO | VARCHAR2(50) |  |
| A_RANK_NO | VARCHAR2(50) |  |
| GROUP_ID_REPLACE | VARCHAR2(50) |  |
| GROUP_ID | VARCHAR2(50) | 그룹번호 |
| PACKING_LOT_NO | VARCHAR2(50) |  |
| PCB_SUM_QTY | NUMBER |  |
| PCB_WEEK | VARCHAR2(20) | PCB주차 |
| SUB_OTP | VARCHAR2(50) | OTP 버젼 |
| PBA_SW_VERSION_MAIN | VARCHAR2(20) | PBA SW Version Main |
| PBA_SW_VERSION_SUB_OTP | VARCHAR2(20) | PBA SW Version Sub OTP |
| PBA_SW_VERSION_SUB_MICOM | VARCHAR2(20) | PBA SW Version Sub MICOM |
| PBA_CAN_ON_OFF | VARCHAR2(20) | PBA CAN ON / OFF |
| LABEL_ADD_QTY | NUMBER | 라벨 출력시 추가수량 |
| WORK_GROUP | VARCHAR2(50) | SMD 상 그룹생산을 위한 GROUP 정보 |

## 자주 쓰는 JOIN


## 예제 쿼리

