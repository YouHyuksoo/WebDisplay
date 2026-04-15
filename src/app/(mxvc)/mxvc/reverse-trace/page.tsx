/**
 * @file src/app/(mxvc)/mxvc/reverse-trace/page.tsx
 * @description 멕시코전장 역추적 위자드 페이지
 *
 * 초보자 가이드:
 * 1. 초기: TraceStartScreen → [추적 시작] → TraceWizardModal 오픈
 * 2. 위자드에서 모드 + 조건 입력 → candidates API(또는 엑셀 파싱) → 릴 리스트 확보
 * 3. 결과: 좌측 ReelListSidebar + 우측 TraceResultPanel
 * 4. 즉시입력 모드는 사이드바 생략, 바로 TraceResultPanel
 * 5. 상단 [추적 시작(모드 변경)] 버튼은 언제든 위자드 재진입
 */
'use client';

import { useState, useCallback } from 'react';
import DisplayHeader from '@/components/display/DisplayHeader';
import DisplayFooter from '@/components/display/DisplayFooter';
import TraceStartScreen from '@/components/mxvc/reverse-trace/TraceStartScreen';
import TraceWizardModal from '@/components/mxvc/reverse-trace/TraceWizardModal';
import ReelListSidebar from '@/components/mxvc/reverse-trace/ReelListSidebar';
import TraceResultPanel from '@/components/mxvc/reverse-trace/TraceResultPanel';
import Spinner from '@/components/ui/Spinner';
import {
  MODE_LABELS,
  type TraceMode,
  type ReelCandidate,
  type IssueModeInput,
  type RunModeInput,
  type FeederModeInput,
  type ExcelCandidate,
  type CandidatesResponse,
} from '@/types/mxvc/reverse-trace-wizard';

const SCREEN_ID = 'mxvc-reverse-trace';

export default function ReverseTracePage() {
  const [isWizardOpen, setWizardOpen] = useState(false);
  const [mode, setMode]               = useState<TraceMode | null>(null);
  const [candidates, setCandidates]   = useState<ReelCandidate[]>([]);
  const [selectedReelCd, setSelected] = useState('');
  const [tracedReelCd, setTraced]     = useState('');
  const [wizardLoading, setWizLoading] = useState(false);
  const [wizardError, setWizError]     = useState('');

  const fetchCandidates = useCallback(async (url: string): Promise<ReelCandidate[]> => {
    setWizLoading(true); setWizError('');
    try {
      const res = await fetch(url);
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error ?? `HTTP ${res.status}`);
      }
      const json = (await res.json()) as CandidatesResponse;
      return json.candidates;
    } catch (e) {
      setWizError((e as Error).message);
      return [];
    } finally {
      setWizLoading(false);
    }
  }, []);

  const handleImmediate = useCallback((reelCd: string) => {
    setMode('immediate');
    setCandidates([]);
    setSelected(reelCd);
    setTraced(reelCd);
    setWizardOpen(false);
  }, []);

  const handleIssue = useCallback(async (input: IssueModeInput) => {
    const p = new URLSearchParams({ mode: 'issue', ...input });
    const list = await fetchCandidates(`/api/mxvc/reverse-trace/candidates?${p}`);
    setMode('issue'); setCandidates(list); setSelected(''); setTraced(''); setWizardOpen(false);
  }, [fetchCandidates]);

  const handleRun = useCallback(async (input: RunModeInput) => {
    const p = new URLSearchParams({ mode: 'run', ...input });
    const list = await fetchCandidates(`/api/mxvc/reverse-trace/candidates?${p}`);
    setMode('run'); setCandidates(list); setSelected(''); setTraced(''); setWizardOpen(false);
  }, [fetchCandidates]);

  const handleFeeder = useCallback(async (input: FeederModeInput) => {
    const p = new URLSearchParams({ mode: 'feeder', ...input });
    const list = await fetchCandidates(`/api/mxvc/reverse-trace/candidates?${p}`);
    setMode('feeder'); setCandidates(list); setSelected(''); setTraced(''); setWizardOpen(false);
  }, [fetchCandidates]);

  const handleExcel = useCallback((list: ExcelCandidate[]) => {
    setMode('excel'); setCandidates(list); setSelected(''); setTraced(''); setWizardOpen(false);
  }, []);

  const handleTrace = useCallback(() => {
    if (!selectedReelCd) return;
    setTraced(selectedReelCd);
  }, [selectedReelCd]);

  const hasResult   = !!mode && (mode === 'immediate' || candidates.length > 0);
  const showSidebar = mode !== null && mode !== 'immediate' && candidates.length > 0;

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-white dark:bg-gray-950 text-gray-900 dark:text-white">
      <DisplayHeader title="멕시코전장 역추적(자재→PCB)" screenId={SCREEN_ID} />

      {/* 상단 모드 표시 + 추적 시작 */}
      <div className="shrink-0 flex items-center gap-3 px-5 py-2 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        {mode ? (
          <span className="text-xs text-gray-500 dark:text-zinc-400">
            현재 모드: <span className="font-semibold text-gray-800 dark:text-zinc-200">{MODE_LABELS[mode]}</span>
            {tracedReelCd && <> · 추적 중: <code className="text-emerald-500 font-mono">{tracedReelCd}</code></>}
          </span>
        ) : (
          <span className="text-xs text-gray-500 dark:text-zinc-400">추적 모드를 선택하세요</span>
        )}
        <div className="ml-auto flex items-center gap-2">
          {wizardError && (
            <span className="text-xs text-red-500">{wizardError}</span>
          )}
          <button
            onClick={() => setWizardOpen(true)}
            className="px-3 py-1.5 rounded bg-blue-600 text-white text-xs hover:bg-blue-500 transition-colors"
          >
            {mode ? '추적 시작 (모드 변경)' : '추적 시작'}
          </button>
        </div>
      </div>

      {/* 본문 */}
      <main className="flex-1 min-h-0 flex overflow-hidden">
        {!hasResult && (
          <TraceStartScreen onStart={() => setWizardOpen(true)} />
        )}
        {hasResult && showSidebar && (
          <div className="w-64 md:w-72 flex-shrink-0">
            <ReelListSidebar
              mode={mode!}
              candidates={candidates}
              selectedReelCd={selectedReelCd}
              tracedReelCd={tracedReelCd}
              onSelect={setSelected}
              onTrace={handleTrace}
            />
          </div>
        )}
        {hasResult && (
          <div className="flex-1 min-w-0 overflow-hidden">
            {tracedReelCd ? (
              <TraceResultPanel reelCd={tracedReelCd} />
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-gray-500 dark:text-zinc-500">
                좌측에서 릴을 선택하고 <span className="mx-1 font-semibold text-gray-700 dark:text-zinc-300">[조회]</span> 버튼을 누르세요.
              </div>
            )}
          </div>
        )}
      </main>

      {wizardLoading && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50">
          <Spinner size="lg" vertical label="릴 후보 조회 중..." labelClassName="text-white" />
        </div>
      )}

      <TraceWizardModal
        isOpen={isWizardOpen}
        loading={wizardLoading}
        onClose={() => setWizardOpen(false)}
        onImmediateSubmit={handleImmediate}
        onIssueSubmit={handleIssue}
        onRunSubmit={handleRun}
        onFeederSubmit={handleFeeder}
        onExcelSubmit={handleExcel}
      />

      <DisplayFooter />
    </div>
  );
}
