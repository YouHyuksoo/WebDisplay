/**
 * @file useDbClock.ts
 * @description DB 서버 시간 기반 시계 hook.
 * 초보자 가이드:
 * - 최초 1회 /api/db-time에서 Oracle SYSDATE를 조회하여 브라우저와의 오프셋을 계산한다.
 * - 이후 매초 로컬 타이머로 DB 시간을 보정 표시한다 (매초 DB 쿼리하지 않음).
 * - DB 조회 실패 시 로컬 시간으로 fallback한다.
 */
'use client';

import { useEffect, useState } from 'react';

/** HH:MM:SS 형식으로 시간 포맷 */
function formatTime(d: Date): string {
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}`;
}

export default function useDbClock(): string {
  const [time, setTime] = useState('');

  useEffect(() => {
    let offsetMs = 0;
    let intervalId: ReturnType<typeof setInterval>;

    const tick = () => setTime(formatTime(new Date(Date.now() + offsetMs)));

    (async () => {
      try {
        const res = await fetch('/api/db-time');
        if (res.ok) {
          const { time: dbTimeStr } = await res.json();
          if (dbTimeStr) {
            const dbMs = new Date(dbTimeStr.replace(' ', 'T')).getTime();
            offsetMs = dbMs - Date.now();
          }
        }
      } catch { /* DB 실패 시 로컬 시간 사용 */ }
      tick();
      intervalId = setInterval(tick, 1000);
    })();

    return () => clearInterval(intervalId);
  }, []);

  return time;
}
