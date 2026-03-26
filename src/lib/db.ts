/**
 * @file db.ts
 * @description Oracle DB 연결 풀 및 쿼리 실행 헬퍼.
 * 초보자 가이드: Next.js API Route에서 import하여 Oracle DB에 쿼리를 실행한다.
 * connection pool은 싱글톤으로 관리되며, 첫 호출 시 생성된다.
 * config/database.json 파일이 있으면 해당 설정 우선, 없으면 .env 환경변수 사용.
 */
import oracledb from 'oracledb';
import fs from 'fs';
import path from 'path';
import type { DatabaseConfig, DatabaseFileConfig } from '@/types/option';

let poolPromise: Promise<oracledb.Pool> | null = null;

const CONFIG_PATH = path.join(process.cwd(), 'config', 'database.json');

/**
 * config/database.json 파일 전체를 읽는다.
 * 파일이 없으면 null 반환.
 */
export function loadFileConfig(): DatabaseFileConfig | null {
  try {
    if (fs.existsSync(CONFIG_PATH)) {
      const raw = fs.readFileSync(CONFIG_PATH, 'utf-8');
      const data = JSON.parse(raw);
      // 레거시 단일 설정 마이그레이션 (profiles 배열이 없는 경우)
      if (!data.profiles) {
        const legacy = data as DatabaseConfig;
        return {
          activeProfile: 'default',
          profiles: [{ ...legacy, name: 'default' }],
        };
      }
      return data as DatabaseFileConfig;
    }
  } catch {
    console.warn('config/database.json 읽기 실패, env 변수로 대체');
  }
  return null;
}

/**
 * 활성 프로필의 DB 설정을 반환한다.
 * 파일이 없으면 null (env fallback).
 */
function loadActiveConfig(): DatabaseConfig | null {
  const fileData = loadFileConfig();
  if (!fileData || fileData.profiles.length === 0) return null;
  const active = fileData.profiles.find((p) => p.name === fileData.activeProfile);
  return active ?? fileData.profiles[0];
}

/**
 * DatabaseConfig로부터 Oracle connectString을 생성한다.
 * SERVICE_NAME → host:port/service, SID → host:port:sid
 */
export function buildConnectString(cfg: DatabaseConfig): string {
  if (cfg.connectionType === 'SERVICE_NAME') {
    return `${cfg.host}:${cfg.port}/${cfg.sidOrService}`;
  }
  return `${cfg.host}:${cfg.port}:${cfg.sidOrService}`;
}

/**
 * Oracle 커넥션 풀을 싱글톤으로 생성/반환한다.
 * config 파일 설정 우선, 없으면 env 변수 사용.
 * @returns {Promise<oracledb.Pool>} Oracle 커넥션 풀
 */
function getPool(): Promise<oracledb.Pool> {
  if (!poolPromise) {
    const fileCfg = loadActiveConfig();
    if (fileCfg) {
      poolPromise = oracledb.createPool({
        user: fileCfg.username,
        password: fileCfg.password,
        connectString: buildConnectString(fileCfg),
        poolMin: 2,
        poolMax: 10,
        poolIncrement: 1,
        connectTimeout: 10,
        queueTimeout: 10000,
      });
    } else {
      poolPromise = oracledb.createPool({
        user: process.env.ORACLE_USER,
        password: process.env.ORACLE_PASSWORD,
        connectString: process.env.ORACLE_CONNECT_STRING,
        poolMin: 2,
        poolMax: 10,
        poolIncrement: 1,
        connectTimeout: 10,
        queueTimeout: 10000,
      });
    }
  }
  return poolPromise!;
}

/**
 * 기존 풀을 닫고 재시작한다. DB 설정 변경 후 호출.
 */
export async function resetPool(): Promise<void> {
  if (poolPromise) {
    try {
      const pool = await poolPromise;
      await pool.close(0);
    } catch {
      // 풀이 이미 닫힌 경우 무시
    }
    poolPromise = null;
  }
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

// ---------------------------------------------------------------------------
// 프로필 기반 보조 커넥션 풀 (SVEHICLEPDB 등 다른 DB 인스턴스 접속용)
// ---------------------------------------------------------------------------

/** 프로필 이름별 보조 커넥션 풀 캐시 */
const secondaryPools = new Map<string, Promise<oracledb.Pool>>();

/**
 * database.json에서 이름으로 프로필을 찾아 커넥션 풀을 반환한다.
 * 메인 풀(getPool)과 독립적으로 관리된다.
 */
function getPoolByProfile(profileName: string): Promise<oracledb.Pool> {
  const existing = secondaryPools.get(profileName);
  if (existing) return existing;

  const alias = `secondary_${profileName}`;

  // HMR 재로드 시 이미 생성된 풀이 있으면 재사용
  try {
    const pool = oracledb.getPool(alias);
    const resolved = Promise.resolve(pool);
    secondaryPools.set(profileName, resolved);
    return resolved;
  } catch { /* 풀이 없으면 새로 생성 */ }

  const fileData = loadFileConfig();
  const cfg = fileData?.profiles.find((p) => p.name === profileName);
  if (!cfg) throw new Error(`DB 프로필 "${profileName}"을 찾을 수 없습니다`);

  const promise = oracledb.createPool({
    user: cfg.username,
    password: cfg.password,
    connectString: buildConnectString(cfg),
    poolMin: 1,
    poolMax: 5,
    poolIncrement: 1,
    connectTimeout: 10,
    queueTimeout: 10000,
    poolAlias: alias,
  });
  secondaryPools.set(profileName, promise);
  return promise;
}

/**
 * 특정 프로필의 DB에서 SQL 쿼리를 실행한다.
 * 메인 DB가 아닌 다른 인스턴스(예: SVEHICLEPDB)에 접속할 때 사용.
 * @param profileName - database.json의 프로필 이름
 * @param sql - 실행할 SQL 문
 * @param binds - 바인드 변수
 */
export async function executeQueryByProfile<T = Record<string, unknown>>(
  profileName: string,
  sql: string,
  binds: oracledb.BindParameters = {},
): Promise<T[]> {
  const pool = await getPoolByProfile(profileName);
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
