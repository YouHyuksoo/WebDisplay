/**
 * @file src/app/api/mxvc/process-history/resolve/route.ts
 * @description 공정통과이력 PID 입력 보조 — RATING_LABEL → TOP → BOT 체인 해석.
 *
 * 초보자 가이드:
 * - 클라이언트가 입력값 onBlur 시점에 호출해 TOP/BOT 시리얼을 자동 채우는 용도.
 * - 조회 본 API(`/api/mxvc/process-history`)는 자체적으로 동일 변환을 하지만,
 *   사용자가 실제 값을 UI 에서 확인·수정할 수 있도록 별도로 제공한다.
 *
 * 사용:
 *   GET ?ratingLabel=R6921...   → { top, bot, ratingLabel }
 *   GET ?topSerial=001163...A   → { top, bot }
 */

import { NextRequest, NextResponse } from 'next/server';
import { executeQuery } from '@/lib/db';

export const dynamic = 'force-dynamic';

async function resolveTopFromLabel(label: string): Promise<string | null> {
  const r = await executeQuery<{ SERIAL_NO: string | null }>(
    `SELECT SERIAL_NO
       FROM IP_PRODUCT_2D_BARCODE
      WHERE RATING_LABEL = :label
        AND SERIAL_NO IS NOT NULL
        AND ROWNUM = 1`,
    { label },
  );
  return r[0]?.SERIAL_NO ?? null;
}

async function resolveBotFromTop(top: string): Promise<string | null> {
  try {
    const r = await executeQuery<{ BOT: string | null }>(
      `SELECT F_GET_SMT_BOT_2_TOP(:t) AS BOT FROM DUAL`,
      { t: top },
    );
    const bot = r[0]?.BOT;
    if (!bot || bot === top) return null;
    return bot;
  } catch {
    return null;
  }
}

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const label = sp.get('ratingLabel')?.trim() ?? '';
  const top   = sp.get('topSerial')?.trim()   ?? '';

  try {
    if (label) {
      const resolvedTop = await resolveTopFromLabel(label);
      if (!resolvedTop) {
        return NextResponse.json({ top: '', bot: '', ratingLabel: label, matched: false });
      }
      const resolvedBot = await resolveBotFromTop(resolvedTop);
      return NextResponse.json({
        top: resolvedTop,
        bot: resolvedBot ?? '',
        ratingLabel: label,
        matched: true,
      });
    }

    if (top) {
      const resolvedBot = await resolveBotFromTop(top);
      return NextResponse.json({
        top,
        bot: resolvedBot ?? '',
        matched: !!resolvedBot,
      });
    }

    return NextResponse.json({ top: '', bot: '', matched: false });
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message, top: '', bot: '', matched: false },
      { status: 500 },
    );
  }
}
