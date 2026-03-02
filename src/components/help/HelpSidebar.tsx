/**
 * @file HelpSidebar.tsx
 * @description 도움말 좌측 TOC 사이드바. 섹션 목록 + 활성 하이라이트.
 * 초보자 가이드: activeSection과 스크롤 위치가 동기화되어 현재 보고 있는 섹션이 강조 표시된다.
 */
'use client';

import { useTranslations } from 'next-intl';
import { SECTION_IDS, type SectionId } from './HelpPage';

/** 섹션별 아이콘 매핑 */
const SECTION_ICONS: Record<SectionId, string> = {
  'overview': '📋',
  'menu-system': '🎮',
  'smd-monitoring': '🔧',
  'pba-monitoring': '📦',
  'equipment': '⚙️',
  'quality': '✅',
  'settings': '🎛️',
  'shortcuts': '⌨️',
};

/** i18n 키 매핑 */
const SECTION_KEYS: Record<SectionId, string> = {
  'overview': 'overview',
  'menu-system': 'menuSystem',
  'smd-monitoring': 'smdMonitoring',
  'pba-monitoring': 'pbaMonitoring',
  'equipment': 'equipment',
  'quality': 'quality',
  'settings': 'settings',
  'shortcuts': 'shortcuts',
};

interface HelpSidebarProps {
  activeSection: SectionId;
  onSectionClick: (id: SectionId) => void;
  onBack: () => void;
}

export default function HelpSidebar({ activeSection, onSectionClick, onBack }: HelpSidebarProps) {
  const t = useTranslations('help');

  return (
    <aside className="flex w-64 shrink-0 flex-col border-r border-zinc-800 bg-zinc-900">
      {/* 헤더 */}
      <div className="border-b border-zinc-800 p-5">
        <h2 className="text-xl font-black text-white">{t('title')}</h2>
        <p className="mt-1 text-sm text-zinc-500">SOLUM MES Display</p>
      </div>

      {/* 목차 */}
      <nav className="flex-1 overflow-y-auto p-3">
        <ul className="space-y-1">
          {SECTION_IDS.map((id, idx) => {
            const isActive = activeSection === id;
            return (
              <li key={id}>
                <button
                  onClick={() => onSectionClick(id)}
                  className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-blue-600/20 text-blue-400'
                      : 'text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200'
                  }`}
                >
                  <span className="text-base">{SECTION_ICONS[id]}</span>
                  <span>
                    <span className="mr-1.5 text-zinc-600">{idx + 1}.</span>
                    {t(SECTION_KEYS[id])}
                  </span>
                  {isActive && (
                    <span className="ml-auto h-1.5 w-1.5 rounded-full bg-blue-400" />
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* 뒤로가기 */}
      <div className="border-t border-zinc-800 p-3">
        <button
          onClick={onBack}
          className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-sm text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-white"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          {t('backToMenu')}
        </button>
      </div>
    </aside>
  );
}
