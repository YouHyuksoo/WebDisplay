/**
 * @file route.ts
 * @description DB 프로필 관리 API. 다중 프로필 조회/추가/삭제/테스트/활성화.
 * 초보자 가이드:
 *   GET  → 전체 프로필 목록 + 활성 프로필 반환 (비밀번호 마스킹)
 *   POST { action:'test', config }    → 임시 연결 시도
 *   POST { action:'save', profiles, activeProfile } → 전체 프로필 저장 + 풀 재시작
 */
import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import oracledb from 'oracledb';
import { buildConnectString, loadFileConfig, resetPool } from '@/lib/db';
import type { DatabaseConfig, DatabaseFileConfig, DatabaseProfile } from '@/types/option';

const CONFIG_PATH = path.join(process.cwd(), 'config', 'database.json');

/** GET: 전체 프로필 목록 반환 (비밀번호 마스킹) */
export async function GET() {
  try {
    const fileData = loadFileConfig();

    if (fileData && fileData.profiles.length > 0) {
      const masked: DatabaseFileConfig = {
        activeProfile: fileData.activeProfile,
        profiles: fileData.profiles.map((p) => ({
          ...p,
          password: p.password ? '****' : '',
        })),
      };
      return NextResponse.json({ ...masked, source: 'file' });
    }

    // .env.local 기반 파싱 → 단일 프로필로 변환
    const connStr = process.env.ORACLE_CONNECT_STRING ?? '';
    let host = '';
    let port = 1521;
    let sidOrService = '';
    let connectionType: 'SID' | 'SERVICE_NAME' = 'SERVICE_NAME';

    if (connStr) {
      if (connStr.includes('/')) {
        connectionType = 'SERVICE_NAME';
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
        const [h, p, s] = connStr.split(':');
        host = h || '';
        port = parseInt(p) || 1521;
        sidOrService = s || '';
      } else if (connStr.includes(':')) {
        const [h, p] = connStr.split(':');
        host = h;
        port = parseInt(p) || 1521;
      } else {
        host = connStr;
      }
    }

    const envProfile: DatabaseProfile = {
      name: 'default',
      host,
      port,
      connectionType,
      sidOrService,
      username: process.env.ORACLE_USER ?? '',
      password: process.env.ORACLE_PASSWORD ? '****' : '',
    };

    return NextResponse.json({
      activeProfile: 'default',
      profiles: [envProfile],
      source: 'env',
    });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

/** POST: 프로필 테스트/저장 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action } = body as { action: string };

    if (action === 'test') {
      const { config, profileName } = body as { config: DatabaseConfig; profileName?: string };
      return await testConnection(config, profileName);
    }

    if (action === 'save') {
      const { profiles, activeProfile } = body as {
        profiles: DatabaseProfile[];
        activeProfile: string;
      };
      return await saveProfiles(profiles, activeProfile);
    }

    if (action === 'reconnect') {
      const { activeProfile } = body as { activeProfile?: string };
      return await reconnectPool(activeProfile);
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

/** 저장된 프로필에서 실제 비밀번호 조회 */
function resolvePassword(cfg: DatabaseConfig, profileName?: string): string {
  if (cfg.password && cfg.password !== '●●●●●●●●' && cfg.password !== '****') {
    return cfg.password;
  }
  // 비밀번호가 비어있거나 마스킹값이면 파일에서 복원
  const existing = loadFileConfig();
  const stored = existing?.profiles.find((p) => p.name === profileName);
  return stored?.password && stored.password !== '****'
    ? stored.password
    : cfg.password;
}

/** 임시 연결로 테스트 */
async function testConnection(cfg: DatabaseConfig, profileName?: string) {
  const password = resolvePassword(cfg, profileName);
  let conn: oracledb.Connection | null = null;
  try {
    conn = await oracledb.getConnection({
      user: cfg.username,
      password,
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

/** 전체 프로필 저장 후 풀 재시작 */
async function saveProfiles(profiles: DatabaseProfile[], activeProfile: string) {
  const dir = path.dirname(CONFIG_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  // 기존 파일에서 비밀번호 복원 (마스킹/빈값인 프로필은 기존 비밀번호 유지)
  const existing = loadFileConfig();
  const merged = profiles.map((p) => {
    if (!p.password || p.password === '****' || p.password === '●●●●●●●●') {
      const old = existing?.profiles.find((o) => o.name === p.name);
      if (old?.password && old.password !== '****') {
        return { ...p, password: old.password };
      }
    }
    return p;
  });

  const data: DatabaseFileConfig = { activeProfile, profiles: merged };
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(data, null, 2), 'utf-8');

  /* 활성 프로필이 변경되었을 수 있으므로 기존 풀 해제 → 다음 쿼리 시 새 프로필로 재생성 */
  await resetPool();

  return NextResponse.json({ success: true, message: 'Saved' });
}

/** 풀 재연결 (activeProfile 변경 시 파일도 갱신) */
async function reconnectPool(activeProfile?: string) {
  if (activeProfile) {
    const existing = loadFileConfig();
    if (existing) {
      existing.activeProfile = activeProfile;
      fs.writeFileSync(CONFIG_PATH, JSON.stringify(existing, null, 2), 'utf-8');
    }
  }
  await resetPool();
  return NextResponse.json({ success: true, message: 'Pool reconnected' });
}
