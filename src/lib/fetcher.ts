/**
 * @file fetcher.ts
 * @description SWR에서 사용하는 공용 fetcher 함수.
 *
 * 초보자 가이드:
 * 1. SWR은 데이터 패칭 라이브러리로, fetcher 함수를 통해 API를 호출한다.
 * 2. 이 파일은 프로젝트 전체에서 공통으로 사용하는 fetcher를 한 곳에 정의한다.
 * 3. 사용법: `import { fetcher } from '@/lib/fetcher';`
 *    그리고 `useSWR('/api/...', fetcher, { ... })` 형태로 사용.
 * 4. 에러 처리가 포함되어 있어, HTTP 오류 시 자동으로 예외를 던진다.
 */

/**
 * SWR 공용 fetcher.
 * HTTP 응답이 실패(4xx/5xx)이면 에러를 throw하여 SWR의 error 상태로 전달한다.
 * @param url - 요청할 API URL
 * @returns JSON으로 파싱된 응답 데이터
 */
export const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`API 오류 (${res.status})`);
  return res.json();
};
