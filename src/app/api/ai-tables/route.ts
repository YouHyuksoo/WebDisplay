/**
 * @file src/app/api/ai-tables/route.ts
 * @description Bootstrap — AI Tables 페이지 초기 로드용 전체 상태 병합.
 *
 * 초보자 가이드:
 * - tables.json / schema-cache.json / column-domains.json / basecode-cache.json 4개 파일을
 *   한꺼번에 읽고 사이트별 테이블 목록을 flat하게 조합한 뒤 프런트로 내려준다.
 * - 상세 데이터(meta.columnOverrides 등)는 여기에 포함되지 않는다. 테이블 선택 시
 *   `GET /api/ai-tables/[site]/[table]` 에서 별도 호출.
 */

import { NextResponse } from 'next/server';
import { loadTables, loadDomains } from '@/lib/ai-tables/store';
import { loadSchemaCache } from '@/lib/ai-tables/schema-loader';
import { loadBasecodes } from '@/lib/ai-tables/basecode-loader';
import type { SiteKey } from '@/lib/ai-tables/types';

export async function GET() {
  try {
    const [tables, domains, schema, basecodes] = await Promise.all([
      loadTables(),
      loadDomains(),
      loadSchemaCache(),
      loadBasecodes(),
    ]);

    const sites = Object.keys(tables.sites) as SiteKey[];
    const activeSite: SiteKey = sites[0] ?? ('default' as SiteKey);

    const tablesList: Record<string, Array<Record<string, unknown>>> = {};
    const stats = { tables: 0, enabled: 0, examples: 0, pendingFeedback: 0 };

    for (const site of sites) {
      const rows = Object.entries(tables.sites[site].tables).map(
        ([name, meta]) => {
          const sch = schema.sites[site]?.tables[name];
          return {
            name,
            enabled: meta.enabled,
            tags: meta.tags,
            summary: meta.summary,
            columnCount: sch?.columns.length ?? 0,
            exampleCount: meta.examples.length,
            pendingFeedbackCount: meta.feedbackQueue.length,
            lastEditedAt: meta.lastEditedAt,
          };
        },
      );
      tablesList[site] = rows;
      stats.tables += rows.length;
      stats.enabled += rows.filter((r) => r.enabled).length;
      stats.examples += rows.reduce((s, r) => s + (r.exampleCount as number), 0);
      stats.pendingFeedback += rows.reduce(
        (s, r) => s + (r.pendingFeedbackCount as number),
        0,
      );
    }

    return NextResponse.json({
      sites,
      activeSite,
      tables: tablesList,
      domains: domains.domains,
      basecodeTypes: basecodes.codeTypes.map((c) => c.codeType),
      stats,
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : String(e) },
      { status: 500 },
    );
  }
}
