/**
 * @file KindSubTabs.tsx
 * @description Examples 탭 내부 sub-tab 스위처 (exact/template/skeleton).
 *
 * 초보자 가이드:
 * - `value` 는 현재 선택된 kind. 부모가 상태를 관리 (controlled).
 * - `counts` 를 넘기면 각 탭 우측에 저장된 예제 수 뱃지 표시.
 */

'use client';

import type { ExampleKind } from '@/lib/ai-tables/types';

const KINDS: Array<{ id: ExampleKind; label: string; desc: string }> = [
  { id: 'exact', label: 'Exact', desc: '그대로 재사용' },
  { id: 'template', label: 'Template', desc: '슬롯 치환' },
  { id: 'skeleton', label: 'Skeleton', desc: '대화 완성' },
];

interface Props {
  value: ExampleKind;
  onChange: (k: ExampleKind) => void;
  counts?: Record<ExampleKind, number>;
}

export default function KindSubTabs({ value, onChange, counts }: Props) {
  return (
    <div className="inline-flex rounded border border-zinc-200 dark:border-zinc-800 overflow-hidden text-sm">
      {KINDS.map((k) => {
        const active = value === k.id;
        const count = counts?.[k.id] ?? 0;
        return (
          <button
            key={k.id}
            type="button"
            onClick={() => onChange(k.id)}
            title={k.desc}
            className={`px-3 py-1.5 transition-colors ${
              active
                ? 'bg-blue-600 text-white'
                : 'bg-white text-zinc-700 hover:bg-zinc-100 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800'
            }`}
          >
            {k.label}
            <span
              className={`ml-1.5 text-xs ${
                active ? 'text-blue-100' : 'text-zinc-500 dark:text-zinc-400'
              }`}
            >
              {count}
            </span>
          </button>
        );
      })}
    </div>
  );
}
