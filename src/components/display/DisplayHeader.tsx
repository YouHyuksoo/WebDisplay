/**
 * @file DisplayHeader.tsx
 * @description 디스플레이 화면 공통 헤더. 화면 제목, 현재 시간, 새로고침/스크롤 주기 표시.
 * 초보자 가이드: 모든 디스플레이 화면 상단에 고정되는 얇은 바.
 */
'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { Globe, Sun, Moon, Settings, Database, HelpCircle, LogOut } from 'lucide-react';
import { useTheme } from 'next-themes';
import { changeLocale } from '@/components/providers/LocaleProvider';
import LineSelectModal from '../common/LineSelectModal';
import SqlViewerModal from '../common/SqlViewerModal';
import useDisplayTiming from '@/hooks/useDisplayTiming';
import { hasLineSelection } from '@/lib/display-helpers';
import Link from 'next/link';

interface DisplayHeaderProps {
  title: string;
  screenId?: string;
  /** 설정 모달 렌더 함수. 미지정 시 기본 LineSelectModal 사용 */
  renderSettingsModal?: (props: { isOpen: boolean; onClose: () => void; screenId: string }) => React.ReactNode;
}

export default function DisplayHeader({ title, screenId, renderSettingsModal }: DisplayHeaderProps) {
  const t = useTranslations('display');
  const router = useRouter();
  const locale = useLocale();
  const { theme, setTheme } = useTheme();
  
  const [time, setTime] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSqlOpen, setIsSqlOpen] = useState(false);
  const [showLocaleMenu, setShowLocaleMenu] = useState(false);
  
  /** 라인 선택 필수 여부 (저장값 없을 때 true) */
  const [lineRequired, setLineRequired] = useState(false);
  const timing = useDisplayTiming();

  useEffect(() => {
    const tick = () => setTime(new Date().toLocaleTimeString('ko-KR'));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  /* ── 최초 접속 시 라인 미선택이면 자동 팝업 ── */
  useEffect(() => {
    if (screenId && !renderSettingsModal && !hasLineSelection(screenId)) {
      setLineRequired(true);
      setIsModalOpen(true);
    }
  }, [screenId, renderSettingsModal]);

  // 언어 변경 함수 (localStorage 기반 → 페이지 새로고침)
  const handleLocaleChange = (newLocale: string) => {
    setShowLocaleMenu(false);
    changeLocale(newLocale as 'ko' | 'en' | 'es' | 'vi');
  };

  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b border-zinc-700 bg-zinc-900 px-6 z-50">
      <h1 className="text-2xl font-black text-white truncate max-w-[50%]">
        {title}
      </h1>
      
      <div className="flex items-center gap-3 text-sm text-zinc-400">
        {/* 인터벌 정보 */}
        <div className="hidden lg:flex items-center gap-3 mr-2 px-3 py-1 bg-zinc-800/50 rounded-full border border-zinc-700/50">
          <span>{t('refreshInterval', { seconds: timing.refreshSeconds })}</span>
          <span className="w-px h-3 bg-zinc-700" />
          <span>{t('scrollInterval', { seconds: timing.scrollSeconds })}</span>
        </div>

        {/* 현재 시각 */}
        <span className="font-mono text-white bg-zinc-800 px-3 py-1 rounded-md border border-zinc-700">
          {time}
        </span>

        <div className="flex items-center gap-1.5 ml-2 border-l border-zinc-700 pl-4">
          {/* 다국어 선택 */}
          <div className="relative">
            <button
              onClick={() => setShowLocaleMenu(!showLocaleMenu)}
              className="rounded-full p-2 text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-white"
              title="Change Language"
            >
              <Globe size={18} />
            </button>
            {showLocaleMenu && (
              <div className="absolute right-0 top-full mt-2 w-32 bg-zinc-800 border border-zinc-700 rounded-lg shadow-xl z-50 py-1 overflow-hidden">
                {[
                  { id: 'ko', label: '한국어', flag: '🇰🇷' },
                  { id: 'en', label: 'English', flag: '🇺🇸' },
                  { id: 'es', label: 'Español', flag: '🇪🇸' },
                  { id: 'vi', label: 'Tiếng Việt', flag: '🇻🇳' },
                ].map((lang) => (
                  <button
                    key={lang.id}
                    onClick={() => handleLocaleChange(lang.id)}
                    className={`w-full flex items-center gap-2 px-3 py-2 text-xs text-left transition-colors hover:bg-zinc-700 ${
                      locale === lang.id ? 'text-blue-400 font-bold bg-zinc-700/50' : 'text-zinc-300'
                    }`}
                  >
                    <span>{lang.flag}</span>
                    <span>{lang.label}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* 테마 토글 */}
          <button
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className="rounded-full p-2 text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-yellow-400"
            title="Toggle Theme"
          >
            {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
          </button>

          {screenId && (
            <>
              {/* 설정 (라인 선택) */}
              <button
                onClick={() => setIsModalOpen(true)}
                className="rounded-full p-2 text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-white"
                data-tooltip={t('settingsTooltip')}
              >
                <Settings size={18} />
              </button>
              {renderSettingsModal
                ? renderSettingsModal({ isOpen: isModalOpen, onClose: () => setIsModalOpen(false), screenId })
                : <LineSelectModal
                    isOpen={isModalOpen}
                    onClose={() => { setIsModalOpen(false); setLineRequired(false); }}
                    screenId={screenId}
                    required={lineRequired}
                  />
              }

              {/* SQL 뷰어 */}
              <button
                onClick={() => setIsSqlOpen(true)}
                className="rounded-full p-2 text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-emerald-400"
                title={t('sqlViewTooltip')}
              >
                <Database size={18} />
              </button>
              <SqlViewerModal
                isOpen={isSqlOpen}
                onClose={() => setIsSqlOpen(false)}
                screenId={screenId}
              />
            </>
          )}

          {/* 도움말 */}
          <Link
            href={screenId ? `/help?screenId=${screenId}` : '/help'}
            className="rounded-full p-2 text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-blue-400"
            title={t('helpTooltip')}
          >
            <HelpCircle size={18} />
          </Link>

          {/* 메뉴로 나가기 */}
          <button
            onClick={() => router.push('/')}
            className="rounded-full p-2 text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-red-400"
            title={t('backToMenu')}
          >
            <LogOut size={20} />
          </button>
        </div>
      </div>
    </header>
  );
}
