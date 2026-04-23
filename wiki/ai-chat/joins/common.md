---
type: join-recipe
title: "JOIN 공통 주의사항"
stage: sql_generation
tags: [join, rules]
updated: 2026-04-18
---

## 레시피 사용 원칙
MES 스키마는 소수의 공통 키(LINE_CODE, MODEL_NO, BARCODE, EQP_NO, WORK_DATE 등)로 수렴합니다.
질문이 여러 테이블을 엮어야 한다면 **먼저 축 카드를 찾고**, 거기에 맞춰 ON 절을 구성하세요.

## 공통 주의
- **ORGANIZATION_ID = 1** 필터는 해당 테이블의 `common:` / `key:` 목록에 `ORGANIZATION_ID` 가 **명시된 경우에만** 추가합니다. 명시되지 않은 테이블에 넣으면 `ORA-00904: invalid identifier` 오류가 납니다.
  - 일반적으로 포함: `IP_PRODUCT_*`, `IM_PRODUCT_*`, `ISYS_*` 등 마스터·집계 계열
  - 일반적으로 **제외**: `LOG_*`, `INSP_*` 계열 (이력 로그 테이블은 보통 ORGANIZATION_ID 없음)
- 정렬은 **라인명(F_GET_LINE_NAME)** → 라인코드 순으로. 이름 기준이 UX 자연스러움.
