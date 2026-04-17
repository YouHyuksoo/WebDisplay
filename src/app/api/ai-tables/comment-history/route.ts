/**
 * @file src/app/api/ai-tables/comment-history/route.ts
 * @description scripts/sql/comment-history/*.sql 을 파싱해 이력 목록 반환.
 *
 * 초보자 가이드:
 * - 파일명: YYYYMMDD_HHMMSS_TABLE[_COL].sql
 * - 각 파일 상단의 `-- table:` `-- column:` `-- user:` `-- timestamp:`
 *   `-- BEFORE` `-- AFTER` 헤더를 읽어 구조화해 리턴.
 * - 쿼리 파라미터 `table` 로 특정 테이블만 필터 (없으면 전체, 최신 50개).
 */

import { NextResponse, type NextRequest } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import { PATHS } from '@/lib/ai-tables/paths';

interface HistoryEntry {
  filename: string;
  table: string | null;
  column: string | null;
  osUser: string | null;
  timestamp: string | null;
  before: string | null;
  after: string | null;
  changeType: 'table' | 'column';
}

function parseHistory(content: string): Omit<HistoryEntry, 'filename'> {
  const pick = (label: string): string | null => {
    const re = new RegExp(`^--\\s+${label}:\\s*(.+)$`, 'm');
    const m = content.match(re);
    return m ? m[1].trim() : null;
  };
  const blockAfter = (label: string): string | null => {
    const re = new RegExp(`--\\s+${label}\\s*\\n--\\s*(.+?)$`, 'm');
    const m = content.match(re);
    if (!m) return null;
    const raw = m[1].trim();
    return raw === '(null)' ? null : raw;
  };
  const column = pick('column');
  return {
    table: pick('table'),
    column,
    osUser: pick('user'),
    timestamp: pick('timestamp'),
    before: blockAfter('BEFORE'),
    after: blockAfter('AFTER'),
    changeType: column ? 'column' : 'table',
  };
}

export async function GET(req: NextRequest) {
  try {
    const table = req.nextUrl.searchParams.get('table');
    await fs.mkdir(PATHS.historyDir, { recursive: true });
    const all = (await fs.readdir(PATHS.historyDir))
      .filter((f) => f.endsWith('.sql'))
      .sort()
      .reverse();

    const filtered = table
      ? all.filter((f) => f.includes(table.toUpperCase()))
      : all;
    const limited = filtered.slice(0, 50);

    const entries: HistoryEntry[] = await Promise.all(
      limited.map(async (filename) => {
        const content = await fs.readFile(
          path.join(PATHS.historyDir, filename),
          'utf-8',
        );
        return { filename, ...parseHistory(content) };
      }),
    );
    return NextResponse.json({ entries });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : String(e) },
      { status: 500 },
    );
  }
}
