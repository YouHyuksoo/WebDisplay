---
object: F_GET_LINE_NAME
kind: function
returns: VARCHAR2
args:
  - { name: P_LINE_CODE, type: VARCHAR2, mode: IN }
  - { name: P_LANG, type: NUMBER, mode: IN }
enabled: true
tags: [라인, 디코딩, 표시용]
updated: 2026-04-18
---

## 개요
라인 코드(예: `P51`)를 사람이 읽을 수 있는 라인명으로 변환하는 디코딩 함수.

## 용도
- SELECT 결과에 `LINE_CODE` 를 노출할 때 **반드시 이 함수로 감싸서** 라인명으로 출력.
- 다국어 출력: `P_LANG` 인자로 언어 전환 (1=한국어, 2=영어, 3=스페인어, 4=베트남어).
- `P_LANG` 이 명시되지 않으면 한국어(1) 기본.

## 사용법
```sql
-- 단독 사용
SELECT F_GET_LINE_NAME('P51', 1) FROM DUAL;

-- 테이블 컬럼에 적용
SELECT F_GET_LINE_NAME(LINE_CODE, 1) AS "라인명", SHIFT_CODE
  FROM IP_PRODUCT_LINE_TARGET
 WHERE ORGANIZATION_ID = 1;
```

## 주의
- 라인 코드가 마스터에 없거나 NULL 이면 NULL 반환 — 필요 시 `NVL(..., LINE_CODE)` 로 fallback.
- **정렬**도 이 함수의 반환값 기준으로 하는 게 UX 자연스러움.
  ```sql
  ORDER BY F_GET_LINE_NAME(LINE_CODE, 1)
  ```
