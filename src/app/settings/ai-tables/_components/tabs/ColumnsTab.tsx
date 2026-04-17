/**
 * @file ColumnsTab.tsx
 * @description 컬럼 테이블 뷰 — 주석 더블클릭 편집 + excludeFromPrompt 토글.
 *
 * 초보자 가이드:
 * - 주석 셀을 더블클릭하면 input으로 전환. Enter/blur 시 DDL 미리보기 모달 오픈.
 * - excludeFromPrompt 체크박스는 즉시 PATCH (tables.json.columnOverrides 업데이트).
 * - priority 는 현재 표시만 — 편집은 Phase 3b 도메인 관리에서 확장.
 */

'use client';

import { useState } from 'react';
import { api } from '../../_lib/api-client';
import { useAiTablesStore } from '../../_hooks/useAiTablesStore';
import DdlPreviewModal from '../modals/DdlPreviewModal';

/* eslint-disable @typescript-eslint/no-explicit-any */
interface ResolvedColumn {
  name: string;
  type: string;
  nullable: boolean;
  comment: string | null;
  priority: 'key' | 'common' | 'rare';
  excludeFromPrompt: boolean;
  hint?: string;
  domainId?: string;
}

interface Props {
  data: { resolvedColumns: ResolvedColumn[]; schema: any; meta: any };
  onChange: () => void;
}

export default function ColumnsTab({ data, onChange }: Props) {
  const { activeSite, activeTable } = useAiTablesStore();
  const [editCol, setEditCol] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<string>('');
  const [preview, setPreview] = useState<null | {
    colName: string;
    before: string | null;
    after: string;
    ddl: string;
  }>(null);
  const [errMsg, setErrMsg] = useState<string | null>(null);

  const startEdit = (col: ResolvedColumn) => {
    setEditCol(col.name);
    setEditValue(col.comment ?? '');
  };

  const commitEdit = async (colName: string, newComment: string) => {
    setEditCol(null);
    // 변경 없으면 skip
    const orig = data.resolvedColumns.find((c) => c.name === colName);
    if ((orig?.comment ?? '') === newComment) return;
    try {
      const r = await api.previewColComment(
        activeSite,
        activeTable as string,
        colName,
        newComment,
      );
      setPreview({
        colName,
        before: r.before,
        after: r.after,
        ddl: r.ddl,
      });
    } catch (e) {
      setErrMsg(`미리보기 실패: ${e instanceof Error ? e.message : String(e)}`);
    }
  };

  const confirm = async () => {
    if (!preview) return;
    await api.executeColComment(
      activeSite,
      activeTable as string,
      preview.colName,
      preview.ddl,
      preview.before,
      preview.after,
    );
    setPreview(null);
    onChange();
  };

  const toggleExclude = async (colName: string, currentValue: boolean) => {
    try {
      await api.patchColumn(activeSite, activeTable as string, colName, {
        excludeFromPrompt: !currentValue,
      });
      onChange();
    } catch (e) {
      setErrMsg(`저장 실패: ${e instanceof Error ? e.message : String(e)}`);
    }
  };

  return (
    <div>
      {errMsg && (
        <div className="mb-3 p-2 bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-200 text-xs rounded">
          {errMsg}
        </div>
      )}
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-xs text-zinc-500 dark:text-zinc-400 border-b border-zinc-200 dark:border-zinc-800">
            <th className="py-2 px-1 font-medium">컬럼</th>
            <th className="py-2 px-1 font-medium">타입</th>
            <th className="py-2 px-1 font-medium">주석 (더블클릭 편집)</th>
            <th className="py-2 px-1 font-medium text-center">우선</th>
            <th className="py-2 px-1 font-medium text-center">도메인</th>
            <th className="py-2 px-1 font-medium text-center">제외</th>
          </tr>
        </thead>
        <tbody>
          {data.resolvedColumns.map((c) => (
            <tr
              key={c.name}
              className="border-t border-zinc-100 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-900"
            >
              <td className="py-1 px-1 font-mono text-xs">{c.name}</td>
              <td className="py-1 px-1 text-xs text-zinc-500 dark:text-zinc-400">
                {c.type}
              </td>
              <td className="py-1 px-1">
                {editCol === c.name ? (
                  <input
                    autoFocus
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    onBlur={() => commitEdit(c.name, editValue)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') commitEdit(c.name, editValue);
                      if (e.key === 'Escape') setEditCol(null);
                    }}
                    className="w-full px-1 py-0.5 text-xs border rounded border-blue-400 bg-white dark:bg-zinc-900"
                  />
                ) : (
                  <span
                    role="button"
                    tabIndex={0}
                    onDoubleClick={() => startEdit(c)}
                    className="cursor-pointer text-xs block min-h-[1rem]"
                    title="더블클릭하여 편집"
                  >
                    {c.comment ?? (
                      <span className="text-zinc-400 italic">(없음)</span>
                    )}
                  </span>
                )}
              </td>
              <td className="py-1 px-1 text-center">
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded ${
                    c.priority === 'key'
                      ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-200'
                      : c.priority === 'rare'
                        ? 'bg-zinc-200 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400'
                        : 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300'
                  }`}
                >
                  {c.priority}
                </span>
              </td>
              <td className="py-1 px-1 text-center text-[10px] text-zinc-500 dark:text-zinc-400">
                {c.domainId ?? '-'}
              </td>
              <td className="py-1 px-1 text-center">
                <input
                  type="checkbox"
                  checked={c.excludeFromPrompt}
                  onChange={() =>
                    toggleExclude(c.name, c.excludeFromPrompt)
                  }
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <DdlPreviewModal
        open={!!preview}
        title={`컬럼 주석 변경: ${preview?.colName ?? ''}`}
        before={preview?.before ?? null}
        after={preview?.after ?? ''}
        ddl={preview?.ddl ?? ''}
        onCancel={() => setPreview(null)}
        onConfirm={confirm}
      />
    </div>
  );
}
/* eslint-enable @typescript-eslint/no-explicit-any */
