---
name: IM_ITEM_SOLDER_MASTER
site: default
description: IM_ITEM_SOLDER_MASTER 테이블
related_tables: []
---

## 주요 컬럼
| 컬럼 | 타입 | 설명 |
|---|---|---|
| ITEM_CODE | VARCHAR2(20) | 품목코드 |
| SOLDER_LOT_NO | VARCHAR2(20) | 솔더롯트번호 |
| RECEIPT_DATE | DATE | 입고일자 |
| ISSUE_DATE | DATE | 출고일자 |
| OPEN_DATE | DATE | 개봉일자 |
| RETURN_DATE | DATE | 반품일자 |
| LINE_CODE | VARCHAR2(10) | 라인코드 |
| WORKSTAGE_CODE | VARCHAR2(10) | 공정명 |
| MACHINE_CODE | VARCHAR2(20) | 설비코드 |
| ENTER_DATE | DATE | 등록일자 |
| ENTER_BY | VARCHAR2(20) | 등록자 |
| LAST_MODIFY_DATE | DATE | 최종수정일자 |
| LAST_MODIFY_BY | VARCHAR2(20) | 최종수정자 |
| ORGANIZATION_ID | NUMBER | 조직ID |
| INPUT_DATE | DATE | 라인 투입일자 |
| SOLDER_TYPE | VARCHAR2(10) | 솔더타입: F=무연, P=유연 |
| ITEM_BARCODE | VARCHAR2(100) | 품목바코드 |
| MODEL_NAME | VARCHAR2(50) | 모델명 |
| MIX_START_DATE | DATE | 교반시작 |
| MIX_END_DATE | DATE | 교반종료 |
| DESTROY_DATE | DATE | 폐기일자 |
| UNFREEZING_START_DATE | DATE | 상온방치시작 |
| UNFREEZING_END_DATE | DATE | 상온방치종료 |
| TIME_CHECK_DATE | DATE |  |
| REFREEZE_START_DATE | DATE |  |
| REFREEZE_END_DATE | DATE |  |
| OLD_ISSUE_DATE | DATE |  |
| FREEZER_IN_TEMP | NUMBER | 냉장고 온도 |
| UNFREEZING_START_TEMP | NUMBER | 상온방치 시작온도 |
| UNFREEZING_END_TEMP | NUMBER | 상온방치 종료온도 |
| VISCOSITY_START_DATE | DATE | 점도측정시작일자 |
| VISCOSITY_END_DATE | DATE | 점도측정완료일자 |
| VISCOSITY | NUMBER | 점도측정 |
| VALID_DATE | DATE | 유효기간 |
| RPM | NUMBER |  |
| TIME | NUMBER | 시간 |
| TEMP | NUMBER |  |
| VISCOSITY_FILE_NAME | VARCHAR2(100) | 점도측정 화일명 |
| RUN_NO | VARCHAR2(20) | 런번호 |
| FIRST_LINE_INPUT_DATE | DATE | 라인투입일자 |
| VISCOSITY_OPERATOR | VARCHAR2(100) | 측정자 |
| PARENT_LOT_NO | VARCHAR2(20) |  |

## 자주 쓰는 JOIN


## 예제 쿼리

