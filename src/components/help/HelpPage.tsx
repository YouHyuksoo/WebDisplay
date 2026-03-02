/**
 * @file HelpPage.tsx
 * @description 도움말 메인 페이지. 사이드바 TOC + 콘텐츠 영역 조합.
 * 초보자 가이드: 좌측 사이드바에서 섹션 클릭 시 우측 콘텐츠가 해당 위치로 스크롤.
 * 스크롤 위치에 따라 사이드바 활성 항목이 자동 변경된다.
 */
'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import HelpSidebar from './HelpSidebar';
import HelpContent from './HelpContent';

/** 섹션 ID 목록 — 목차 순서와 동일 */
export const SECTION_IDS = [
  'overview',
  'menu-system',
  'smd-monitoring',
  'pba-monitoring',
  'equipment',
  'quality',
  'settings',
  'shortcuts',
] as const;

export type SectionId = (typeof SECTION_IDS)[number];

export default function HelpPage() {
  const t = useTranslations('help');
  const router = useRouter();
  const searchParams = useSearchParams();
  const contentRef = useRef<HTMLDivElement>(null);
  const [activeSection, setActiveSection] = useState<SectionId>('overview');

  /** 스크롤 위치 기반 활성 섹션 감지 */
  const handleScroll = useCallback(() => {
    const container = contentRef.current;
    if (!container) return;

    const scrollTop = container.scrollTop + 120;
    for (let i = SECTION_IDS.length - 1; i >= 0; i--) {
      const el = document.getElementById(SECTION_IDS[i]);
      if (el && el.offsetTop <= scrollTop) {
        setActiveSection(SECTION_IDS[i]);
        break;
      }
    }
  }, []);

  /** 섹션 클릭 시 스크롤 */
  const scrollToSection = useCallback((id: SectionId) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      setActiveSection(id);
    }
  }, []);

  /** screenId 파라미터 → 해당 섹션 자동 스크롤 */
  useEffect(() => {
    const screenId = searchParams.get('screenId');
    if (!screenId) return;

    const sectionMap: Record<string, SectionId> = {
      '24': 'smd-monitoring', '25': 'smd-monitoring',
      '26': 'smd-monitoring', '27': 'smd-monitoring',
      '21': 'pba-monitoring',
      '34': 'equipment', '35': 'equipment',
      '29': 'quality', '30': 'quality', '31': 'quality', '37': 'quality',
      '18': 'settings',
    };
    const target = sectionMap[screenId];
    if (target) {
      setTimeout(() => scrollToSection(target), 300);
    }
  }, [searchParams, scrollToSection]);

  return (
    <div className="flex h-screen overflow-hidden">
      {/* 사이드바 */}
      <HelpSidebar
        activeSection={activeSection}
        onSectionClick={scrollToSection}
        onBack={() => router.push('/')}
      />

      {/* 콘텐츠 영역 */}
      <div
        ref={contentRef}
        className="flex-1 overflow-y-auto scroll-smooth"
        onScroll={handleScroll}
      >
        <HelpContent />
      </div>
    </div>
  );
}
