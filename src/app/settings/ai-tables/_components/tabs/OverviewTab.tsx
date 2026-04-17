/**
 * @file OverviewTab.tsx
 * @description 테이블 개요 — summary 편집 + DB 테이블 주석 DDL 편집.
 *
 * 초보자 가이드:
 * - summary는 tables.json 의 meta.summary (페이지 내부용, 80자 권장).
 * - DB 주석은 Oracle USER_TAB_COMMENTS — DDL 미리보기 → 실행 순서.
 * - 저장 성공 시 `onChange()` 호출 → SWR revalidate.
 */

'use client';

import { useEffect, useState } from 'react';
import { api } from '../../_lib/api-client';
import { useAiTablesStore } from '../../_hooks/useAiTablesStore';
import DdlPreviewModal from '../modals/DdlPreviewModal';

/* eslint-disable @typescript-eslint/no-explicit-any */
interface Props {
  data: any;
  onChange: () => void;
}

export default function OverviewTab({ data, onChange }: Props) {
  const { activeSite, activeTable } = useAiTablesStore();
  const [summary, setSummary] = useState<string>(data.meta.summary ?? '');
  const [enabled, setEnabled] = useState<boolean>(!!data.meta.enabled);
  const [tableComment, setTableComment] = useState<string>(
    data.schema.tableComment ?? '',
  );
  const [savingMeta, setSavingMeta] = useState(false);
  const [savedMsg, setSavedMsg] = useState<string | null>(null);
  const [preview, setPreview] = useState<null | {
    before: string | null;
    after: string;
    ddl: string;
  }>(null);

  // 다른 테이블로 넘어갔을 때 로컬 state 초기화
  useEffect(() => {
    setSummary(data.meta.summary ?? '');
    setEnabled(!!data.meta.enabled);
    setTableComment(data.schema.tableComment ?? '');
    setSavedMsg(null);
  }, [activeTable, data.meta.summary, data.meta.enabled, data.schema.tableComment]);

  const saveMeta = async () => {
    setSavingMeta(true);
    setSavedMsg(null);
    try {
      await api.patchTable(activeSite, activeTable as string, {
        summary,
        enabled,
      });
      setSavedMsg('저장됨');
      onChange();
    } catch (e) {
      setSavedMsg(`오류: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setSavingMeta(false);
    }
  };

  const openDdlPreview = async () => {
    try {
      const r = await api.previewTableComment(
        activeSite,
        activeTable as string,
        tableComment,
      );
      setPreview({ before: r.before, after: r.after, ddl: r.ddl });
    } catch (e) {
      setSavedMsg(`미리보기 실패: ${e instanceof Error ? e.message : String(e)}`);
    }
  };

  const confirmDdl = async () => {
    if (!preview) return;
    await api.executeTableComment(
      activeSite,
      activeTable as string,
      preview.ddl,
      preview.before,
      preview.after,
    );
    setPreview(null);
    setSavedMsg('DB 주석 변경 완료');
    onChange();
  };

  return (
    <div className="space-y-5 max-w-2xl">
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={enabled}
          onChange={(e) => setEnabled(e.target.checked)}
        />
        AI 컨텍스트에 이 테이블 포함 (enabled)
      </label>

      <div>
        <label className="block text-sm mb-1 text-zinc-700 dark:text-zinc-300">
          Summary{' '}
          <span className="text-xs text-zinc-500 dark:text-zinc-400">
            (페이지/프롬프트용, 80자 권장)
          </span>
        </label>
        <input
          className="w-full px-2 py-1.5 text-sm border rounded border-zinc-300 bg-white dark:bg-zinc-900 dark:border-zinc-700"
          value={summary}
          onChange={(e) => setSummary(e.target.value)}
          maxLength={200}
        />
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          className="px-3 py-1.5 text-sm bg-zinc-200 text-zinc-900 dark:bg-zinc-700 dark:text-zinc-100 rounded hover:bg-zinc-300 dark:hover:bg-zinc-600 disabled:opacity-50"
          onClick={saveMeta}
          disabled={savingMeta}
        >
          {savingMeta ? '저장 중...' : '메타 저장'}
        </button>
        {savedMsg && (
          <span className="text-xs text-zinc-600 dark:text-zinc-400">
            {savedMsg}
          </span>
        )}
      </div>

      <hr className="border-zinc-200 dark:border-zinc-800" />

      <div>
        <label className="block text-sm mb-1 text-zinc-700 dark:text-zinc-300">
          DB 테이블 주석{' '}
          <span className="text-xs text-zinc-500 dark:text-zinc-400">
            (Oracle USER_TAB_COMMENTS)
          </span>
        </label>
        <textarea
          className="w-full px-2 py-1.5 text-sm border rounded border-zinc-300 bg-white dark:bg-zinc-900 dark:border-zinc-700 h-24"
          value={tableComment}
          onChange={(e) => setTableComment(e.target.value)}
        />
        <button
          type="button"
          className="mt-1 px-3 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
          onClick={openDdlPreview}
        >
          DDL 미리보기
        </button>
      </div>

      <DdlPreviewModal
        open={!!preview}
        title="테이블 주석 변경 미리보기"
        before={preview?.before ?? null}
        after={preview?.after ?? ''}
        ddl={preview?.ddl ?? ''}
        onCancel={() => setPreview(null)}
        onConfirm={confirmDdl}
      />
    </div>
  );
}
/* eslint-enable @typescript-eslint/no-explicit-any */
