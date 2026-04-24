/**
 * @file src/components/mxvc/reverse-trace/modes/ModeExcel.tsx
 * @description 엑셀 업로드 모드 — 1열(자재바코드롯트번호) 엑셀에서 릴번호 추출
 *
 * 초보자 가이드:
 * - xlsx 라이브러리로 클라이언트 파싱 (API 호출 없음)
 * - 1행은 헤더로 가정(무시), 2행부터 릴번호
 * - 최대 1000행 제한, 빈 값/숫자형 제외, 중복 제거
 */
'use client';
import { useState, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import * as XLSX from 'xlsx';
import type { ExcelCandidate } from '@/types/mxvc/reverse-trace-wizard';

interface Props {
  onSubmit: (candidates: ExcelCandidate[]) => void;
  onBack:   () => void;
}

const MAX_ROWS = 1000;

export default function ModeExcel({ onSubmit, onBack }: Props) {
  const t = useTranslations('mxvcReverseTrace');
  const [fileName, setFileName] = useState('');
  const [parsed, setParsed]     = useState<ExcelCandidate[]>([]);
  const [error, setError]       = useState('');

  const handleFile = useCallback(async (file: File) => {
    setError(''); setFileName(file.name); setParsed([]);
    try {
      const buf = await file.arrayBuffer();
      const wb  = XLSX.read(buf, { type: 'array' });
      const ws  = wb.Sheets[wb.SheetNames[0]];
      const rows: unknown[][] = XLSX.utils.sheet_to_json(ws, { header: 1, blankrows: false });
      const body = rows.slice(1); // 1행 헤더 제거
      if (body.length > MAX_ROWS) {
        setError(t('excel.errorTooMany', { input: body.length, max: MAX_ROWS }));
        return;
      }
      const seen = new Set<string>();
      const list: ExcelCandidate[] = [];
      body.forEach((row, idx) => {
        const raw = row[0];
        if (raw == null) return;
        const reelCd = String(raw).trim();
        if (!reelCd || seen.has(reelCd)) return;
        seen.add(reelCd);
        list.push({ reelCd, rowIndex: idx + 2 });  // +2: 1행 헤더 + 0-based → 1-based
      });
      if (list.length === 0) {
        setError(t('excel.errorNoReels'));
        return;
      }
      setParsed(list);
    } catch (e) {
      setError(t('excel.errorReadFile', { msg: (e as Error).message }));
    }
  }, [t]);

  const canSubmit = parsed.length > 0 && !error;
  return (
    <div className="space-y-3">
      <div>
        <label className="block mb-1 text-xs font-medium text-zinc-300">{t('excel.fileLabel')}</label>
        <input
          type="file"
          accept=".xlsx,.xls"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) handleFile(f);
          }}
          className="block w-full text-sm text-zinc-300 file:mr-3 file:rounded file:border-0 file:bg-blue-600 file:px-4 file:py-1.5 file:text-white file:hover:bg-blue-500"
        />
        <p className="mt-1 text-xs text-zinc-500">
          {t('excel.hint', { max: MAX_ROWS })}
        </p>
      </div>
      {fileName && !error && parsed.length > 0 && (
        <div className="rounded border border-emerald-700 bg-emerald-900/20 p-2 text-xs text-emerald-300">
          {t('excel.parsedOk', { file: fileName, count: parsed.length })}
        </div>
      )}
      {error && (
        <div className="rounded border border-red-700 bg-red-900/20 p-2 text-xs text-red-300">{error}</div>
      )}
      <div className="flex justify-end gap-2 pt-2 border-t border-zinc-800">
        <button onClick={onBack} className="px-3 py-1.5 text-sm rounded border border-zinc-700 text-zinc-300 hover:bg-zinc-800">{t('back')}</button>
        <button
          onClick={() => onSubmit(parsed)}
          disabled={!canSubmit}
          className="px-4 py-1.5 text-sm rounded bg-blue-600 text-white hover:bg-blue-500 disabled:opacity-40"
        >{t('excel.next')}</button>
      </div>
    </div>
  );
}
