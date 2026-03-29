/**
 * @file ProductionPlanRegister.tsx
 * @description 생산계획등록 CRUD 폼 컴포넌트 (메뉴 20).
 * 초보자 가이드:
 * 1. 상단 입력 폼 — 계획일자, 라인코드, Shift, 모델명 등 입력 필드.
 * 2. 하단 목록 테이블 — 등록된 계획을 조회하고 행 클릭 시 수정 모드 진입.
 * 3. 신규/저장/삭제 버튼으로 CRUD 동작.
 * 4. SWR로 목록 자동 갱신, fetch로 CUD 요청.
 */
'use client';

import { useState, useCallback, useEffect } from 'react';
import useSWR, { mutate } from 'swr';
import DisplayLayout from '@/components/display/DisplayLayout';
import RunCardSelectModal from './RunCardSelectModal';
import { fetcher } from '@/lib/fetcher';
import { buildDisplayApiUrl, DEFAULT_ORG_ID, fmtNum, getSelectedLines } from '@/lib/display-helpers';

/** 라인 목록 API 응답 타입 */
interface LineItem { lineCode: string; lineName: string }
interface LineGroup { division: string; lines: LineItem[] }

/** 빈 폼 초기값 */
const EMPTY_FORM = {
  planDate: new Date().toISOString().slice(0, 10),
  lineCode: '',
  shiftCode: 'A',
  modelName: '',
  itemCode: '',
  uph: '',
  planQty: '',
  workerQty: '',
  leaderId: '',
  subLeaderId: '',
  comments: '',
};

type FormState = typeof EMPTY_FORM;

/** 테이블 행 타입 */
interface PlanRow {
  PLAN_DATE: string;
  LINE_CODE: string;
  LINE_NAME: string | null;
  SHIFT_CODE: string;
  MODEL_NAME: string | null;
  ITEM_CODE: string | null;
  UPH: number | null;
  PLAN_QTY: number | null;
  WORKER_QTY: number | null;
  COMMENTS: string | null;
  LEADER_ID: string | null;
  SUB_LEADER_ID: string | null;
  LEADER_NAME: string | null;
  SUB_LEADER_NAME: string | null;
  ENTER_DATE: string | null;
  ENTER_BY: string | null;
}

/** 입력 필드 공통 스타일 */
const inputCls =
  'w-full rounded border border-zinc-300 bg-white px-2 py-1 text-sm dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100';
const labelCls = 'block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-0.5';
const btnBase = 'rounded px-3 py-1.5 text-sm font-semibold transition-colors';

interface ProductionPlanRegisterProps {
  screenId: string;
}

export default function ProductionPlanRegister({ screenId }: ProductionPlanRegisterProps) {
  const [form, setForm] = useState<FormState>({ ...EMPTY_FORM });
  const [editMode, setEditMode] = useState(false);
  const [selectedDate, setSelectedDate] = useState(EMPTY_FORM.planDate);
  const [runCardModalOpen, setRunCardModalOpen] = useState(false);
  const [message, setMessage] = useState<{ type: 'error' | 'success'; text: string } | null>(null);
  const [selectedLinesCsv, setSelectedLinesCsv] = useState(() => getSelectedLines(screenId));

  const apiUrl = buildDisplayApiUrl('20', {
    orgId: DEFAULT_ORG_ID,
    planDate: selectedDate,
  });

  const { data } = useSWR<{ rows: PlanRow[] }>(apiUrl, fetcher, {
    refreshInterval: 0,
  });
  const rows = data?.rows ?? [];

  /* 라인 목록 조회 */
  const { data: lineData } = useSWR<{ groups: LineGroup[] }>(
    `/api/display/lines?orgId=${DEFAULT_ORG_ID}`, fetcher, { refreshInterval: 0 },
  );
  const allGroups = lineData?.groups ?? [];

  /* 헤더에서 선택한 라인만 필터링 */
  const selectedSet = selectedLinesCsv === '%'
    ? null  /* 전체 */
    : new Set(selectedLinesCsv.split(',').map((s) => s.trim()));
  const lineGroups = selectedSet
    ? allGroups
        .map((g) => ({ ...g, lines: g.lines.filter((l) => selectedSet.has(l.lineCode)) }))
        .filter((g) => g.lines.length > 0)
    : allGroups;

  /* 라인 선택 변경 이벤트 감지 */
  useEffect(() => {
    const handler = () => setSelectedLinesCsv(getSelectedLines(screenId));
    window.addEventListener(`line-config-changed-${screenId}`, handler);
    return () => window.removeEventListener(`line-config-changed-${screenId}`, handler);
  }, [screenId]);

  /** 폼 필드 변경 핸들러 */
  const onChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
      setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    },
    [],
  );

  /** 신규 버튼 */
  const handleNew = () => {
    setForm({ ...EMPTY_FORM, planDate: selectedDate });
    setEditMode(false);
  };

  /** 저장/수정 */
  const handleSave = async () => {
    if (!form.planDate || !form.lineCode) {
      setMessage({ type: 'error', text: '계획일자와 라인코드는 필수입니다.' });
      return;
    }
    const method = editMode ? 'PUT' : 'POST';
    const body = { ...form, orgId: DEFAULT_ORG_ID, enterBy: 'SYSTEM', modifyBy: 'SYSTEM' };
    try {
      const res = await fetch('/api/display/20', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error('요청 실패');
      await mutate(apiUrl);
      handleNew();
    } catch (err) {
      console.error(err);
      setMessage({ type: 'error', text: editMode ? '수정 실패' : '등록 실패' });
    }
  };

  /** 삭제 */
  const handleDelete = async () => {
    if (!editMode) return;
    /* confirm 대신 삭제 버튼이 editMode일 때만 보이므로 바로 실행 */
    try {
      const params = new URLSearchParams({
        planDate: form.planDate,
        lineCode: form.lineCode,
        orgId: DEFAULT_ORG_ID,
      });
      const res = await fetch(`/api/display/20?${params}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('삭제 실패');
      await mutate(apiUrl);
      handleNew();
    } catch (err) {
      console.error(err);
      setMessage({ type: 'error', text: '삭제 실패' });
    }
  };

  /** 행 클릭 → 폼 채우기 */
  const handleRowClick = (row: PlanRow) => {
    const dateStr =
      typeof row.PLAN_DATE === 'string' && row.PLAN_DATE.length >= 10
        ? row.PLAN_DATE.slice(0, 10)
        : row.PLAN_DATE;
    setForm({
      planDate: dateStr,
      lineCode: row.LINE_CODE ?? '',
      shiftCode: row.SHIFT_CODE ?? 'A',
      modelName: row.MODEL_NAME ?? '',
      itemCode: row.ITEM_CODE ?? '',
      uph: String(row.UPH ?? ''),
      planQty: String(row.PLAN_QTY ?? ''),
      workerQty: String(row.WORKER_QTY ?? ''),
      leaderId: row.LEADER_ID ?? '',
      subLeaderId: row.SUB_LEADER_ID ?? '',
      comments: row.COMMENTS ?? '',
    });
    setEditMode(true);
  };

  /** 런카드 선택 시 모델명/제품코드/계획수량 자동 입력 */
  const handleRunCardSelect = useCallback((row: { MODEL_NAME: string; ITEM_CODE: string; LOT_SIZE: number }) => {
    setForm((prev) => ({
      ...prev,
      modelName: row.MODEL_NAME,
      itemCode: row.ITEM_CODE,
      planQty: String(row.LOT_SIZE),
    }));
    setRunCardModalOpen(false);
  }, []);

  return (
    <DisplayLayout screenId={screenId}>
      <RunCardSelectModal
        isOpen={runCardModalOpen}
        lineCode={form.lineCode}
        onSelect={handleRunCardSelect}
        onClose={() => setRunCardModalOpen(false)}
      />
      <div className="flex h-full flex-col gap-3 overflow-auto p-3">
        {/* ── 입력 폼 ── */}
        <section className="rounded-lg border border-zinc-200 bg-zinc-50 p-3 dark:border-zinc-700 dark:bg-zinc-900">
          <div className="grid grid-cols-4 gap-x-4 gap-y-2">
            <Field label="계획일자">
              <input type="date" name="planDate" value={form.planDate} onChange={onChange} className={inputCls} />
            </Field>
            <Field label="라인코드">
              <select
                name="lineCode" value={form.lineCode} onChange={onChange}
                disabled={editMode} className={`${inputCls} ${editMode ? 'opacity-60' : ''}`}
              >
                <option value="">-- 선택 --</option>
                {lineGroups.map((g) => (
                  <optgroup key={g.division} label={g.division}>
                    {g.lines.map((l) => (
                      <option key={l.lineCode} value={l.lineCode}>{l.lineName}</option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </Field>
            <Field label="Shift">
              <select name="shiftCode" value={form.shiftCode} onChange={onChange} className={inputCls}>
                <option value="A">A</option>
                <option value="B">B</option>
              </select>
            </Field>
            <Field label="모델명">
              <div className="flex gap-1">
                <input type="text" name="modelName" value={form.modelName} onChange={onChange} className={`${inputCls} flex-1`} readOnly />
                <button
                  type="button"
                  disabled={!form.lineCode}
                  onClick={() => setRunCardModalOpen(true)}
                  className="shrink-0 rounded border border-zinc-300 bg-zinc-100 px-2 text-xs hover:bg-zinc-200 dark:border-zinc-600 dark:bg-zinc-700 dark:hover:bg-zinc-600"
                >
                  검색
                </button>
              </div>
            </Field>
            <Field label="제품코드">
              <input type="text" name="itemCode" value={form.itemCode} onChange={onChange} className={inputCls} readOnly />
            </Field>
            <Field label="UPH">
              <input type="number" name="uph" value={form.uph} onChange={onChange} className={inputCls} />
            </Field>
            <Field label="계획수량">
              <input type="number" name="planQty" value={form.planQty} onChange={onChange} className={inputCls} />
            </Field>
            <Field label="작업인원">
              <input type="number" name="workerQty" value={form.workerQty} onChange={onChange} className={inputCls} />
            </Field>
            <Field label="리더 ID">
              <input type="text" name="leaderId" value={form.leaderId} onChange={onChange} className={inputCls} />
            </Field>
            <Field label="부리더 ID">
              <input type="text" name="subLeaderId" value={form.subLeaderId} onChange={onChange} className={inputCls} />
            </Field>
            <Field label="NOTICE" span={2}>
              <input type="text" name="comments" value={form.comments} onChange={onChange} className={inputCls} />
            </Field>
          </div>

          {/* 버튼 + 메시지 */}
          <div className="mt-3 flex items-center gap-2">
            <button onClick={handleNew} className={`${btnBase} bg-zinc-200 text-zinc-700 hover:bg-zinc-300 dark:bg-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-600`}>
              신규
            </button>
            <button onClick={handleSave} className={`${btnBase} bg-blue-600 text-white hover:bg-blue-700`}>
              {editMode ? '수정' : '저장'}
            </button>
            {editMode && (
              <button onClick={handleDelete} className={`${btnBase} bg-red-600 text-white hover:bg-red-700`}>
                삭제
              </button>
            )}
            {message && (
              <span className={`ml-2 text-xs ${message.type === 'error' ? 'text-red-500' : 'text-green-500'}`}>
                {message.text}
              </span>
            )}
          </div>
        </section>

        {/* ── 날짜 필터 + 건수 ── */}
        <div className="flex items-center gap-3">
          <input
            type="date" value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className={`${inputCls} w-44`}
          />
          <span className="text-xs text-zinc-500 dark:text-zinc-400">
            총 {rows.length}건
          </span>
        </div>

        {/* ── 목록 테이블 ── */}
        <div className="min-h-0 flex-1 overflow-auto rounded-lg border border-zinc-200 dark:border-zinc-700">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
              <tr>
                {['일자', '라인', 'Shift', '모델명', '제품코드', 'UPH', '계획수량', '인원', '리더', 'NOTICE'].map(
                  (h) => (
                    <th key={h} className="whitespace-nowrap px-2 py-1.5 text-left font-medium">
                      {h}
                    </th>
                  ),
                )}
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr
                  key={`${r.PLAN_DATE}-${r.LINE_CODE}`}
                  onClick={() => handleRowClick(r)}
                  className={`cursor-pointer border-t border-zinc-100 hover:bg-blue-50 dark:border-zinc-800 dark:hover:bg-zinc-700 ${
                    i % 2 === 1 ? 'bg-zinc-50 dark:bg-zinc-900/50' : 'bg-white dark:bg-zinc-950'
                  }`}
                >
                  <td className="px-2 py-1">{String(r.PLAN_DATE ?? '').slice(0, 10)}</td>
                  <td className="px-2 py-1">{r.LINE_NAME ?? r.LINE_CODE}</td>
                  <td className="px-2 py-1">{r.SHIFT_CODE}</td>
                  <td className="px-2 py-1">{r.MODEL_NAME}</td>
                  <td className="px-2 py-1">{r.ITEM_CODE}</td>
                  <td className="px-2 py-1 text-right">{fmtNum(r.UPH)}</td>
                  <td className="px-2 py-1 text-right">{fmtNum(r.PLAN_QTY)}</td>
                  <td className="px-2 py-1 text-right">{fmtNum(r.WORKER_QTY)}</td>
                  <td className="px-2 py-1">{r.LEADER_NAME}</td>
                  <td className="px-2 py-1">{r.COMMENTS}</td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={10} className="py-8 text-center text-zinc-400 dark:text-zinc-600">
                    등록된 계획이 없습니다.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </DisplayLayout>
  );
}

/** 라벨+필드 래퍼 */
function Field({ label, span, children }: { label: string; span?: number; children: React.ReactNode }) {
  return (
    <div className={span === 2 ? 'col-span-2' : ''}>
      <label className={labelCls}>{label}</label>
      {children}
    </div>
  );
}
