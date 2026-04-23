/**
 * @file src/app/api/ai-context/sync-objects/route.ts
 * @description 활성 Oracle 프로파일에서 함수·프로시저 메타를 추출해
 *   `data/ai-context/db-objects-cache.json` 덮어쓰기.
 *
 * 초보자 가이드:
 * - UI "↻ DB 동기화" 버튼이 호출.
 * - 테이블 메타(schema-cache)는 기존 /api/ai-tables/sync 가 담당 — 분리 관리.
 */

import { NextResponse } from 'next/server';
import fs from 'node:fs/promises';
import path from 'node:path';
import { extractDbObjects } from '@/lib/ai-tables/db-object-extractor';

const ROOT = process.cwd();
const CONFIG_PATH = path.join(ROOT, 'config', 'database.json');
const CACHE_PATH = path.join(ROOT, 'data', 'ai-context', 'db-objects-cache.json');

export async function POST() {
  try {
    const cfgRaw = await fs.readFile(CONFIG_PATH, 'utf8');
    const cfg = JSON.parse(cfgRaw);
    const siteLabel: string = cfg.activeProfile ?? 'default';

    const payload = await extractDbObjects(siteLabel);

    await fs.mkdir(path.dirname(CACHE_PATH), { recursive: true });
    await fs.writeFile(
      CACHE_PATH,
      JSON.stringify(payload, null, 2),
      'utf8',
    );

    return NextResponse.json({
      ok: true,
      site: siteLabel,
      refreshedAt: payload.refreshedAt,
      functions: Object.keys(payload.functions).length,
      procedures: Object.keys(payload.procedures).length,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { ok: false, error: msg },
      { status: 500 },
    );
  }
}
