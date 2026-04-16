/**
 * @file src/components/mxvc/traceability/BarcodeSearchWizard.tsx
 * @description 추적성분석 바코드 조회 위자드 — Step1(모드 선택) + Step2(입력 폼)
 *
 * 초보자 가이드:
 * - reverse-trace의 TraceWizardModal과 유사한 패턴
 * - 6개 모드 카드 → 선택 시 해당 입력 폼 표시
 * - 조회 결과는 공통 {SERIAL_NO, PCB_ITEM}[] — 부모가 처리
 */
'use client';
import { useState, useEffect } from 'react';
import { Tag, Layers3, Package, Truck, Scan, Wrench, Microscope, Camera, X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import ModeSingleValue from './modes/ModeSingleValue';
import ModeRepair from './modes/ModeRepair';
import ModeDateRange from './modes/ModeDateRange';
import type {
  BarcodeSearchMode,
  BarcodeSingleModeInput,
  BarcodeRepairModeInput,
  BarcodeDateRangeModeInput,
  SingleValueMode,
  DateRangeMode,
} from '@/types/mxvc/traceability-wizard';

interface Props {
  isOpen: boolean;
  loading?: boolean;
  onClose: () => void;
  onSingleSubmit: (input: BarcodeSingleModeInput) => void;
  onRepairSubmit: (input: BarcodeRepairModeInput) => void;
  onDateRangeSubmit: (input: BarcodeDateRangeModeInput) => void;
}

const MODE_ORDER: BarcodeSearchMode[] = ['runNo', 'magazine', 'box', 'pallet', 'carrier', 'repair', 'spi', 'aoi'];

const MODE_ICON = {
  runNo:    Tag,
  magazine: Layers3,
  box:      Package,
  pallet:   Truck,
  carrier:  Scan,
  repair:   Wrench,
  spi:      Microscope,
  aoi:      Camera,
} as const;

const SINGLE_MODES: ReadonlySet<SingleValueMode> = new Set(['runNo', 'magazine', 'box', 'pallet', 'carrier']);
const DATE_RANGE_MODES: ReadonlySet<DateRangeMode> = new Set(['spi', 'aoi']);

export default function BarcodeSearchWizard({
  isOpen, loading, onClose, onSingleSubmit, onRepairSubmit, onDateRangeSubmit,
}: Props) {
  const t = useTranslations('mxvc.traceability.wizard');
  const [step, setStep] = useState<'pick' | 'input'>('pick');
  const [mode, setMode] = useState<BarcodeSearchMode | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setStep('pick');
    setMode(null);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handlePick = (m: BarcodeSearchMode) => { setMode(m); setStep('input'); };
  const handleBack = () => { setMode(null); setStep('pick'); };

  const handleSingle = (m: SingleValueMode) => (value: string) => {
    onSingleSubmit({ mode: m, value });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-xl rounded-xl border border-zinc-700 bg-zinc-900 shadow-2xl">
        <header className="flex items-center justify-between border-b border-zinc-800 px-5 py-3">
          <h3 className="text-sm font-semibold text-zinc-100">
            {t('title')} {step === 'pick' ? `— ${t('pickMode')}` : mode ? `— ${t(`modes.${mode}.label`)}` : ''}
          </h3>
          <button
            onClick={onClose}
            aria-label={t('close')}
            className="text-zinc-400 hover:text-zinc-200 leading-none"
          >
            <X size={18} strokeWidth={2} />
          </button>
        </header>

        <div className="p-5">
          {step === 'pick' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {MODE_ORDER.map((m) => {
                const Icon = MODE_ICON[m];
                return (
                  <button
                    key={m}
                    onClick={() => handlePick(m)}
                    className="group flex flex-col items-start gap-2 rounded-lg border border-zinc-700 bg-zinc-800/60 p-4 text-left transition-colors hover:border-blue-500 hover:bg-blue-900/20"
                  >
                    <Icon size={20} strokeWidth={1.75} className="text-zinc-400 group-hover:text-blue-400 transition-colors" />
                    <span className="text-sm font-semibold text-zinc-100">{t(`modes.${m}.label`)}</span>
                    <span className="text-xs text-zinc-400">{t(`modes.${m}.desc`)}</span>
                  </button>
                );
              })}
            </div>
          )}

          {step === 'input' && mode && SINGLE_MODES.has(mode as SingleValueMode) && (
            <ModeSingleValue
              label={t(`modes.${mode}.fieldLabel`)}
              placeholder={t(`modes.${mode}.placeholder`)}
              hint={t(`modes.${mode}.hint`)}
              onSubmit={handleSingle(mode as SingleValueMode)}
              onBack={handleBack}
              loading={loading}
            />
          )}

          {step === 'input' && mode === 'repair' && (
            <ModeRepair onSubmit={onRepairSubmit} onBack={handleBack} loading={loading} />
          )}

          {step === 'input' && mode && DATE_RANGE_MODES.has(mode as DateRangeMode) && (
            <ModeDateRange
              mode={mode as DateRangeMode}
              hint={t(`modes.${mode}.hint`)}
              onSubmit={onDateRangeSubmit}
              onBack={handleBack}
              loading={loading}
            />
          )}
        </div>
      </div>
    </div>
  );
}
