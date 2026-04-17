/**
 * @file src/app/settings/ai-tables/_hooks/useAiTablesStore.ts
 * @description Zustand 전역 상태 — 선택된 사이트/테이블/탭, bootstrap 데이터 캐시.
 *
 * 초보자 가이드:
 * - Zustand v5 `create` 사용. React Server Component 아닌 클라이언트 전용.
 * - `detailTab` 은 Phase 3b에서 `dictionary`/`examples` 등으로 확장될 예정.
 */

'use client';

import { create } from 'zustand';

export type AiTablesMode = 'tables' | 'domains';
export type AiTablesDetailTab =
  | 'overview'
  | 'columns'
  | 'dictionary'
  | 'filters-joins'
  | 'examples'
  | 'prompt'
  | 'history';

/* eslint-disable @typescript-eslint/no-explicit-any */
export interface AiTablesState {
  mode: AiTablesMode;
  activeSite: string;
  activeTable: string | null;
  detailTab: AiTablesDetailTab;
  bootstrap: any | null;

  setMode: (m: AiTablesMode) => void;
  setActiveSite: (s: string) => void;
  setActiveTable: (t: string | null) => void;
  setDetailTab: (t: AiTablesDetailTab) => void;
  setBootstrap: (b: any) => void;
}

export const useAiTablesStore = create<AiTablesState>((set) => ({
  mode: 'tables',
  activeSite: 'default',
  activeTable: null,
  detailTab: 'overview',
  bootstrap: null,

  setMode: (m) => set({ mode: m }),
  setActiveSite: (s) => set({ activeSite: s, activeTable: null }),
  setActiveTable: (t) => set({ activeTable: t, detailTab: 'overview' }),
  setDetailTab: (t) => set({ detailTab: t }),
  setBootstrap: (b) => set({ bootstrap: b }),
}));
/* eslint-enable @typescript-eslint/no-explicit-any */
