/**
 * @file DisplaySelectModal.tsx
 * @description 디스플레이 공통 선택 모달 (제네릭). 라인/센서 등 다양한 항목 선택 + 타이밍 설정.
 * 초보자 가이드:
 * - DisplayHeader의 설정 아이콘을 클릭하면 열린다.
 * - `type` prop으로 라인('line') 또는 센서('sensor') 모드를 결정한다.
 * - 항목 선택은 화면별(screenId), 타이밍 설정은 공통(전체 화면 공유).
 * - 새 유형 추가 시 SelectType에 값을 추가하고 CONFIG_MAP에 설정을 등록하면 된다.
 * PB 원본: w_line_multi_select_flat / 온습도 설비 선택 대응
 */
'use client';

import { useState, useEffect } from 'react';
import useSWR from 'swr';
import Modal from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { DEFAULT_TIMING_CONFIG } from '@/types/option';
import type { DisplayTimingConfig } from '@/types/option';
import { saveTiming, loadTiming } from '@/hooks/useDisplayTiming';
import { fetcher } from '@/lib/fetcher';
import { DEFAULT_ORG_ID } from '@/lib/display-helpers';

/* ───────────── 공통 타입 ───────────── */

/** 선택 가능한 항목 유형 */
export type SelectType = 'line' | 'sensor';

/** API에서 받아오는 개별 항목의 공통 형태 */
interface SelectItem {
  code: string;
  name: string;
  sequence: number;
}

/** 유형별 설정 정보 */
interface TypeConfig {
  /** SWR에서 호출할 API 엔드포인트 */
  apiEndpoint: string;
  /** API 응답 JSON에서 목록을 꺼낼 키 (예: 'lines', 'sensors') */
  responseKey: string;
  /** 응답 객체에서 code/name으로 매핑할 필드명 */
  codeField: string;
  nameField: string;
  /** localStorage 접두사 */
  storagePrefix: string;
  /** 설정 변경 시 발행할 이벤트명 접두사 */
  eventPrefix: string;
  /** UI에 표시할 섹션 제목 */
  sectionTitle: string;
  /** 전체 선택 레이블 */
  allLabel: string;
}

/** 유형별 설정 맵 — 새 유형 추가 시 여기만 확장 */
const CONFIG_MAP: Record<SelectType, TypeConfig> = {
  line: {
    apiEndpoint: `/api/display/lines?orgId=${DEFAULT_ORG_ID}`,
    responseKey: 'lines',
    codeField: 'lineCode',
    nameField: 'lineName',
    storagePrefix: 'display-lines-',
    eventPrefix: 'line-config-changed-',
    sectionTitle: '라인 선택',
    allLabel: '% (ALL LINES)',
  },
  sensor: {
    apiEndpoint: `/api/display/sensors?orgId=${DEFAULT_ORG_ID}`,
    responseKey: 'sensors',
    codeField: 'machineCode',
    nameField: 'machineName',
    storagePrefix: 'display-sensors-',
    eventPrefix: 'sensor-config-changed-',
    sectionTitle: '온습도기 선택',
    allLabel: '% (ALL SENSORS)',
  },
};

/* ───────────── 유틸 ───────────── */

/** API 응답을 공통 SelectItem[]으로 변환 */
function toSelectItems(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  rawList: Record<string, any>[],
  codeField: string,
  nameField: string,
): SelectItem[] {
  return rawList.map((row) => ({
    code: String(row[codeField] ?? ''),
    name: String(row[nameField] ?? ''),
    sequence: Number(row.sequence ?? 0),
  }));
}

/* ───────────── Props ───────────── */

export interface DisplaySelectModalProps {
  /** 모달 열림/닫힘 */
  isOpen: boolean;
  /** 닫기 콜백 */
  onClose: () => void;
  /** 현재 화면 ID — localStorage 키와 이벤트명에 사용 */
  screenId: string;
  /** 선택 유형 ('line' | 'sensor') */
  type: SelectType;
}

/* ───────────── 컴포넌트 ───────────── */

export default function DisplaySelectModal({
  isOpen,
  onClose,
  screenId,
  type,
}: DisplaySelectModalProps) {
  const config = CONFIG_MAP[type];

  /* ── 데이터 페치 ── */
  const { data, isLoading } = useSWR(
    isOpen ? config.apiEndpoint : null,
    fetcher,
  );

  /* ── 상태 ── */
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [timing, setTiming] = useState<DisplayTimingConfig>(DEFAULT_TIMING_CONFIG);

  /* ── 모달 열릴 때 localStorage에서 복원 ── */
  useEffect(() => {
    if (isOpen) {
      const saved = localStorage.getItem(`${config.storagePrefix}${screenId}`);
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) setSelectedItems(new Set(parsed));
        } catch { /* 무시 */ }
      } else {
        setSelectedItems(new Set(['%']));
      }
      setTiming(loadTiming());
    }
  }, [isOpen, screenId, config.storagePrefix]);

  /* ── API 응답 → 공통 아이템 목록 ── */
  const rawList = data?.[config.responseKey] ?? [];
  const items: SelectItem[] = toSelectItems(rawList, config.codeField, config.nameField);
  const isSelectAll = selectedItems.has('%');

  /* ── 개별 토글 ── */
  const toggleItem = (code: string) => {
    const newSet = new Set(selectedItems);
    newSet.delete('%');
    if (newSet.has(code)) newSet.delete(code);
    else newSet.add(code);
    // 모든 항목이 선택되면 자동으로 '%'(전체)로 전환
    if (items.length > 0 && items.every((item) => newSet.has(item.code))) {
      newSet.clear();
      newSet.add('%');
    }
    setSelectedItems(newSet);
  };

  /* ── 전체 토글 ── */
  const toggleAll = () => {
    setSelectedItems(isSelectAll ? new Set() : new Set(['%']));
  };

  /* ── 저장 ── */
  const handleSave = () => {
    const arr = Array.from(selectedItems);
    localStorage.setItem(
      `${config.storagePrefix}${screenId}`,
      JSON.stringify(arr.length > 0 ? arr : ['%']),
    );
    window.dispatchEvent(new Event(`${config.eventPrefix}${screenId}`));
    saveTiming(timing);
    onClose();
  };

  /* ── 렌더 ── */
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Display Settings" size="md"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>취소</Button>
          <Button variant="primary" onClick={handleSave}>OK</Button>
        </>
      }
    >
      {/* 타이밍 설정 */}
      <div className="mb-4 rounded-lg border border-zinc-200 p-4 dark:border-zinc-700">
        <h3 className="mb-3 text-sm font-bold text-zinc-900 dark:text-white">타이밍 설정 (공통)</h3>
        <div className="flex flex-col gap-3">
          {/* 새로고침 간격 */}
          <div className="flex items-center gap-3">
            <label className="w-28 shrink-0 text-sm text-zinc-700 dark:text-zinc-300">새로고침</label>
            <input
              type="range"
              min={5} max={300} step={5}
              value={timing.refreshSeconds}
              onChange={(e) => setTiming((p) => ({ ...p, refreshSeconds: Number(e.target.value) }))}
              className="h-2 flex-1 cursor-pointer accent-sky-500"
            />
            <span className="w-16 text-right font-mono text-sm font-bold text-sky-400">
              {timing.refreshSeconds}초
            </span>
          </div>
          {/* 스크롤 간격 */}
          <div className="flex items-center gap-3">
            <label className="w-28 shrink-0 text-sm text-zinc-700 dark:text-zinc-300">스크롤 전환</label>
            <input
              type="range"
              min={3} max={60} step={1}
              value={timing.scrollSeconds}
              onChange={(e) => setTiming((p) => ({ ...p, scrollSeconds: Number(e.target.value) }))}
              className="h-2 flex-1 cursor-pointer accent-sky-500"
            />
            <span className="w-16 text-right font-mono text-sm font-bold text-sky-400">
              {timing.scrollSeconds}초
            </span>
          </div>
        </div>
      </div>

      {/* 항목 선택 */}
      <div className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-700">
        <h3 className="mb-3 text-sm font-bold text-zinc-900 dark:text-white">{config.sectionTitle}</h3>
        {isLoading ? (
          <div className="flex h-32 items-center justify-center">
            <svg className="h-8 w-8 animate-spin text-sky-500" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          </div>
        ) : (
          <div className="flex flex-col gap-1">
            <label className="flex cursor-pointer items-center gap-3 rounded-lg border-b border-zinc-200 p-2 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800">
              <input type="checkbox" className="h-5 w-5 accent-sky-500" checked={isSelectAll} onChange={toggleAll} />
              <span className="font-bold text-zinc-900 dark:text-white">{config.allLabel}</span>
            </label>
            <div className="flex flex-col gap-0.5 overflow-y-auto pr-2" style={{ maxHeight: '280px' }}>
              {items.map((item) => (
                <label key={item.code}
                  className={`flex cursor-pointer items-center gap-3 rounded-lg p-2 transition-colors ${
                    !isSelectAll && selectedItems.has(item.code)
                    ? 'bg-sky-50 dark:bg-sky-900/20'
                    : 'hover:bg-zinc-50 dark:hover:bg-zinc-800/50'
                  }`}>
                  <input type="checkbox" className="h-5 w-5 accent-sky-500"
                    checked={isSelectAll || selectedItems.has(item.code)}
                    onChange={() => toggleItem(item.code)} />
                  <span className={`text-sm ${
                    isSelectAll || selectedItems.has(item.code)
                    ? 'font-semibold text-sky-700 dark:text-sky-300'
                    : 'text-zinc-700 dark:text-zinc-300'
                  }`}>
                    {item.code} : {item.name}
                  </span>
                </label>
              ))}
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
