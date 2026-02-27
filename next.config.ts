/**
 * @file next.config.ts
 * @description Next.js 설정 파일. next-intl 플러그인을 적용한다.
 *
 * 【초보자 가이드】
 * - createNextIntlPlugin: next-intl의 서버 측 번역 기능을 활성화하는 플러그인
 * - withNextIntl: Next.js 설정을 감싸서 i18n 기능을 추가하는 래퍼 함수
 * - './src/i18n/request.ts' 경로를 지정해 서버 측 요청 설정을 연결한다
 */
import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

const nextConfig: NextConfig = {
  /* config options here */
};

export default withNextIntl(nextConfig);
