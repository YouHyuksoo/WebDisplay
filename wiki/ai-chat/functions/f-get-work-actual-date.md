---
object: F_GET_WORK_ACTUAL_DATE
kind: function
returns: DATE
args:
  - { name: P_DATE, type: DATE, mode: IN }
  - { name: P_SHIFT, type: VARCHAR2, mode: IN }
enabled: true
tags: [날짜, 작업일, 시프트]
updated: 2026-04-18
---

## 개요
달력일(`SYSDATE` 등)과 시프트 코드를 받아 **MES 업무일(작업일)** 로 변환. 제조 현장의 야간 시프트가
자정을 넘기면 달력일과 업무일이 달라지므로 이 함수 없이는 정확한 일별 집계 불가능.

## 용도
- "오늘" 기준 질의 시 `PLAN_DATE`, `ACTUAL_DATE`, `WORK_DATE` 같은 업무일 컬럼과 비교할 때 **반드시 이 함수**로 변환.
- 시프트별 집계 시 `P_SHIFT = 'A'`(주간 기본) 사용.

## 사용법
```sql
-- 오늘 계획량
SELECT SUM(PLAN_QTY)
  FROM IP_PRODUCT_LINE_TARGET
 WHERE PLAN_DATE = F_GET_WORK_ACTUAL_DATE(SYSDATE, 'A')
   AND LINE_CODE = :line_code
   AND ORGANIZATION_ID = 1;

-- 어제부터 오늘까지 실적
SELECT SUM(IO_QTY)
  FROM IP_PRODUCT_WORKSTAGE_IO
 WHERE ACTUAL_DATE BETWEEN F_GET_WORK_ACTUAL_DATE(SYSDATE - 1, 'A')
                        AND F_GET_WORK_ACTUAL_DATE(SYSDATE, 'A');
```

## 주의
- 달력일 `TRUNC(SYSDATE)` 와 **다를 수 있음**. 반드시 이 함수로 일관되게 처리.
- `P_SHIFT` 기본은 `'A'`. 야간 시프트 전용 비교가 필요한 경우에만 `'B'` 등 사용.
- `WHERE 날짜컬럼 = TRUNC(SYSDATE)` 같은 식은 **틀린 패턴** — 자정 경계의 데이터가 누락됨.
