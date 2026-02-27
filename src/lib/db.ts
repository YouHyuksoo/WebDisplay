/**
 * @file db.ts
 * @description Oracle DB 연결 풀 및 쿼리 실행 헬퍼.
 * 초보자 가이드: Next.js API Route에서 import하여 Oracle DB에 쿼리를 실행한다.
 * connection pool은 싱글톤으로 관리되며, 첫 호출 시 생성된다.
 */
import oracledb from 'oracledb';

let poolPromise: Promise<oracledb.Pool> | null = null;

/**
 * Oracle 커넥션 풀을 싱글톤으로 생성/반환한다.
 * @returns {Promise<oracledb.Pool>} Oracle 커넥션 풀
 */
function getPool(): Promise<oracledb.Pool> {
  if (!poolPromise) {
    poolPromise = oracledb.createPool({
      user: process.env.ORACLE_USER,
      password: process.env.ORACLE_PASSWORD,
      connectString: process.env.ORACLE_CONNECT_STRING,
      poolMin: 2,
      poolMax: 10,
      poolIncrement: 1,
    });
  }
  return poolPromise!;
}

/**
 * SQL 쿼리를 실행하고 결과를 객체 배열로 반환한다.
 * @template T - 결과 행의 타입
 * @param {string} sql - 실행할 SQL 문
 * @param {Record<string, unknown>} binds - 바인드 변수
 * @returns {Promise<T[]>} 쿼리 결과 배열
 */
export async function executeQuery<T = Record<string, unknown>>(
  sql: string,
  binds: oracledb.BindParameters = {},
): Promise<T[]> {
  const pool = await getPool();
  const conn = await pool.getConnection();
  try {
    const result = await conn.execute(sql, binds, {
      outFormat: oracledb.OUT_FORMAT_OBJECT,
    });
    return (result.rows as T[]) ?? [];
  } finally {
    await conn.close();
  }
}
