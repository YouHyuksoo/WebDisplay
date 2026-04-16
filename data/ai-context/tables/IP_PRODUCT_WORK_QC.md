---
name: IP_PRODUCT_WORK_QC
site: default
description: 품질검사(QC) 결과. 불량유형/수리결과/폐기/반품 등 공정 품질 이벤트 기록.
related_tables: [IP_PRODUCT_RUN_CARD, IP_PRODUCT_LINE]
---

## 주요 컬럼
| 컬럼 | 타입 | 설명 |
|---|---|---|
| SERIAL_NO | VARCHAR2(50) | PID번호 |
| ITEM_CODE | VARCHAR2(20) | 품목코드 |
| QC_DATE | DATE | 검사일자 |
| QC_SEQUENCE | NUMBER | 항번 |
| QC_RESULT | VARCHAR2(1) | 진가성: N=진성불량, O=가성불량, W=대기 |
| SHIFT_CODE | VARCHAR2(1) | 교대조: A=1교대, B=2교대, C=3교대 |
| DEFECT_QTY | NUMBER | 불량점수 |
| RECEIPT_DEFICIT | VARCHAR2(1) | 입출구분: 1=입고, 2=반품 |
| REPAIR_RESULT_CODE | VARCHAR2(10) | 수리결과: G=수리완료, N=불합격 |
| LINE_CODE | VARCHAR2(10) | 라인코드: 01=A라인, 02=B라인, 03=C라인, 04=D라인, 05=E라인, 06=F라인, 07=G라인, 08=H라인, 09=I라인, 10=J라인, 11=K라인, 12=L라인, 13=M라인, 14=N라인, 15=O라인 |
| WORKSTAGE_CODE | VARCHAR2(10) | 공정명 |
| MACHINE_CODE | VARCHAR2(20) | 설비코드 |
| BAD_REASON_CODE | VARCHAR2(10) | 불량원인: A=외관불량, B=기능불량, C=규격불량, D=기타 |
| BAD_QTY | NUMBER | 불량수량 |
| CHARGER | VARCHAR2(20) | 담당자 |
| REPAIR_BY | VARCHAR2(20) | 수리자 |
| REPAIR_DATE | DATE | 수리일자 |
| QC_INSPECT_HANDLING | VARCHAR2(20) | 후처리: B=WIP불량, D=폐기, S=보관, U=재사용, W=대기 |
| COMMENTS | VARCHAR2(1000) | 설명 |
| ORGANIZATION_ID | NUMBER | 조직ID |
| ENTER_DATE | DATE | 등록일자 |
| ENTER_BY | VARCHAR2(20) | 등록자 |
| LAST_MODIFY_DATE | DATE | 최종수정일자 |
| LAST_MODIFY_BY | VARCHAR2(20) | 최종수정자 |
| MODEL_NAME | VARCHAR2(50) | 모델명 |
| LOCATION_CODE | VARCHAR2(100) | 로케이션: M01=양품, M02=불량품, M03=폐기품, M04=리볼대기, M05=벌크, M06=리볼양품, M07=홀딩, M99=기타 |
| COMPLAINT_NO | VARCHAR2(30) | 컴플레인번호 |
| MODEL_SUFFIX | VARCHAR2(50) | 모델서픽스 |
| REPAIR_WORKSTAGE_CODE | VARCHAR2(10) | 검출공정코드 |
| REPAIR_LINE_CODE | VARCHAR2(10) | 검출라인코드 |
| REPAIR_SUPPLIER_CODE | VARCHAR2(20) |  |
| REPAIR_DIVISION | VARCHAR2(1) | REPAIR_DIVISION: P=PBA, R=RTV, S=SMD |
| BAD_POSITION | VARCHAR2(30) |  |
| CARRIER_BARCODE | VARCHAR2(30) | 캐리어바코드 |
| RUN_DATE | DATE | 롯트 계획일자 |
| RUN_NO | VARCHAR2(20) | 런번호 |
| ARRAY_YN | VARCHAR2(1) | 대표여부 |
| NEW_RUN_NO | VARCHAR2(20) | 신규롯트번호 |
| BAD_CAUSE_BY | VARCHAR2(1) | 불량사유처: A=PBA불량, B=SMD불량, C=OTP, D=SMD/PBA, E=RAW MATERIAL, F=프로그램, G=엔지니어, H=STENCIL ROOM, I=출하, J=생산, K=AOI, L=기술, M=품질, N=원자재불량, O=판정중, P=수리실, R=솔맥스, S=사맥스 |
| LCR_MEASURE | VARCHAR2(50) |  |
| PBA_BARCODE | VARCHAR2(100) | PBA바코드 |
| BAD_PHENOMENON | VARCHAR2(50) | 불량현상: ATV, AUDIO LOOPBACK, BAD ASSEMBLY, BLE CHECK, Cam, CH Setting, COMP/AV LOOPBACK, COSMETICO, DRM, DTV, EEPROM, ETC, FACTORY, HDMI CRC, HDMI SST, KEY INSPECTION, LAN, MODEL OPTION, NDF, PMIC CHECK, RF INSPECTION, SOUND, USB, VIDEO, VISUAL, WIFI 등: ATV=ATV, AUDIO LOOPBACK=AUDIO LOOPBACK, AX POWER ON=AX POWER ON, BAD ASSEMBLY=BAD ASSEMBLY, BLE CHECK=BLE CHECK, CH Setting=CH Setting, COMP/AV LOOPBACK=COMP/AV LOOPBACK, COSMETICO=COSMETICO, Cam=Cam, DRM=DRM, DTV=DTV, EEPROM=EEPROM, ETC=ETC, FACTORY=FACTORY, Frequency left=Frequency left, ... 외 31개 |
| PARENT_ITEM_CODE | VARCHAR2(50) | 모품목코드 |
| ACTUAL_DATE | DATE | 생산실적일자 |
| LOG_ID | NUMBER |  |
| FILE_NAME | VARCHAR2(500) |  |

## 자주 쓰는 JOIN


## 예제 쿼리

