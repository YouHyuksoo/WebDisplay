/**
 * @file LocaleProvider.tsx
 * @description 클라이언트 측 로케일 프로바이더. localStorage에서 언어 설정을 읽어
 * NextIntlClientProvider에 전달한다.
 *
 * 【초보자 가이드】
 * - 이 컴포넌트는 앱 전체를 감싸서 번역 기능을 제공한다
 * - localStorage의 'mes-display-locale' 키에서 저장된 언어를 읽는다
 * - 언어를 변경하려면 changeLocale() 함수를 호출하면 된다 (페이지 새로고침됨)
 * - getCurrentLocale()로 현재 언어를 가져올 수 있다
 * - 기본 언어는 한국어(ko)이다
 */
'use client';

import { NextIntlClientProvider } from 'next-intl';
import { useEffect, useState } from 'react';
import { defaultLocale, type Locale, locales } from '@/i18n/config';

import koMessages from '@/i18n/messages/ko.json';
import enMessages from '@/i18n/messages/en.json';
import esMessages from '@/i18n/messages/es.json';

/** 언어별 메시지 맵 */
const allMessages: Record<Locale, Record<string, unknown>> = {
  ko: koMessages,
  en: enMessages,
  es: esMessages,
};

/** localStorage 키 */
const STORAGE_KEY = 'mes-display-locale';

/**
 * 클라이언트 측 로케일 프로바이더 컴포넌트.
 * localStorage에서 언어 설정을 읽어 NextIntlClientProvider에 전달한다.
 */
export function LocaleProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(defaultLocale);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY) as Locale | null;
    if (saved && locales.includes(saved)) {
      setLocaleState(saved);
    }
  }, []);

  return (
    <NextIntlClientProvider
      locale={locale}
      messages={allMessages[locale] as Record<string, string>}
    >
      {children}
    </NextIntlClientProvider>
  );
}

/**
 * 언어를 변경하고 페이지를 새로고침한다.
 * @param locale - 변경할 언어 코드 ('ko' | 'en' | 'es')
 */
export function changeLocale(locale: Locale) {
  localStorage.setItem(STORAGE_KEY, locale);
  window.location.reload();
}

/**
 * 현재 설정된 언어를 반환한다.
 * 서버 측에서는 기본 언어(ko)를 반환한다.
 * @returns 현재 언어 코드
 */
export function getCurrentLocale(): Locale {
  if (typeof window === 'undefined') return defaultLocale;
  return (localStorage.getItem(STORAGE_KEY) as Locale) ?? defaultLocale;
}
