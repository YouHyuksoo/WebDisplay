/**
 * @file src/components/mxvc/reverse-trace/ReelListSidebar.tsx
 * @description 위자드 결과로 받은 릴 후보 리스트 (좌측 사이드바)
 *
 * 초보자 가이드:
 * - 모드별 추가 컬럼 표시 (issue: 출고일/품목, run: 품목/출고일, feeder: 설치일시, excel: 행번호)
 * - 행 클릭으로 선택 → 하이라이트만 (조회는 [조회] 버튼 클릭 필요)
 * - [조회] 버튼: selectedReelCd가 있을 때만 활성
 */
'use client';
import type { TraceMode, ReelCandidate } from '@/types/mxvc/reverse-trace-wizard';

interface Props {
  mode:           TraceMode;
  candidates:     ReelCandidate[];
  selectedReelCd: string;
  tracedReelCd:   string;
  onSelect:       (reelCd: string) => void;
  onTrace:        () => void;
}

export default function ReelListSidebar({ mode, candidates, selectedReelCd, tracedReelCd, onSelect, onTrace }: Props) {
  return (
    <aside className="flex flex-col h-full w-full border-r border-zinc-800 bg-zinc-950">
      <header className="flex-shrink-0 px-3 py-2 border-b border-zinc-800">
        <div className="text-xs font-semibold text-zinc-200">
          릴 후보 <span className="text-zinc-500">({mode})</span> · {candidates.length}건
        </div>
        <div className="text-[10px] text-zinc-500 mt-0.5">클릭 후 [조회] 눌러 추적</div>
      </header>

      <div className="flex-1 min-h-0 overflow-y-auto">
        {candidates.length === 0 ? (
          <div className="p-6 text-center text-xs text-zinc-500">조회 결과 없음</div>
        ) : (
          <ul className="divide-y divide-zinc-800">
            {candidates.map((c) => {
              const isSelected = c.reelCd === selectedReelCd;
              const isTraced   = c.reelCd === tracedReelCd;
              return (
                <li
                  key={c.reelCd}
                  onClick={() => onSelect(c.reelCd)}
                  className={`px-3 py-2 text-xs cursor-pointer transition-colors ${
                    isSelected
                      ? 'bg-blue-900/40 border-l-2 border-blue-400'
                      : 'border-l-2 border-transparent hover:bg-zinc-900'
                  }`}
                >
                  <div className="flex items-center gap-1">
                    <span className={`font-mono truncate ${isTraced ? 'text-emerald-300' : 'text-zinc-100'}`}>{c.reelCd}</span>
                    {isTraced && <span className="ml-auto shrink-0 text-[9px] rounded bg-emerald-800 px-1.5 py-0.5 text-emerald-200">추적됨</span>}
                  </div>
                  {/* 모드별 보조 정보 */}
                  {'issueDate' in c && (
                    <div className="mt-0.5 text-[10px] text-zinc-400">
                      {c.issueDate.slice(0, 10)} · {'itemCode' in c ? c.itemCode : ''} · {c.issueQty.toLocaleString()}ea
                    </div>
                  )}
                  {'installDt' in c && (
                    <div className="mt-0.5 text-[10px] text-zinc-400">
                      {c.partNo} · 설치 {c.installDt.slice(0, 16)}
                    </div>
                  )}
                  {'rowIndex' in c && (
                    <div className="mt-0.5 text-[10px] text-zinc-500">엑셀 {c.rowIndex}행</div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <footer className="flex-shrink-0 border-t border-zinc-800 p-2">
        <button
          onClick={onTrace}
          disabled={!selectedReelCd}
          className="w-full rounded bg-blue-600 py-1.5 text-xs font-medium text-white hover:bg-blue-500 disabled:opacity-40"
        >
          {selectedReelCd ? `[${selectedReelCd.slice(0, 24)}${selectedReelCd.length > 24 ? '…' : ''}] 조회` : '릴을 선택하세요'}
        </button>
      </footer>
    </aside>
  );
}
