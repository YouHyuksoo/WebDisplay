/**
 * @file src/app/api/ai-chat/feedback/route.ts
 * @description AI 챗 피드백 CRUD API
 *   - POST: 좋아요/싫어요 피드백 저장 (AI_CHAT_FEEDBACK 테이블 INSERT)
 *   - GET: 통계(mode=stats) 또는 목록(mode=list) 조회
 *   - DELETE: 선택 삭제(feedbackIds) 또는 전체 삭제(deleteAll)
 *
 * 초보자 가이드:
 *   피드백 데이터는 AI_CHAT_FEEDBACK 테이블에 저장된다.
 *   POST로 피드백을 기록하고, GET으로 통계·목록을 조회하며,
 *   DELETE로 선택/전체 삭제할 수 있다.
 */

import { NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { executeQuery, executeDml } from '@/lib/db';

export const dynamic = 'force-dynamic';

/* ------------------------------------------------------------------ */
/*  POST — 피드백 저장                                                  */
/* ------------------------------------------------------------------ */

interface FeedbackBody {
  messageId: string;
  sessionId: string;
  rating: 'POSITIVE' | 'NEGATIVE' | 'NEUTRAL';
  userQuery?: string;
  llmResponse?: string;
  sqlQuery?: string;
  resultJson?: string;
  providerId?: string;
  modelId?: string;
  totalMs?: number;
  sqlGenMs?: number;
  sqlExecMs?: number;
  analysisMs?: number;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as FeedbackBody;
    const { messageId, sessionId, rating } = body;

    if (!messageId || !sessionId || !rating) {
      return NextResponse.json(
        { error: 'messageId, sessionId, rating 은 필수입니다' },
        { status: 400 },
      );
    }

    const feedbackId = randomUUID();

    await executeDml(
      `INSERT INTO AI_CHAT_FEEDBACK (
        FEEDBACK_ID, MESSAGE_ID, SESSION_ID, RATING,
        USER_QUERY, LLM_RESPONSE, SQL_QUERY, RESULT_JSON,
        PROVIDER_ID, MODEL_ID,
        TOTAL_MS, SQL_GEN_MS, SQL_EXEC_MS, ANALYSIS_MS
      ) VALUES (
        :feedbackId, :messageId, :sessionId, :rating,
        :userQuery, :llmResponse, :sqlQuery, :resultJson,
        :providerId, :modelId,
        :totalMs, :sqlGenMs, :sqlExecMs, :analysisMs
      )`,
      {
        feedbackId,
        messageId,
        sessionId,
        rating,
        userQuery: body.userQuery ?? null,
        llmResponse: body.llmResponse ?? null,
        sqlQuery: body.sqlQuery ?? null,
        resultJson: body.resultJson ?? null,
        providerId: body.providerId ?? null,
        modelId: body.modelId ?? null,
        totalMs: body.totalMs ?? null,
        sqlGenMs: body.sqlGenMs ?? null,
        sqlExecMs: body.sqlExecMs ?? null,
        analysisMs: body.analysisMs ?? null,
      },
    );

    return NextResponse.json({ feedbackId });
  } catch (e) {
    console.error('[ai-chat/feedback POST]', e);
    return NextResponse.json({ error: 'feedback save failed' }, { status: 500 });
  }
}

/* ------------------------------------------------------------------ */
/*  GET — 통계(stats) 또는 목록(list) 조회                               */
/* ------------------------------------------------------------------ */

/** WHERE 절 동적 빌더 */
function buildWhere(params: URLSearchParams) {
  const clauses: string[] = [];
  const binds: Record<string, string> = {};

  const rating = params.get('rating');
  if (rating) {
    clauses.push('RATING = :rating');
    binds.rating = rating;
  }

  const providerId = params.get('providerId');
  if (providerId) {
    clauses.push('PROVIDER_ID = :providerId');
    binds.providerId = providerId;
  }

  const dateFrom = params.get('dateFrom');
  if (dateFrom) {
    clauses.push("CREATED_AT >= TO_TIMESTAMP(:dateFrom || ' 00:00:00', 'YYYY-MM-DD HH24:MI:SS')");
    binds.dateFrom = dateFrom;
  }

  const dateTo = params.get('dateTo');
  if (dateTo) {
    clauses.push("CREATED_AT <= TO_TIMESTAMP(:dateTo || ' 23:59:59', 'YYYY-MM-DD HH24:MI:SS')");
    binds.dateTo = dateTo;
  }

  const where = clauses.length > 0 ? 'WHERE ' + clauses.join(' AND ') : '';
  return { where, binds };
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const mode = searchParams.get('mode') ?? 'stats';

    const { where, binds } = buildWhere(searchParams);

    /* ---------- mode = list ---------- */
    if (mode === 'list') {
      const page = Math.max(1, Number(searchParams.get('page') ?? '1'));
      const pageSize = Math.min(100, Math.max(1, Number(searchParams.get('pageSize') ?? '20')));
      const offset = (page - 1) * pageSize;

      const countRows = await executeQuery<{ CNT: number }>(
        `SELECT COUNT(*) AS CNT FROM AI_CHAT_FEEDBACK ${where}`,
        binds,
      );
      const total = countRows[0]?.CNT ?? 0;

      const rows = await executeQuery<Record<string, unknown>>(
        `SELECT * FROM (
           SELECT A.*, ROW_NUMBER() OVER (ORDER BY CREATED_AT DESC) AS RN
           FROM AI_CHAT_FEEDBACK A ${where}
         ) WHERE RN > :offset AND RN <= :limit`,
        { ...binds, offset, limit: offset + pageSize },
      );

      return NextResponse.json({
        rows,
        totalCount: total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
      });
    }

    /* ---------- mode = stats ---------- */

    // 1) 총건수 + 긍정/부정/중립 + 평균 성능
    const summary = await executeQuery<{
      TOTAL: number;
      POSITIVE: number;
      NEGATIVE: number;
      NEUTRAL: number;
      AVG_TOTAL_MS: number;
      AVG_SQL_GEN_MS: number;
      AVG_SQL_EXEC_MS: number;
      AVG_ANALYSIS_MS: number;
    }>(
      `SELECT
         COUNT(*) AS TOTAL,
         NVL(SUM(CASE WHEN RATING = 'POSITIVE' THEN 1 ELSE 0 END), 0) AS POSITIVE,
         NVL(SUM(CASE WHEN RATING = 'NEGATIVE' THEN 1 ELSE 0 END), 0) AS NEGATIVE,
         NVL(SUM(CASE WHEN RATING = 'NEUTRAL'  THEN 1 ELSE 0 END), 0) AS NEUTRAL,
         NVL(ROUND(AVG(TOTAL_MS)), 0)     AS AVG_TOTAL_MS,
         NVL(ROUND(AVG(SQL_GEN_MS)), 0)   AS AVG_SQL_GEN_MS,
         NVL(ROUND(AVG(SQL_EXEC_MS)), 0)  AS AVG_SQL_EXEC_MS,
         NVL(ROUND(AVG(ANALYSIS_MS)), 0)  AS AVG_ANALYSIS_MS
       FROM AI_CHAT_FEEDBACK ${where}`,
      binds,
    );
    const s = summary[0];
    const positiveRate = s.TOTAL > 0 ? Math.round((s.POSITIVE / s.TOTAL) * 100) : 0;

    // 추가 AND 조건을 where에 붙이기 위한 헬퍼
    const andPrefix = where ? where + ' AND' : 'WHERE';

    // 2) 일별 사용량 (최근 30일)
    const dailyUsage = await executeQuery<{ DT: string; CNT: number; POS: number }>(
      `SELECT TO_CHAR(CREATED_AT, 'YYYY-MM-DD') AS DT, COUNT(*) AS CNT,
              SUM(CASE WHEN RATING = 'POSITIVE' THEN 1 ELSE 0 END) AS POS
         FROM AI_CHAT_FEEDBACK
        ${andPrefix} CREATED_AT >= SYSTIMESTAMP - INTERVAL '30' DAY
        GROUP BY TO_CHAR(CREATED_AT, 'YYYY-MM-DD')
        ORDER BY DT`,
      binds,
    );

    // 3) TOP 질문 (최다 빈도)
    const topQueries = await executeQuery<{ QUERY_TEXT: string; CNT: number }>(
      `SELECT * FROM (
         SELECT DBMS_LOB.SUBSTR(USER_QUERY, 100, 1) AS QUERY_TEXT, COUNT(*) AS CNT
           FROM AI_CHAT_FEEDBACK
          ${andPrefix} USER_QUERY IS NOT NULL
          GROUP BY DBMS_LOB.SUBSTR(USER_QUERY, 100, 1)
          ORDER BY CNT DESC
       ) WHERE ROWNUM <= 10`,
      binds,
    );

    // 4) 프로바이더별 통계
    const providerStats = await executeQuery<{
      PROVIDER_ID: string;
      CNT: number;
      POSITIVE: number;
      NEGATIVE: number;
      AVG_TOTAL_MS: number;
    }>(
      `SELECT PROVIDER_ID,
              COUNT(*) AS CNT,
              SUM(CASE WHEN RATING = 'POSITIVE' THEN 1 ELSE 0 END) AS POSITIVE,
              SUM(CASE WHEN RATING = 'NEGATIVE' THEN 1 ELSE 0 END) AS NEGATIVE,
              ROUND(AVG(TOTAL_MS)) AS AVG_TOTAL_MS
         FROM AI_CHAT_FEEDBACK
        ${andPrefix} PROVIDER_ID IS NOT NULL
        GROUP BY PROVIDER_ID
        ORDER BY CNT DESC`,
      binds,
    );

    return NextResponse.json({
      totalFeedbacks: s.TOTAL,
      positive: s.POSITIVE,
      negative: s.NEGATIVE,
      neutral: s.NEUTRAL,
      positiveRate,
      avgTotalMs: s.AVG_TOTAL_MS ?? 0,
      avgSqlGenMs: s.AVG_SQL_GEN_MS ?? 0,
      avgSqlExecMs: s.AVG_SQL_EXEC_MS ?? 0,
      avgAnalysisMs: s.AVG_ANALYSIS_MS ?? 0,
      dailyUsage: dailyUsage.map((d) => ({ date: d.DT, count: d.CNT, positive: d.POS })),
      topQueries: topQueries.map((q) => ({ query: q.QUERY_TEXT, count: q.CNT })),
      providerStats: providerStats.map((p) => ({
        providerId: p.PROVIDER_ID,
        count: p.CNT,
        positiveRate: p.CNT > 0 ? Math.round((p.POSITIVE / p.CNT) * 100) : 0,
        avgTotalMs: p.AVG_TOTAL_MS ?? 0,
      })),
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error('[ai-chat/feedback GET]', msg, e);
    return NextResponse.json({ error: `feedback query failed: ${msg}` }, { status: 500 });
  }
}

/* ------------------------------------------------------------------ */
/*  DELETE — 선택 삭제 또는 전체 삭제                                     */
/* ------------------------------------------------------------------ */

interface DeleteBody {
  feedbackIds?: string[];
  deleteAll?: boolean;
}

export async function DELETE(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as DeleteBody;

    if (body.deleteAll) {
      const result = await executeDml('DELETE FROM AI_CHAT_FEEDBACK', {});
      return NextResponse.json({ deleted: result });
    }

    if (!body.feedbackIds || body.feedbackIds.length === 0) {
      return NextResponse.json(
        { error: 'feedbackIds 배열 또는 deleteAll: true 가 필요합니다' },
        { status: 400 },
      );
    }

    // 바인드 변수를 개별로 생성하여 IN 절 구성
    const placeholders = body.feedbackIds.map((_, i) => `:id${i}`).join(',');
    const deleteBinds: Record<string, string> = {};
    body.feedbackIds.forEach((id, i) => {
      deleteBinds[`id${i}`] = id;
    });

    const result = await executeDml(
      `DELETE FROM AI_CHAT_FEEDBACK WHERE FEEDBACK_ID IN (${placeholders})`,
      deleteBinds,
    );

    return NextResponse.json({ deleted: result });
  } catch (e) {
    console.error('[ai-chat/feedback DELETE]', e);
    return NextResponse.json({ error: 'feedback delete failed' }, { status: 500 });
  }
}
