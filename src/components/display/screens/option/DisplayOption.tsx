/**
 * @file DisplayOption.tsx
 * @description 옵션 설정 화면 (Screen 18) 메인 컨테이너. 6탭 UI.
 * 초보자 가이드: DisplayLayout으로 감싸고, 기존 3탭 + AI 설정 3탭을 전환한다.
 */
'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import dynamic from 'next/dynamic';
import DisplayLayout from '../../DisplayLayout';
import PageRollingPanel from './PageRollingPanel';
import DatabasePanel from './DatabasePanel';
import AutoLaunchPanel from './AutoLaunchPanel';

const AiModelsPanel = dynamic(() => import('@/app/settings/ai-models/page'), { ssr: false });
const AiPersonasPanel = dynamic(() => import('@/app/settings/ai-personas/page'), { ssr: false });
const AiGlossaryPanel = dynamic(() => import('@/app/settings/ai-glossary/page'), { ssr: false });
const AiTablesPanel = dynamic(() => import('@/app/settings/ai-tables/page'), { ssr: false });

type Tab =
  | 'rolling'
  | 'database'
  | 'autolaunch'
  | 'aiModels'
  | 'aiPersonas'
  | 'aiGlossary'
  | 'aiTables';

const TAB_KEYS: { key: Tab; labelKey: string }[] = [
  { key: 'rolling', labelKey: 'pageRolling' },
  { key: 'database', labelKey: 'dbSettings' },
  { key: 'autolaunch', labelKey: 'autoLaunch' },
  { key: 'aiModels', labelKey: 'aiModels' },
  { key: 'aiPersonas', labelKey: 'aiPersonas' },
  { key: 'aiGlossary', labelKey: 'aiGlossary' },
  { key: 'aiTables', labelKey: 'aiTables' },
];

interface DisplayOptionProps {
  screenId: string;
}

export default function DisplayOption({ screenId }: DisplayOptionProps) {
  const [activeTab, setActiveTab] = useState<Tab>('rolling');
  const t = useTranslations('option');

  return (
    <DisplayLayout screenId={screenId}>
      <div className="flex h-full flex-col overflow-hidden">
        {/* 탭 헤더 */}
        <div className="flex border-b border-zinc-200 bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900">
          {TAB_KEYS.map(({ key, labelKey }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={`px-6 py-3 text-sm font-medium transition-colors ${
                activeTab === key
                  ? 'border-b-2 border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400'
                  : 'text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200'
              }`}
            >
              {t(labelKey)}
            </button>
          ))}
        </div>

        {/* 탭 콘텐츠 */}
        <div className="min-h-0 flex-1 overflow-auto">
          {activeTab === 'rolling' && <PageRollingPanel />}
          {activeTab === 'database' && <DatabasePanel />}
          {activeTab === 'autolaunch' && <AutoLaunchPanel />}
          {activeTab === 'aiModels' && <div className="p-4"><AiModelsPanel /></div>}
          {activeTab === 'aiPersonas' && <div className="p-4"><AiPersonasPanel /></div>}
          {activeTab === 'aiGlossary' && <div className="p-4"><AiGlossaryPanel /></div>}
          {activeTab === 'aiTables' && <div className="h-full"><AiTablesPanel /></div>}
        </div>
      </div>
    </DisplayLayout>
  );
}
