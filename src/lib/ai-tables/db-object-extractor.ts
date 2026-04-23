/**
 * @file src/lib/ai-tables/db-object-extractor.ts
 * @description 활성 Oracle 프로파일에서 함수·프로시저 메타를 추출해
 *   `data/ai-context/db-objects-cache.json` 구조로 반환.
 *
 * 초보자 가이드:
 * - Python 스크립트(scripts/extract-db-objects.py) 의 Node 런타임 포팅.
 * - /api/ai-context/sync-objects 에서 호출 → UI "↻ DB 동기화" 버튼 완성.
 * - SYS* 객체 제외. PACKAGE 내부 함수·프로시저 제외 (standalone 만).
 */

import { executeQuery } from '@/lib/db';

export interface DbArg {
  position: number;
  name: string | null;
  type: string;
  mode: string;
}

export interface DbFunctionMeta {
  name: string;
  kind: 'function';
  returns: string | null;
  args: DbArg[];
}

export interface DbProcedureMeta {
  name: string;
  kind: 'procedure';
  args: DbArg[];
}

export interface DbObjectsCachePayload {
  version: 1;
  refreshedAt: string;
  site: string;
  functions: Record<string, DbFunctionMeta>;
  procedures: Record<string, DbProcedureMeta>;
}

interface Row {
  OBJECT_NAME: string;
  OBJECT_TYPE: string;
  POSITION: number | null;
  ARGUMENT_NAME: string | null;
  DATA_TYPE: string | null;
  IN_OUT: string | null;
}

/**
 * 현재 기본 Oracle 풀(activeProfile)에서 함수·프로시저 메타를 추출.
 * @param siteLabel 캐시 파일에 기록할 사이트 라벨 (예: "멕시코전장외부")
 */
export async function extractDbObjects(
  siteLabel: string,
): Promise<DbObjectsCachePayload> {
  const rows = await executeQuery<Row>(
    `SELECT p.OBJECT_NAME, p.OBJECT_TYPE,
            a.POSITION, a.ARGUMENT_NAME, a.DATA_TYPE, a.IN_OUT
       FROM USER_PROCEDURES p
       LEFT JOIN USER_ARGUMENTS a
         ON a.OBJECT_NAME = p.OBJECT_NAME
        AND a.PACKAGE_NAME IS NULL
      WHERE p.OBJECT_TYPE IN ('FUNCTION','PROCEDURE')
        AND p.OBJECT_NAME NOT LIKE 'SYS%'
      ORDER BY p.OBJECT_TYPE, p.OBJECT_NAME, a.POSITION`,
    {},
  );

  const functions: Record<string, DbFunctionMeta> = {};
  const procedures: Record<string, DbProcedureMeta> = {};

  for (const r of rows) {
    const name = r.OBJECT_NAME;
    if (r.OBJECT_TYPE === 'FUNCTION') {
      if (!functions[name]) {
        functions[name] = { name, kind: 'function', returns: null, args: [] };
      }
      accumulate(functions[name], r);
    } else if (r.OBJECT_TYPE === 'PROCEDURE') {
      if (!procedures[name]) {
        procedures[name] = { name, kind: 'procedure', args: [] };
      }
      accumulate(procedures[name], r);
    }
  }

  return {
    version: 1,
    refreshedAt: new Date().toISOString(),
    site: siteLabel,
    functions,
    procedures,
  };
}

function accumulate(
  entry: DbFunctionMeta | DbProcedureMeta,
  row: Row,
): void {
  if (row.POSITION === null) return; // 인자 없는 프로시저/함수 void
  // POSITION=0 AND IN_OUT='OUT' → 함수 리턴 타입
  if (
    row.POSITION === 0 &&
    row.IN_OUT === 'OUT' &&
    entry.kind === 'function'
  ) {
    entry.returns = row.DATA_TYPE ?? null;
    return;
  }
  if (row.POSITION > 0) {
    entry.args.push({
      position: row.POSITION,
      name: row.ARGUMENT_NAME,
      type: row.DATA_TYPE ?? '',
      mode: row.IN_OUT ?? 'IN',
    });
  }
}
