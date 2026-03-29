/**
 * @file src/lib/menu/i18n.ts
 * @description 메뉴 시스템(vanilla JS) 전용 다국어 유틸리티.
 *
 * 초보자 가이드:
 * 1. **주요 개념**: React useTranslations 훅을 사용할 수 없는 vanilla JS 코드에서
 *    번역 함수 `t(key)` 를 제공한다.
 * 2. **사용 방법**:
 *    ```ts
 *    import { t } from '@/lib/menu/i18n';
 *    t('menuUI.edit');              // → '수정' (ko) / 'Edit' (en) / 'Editar' (es)
 *    t('menuUI.minutesAgo', {n:5}); // → '5분 전' (ko) / '5 min ago' (en)
 *    getScreenTitle(shortcut);      // → screens.ts에서 로케일별 제목 반환
 *    ```
 * 3. **로케일 소스**: localStorage의 'mes-display-locale' 키 (LocaleProvider와 동일)
 */

import koMessages from '@/i18n/messages/ko.json';
import enMessages from '@/i18n/messages/en.json';
import esMessages from '@/i18n/messages/es.json';
import viMessages from '@/i18n/messages/vi.json';
import { KEYS } from './storage';
import { SCREENS } from '@/lib/screens';

const allMessages: Record<string, Record<string, unknown>> = {
  ko: koMessages,
  en: enMessages,
  es: esMessages,
  vi: viMessages,
};

/**
 * 현재 로케일을 localStorage에서 읽어 반환
 * @returns 'ko' | 'en' | 'es'
 */
function getLocale(): string {
  if (typeof window === 'undefined') return 'ko';
  return localStorage.getItem(KEYS.LOCALE) ?? 'ko';
}

/**
 * 메뉴 시스템용 번역 함수
 * @param key - 점(.)으로 구분된 메시지 키 (예: 'menuUI.edit', 'menuUI.catName0')
 * @param params - ICU 스타일 보간 파라미터 (예: \{ n: 5 \})
 * @returns 번역된 문자열, 키를 못 찾으면 key 그대로 반환
 */
export function t(key: string, params?: Record<string, string | number>): string {
  const locale = getLocale();
  const messages = allMessages[locale] ?? allMessages.ko;

  // 'menuUI.edit' → messages['menuUI']['edit']
  const parts = key.split('.');
  let value: unknown = messages;
  for (const part of parts) {
    if (value && typeof value === 'object') {
      value = (value as Record<string, unknown>)[part];
    } else {
      return key;
    }
  }

  if (typeof value !== 'string') return key;

  // {n} → params.n 보간
  if (params) {
    return Object.entries(params).reduce(
      (s, [k, v]) => s.replaceAll(`{${k}}`, String(v)),
      value,
    );
  }

  return value;
}

/**
 * 바로가기 URL에서 screen ID를 추출하여 번역된 제목 반환.
 * Single Source of Truth: screens.ts의 제목을 직접 참조한다.
 *
 * @param shortcut - 바로가기 객체 (url, title 포함)
 * @returns 번역된 화면 제목. 매칭 실패 시 원본 title 반환.
 */
/** CTQ 카드 ID → i18n 키 매핑 */
const CTQ_TITLE_KEYS: Record<string, string> = {
  'ctq-repeat': 'ctq.nav.repeatability',
  'ctq-non-consec': 'ctq.nav.nonConsecutive',
  'ctq-accident': 'ctq.nav.accident',
  'ctq-material': 'ctq.nav.material',
  'ctq-open-short': 'ctq.nav.openShort',
  'ctq-fpy': 'ctq.nav.fpy',
  'ctq-equipment': 'ctq.nav.equipment',
  'ctq-repair': 'ctq.nav.repairStatus',
  'ctq-equip-hist': 'ctq.nav.equipmentHistory',
  'ctq-indicator': 'ctq.nav.indicator',
  'ctq-dashboard': 'ctq.nav.qualityDashboard',
  'ctq-analysis': 'ctq.nav.analysis',
};

export function getScreenTitle(shortcut: { id?: string; url: string; title: string }): string {
  // CTQ 카드: i18n 키로 번역
  if (shortcut.id && CTQ_TITLE_KEYS[shortcut.id]) {
    const translated = t(CTQ_TITLE_KEYS[shortcut.id]);
    if (translated !== CTQ_TITLE_KEYS[shortcut.id]) return translated;
  }

  // Display 카드: screens.ts에서 로케일별 제목
  const match = shortcut.url.match(/\/display\/(\d+)/);
  if (match) {
    const screen = SCREENS[match[1]];
    if (screen) {
      const locale = getLocale();
      if (locale === 'ko') return screen.titleKo;
      if (locale === 'es' && screen.titleEs) return screen.titleEs;
      return screen.title; // 영문 기본 (vi도 여기)
    }
  }
  return shortcut.title;
}
