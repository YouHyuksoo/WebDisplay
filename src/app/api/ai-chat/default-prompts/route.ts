/**
 * @file src/app/api/ai-chat/default-prompts/route.ts
 * @description wiki/ai-chat/identity/ 의 기본 identity 프롬프트를 클라이언트에 제공.
 *
 * 초보자 가이드:
 * - /settings/ai-models 의 "기본값 불러오기" 버튼이 이 엔드포인트를 호출.
 * - 서버 전용 md-loader 를 클라이언트에서 직접 쓸 수 없어서 이 API가 다리 역할.
 */

import { NextResponse } from 'next/server';
import { loadAiChatContext } from '@/lib/ai/context/md-loader';

export async function GET() {
  const ctx = await loadAiChatContext();
  return NextResponse.json({
    sqlGeneration: ctx.identity.sqlGeneration,
    analysis: ctx.identity.analysis,
  });
}
