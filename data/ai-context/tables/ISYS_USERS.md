---
name: ISYS_USERS
site: default
description: User Master | PB화면: w_com_carrying_out_bring_in_analysis_report, w_com_carrying_out_bring_in_confirm, w_com_carrying_out_master, w_privilege_master, w_bulletin_board | DW: d_com_carrying_out_analysys_byt_dept_rpt, d_man_bring_in_confirm_lst, d_man_bring_in_security_lst, d_man_carrying_out_confirm_lst, d_man_carrying_out_lst
related_tables: []
---

## 주요 컬럼
| 컬럼 | 타입 | 설명 |
|---|---|---|
| USER_ID | VARCHAR2(20) | 사용자ID |
| ORGANIZATION_ID | NUMBER | 조직ID |
| USER_NAME | VARCHAR2(100) | 사용자명 |
| DEPARTMENT_CODE | VARCHAR2(20) | 부서코드: G=생산기술, J=자재, K=KTC 생산, S=생산 |
| PASSWORD | VARCHAR2(20) | 비밀번호 |
| ADDRESS | VARCHAR2(100) | 주소 |
| USER_LEVEL | NUMBER | 사용자레벨: 1=일반, 2=협력사, 3=담당자, 4=리더, 8=관리자, 9=슈퍼유져 |
| FAX_NO | VARCHAR2(20) | 팩스번호 |
| EMAIL_ADDRESS | VARCHAR2(50) | 전자메일주소 |
| TEL_NO | VARCHAR2(20) | 전화번호 |
| HANDPHONE_NO | VARCHAR2(20) | 휴대폰번호 |
| OFFICE_TEL_NO | VARCHAR2(20) | 사무실전화번호 |
| ENTER_DATE | DATE | 등록일자 |
| ENTER_BY | VARCHAR2(20) | 등록자 |
| BIRTHDAY | DATE | 생일 |
| LAST_MODIFY_DATE | DATE | 최종수정일자 |
| LAST_MODIFY_BY | VARCHAR2(20) | 최종수정자 |
| COMPANY_ENTER_DATE | DATE | 입사일자 |
| USER_IMAGE | BLOB |  |
| COMPANY_WITHDRAW_DATE | DATE | 퇴사일자 |
| POSITION | VARCHAR2(100) | 직위: AA=대표이사, BB=팀장, BC=차장, BD=과장, BE=대, BR=부장, CA=반장, CB=조장, CC=사원 |
| SHOW_UNIT_PRICE | VARCHAR2(1) | 단가보기 |
| SHOW_SALE_PRICE | VARCHAR2(1) | 판가보기 |
| SHOW_INVENTORY_PRICE | VARCHAR2(1) | 재고단가보기 |
| DOWNLOAD_DOCUMENT | VARCHAR2(1) | 문서다운로드 |
| START_WINDOW | VARCHAR2(100) | 시작윈도우 |
| WORKSTAGE_CODE | VARCHAR2(10) | 공정명 |
| BRING_IN_OUT_MANAGER | VARCHAR2(1) | 반입반출관리자 |
| BRING_IN_OUT_AUTO_CONFIRM | VARCHAR2(1) |  |
| DESIGN_DOCUMENT_MANAGER | VARCHAR2(1) | 설계문서관리자 |
| BRING_IN_OUT_AUTO_SELECT | VARCHAR2(1) | 출입증부서선택 |
| LAST_ENTER_DATE | DATE |  |
| LAST_PASSWORD_DATE | DATE |  |
| SIGN_IMAGE | BLOB |  |
| ALRAM_MSG_RECEIVER | VARCHAR2(1) |  |
| USER_LANG | VARCHAR2(2) | User Language |

## 자주 쓰는 JOIN


## 예제 쿼리

