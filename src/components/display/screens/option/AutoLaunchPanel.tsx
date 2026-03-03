/**
 * @file AutoLaunchPanel.tsx
 * @description 시작 페이지(자동 실행) 설정 패널.
 * 프로그램 시작 시 자동으로 실행될 화면을 지정한다.
 */
'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { KEYS } from '@/lib/menu/storage';
import { SCREENS } from '@/lib/screens';
import { Rocket, Power, Trash2, CheckCircle2 } from 'lucide-react';

/** 드롭다운 옵션용 화면 목록 (옵션 화면 자신은 제외) */
const SCREEN_OPTIONS = Object.values(SCREENS)
  .filter((s) => s.id !== '18')
  .map((s) => ({ id: s.id, label: `${s.titleKo} (${s.id})` }));

export default function AutoLaunchPanel() {
  const t = useTranslations('option');
  const [autoLaunchId, setAutoLaunchId] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const id = localStorage.getItem(KEYS.AUTO_LAUNCH);
    setAutoLaunchId(id);
  }, []);

  const save = (id: string | null) => {
    if (id) {
      localStorage.setItem(KEYS.AUTO_LAUNCH, id);
    } else {
      localStorage.removeItem(KEYS.AUTO_LAUNCH);
    }
    setAutoLaunchId(id);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const selectedLabel = SCREEN_OPTIONS.find((s) => s.id === autoLaunchId)?.label ?? t('notSet');

  return (
    <div className="space-y-8 p-8">
      {/* 설명 헤더 */}
      <div className="rounded-xl bg-blue-50 p-6 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800/30">
        <div className="flex gap-4">
          <div className="flex-shrink-0 flex items-center justify-center w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-800">
            <Rocket className="text-blue-600 dark:text-blue-400" size={24} />
          </div>
          <div>
            <h3 className="text-lg font-bold text-blue-900 dark:text-blue-100 mb-1">{t('launchTitle')}</h3>
            <p className="text-sm text-blue-800/70 dark:text-blue-300/70 leading-relaxed">
              {t('launchDesc1')}<br />
              {t('launchDesc2')}
            </p>
          </div>
        </div>
      </div>

      {/* 현재 상태 */}
      <div className="grid gap-6">
        <div className="flex flex-col gap-2">
          <label className="text-sm font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
            {t('currentLaunch')}
          </label>
          <div className="flex items-center gap-4 p-4 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700">
            {autoLaunchId ? (
              <>
                <div className="w-10 h-10 flex items-center justify-center rounded-lg bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400">
                  <Power size={20} />
                </div>
                <div className="flex-1">
                  <span className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                    {selectedLabel}
                  </span>
                </div>
                <button
                  onClick={() => save(null)}
                  className="p-2 text-zinc-400 hover:text-red-500 transition-colors"
                  title={t('clearSetting')}
                >
                  <Trash2 size={20} />
                </button>
              </>
            ) : (
              <div className="flex items-center gap-3 text-zinc-400 italic">
                <div className="w-10 h-10 flex items-center justify-center rounded-lg bg-zinc-100 dark:bg-zinc-800">
                  <Power size={20} className="opacity-50" />
                </div>
                <span>{t('noLaunch')}</span>
              </div>
            )}
          </div>
        </div>

        {/* 페이지 선택 창 */}
        <div className="flex flex-col gap-2">
          <label className="text-sm font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
            {t('newLaunch')}
          </label>
          <div className="flex gap-2">
            <select
              value={autoLaunchId || ''}
              onChange={(e) => save(e.target.value || null)}
              className="flex-1 rounded-xl border border-zinc-200 bg-white px-4 py-3 text-base outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 transition-all appearance-none"
              style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' fill=\'none\' viewBox=\'0 0 24 24\' stroke=\'currentColor\'%3E%3Cpath stroke-linecap=\'round\' stroke-linejoin=\'round\' stroke-width=\'2\' d=\'M19 9l-7 7-7-7\' /%3E%3C/svg%3E")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right 1rem center', backgroundSize: '1.2rem' }}
            >
              <option value="">{t('noneOption')}</option>
              {SCREEN_OPTIONS.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* 저장 완료 알림 */}
      <div className={`flex items-center gap-2 text-emerald-600 dark:text-emerald-400 transition-opacity duration-300 ${saved ? 'opacity-100' : 'opacity-0'}`}>
        <CheckCircle2 size={18} />
        <span className="text-sm font-medium">{t('launchSaved')}</span>
      </div>
    </div>
  );
}
