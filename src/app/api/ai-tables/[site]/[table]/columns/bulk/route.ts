/**
 * @file src/app/api/ai-tables/[site]/[table]/columns/bulk/route.ts
 * @description 여러 컬럼에 일괄 액션 적용 (priority 설정 / 제외 토글 / 도메인 할당).
 *
 * 초보자 가이드:
 * - 요청 body: { columns: string[], action: 'set_priority'|'set_exclude'|'assign_domain', value }
 * - set_priority: columnOverrides[col].priority = value
 * - set_exclude: columnOverrides[col].excludeFromPrompt = !!value
 * - assign_domain: 도메인의 members 에 컬럼을 추가 (중복 방지).
 */

import { NextResponse, type NextRequest } from 'next/server';
import {
  loadTables,
  saveTables,
  loadDomains,
  saveDomains,
} from '@/lib/ai-tables/store';
import type { SiteKey } from '@/lib/ai-tables/types';

type Params = { params: Promise<{ site: SiteKey; table: string }> };

interface BulkBody {
  columns: string[];
  action: 'set_priority' | 'set_exclude' | 'assign_domain';
  value: unknown;
}

export async function POST(req: NextRequest, { params }: Params) {
  try {
    const { site, table } = await params;
    const tableName = decodeURIComponent(table);
    const body = (await req.json()) as BulkBody;
    const { columns, action, value } = body;
    if (!Array.isArray(columns) || columns.length === 0) {
      return NextResponse.json(
        { error: 'columns[] required' },
        { status: 400 },
      );
    }

    const tables = await loadTables();
    const meta = tables.sites[site]?.tables[tableName];
    if (!meta) {
      return NextResponse.json({ error: 'not found' }, { status: 404 });
    }
    meta.columnOverrides ??= {};

    let domainsChanged = false;
    let domainsData = action === 'assign_domain' ? await loadDomains() : null;

    let updated = 0;
    for (const col of columns) {
      if (action === 'set_priority') {
        meta.columnOverrides[col] ??= {};
        meta.columnOverrides[col].priority = value as
          | 'key'
          | 'common'
          | 'rare';
        updated++;
      } else if (action === 'set_exclude') {
        meta.columnOverrides[col] ??= {};
        meta.columnOverrides[col].excludeFromPrompt = !!value;
        updated++;
      } else if (action === 'assign_domain' && domainsData) {
        const d = domainsData.domains.find((x) => x.id === value);
        if (d && !d.members.includes(col)) {
          d.members.push(col);
          domainsChanged = true;
          updated++;
        }
      }
    }

    await saveTables(tables);
    if (domainsChanged && domainsData) await saveDomains(domainsData);
    return NextResponse.json({ ok: true, updated });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : String(e) },
      { status: 500 },
    );
  }
}
