/**
 * @file SolderThresholdModal.tsx
 * @description Solder Paste 경고 임계값 설정 모달.
 * 초보자 가이드: 개봉후경과(GAP3), 해동후경과시간, 유효기간의 위험/주의 임계값을 조정한다.
 * localStorage에 저장되어 새로고침 후에도 유지되며, 저장 시 이벤트로 즉시 반영된다.
 */
'use client';

import { useState, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import Modal from '@/components/ui/Modal';
import { DEFAULT_SOLDER_THRESHOLDS, DEFAULT_TIMING_CONFIG } from '@/types/option';
import type { SolderThresholdConfig, DisplayTimingConfig } from '@/types/option';
import { saveSolderThresholds } from '@/hooks/useSolderThresholds';
import { loadTiming, saveTiming } from '@/hooks/useDisplayTiming';

interface SolderThresholdModalProps {
  isOpen: boolean;
  onClose: () => void;
}

/** HH:MM 형식 검증 (00:00 ~ 99:59) */
function isValidTime(val: string): boolean {
  return /^\d{2}:\d{2}$/.test(val) && Number(val.slice(3)) < 60;
}

/** 시간 입력 필드 */
function TimeInput({ label, color, value, onChange }: {
  label: string;
  color: 'red' | 'amber';
  value: string;
  onChange: (v: string) => void;
}) {
  const borderColor = color === 'red'
    ? 'border-red-500 focus:ring-red-500/30'
    : 'border-amber-500 focus:ring-amber-500/30';
  const dotColor = color === 'red' ? 'bg-red-500' : 'bg-amber-500';

  return (
    <div className="flex flex-col gap-1.5">
      <label className="flex items-center gap-1.5 text-sm font-medium text-zinc-300">
        <span className={`inline-block h-2.5 w-2.5 rounded-full ${dotColor}`} />
        {label}
      </label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="HH:MM"
        maxLength={5}
        className={`w-full rounded-md border bg-zinc-800 px-3 py-2 text-center font-mono text-base
          text-white outline-none transition focus:ring-2 ${borderColor}`}
      />
    </div>
  );
}

/** 숫자 입력 필드 */
function NumberInput({ label, color, value, onChange, suffix }: {
  label: string;
  color: 'red' | 'amber';
  value: number;
  onChange: (v: number) => void;
  suffix?: string;
}) {
  const borderColor = color === 'red'
    ? 'border-red-500 focus:ring-red-500/30'
    : 'border-amber-500 focus:ring-amber-500/30';
  const dotColor = color === 'red' ? 'bg-red-500' : 'bg-amber-500';

  return (
    <div className="flex flex-col gap-1.5">
      <label className="flex items-center gap-1.5 text-sm font-medium text-zinc-300">
        <span className={`inline-block h-2.5 w-2.5 rounded-full ${dotColor}`} />
        {label}
      </label>
      <div className="flex items-center gap-2">
        <input
          type="number"
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className={`w-full rounded-md border bg-zinc-800 px-3 py-2 text-center font-mono text-base
            text-white outline-none transition focus:ring-2 ${borderColor}`}
        />
        {suffix && <span className="shrink-0 text-sm text-zinc-400">{suffix}</span>}
      </div>
    </div>
  );
}

/** 섹션 헤더 */
function SectionHeader({ title, description }: { title: string; description?: string }) {
  return (
    <div className="mb-3">
      <h4 className="text-base font-bold text-white">{title}</h4>
      {description && <p className="mt-0.5 text-xs text-zinc-500">{description}</p>}
    </div>
  );
}

/** Solder Paste 임계값 설정 모달 */
export default function SolderThresholdModal({ isOpen, onClose }: SolderThresholdModalProps) {
  const t = useTranslations('solderTable');
  const tDisplay = useTranslations('display');
  const tCommon = useTranslations('common');
  const [config, setConfig] = useState<SolderThresholdConfig>(() => {
    try {
      const raw = localStorage.getItem('solder-thresholds');
      if (raw) return { ...DEFAULT_SOLDER_THRESHOLDS, ...JSON.parse(raw) };
    } catch { /* 무시 */ }
    return { ...DEFAULT_SOLDER_THRESHOLDS };
  });
  const [timing, setTiming] = useState<DisplayTimingConfig>(() => loadTiming());

  const update = useCallback(<K extends keyof SolderThresholdConfig>(key: K, val: SolderThresholdConfig[K]) => {
    setConfig((prev) => ({ ...prev, [key]: val }));
  }, []);

  const handleReset = useCallback(() => {
    setConfig({ ...DEFAULT_SOLDER_THRESHOLDS });
    setTiming({ ...DEFAULT_TIMING_CONFIG });
  }, []);

  const handleSave = useCallback(() => {
    if (!isValidTime(config.gap3Danger) || !isValidTime(config.gap3Warning)) {
      alert(t('invalidGap3'));
      return;
    }
    if (!isValidTime(config.unfreezingDanger) || !isValidTime(config.unfreezingWarning)) {
      alert(t('invalidUnfreezing'));
      return;
    }
    saveSolderThresholds(config);
    saveTiming(timing);
    onClose();
  }, [config, timing, onClose, t]);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={t('thresholdTitle')}
      subtitle={t('thresholdDesc')}
      size="md"
      footer={
        <>
          <button
            onClick={handleReset}
            className="mr-auto rounded-md border border-zinc-600 px-4 py-2 text-sm font-medium
              text-zinc-300 transition hover:bg-zinc-700"
          >
            {t('reset')}
          </button>
          <button
            onClick={onClose}
            className="rounded-md border border-zinc-600 px-4 py-2 text-sm font-medium
              text-zinc-300 transition hover:bg-zinc-700"
          >
            {tCommon('cancel')}
          </button>
          <button
            onClick={handleSave}
            className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-bold text-white
              transition hover:bg-emerald-500"
          >
            {tCommon('save')}
          </button>
        </>
      }
    >
      <div className="flex flex-col gap-6">
        {/* 화면 타이밍 설정 */}
        <section>
          <SectionHeader title={tDisplay('timingSection')} description={tDisplay('timingDesc')} />
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="flex items-center gap-1.5 text-sm font-medium text-zinc-300">
                <span className="inline-block h-2.5 w-2.5 rounded-full bg-blue-500" />
                {tDisplay('refreshLabel')}
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={5}
                  max={300}
                  value={timing.refreshSeconds}
                  onChange={(e) => setTiming((prev) => ({ ...prev, refreshSeconds: Math.max(5, Math.min(300, Number(e.target.value) || 30)) }))}
                  className="w-full rounded-md border border-blue-500 bg-zinc-800 px-3 py-2 text-center font-mono text-base
                    text-white outline-none transition focus:ring-2 focus:ring-blue-500/30"
                />
                <span className="shrink-0 text-sm text-zinc-400">{tCommon('seconds')}</span>
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="flex items-center gap-1.5 text-sm font-medium text-zinc-300">
                <span className="inline-block h-2.5 w-2.5 rounded-full bg-cyan-500" />
                {tDisplay('scrollLabel')}
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={3}
                  max={60}
                  value={timing.scrollSeconds}
                  onChange={(e) => setTiming((prev) => ({ ...prev, scrollSeconds: Math.max(3, Math.min(60, Number(e.target.value) || 5)) }))}
                  className="w-full rounded-md border border-cyan-500 bg-zinc-800 px-3 py-2 text-center font-mono text-base
                    text-white outline-none transition focus:ring-2 focus:ring-cyan-500/30"
                />
                <span className="shrink-0 text-sm text-zinc-400">{tCommon('seconds')}</span>
              </div>
            </div>
          </div>
        </section>

        <hr className="border-zinc-700" />

        {/* 개봉후경과 (GAP3) */}
        <section>
          <SectionHeader title={`${t('gap3Section')} (GAP3)`} description="HH:MM" />
          <div className="grid grid-cols-2 gap-4">
            <TimeInput label={t('danger')} color="red" value={config.gap3Danger} onChange={(v) => update('gap3Danger', v)} />
            <TimeInput label={t('warning')} color="amber" value={config.gap3Warning} onChange={(v) => update('gap3Warning', v)} />
          </div>
        </section>

        {/* 해동후경과시간 */}
        <section>
          <SectionHeader title={t('unfreezingSection')} description="HH:MM" />
          <div className="grid grid-cols-2 gap-4">
            <TimeInput label={t('danger')} color="red" value={config.unfreezingDanger} onChange={(v) => update('unfreezingDanger', v)} />
            <TimeInput label={t('warning')} color="amber" value={config.unfreezingWarning} onChange={(v) => update('unfreezingWarning', v)} />
          </div>
        </section>

        {/* 유효기간 */}
        <section>
          <SectionHeader title={t('validSection')} />
          <div className="grid grid-cols-2 gap-4">
            <NumberInput label={t('danger')} color="red" value={config.validExpired} onChange={(v) => update('validExpired', v)} />
            <NumberInput label={t('warning')} color="amber" value={config.validWarning} onChange={(v) => update('validWarning', v)} />
          </div>
        </section>
      </div>
    </Modal>
  );
}
