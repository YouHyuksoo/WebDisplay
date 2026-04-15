/**
 * @file src/components/mxvc/reverse-trace/TraceWizardModal.tsx
 * @description 역추적 위자드 모달 — Step 1(모드 선택) + Step 2(모드별 입력) 관리
 *
 * 초보자 가이드:
 * - 오픈 시 Step 1(모드 카드) 표시
 * - 모드 선택 → Step 2로 전환, 해당 모드의 ModeXxx 컴포넌트 렌더
 * - 모드별 onSubmit은 부모로 위임 (API 호출/상태관리는 부모 책임)
 */
'use client';
import { useState, useEffect, type ComponentType } from 'react';
import { Zap, Package, Tag, Wrench, FileSpreadsheet, ScanLine, X, type LucideProps } from 'lucide-react';
import ModeImmediate from './modes/ModeImmediate';
import ModeIssue    from './modes/ModeIssue';
import ModeRun      from './modes/ModeRun';
import ModeFeeder   from './modes/ModeFeeder';
import ModeExcel    from './modes/ModeExcel';
import ModeRefId    from './modes/ModeRefId';
import {
  MODE_LABELS,
  type TraceMode,
  type IssueModeInput,
  type RunModeInput,
  type FeederModeInput,
  type ExcelCandidate,
  type RefIdModeInput,
} from '@/types/mxvc/reverse-trace-wizard';

interface Props {
  isOpen: boolean;
  initialMode?: TraceMode;
  loading?: boolean;
  onClose:              () => void;
  onImmediateSubmit:    (reelCd: string) => void;
  onIssueSubmit:        (input: IssueModeInput) => void;
  onRunSubmit:          (input: RunModeInput) => void;
  onFeederSubmit:       (input: FeederModeInput) => void;
  onExcelSubmit:        (candidates: ExcelCandidate[]) => void;
  onRefIdSubmit:        (input: RefIdModeInput) => void;
}

type IconType = ComponentType<LucideProps>;

const MODE_CARDS: { mode: TraceMode; Icon: IconType; desc: string }[] = [
  { mode: 'immediate', Icon: Zap,              desc: '릴번호를 바로 입력' },
  { mode: 'issue',     Icon: Package,          desc: '기간 + 품목으로 출고된 릴 찾기' },
  { mode: 'run',       Icon: Tag,              desc: '런번호(RUN_NO)로 찾기' },
  { mode: 'feeder',    Icon: Wrench,           desc: '특정일 피더에 걸린 릴 찾기' },
  { mode: 'excel',     Icon: FileSpreadsheet,  desc: '엑셀(1열) 릴번호 일괄 업로드' },
  { mode: 'refid',     Icon: ScanLine,         desc: 'ReferenceID + 날짜로 마운터 장착 릴 찾기' },
];

export default function TraceWizardModal({
  isOpen, initialMode, loading,
  onClose,
  onImmediateSubmit, onIssueSubmit, onRunSubmit, onFeederSubmit, onExcelSubmit, onRefIdSubmit,
}: Props) {
  const [step, setStep] = useState<'pick' | 'input'>(initialMode ? 'input' : 'pick');
  const [mode, setMode] = useState<TraceMode | null>(initialMode ?? null);

  /* 오픈 전환 시 상태 초기화 — isOpen false→true 에지에서만 리셋 */
  useEffect(() => {
    if (!isOpen) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setStep(initialMode ? 'input' : 'pick');
    setMode(initialMode ?? null);
  }, [isOpen, initialMode]);

  /* ESC로 닫기 */
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handlePickMode = (m: TraceMode) => { setMode(m); setStep('input'); };
  const handleBack     = () => { setMode(null); setStep('pick'); };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-xl rounded-xl border border-zinc-700 bg-zinc-900 shadow-2xl">
        <header className="flex items-center justify-between border-b border-zinc-800 px-5 py-3">
          <h3 className="text-sm font-semibold text-zinc-100">
            역추적 {step === 'pick' ? '— 모드 선택' : mode ? `— ${MODE_LABELS[mode]}` : ''}
          </h3>
          <button
            onClick={onClose}
            aria-label="닫기"
            className="text-zinc-400 hover:text-zinc-200 leading-none"
          >
            <X size={18} strokeWidth={2} />
          </button>
        </header>

        <div className="p-5">
          {step === 'pick' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {MODE_CARDS.map((c) => {
                const Icon = c.Icon;
                return (
                  <button
                    key={c.mode}
                    onClick={() => handlePickMode(c.mode)}
                    className="group flex flex-col items-start gap-2 rounded-lg border border-zinc-700 bg-zinc-800/60 p-4 text-left transition-colors hover:border-blue-500 hover:bg-blue-900/20"
                  >
                    <Icon
                      size={20}
                      strokeWidth={1.75}
                      className="text-zinc-400 group-hover:text-blue-400 transition-colors"
                    />
                    <span className="text-sm font-semibold text-zinc-100">{MODE_LABELS[c.mode]}</span>
                    <span className="text-xs text-zinc-400">{c.desc}</span>
                  </button>
                );
              })}
            </div>
          )}

          {step === 'input' && mode === 'immediate' && (
            <ModeImmediate onSubmit={onImmediateSubmit} onBack={handleBack} />
          )}
          {step === 'input' && mode === 'issue' && (
            <ModeIssue onSubmit={onIssueSubmit} onBack={handleBack} loading={loading} />
          )}
          {step === 'input' && mode === 'run' && (
            <ModeRun onSubmit={onRunSubmit} onBack={handleBack} loading={loading} />
          )}
          {step === 'input' && mode === 'feeder' && (
            <ModeFeeder onSubmit={onFeederSubmit} onBack={handleBack} loading={loading} />
          )}
          {step === 'input' && mode === 'excel' && (
            <ModeExcel onSubmit={onExcelSubmit} onBack={handleBack} />
          )}
          {step === 'input' && mode === 'refid' && (
            <ModeRefId onSubmit={onRefIdSubmit} onBack={handleBack} loading={loading} />
          )}
        </div>
      </div>
    </div>
  );
}
