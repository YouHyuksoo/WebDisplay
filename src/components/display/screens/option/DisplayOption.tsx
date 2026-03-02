/**
 * @file DisplayOption.tsx
 * @description 옵션 설정 화면 (Screen 18) 메인 컨테이너. 2탭 UI.
 * 초보자 가이드: DisplayLayout으로 감싸고, 페이지 순환 / DB 설정 탭을 전환한다.
 */
'use client';

import { useState } from 'react';
import DisplayLayout from '../../DisplayLayout';
import PageRollingPanel from './PageRollingPanel';
import DatabasePanel from './DatabasePanel';
import AutoLaunchPanel from './AutoLaunchPanel';

type Tab = 'rolling' | 'database' | 'autolaunch';

const TABS: { key: Tab; label: string }[] = [
  { key: 'rolling', label: '페이지 순환' },
  { key: 'database', label: 'DB 설정' },
  { key: 'autolaunch', label: '시작페이지 설정' },
];

interface DisplayOptionProps {
  screenId: string;
}

export default function DisplayOption({ screenId }: DisplayOptionProps) {
  const [activeTab, setActiveTab] = useState<Tab>('rolling');

  return (
    <DisplayLayout title="Display Option" screenId={screenId}>
      <div className="flex h-full flex-col overflow-hidden">
        {/* 탭 헤더 */}
        <div className="flex border-b border-zinc-200 bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900">
          {TABS.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={`px-6 py-3 text-sm font-medium transition-colors ${
                activeTab === key
                  ? 'border-b-2 border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400'
                  : 'text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* 탭 콘텐츠 */}
        <div className="min-h-0 flex-1 overflow-auto">
          {activeTab === 'rolling' && <PageRollingPanel />}
          {activeTab === 'database' && <DatabasePanel />}
          {activeTab === 'autolaunch' && <AutoLaunchPanel />}
        </div>
      </div>
    </DisplayLayout>
  );
}
