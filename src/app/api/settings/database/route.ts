/**
 * @file route.ts
 * @description DB 설정 API. 현재 설정 조회, 연결 테스트, 설정 저장 & 풀 재시작.
 * 초보자 가이드:
 *   GET  → 현재 설정 반환 (비밀번호 마스킹)
 *   POST { action:'test', config } → 임시 연결 시도
 *   POST { action:'save', config } → config/database.json 저장 + 풀 재시작
 */
import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import oracledb from 'oracledb';
import { buildConnectString, resetPool } from '@/lib/db';
import type { DatabaseConfig } from '@/types/option';

const CONFIG_PATH = path.join(process.cwd(), 'config', 'database.json');

/** GET: 현재 DB 설정 반환 (비밀번호 마스킹) */
export async function GET() {
  try {
    if (fs.existsSync(CONFIG_PATH)) {
      const raw = fs.readFileSync(CONFIG_PATH, 'utf-8');
      const cfg = JSON.parse(raw) as DatabaseConfig;
      return NextResponse.json({
        ...cfg,
        password: cfg.password ? '****' : '',
        source: 'file',
      });
    }

    // .env.local 기반 파싱
    const connStr = process.env.ORACLE_CONNECT_STRING ?? '';
    let host = '';
    let port = 1521;
    let sidOrService = '';
    let connectionType: 'SID' | 'SERVICE_NAME' = 'SERVICE_NAME';

    if (connStr) {
      // 1. 형식 판별: '/'가 포함되면 SERVICE_NAME, ':'가 2개 이상이면 SID (host:port:sid)
      if (connStr.includes('/')) {
        connectionType = 'SERVICE_NAME';
        // host:port/service
        const [hp, service] = connStr.split('/');
        sidOrService = service || '';
        if (hp.includes(':')) {
          const [h, p] = hp.split(':');
          host = h;
          port = parseInt(p) || 1521;
        } else {
          host = hp;
        }
      } else if ((connStr.match(/:/g) || []).length >= 2) {
        connectionType = 'SID';
        // host:port:sid
        const [h, p, s] = connStr.split(':');
        host = h || '';
        port = parseInt(p) || 1521;
        sidOrService = s || '';
      } else if (connStr.includes(':')) {
        // host:port 또는 host:sid (애매하지만 여기서는 host:port로 가정)
        const [h, p] = connStr.split(':');
        host = h;
        port = parseInt(p) || 1521;
      } else {
        host = connStr;
      }
    }

    return NextResponse.json({
      host,
      port,
      connectionType,
      sidOrService,
      username: process.env.ORACLE_USER ?? '',
      password: process.env.ORACLE_PASSWORD ? '****' : '',
      source: 'env',
    });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

/** POST: action='test' → 연결 테스트, action='save' → 저장 & 풀 재시작 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action, config } = body as { action: string; config: DatabaseConfig };

    if (action === 'test') {
      return await testConnection(config);
    }

    if (action === 'save') {
      return await saveAndRestart(config);
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

/** 임시 연결로 테스트 */
async function testConnection(cfg: DatabaseConfig) {
  let conn: oracledb.Connection | null = null;
  try {
    conn = await oracledb.getConnection({
      user: cfg.username,
      password: cfg.password,
      connectString: buildConnectString(cfg),
    });
    const result = await conn.execute<{ BANNER: string }>(
      `SELECT BANNER FROM V$VERSION WHERE ROWNUM = 1`,
    );
    const banner = result.rows?.[0]?.BANNER ?? 'Connected';
    return NextResponse.json({ success: true, banner });
  } catch (e) {
    return NextResponse.json({ success: false, error: String(e) });
  } finally {
    if (conn) await conn.close();
  }
}

/** 설정 파일 저장 후 풀 재시작 */
async function saveAndRestart(cfg: DatabaseConfig) {
  const dir = path.dirname(CONFIG_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(cfg, null, 2), 'utf-8');

  await resetPool();
  return NextResponse.json({ success: true, message: 'Saved & pool restarted' });
}
