/**
 * @file src/app/api/ai-tables/[site]/[table]/comment/preview/route.ts
 * @description 테이블 주석 변경 DDL 미리보기.
 *
 * 초보자 가이드:
 * - 요청 body: { newComment: string }
 * - 응답: { before, after, ddl } — 모달에서 사용자 확인 후 `POST .../comment`로 실행
 */

import { NextResponse, type NextRequest } from 'next/server';
import {
  previewCommentDdl,
  getCurrentComment,
} from '@/lib/ai-tables/ddl-executor';

type Params = { params: Promise<{ site: string; table: string }> };

export async function POST(req: NextRequest, { params }: Params) {
  try {
    const { table } = await params;
    const tableName = decodeURIComponent(table);
    const { newComment } = (await req.json()) as { newComment: string };
    const before = await getCurrentComment(tableName);
    const { ddl } = await previewCommentDdl({
      table: tableName,
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
