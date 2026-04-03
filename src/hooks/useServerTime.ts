/**
 * @file src/hooks/useServerTime.ts
 * @description DB 서버 시간 조회 훅 — 날짜 필터 초기값에 사용
 * 초보자 가이드:
 * 1. DB 서버의 SYSDATE를 가져와서 today(YYYY-MM-DD) 반환
 * 2. 로드 전에는 빈 문자열, 로드 후 DB 날짜로 설정
 * 3. 모든 검색 페이지에서 import해서 사용
 */
"use client";

import useSWR from "swr";

interface ServerTime { today: string; now: string; }

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export function useServerTime(): string {
  const { data } = useSWR<ServerTime>("/api/server-time", fetcher, {
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
    dedupingInterval: 60000,
  });
  return data?.today ?? "";
}
