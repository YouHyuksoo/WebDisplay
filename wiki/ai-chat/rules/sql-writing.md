---
type: sql-rule
title: "Oracle/MES SQL 작성 규칙"
stage: sql_generation
tags: [oracle, sql, rules]
updated: 2026-04-18
---

## SQL 작성 규칙 (반드시 준수)
0. **컬럼 사용 제약 (가장 중요)**: 아래 "사용 가능한 테이블" 블록의 `PK:` / `key:` / `common:` 에 **명시된 컬럼만** 사용하세요.
   - 일반 MES 관례로 있을 법한 컬럼(예: `LINE_CODE`, `ACTUAL_DATE`, `RESULT`, `ORGANIZATION_ID`)도 해당 테이블 블록에 **없으면 절대 사용 금지**. `ORA-00904: invalid identifier` 오류로 실패합니다.
   - 필요한 컬럼이 선택된 테이블에 **없으면** SQL 생성을 중단하고 다음과 같이 응답하세요:
     > "요청하신 질문은 `<테이블명>` 만으로는 답할 수 없습니다. 이 테이블에는 `<없는 컬럼 목록>` 이 없습니다. 다른 테이블을 함께 선택하거나 질문을 구체화해주세요."
   - 컬럼명 추측·창작 금지. 테이블 블록이 유일한 진실의 원천(single source of truth).

0-b. **바인드 변수는 사용자 값이 명확할 때만**: 사용자 질문에 **구체 값(예: 'P51', '123456')이 없는데** `:xxx` 바인드 변수를 WHERE 에 쓰면 실행 시 `NJS-098` 로 실패합니다.
   - 질문에 값이 명시되면 → **리터럴**로 작성 (`WHERE ITEM_CODE = 'ABC123'`)
   - 질문에 값이 없으면 → 바인드 대신 **다음 중 하나** 선택:
     - "최근 N건" 형태로 전환: `ORDER BY 날짜 DESC FETCH FIRST 10 ROWS ONLY` (조건 없음)
     - 집계 요약: `SELECT COUNT(*), ... GROUP BY ...`
     - SQL 생성을 중단하고 사용자에게 되묻기:
       > "어떤 `<컬럼명>` 값으로 조회할까요? 예시: 'P51', '20240418' 등"
   - **금지 패턴**: `WHERE COL = :PARAM` 만 있고 PARAM 값이 어디서도 정의되지 않음.

0-a. **컬럼 값 decode 준수**: 테이블 블록에 컬럼 코멘트로 `-- data.COL: A=..., B=..., C=...` 형태의 값 매핑이 명시된 경우, **명시된 값 외의 리터럴을 조건식에 쓰지 마세요**.
   - 예: `RESULT -- data.RESULT: FAIL=FAIL, N=NG, NG=NG, OK=OK, PASS=PASS, Y=OK`
     - "양품" 의미: `RESULT IN ('OK','PASS','Y')` (3개 모두 포함)
     - "불량" 의미: `RESULT IN ('FAIL','N','NG')`
     - ❌ 잘못: `RESULT = 'PASS'` — 실제 OK/Y 가 섞여 있어 과소집계됨
   - `flag(Y/N)` 은 `= 'Y'` / `= 'N'` 만 허용. 코멘트에 명시된 집합 밖의 값은 사용 금지.
1. **SELECT 또는 WITH 만 허용**. INSERT/UPDATE/DELETE/MERGE/DDL 절대 생성 금지 (자동 차단됨).
2. **세미콜론 1개만**. 다중 문장 금지.
3. **결과 행 제한**: 마지막에 `FETCH FIRST 1000 ROWS ONLY` 또는 `WHERE ROWNUM <= 1000` 자동 주입됨. 명시해도 무방.
4. **라인명 표시**: SELECT에서 라인명 보일 때 `F_GET_LINE_NAME(LINE_CODE, 1) AS LINE_NAME` 사용.
5. **작업일 비교**: `PLAN_DATE = F_GET_WORK_ACTUAL_DATE(SYSDATE, 'A')` 패턴 사용.
6. **IO 시각**: 베트남 로컬로 그룹핑할 땐 `(IO_DATE - 2/24)`로 감싸서 사용.
7. **NULL 시프트 비교**: `NVL(SHIFT_CODE,'X') = NVL(:shift,'X')`.
8. **바인드 변수**: 사용자 입력값은 :변수명으로 처리. 문자열 결합 금지.
9. **컬럼 별칭**: 한국어 별칭은 큰따옴표 안에 — `COL AS "라인명"`. 영어는 따옴표 불필요.
10. **TO_DATE**: 문자열 → 날짜 변환은 항상 `TO_DATE(:str, 'YYYY-MM-DD')` 명시.

## 자주 쓰는 패턴
- 오늘 P51 야간 계획 합계:
  ```sql
  SELECT SUM(PLAN_QTY) FROM IP_PRODUCT_LINE_TARGET
   WHERE LINE_CODE='P51' AND SHIFT_CODE='B'
     AND PLAN_DATE = F_GET_WORK_ACTUAL_DATE(SYSDATE,'A')
     AND ORGANIZATION_ID = 1
  ```
- 라인별 시프트별 실적:
  ```sql
  SELECT F_GET_LINE_NAME(LINE_CODE,1) AS LINE_NAME, SHIFT_CODE, SUM(IO_QTY) AS QTY
    FROM IP_PRODUCT_WORKSTAGE_IO
   WHERE WORKSTAGE_CODE='W220' AND ACTUAL_DATE = F_GET_WORK_ACTUAL_DATE(SYSDATE,'A')
   GROUP BY LINE_CODE, SHIFT_CODE
   ORDER BY LINE_NAME
  ```
