/**
 * @file src/app/api/ai-tables/[site]/[table]/columns/[col]/comment/preview/route.ts
 * @description 컬럼 주석 변경 DDL 미리보기.
 */

import { NextResponse, type NextRequest } from 'next/server';
import {
  previewCommentDdl,
  getCurrentComment,
} from '@/lib/ai-tables/ddl-executor';

type Params = {
  params: Promise<{ site: string; table: string; col: string }>;
};

export async function POST(req: NextRequest, { params }: Params) {
  try {
    const { table, col } = await params;
    const tableName = decodeURIComponent(table);
    const colName = decodeURIComponent(col);
    const { newComment } = (await req.json()) as { newComment: string };
    const before = await getCurrentComment(tableName, colName);
    const { ddl } = await previewCommentDdl({
      table: tableName,
      column: colName,
      before,
      after: newComment ?? '',
    });
    return NextResponse.json({ before, after: newComment ?? '', ddl });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : String(e) },
      { status: 500 },
    );
  }
}
