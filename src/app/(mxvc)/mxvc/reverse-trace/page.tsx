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
import { useTranslations } from 'next-intl';
import DisplayHeader from '@/components/display/DisplayHeader';
import DisplayFooter from '@/components/display/DisplayFooter';
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
  type RefIdModeInput,
  type CandidatesResponse,
} from '@/types/mxvc/reverse-trace-wizard';

const SCREEN_ID = 'mxvc-reverse-trace';

export default function ReverseTracePage() {
  const t = useTranslations('mxvc.reverseTrace');
  const [isWizardOpen, setWizardOpen] = useState(true);
  const [mode, setMode]               = useState<TraceMode | null>(null);
  const [candidates, setCandidates]   = useState<ReelCandidate[]>([]);
  const [selectedIdx, setSelectedIdx] = useState(-1);
  const [tracedReelCd, setTraced]     = useState('');
  const [wizardLoading, setWizLoading] = useState(false);
  const [wizardError, setWizError]     = useState('');

  const selectedReelCd = selectedIdx >= 0 ? candidates[selectedIdx]?.reelCd ?? '' : '';

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
    setSelectedIdx(-1);
    setTraced(reelCd);
    setWizardOpen(false);
  }, []);

  const handleIssue = useCallback(async (input: IssueModeInput) => {
    const p = new URLSearchParams({ mode: 'issue', ...input });
    const list = await fetchCandidates(`/api/mxvc/reverse-trace/candidates?${p}`);
    setMode('issue'); setCandidates(list); setSelectedIdx(-1); setTraced(''); setWizardOpen(false);
  }, [fetchCandidates]);

  const handleRun = useCallback(async (input: RunModeInput) => {
    const p = new URLSearchParams({ mode: 'run', ...input });
    const list = await fetchCandidates(`/api/mxvc/reverse-trace/candidates?${p}`);
    setMode('run'); setCandidates(list); setSelectedIdx(-1); setTraced(''); setWizardOpen(false);
  }, [fetchCandidates]);

  const handleFeeder = useCallback(async (input: FeederModeInput) => {
    const p = new URLSearchParams({ mode: 'feeder', ...input });
    const list = await fetchCandidates(`/api/mxvc/reverse-trace/candidates?${p}`);
    setMode('feeder'); setCandidates(list); setSelectedIdx(-1); setTraced(''); setWizardOpen(false);
  }, [fetchCandidates]);

  const handleExcel = useCallback((list: ExcelCandidate[]) => {
    setMode('excel'); setCandidates(list); setSelectedIdx(-1); setTraced(''); setWizardOpen(false);
  }, []);

  const handleRefId = useCallback(async (input: RefIdModeInput) => {
    const p = new URLSearchParams({ mode: 'refid', ...input });
    const list = await fetchCandidates(`/api/mxvc/reverse-trace/candidates?${p}`);
    setMode('refid'); setCandidates(list); setSelectedIdx(-1); setTraced(''); setWizardOpen(false);
  }, [fetchCandidates]);

  const handleTrace = useCallback(() => {
    if (!selectedReelCd) return;
    setTraced(selectedReelCd);
  }, [selectedReelCd]);

  const hasResult   = !!mode && (mode === 'immediate' || candidates.length > 0);
  const showSidebar = mode !== null && mode !== 'immediate' && candidates.length > 0;

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-white dark:bg-gray-950 text-gray-900 dark:text-white">
      <DisplayHeader title={t('pageTitle')} screenId={SCREEN_ID} />

      {/* 상단 모드 표시 + 추적 시작 */}
      <div className="shrink-0 flex items-center gap-3 px-5 py-2 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        {mode ? (
          <span className="text-xs text-gray-500 dark:text-zinc-400">
            {t('currentMode')} <span className="font-semibold text-gray-800 dark:text-zinc-200">{MODE_LABELS[mode]}</span>
            {tracedReelCd && <> · {t('tracing')} <code className="text-emerald-500 font-mono">{tracedReelCd}</code></>}
          </span>
        ) : (
          <span className="text-xs text-gray-500 dark:text-zinc-400">{t('selectModePrompt')}</span>
        )}
        <div className="ml-auto flex items-center gap-2">
          {wizardError && (
            <span className="text-xs text-red-500">{wizardError}</span>
          )}
          {showSidebar && (
            <button
              onClick={handleTrace}
              disabled={!selectedReelCd}
              className="px-3 py-1.5 rounded bg-emerald-600 text-white text-xs hover:bg-emerald-500 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {selectedReelCd ? t('queryLotTrace') : t('selectReel')}
            </button>
          )}
          <button
            onClick={() => setWizardOpen(true)}
            className="px-3 py-1.5 rounded bg-blue-600 text-white text-xs hover:bg-blue-500 transition-colors"
          >
            {mode ? t('startTraceChange') : t('startTrace')}
          </button>
        </div>
      </div>

      {/* 본문 */}
      <main className="flex-1 min-h-0 flex overflow-hidden">
        {hasResult && showSidebar && (
          <div className="w-64 md:w-72 flex-shrink-0">
            <ReelListSidebar
              mode={mode!}
              candidates={candidates}
              selectedIdx={selectedIdx}
              tracedReelCd={tracedReelCd}
              onSelect={setSelectedIdx}
            />
          </div>
        )}
        {hasResult && (
          <div className="flex-1 min-w-0 overflow-hidden">
            {tracedReelCd ? (
              <TraceResultPanel reelCd={tracedReelCd} />
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-gray-500 dark:text-zinc-500">
                {t('selectReelHintPrefix')} <span className="mx-1 font-semibold text-gray-700 dark:text-zinc-300">{t('selectReelHintQuery')}</span> {t('selectReelHintSuffix')}
              </div>
            )}
          </div>
        )}
      </main>

      {wizardLoading && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50">
          <Spinner size="lg" vertical label={t('loadingCandidates')} labelClassName="text-white" />
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
        onRefIdSubmit={handleRefId}
      />

      <DisplayFooter />
    </div>
  );
}
