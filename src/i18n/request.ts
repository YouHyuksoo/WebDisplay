/**
 * @file request.ts
 * @description next-intl 서버 측 요청 설정. 서버 컴포넌트에서 번역을 사용할 때 필요하다.
 *
 * 【초보자 가이드】
 * - getRequestConfig: next-intl이 서버에서 요청마다 호출하는 설정 함수
 * - 이 앱은 URL 기반 라우팅을 사용하지 않으므로, 항상 기본 언어(ko)를 반환한다
 * - 클라이언트 측에서는 LocaleProvider가 localStorage 기반으로 언어를 전환한다
 */
import { getRequestConfig } from 'next-intl/server';
import { defaultLocale } from './config';

export default getRequestConfig(async () => {
  const locale = defaultLocale;

  return {
    locale,
    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    messages: (await import(`./messages/${locale}.json`)).default,
  };
});
