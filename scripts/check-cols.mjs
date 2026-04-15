import oracledb from 'oracledb';
oracledb.initOracleClient();
const conn = await oracledb.getConnection({ user:'INFINITY21_JSMES', password:'INFINITY21_JSMES', connectString:'201.174.222.243:1588/SVEHICLEPDB' });
const r = await conn.execute("SELECT COLUMN_NAME FROM ALL_TAB_COLUMNS WHERE TABLE_NAME = 'HW_ITS_REELCHANGEHISTORY' ORDER BY COLUMN_ID", []);
console.log('HW_ITS_REELCHANGEHISTORY 컬럼:', r.rows.map(x=>x[0]).join(', '));
const r2 = await conn.execute("SELECT * FROM HW_ITS_REELCHANGEHISTORY WHERE ROWNUM <= 1", []);
console.log('샘플행 컬럼명:', r2.metaData?.map(m=>m.name).join(', '));
await conn.close();
