/**
 * @file config.ts
 * @description i18n 설정 파일. 지원 언어(ko, en, es) 및 기본 언어를 정의한다.
 *
 * 【초보자 가이드】
 * - locales: 앱에서 지원하는 언어 목록 (한국어, 영어, 스페인어)
 * - Locale 타입: locales 배열의 요소 타입 ('ko' | 'en' | 'es')
 * - defaultLocale: 사용자가 언어를 설정하지 않았을 때 기본으로 사용할 언어
 */

/** 지원 언어 목록 */
export const locales = ['ko', 'en', 'es'] as const;

/** 지원 언어 타입 */
export type Locale = (typeof locales)[number];

/** 기본 언어 (한국어) */
export const defaultLocale: Locale = 'ko';
