/**
 * @file src/hooks/useServerTime.ts
 * @description DB 서버 시간 조회 훅 — 날짜 필터 초기값에 사용
 * 초보자 가이드:
 * 1. DB 서버의 SYSDATE를 가져와서 today(YYYY-MM-DD) 반환
 * 2. 로드 전에는 빈 문자열, 로드 후 DB 날짜로 설정
 * 3. 모든 검색 페이지에서 import해서 사용
 * 4. useServerNow(): 현재 서버 시각을 datetime-local 형식(YYYY-MM-DDTHH:mm)으로 반환
 */
"use client";

import useSWR from "swr";

interface ServerTime { today: string; now: string; }

const fetcher = (url: string) => fetch(url).then((r) => r.json());

const SWR_OPTIONS = {
  revalidateOnFocus: false,
  revalidateOnReconnect: false,
  dedupingInterval: 60000,
};

/** DB 서버 오늘 날짜(YYYY-MM-DD) */
export function useServerTime(): string {
  const { data } = useSWR<ServerTime>("/api/server-time", fetcher, SWR_OPTIONS);
  return data?.today ?? "";
}

/** DB 서버 현재 시각(YYYY-MM-DDTHH:mm) — datetime-local 입력값으로 바로 사용 가능 */
export function useServerNow(): string {
  const { data } = useSWR<ServerTime>("/api/server-time", fetcher, SWR_OPTIONS);
  if (!data?.now) return "";
  // API: "YYYY-MM-DD HH24:MI:SS" → datetime-local: "YYYY-MM-DDTHH:mm"
  return data.now.replace(" ", "T").slice(0, 16);
}
