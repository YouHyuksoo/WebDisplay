/**
 * @file src/instrumentation.ts
 * @description
 * Next.js 서버 초기화 훅 (Next.js 15 공식 지원).
 * 서버 기동 시 1회 자동 실행 — CTQ 모니터 잡 조건부 재개.
 *
 * 초보자 가이드:
 * - 이 파일은 Next.js가 서버 시작 시 자동으로 실행합니다 (별도 설정 불필요)
 * - CTQ_MONITOR_ENABLED=true (.env.local) 인 서버에서만 잡이 시작됨
 * - 환경변수가 없거나 false면 아무것도 하지 않음 (완전 차단)
 * - NEXT_RUNTIME === 'nodejs' 조건 필수: Edge 런타임에서는 DB 접근 불가
 * - 설정 페이지 접속 없이도 서버 기동 즉시 잡이 재개됨
 *
 * 서버별 설정 위치: 프로젝트 루트 .env.local
 * - 알림 필요한 서버: CTQ_MONITOR_ENABLED=true
 * - 알림 불필요한 서버: CTQ_MONITOR_ENABLED=false (또는 줄 생략)
 */

export async function register() {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return;

  if (process.env.CTQ_MONITOR_ENABLED !== 'true') {
    console.log('[instrumentation] CTQ 모니터 비활성화 (CTQ_MONITOR_ENABLED != true)');
    return;
  }

  try {
    const { getJobManager } = await import('@/lib/monitor/ctq-monitor');
    const { getSettings } = await import('@/lib/slack-settings');

    const settings = await getSettings();
    if (settings.monitorEnabled) {
      getJobManager().start(settings.monitorIntervalMinutes);
      console.log('[instrumentation] CTQ 모니터 잡 자동 재개');
    } else {
      console.log('[instrumentation] CTQ 모니터 대기 중 (UI에서 비활성화됨)');
    }
  } catch (e) {
    console.error('[instrumentation] CTQ 모니터 초기화 실패:', e);
  }
}
