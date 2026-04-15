/**
 * @file scripts/magazine-issue-batch.js
 * @description LOG_ICT 기준 미처리 매거진 출고 일괄 처리
 *
 * 처리 흐름:
 * 1. LOG_ICT ↔ IP_PRODUCT_2D_BARCODE 조인으로 미처리 바코드 조회
 * 2. 바코드별 PK_WORKSTAGE_M_MAGAZINE.P_MAGAZINE_ISSUE 호출
 * 3. 결과(P_OUT / P_MSG) 콘솔 출력
 *
 * 실행:  node scripts/magazine-issue-batch.js
 * 옵션:  --dry-run  → 쿼리만 하고 프로시저 실제 호출 안 함
 */
const oracledb = require('oracledb');
const cfg      = require('../config/database.json');

const DRY_RUN  = process.argv.includes('--dry-run');
const OPERATOR = 'ICT AUTO ISSUE';

// 내부 DB 프로필 (SVEHICLEPDB)
const profile  = cfg.profiles.find(p => p.name === '멕시코전장내부');
const CS       = `${profile.host}:${profile.port}/${profile.sidOrService}`;

/** 미처리 바코드 전체 조회 */
const SQL_UNISSUED = `
  SELECT ict.BARCODE,
         MIN(ict.LOG_TIMESTAMP)  AS ISSUE_DATE,
         b.MAGAZINE_NO,
         b.WORKSTAGE_CODE,
         b.MODEL_NAME,
         b.ITEM_CODE
    FROM LOG_ICT ict
    JOIN IP_PRODUCT_2D_BARCODE b
      ON b.SERIAL_NO = ict.BARCODE
    LEFT JOIN IP_PRODUCT_MAGAZINE_ISSUE iss
           ON iss.BARCODE = ict.BARCODE AND iss.CANCEL_FLAG = 'N'
   WHERE iss.BARCODE    IS NULL
     AND ict.IS_LAST     = 'Y'
     AND b.MAGAZINE_NO  IS NOT NULL
   GROUP BY ict.BARCODE, b.MAGAZINE_NO, b.WORKSTAGE_CODE, b.MODEL_NAME, b.ITEM_CODE
   ORDER BY MIN(ict.LOG_TIMESTAMP)
`;

/** 프로시저 호출 */
const SQL_PROC = `
  BEGIN
    PK_WORKSTAGE_M_MAGAZINE.P_MAGAZINE_ISSUE(
      :p_magazine_no,
      :p_barcode,
      :p_issue_date,
      :p_workstage_code,
      :p_operator,
      :p_out,
      :p_msg,
      :p_remain_qty
    );
  END;
`;

(async () => {
  let conn;
  const results = { success: 0, fail: 0, skip: 0 };
  const errors  = [];

  try {
    conn = await oracledb.getConnection({
      user: profile.username, password: profile.password, connectString: CS,
    });

    // 1. 미처리 목록 조회
    const { rows } = await conn.execute(SQL_UNISSUED, {}, { outFormat: oracledb.OUT_FORMAT_OBJECT });
    console.log(`\n=== 미처리 대상: ${rows.length}건 ${DRY_RUN ? '[DRY-RUN 모드]' : ''} ===\n`);

    // 2. 바코드별 순차 처리
    for (const [i, row] of rows.entries()) {
      const { BARCODE, ISSUE_DATE, MAGAZINE_NO, WORKSTAGE_CODE } = row;
      const prefix = `[${String(i + 1).padStart(3, '0')}/${rows.length}]`;

      if (!MAGAZINE_NO) {
        console.log(`${prefix} SKIP — MAGAZINE_NO 없음: ${BARCODE}`);
        results.skip++;
        continue;
      }

      if (DRY_RUN) {
        console.log(`${prefix} DRY-RUN: ${BARCODE} → ${MAGAZINE_NO} (${WORKSTAGE_CODE}) @ ${ISSUE_DATE}`);
        continue;
      }

      try {
        const binds = {
          p_magazine_no:    MAGAZINE_NO,
          p_barcode:        BARCODE,
          p_issue_date:     { val: ISSUE_DATE, type: oracledb.DATE },
          p_workstage_code: WORKSTAGE_CODE,
          p_operator:       OPERATOR,
          p_out:            { dir: oracledb.BIND_OUT, type: oracledb.STRING, maxSize: 10  },
          p_msg:            { dir: oracledb.BIND_OUT, type: oracledb.STRING, maxSize: 500 },
          p_remain_qty:     { dir: oracledb.BIND_OUT, type: oracledb.NUMBER },
        };

        const res = await conn.execute(SQL_PROC, binds, { autoCommit: true });
        const out = res.outBinds.p_out;
        const msg = res.outBinds.p_msg;
        const qty = res.outBinds.p_remain_qty;

        if (out === 'S' || out === 'OK') {
          console.log(`${prefix} OK   — ${BARCODE} → ${MAGAZINE_NO} | 잔량 ${qty}`);
          results.success++;
        } else {
          console.warn(`${prefix} FAIL — ${BARCODE} | ${out}: ${msg}`);
          results.fail++;
          errors.push({ barcode: BARCODE, magazine: MAGAZINE_NO, out, msg });
        }
      } catch (e) {
        console.error(`${prefix} ERR  — ${BARCODE} | ${e.message}`);
        results.fail++;
        errors.push({ barcode: BARCODE, magazine: MAGAZINE_NO, error: e.message });
      }
    }

    // 3. 최종 요약
    console.log('\n=== 처리 완료 ===');
    console.log(`  성공: ${results.success}건`);
    console.log(`  실패: ${results.fail}건`);
    console.log(`  스킵: ${results.skip}건`);

    if (errors.length > 0) {
      console.log('\n--- 실패 목록 ---');
      errors.forEach(e => console.log(JSON.stringify(e)));
    }

  } finally {
    if (conn) await conn.close();
  }
})().catch(e => {
  console.error('FATAL:', e.message);
  process.exit(1);
});
