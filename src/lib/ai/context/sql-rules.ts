/**
 * @file src/lib/ai/context/sql-rules.ts
 * @description Oracle/MES SQL 작성 규칙. SQL 생성 단계 시스템 프롬프트에만 prepend.
 *
 * 초보자 가이드:
 * - 자주 쓰는 함수 호출 패턴, 예시 쿼리 포함 → LLM 정확도 향상
 * - 새 패턴 발견 시 여기 추가 + PR
 */

export const SQL_RULES = `
## SQL 작성 규칙 (반드시 준수)
1. **SELECT 또는 WITH 만 허용**. INSERT/UPDATE/DELETE/MERGE/DDL 절대 생성 금지 (자동 차단됨).
2. **세미콜론 1개만**. 다중 문장 금지.
3. **결과 행 제한**: 마지막에 \`FETCH FIRST 1000 ROWS ONLY\` 또는 \`WHERE ROWNUM <= 1000\` 자동 주입됨. 명시해도 무방.
4. **라인명 표시**: SELECT에서 라인명 보일 때 \`F_GET_LINE_NAME(LINE_CODE, 1) AS LINE_NAME\` 사용.
5. **작업일 비교**: \`PLAN_DATE = F_GET_WORK_ACTUAL_DATE(SYSDATE, 'A')\` 패턴 사용.
6. **IO 시각**: 베트남 로컬로 그룹핑할 땐 \`(IO_DATE - 2/24)\`로 감싸서 사용.
7. **NULL 시프트 비교**: \`NVL(SHIFT_CODE,'X') = NVL(:shift,'X')\`.
8. **바인드 변수**: 사용자 입력값은 :변수명으로 처리. 문자열 결합 금지.
9. **컬럼 별칭**: 한국어 별칭은 큰따옴표 안에 — \`COL AS "라인명"\`. 영어는 따옴표 불필요.
10. **TO_DATE**: 문자열 → 날짜 변환은 항상 \`TO_DATE(:str, 'YYYY-MM-DD')\` 명시.

## 자주 쓰는 패턴
- 오늘 P51 야간 계획 합계:
  \`\`\`sql
  SELECT SUM(PLAN_QTY) FROM IP_PRODUCT_LINE_TARGET
   WHERE LINE_CODE='P51' AND SHIFT_CODE='B'
     AND PLAN_DATE = F_GET_WORK_ACTUAL_DATE(SYSDATE,'A')
     AND ORGANIZATION_ID = 1
  \`\`\`
- 라인별 시프트별 실적:
  \`\`\`sql
  SELECT F_GET_LINE_NAME(LINE_CODE,1) AS LINE_NAME, SHIFT_CODE, SUM(IO_QTY) AS QTY
    FROM IP_PRODUCT_WORKSTAGE_IO
   WHERE WORKSTAGE_CODE='W220' AND ACTUAL_DATE = F_GET_WORK_ACTUAL_DATE(SYSDATE,'A')
   GROUP BY LINE_CODE, SHIFT_CODE
   ORDER BY LINE_NAME
  \`\`\`
`.trim();
