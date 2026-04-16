---
name: IB_SMT_CHECKHIST
site: default
description: IB_SMT_CHECKHIST 테이블
related_tables: []
---

## 주요 컬럼
| 컬럼 | 타입 | 설명 |
|---|---|---|
| CHECK_DATE | DATE | 검사일자 |
| CHECK_SEQUENCE | NUMBER | 검사항번 |
| PLAN_DATE | VARCHAR2(30) | 계획일자 |
| LOT_NAME | VARCHAR2(50) | 제품명 |
| PARTNAME | VARCHAR2(50) | 자재코드 |
| CHIPNAME | VARCHAR2(50) | 자재코드(스캔) |
| CHECK_STATUS | VARCHAR2(1) | 검사상태: C=처리중, E=오류, P=합격, R=대체, W=대기 |
| CHECK_MSG | VARCHAR2(200) | 검사메시지 |
| CHECK_BY | VARCHAR2(30) | 검사자 |
| LINE_CODE | VARCHAR2(10) | 라인코드 |
| MACHINE | VARCHAR2(30) | 설비 |
| PLAN_DATE_SEQUENCE | NUMBER | 항번 |
| SCAN_PARTNAME | VARCHAR2(100) | 자사바코드(스캔) |
| LOCATION_CODE | VARCHAR2(30) | 로케이션(위치): M01=양품, M02=불량품, M03=폐기품, M04=리볼대기, M05=벌크, M06=리볼양품, M07=홀딩, M99=기타 |
| TABLE_ID | VARCHAR2(10) | 테이블ID |
| CHECK_TYPE | VARCHAR2(10) | 검사유형: 1=CCS, 2=릴교환, 2M=릴교환(M), 3=풀체크, 4=릴체크 |
| NG_REASON | VARCHAR2(150) | 오류원인 |
| SCAN_SUPPLIER_PARTNAME | VARCHAR2(100) | 거래처바코드 |
| UNLOCK_BY | VARCHAR2(50) | 잠금해제자 |
| UNLOCK_DATE | DATE | 잠금해제일자 |
| FULL_CHECK_SEQUENCE | NUMBER | 풀체크항번 |
| PCB_ITEM | VARCHAR2(10) | Top/Bottom: B=Bottom, S=PBA, T=Top |
| OLD_BARCODE | VARCHAR2(50) | 자사바코드(구) |
| ITEM_CODE | VARCHAR2(20) | 품목코드 |
| CCS_END_DATE | DATE | Ccs종료일자 |
| LOT_NO | VARCHAR2(100) | 제조번호 |
| SUPPLIER_BARCODE_ORIGIN | VARCHAR2(400) | 공급처원바코드 |
| OUR_BARCODE_ORIGIN | VARCHAR2(100) |  |
| VALID_DATE | DATE | 유효기간 |
| LOT_SERIAL | VARCHAR2(10) | 롯트시리얼 |
| TRACE_CODE | VARCHAR2(20) | 추적코드 |
| SCAN_QTY | NUMBER(10,0) | 수량 |
| VENDOR_NAME | VARCHAR2(30) |  |
| INSPECT_DATE | DATE | 검사일자 |
| ITEM_NAME_IN_BARCODE | VARCHAR2(100) | 품명(바코드) |
| NG_REASON_DETAIL | VARCHAR2(500) |  |
| FEEDER_SHAFT | VARCHAR2(1) | 축 |
| NG_TYPE | VARCHAR2(1) | 오류유형 |
| COMMENTS | VARCHAR2(300) | 설명 |
| SMT_MODEL_NAME | VARCHAR2(50) | SMT 모델명 |
| RUN_NO | VARCHAR2(30) | 런번호 |
| ENTER_DATE | DATE | 등록일자 |
| ENTER_BY | VARCHAR2(50) | 등록자 |

## 자주 쓰는 JOIN


## 예제 쿼리

