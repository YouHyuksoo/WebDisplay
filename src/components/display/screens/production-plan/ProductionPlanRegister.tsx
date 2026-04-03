/**
 * @file ProductionPlanRegister.tsx
 * @description 생산계획등록 CRUD 폼 컴포넌트 (메뉴 20).
 * 초보자 가이드:
 * 1. 상단 조회 영역 — 기간(From~To), 라인코드, 조회 버튼으로 목록 검색.
 * 2. 중단 등록 영역 — 계획일자, 라인, Shift, 모델명 등 입력 + 신규/저장/삭제.
 * 3. 하단 목록 테이블 — 조회 결과. 행 클릭 시 수정 모드 진입.
 * 4. SWR로 목록 조회, fetch로 CUD 요청.
 */
'use client';

import { useState, useCallback, useEffect } from 'react';
import useSWR, { mutate } from 'swr';
import { useTranslations } from 'next-intl';
import DisplayLayout from '@/components/display/DisplayLayout';
import RunCardSelectModal from './RunCardSelectModal';
import { fetcher } from '@/lib/fetcher';
import { buildDisplayApiUrl, DEFAULT_ORG_ID, fmtNum, getSelectedLines } from '@/lib/display-helpers';
import { useServerTime } from '@/hooks/useServerTime';

/** 라인 목록 API 응답 타입 */
interface LineItem { lineCode: string; lineName: string }
interface LineGroup { division: string; lines: LineItem[] }

/** 빈 폼 초기값 */
const EMPTY_FORM = {
  planDate: '',
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

/** 공통 스타일 */
const inputCls =
  'w-full rounded border border-zinc-300 bg-white px-2 py-1 text-sm dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100';
const labelCls = 'block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-0.5';
const btnBase = 'rounded px-3 py-1.5 text-sm font-semibold transition-colors whitespace-nowrap';
const sectionTitle = 'text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-2';

interface ProductionPlanRegisterProps {
  screenId: string;
}

export default function ProductionPlanRegister({ screenId }: ProductionPlanRegisterProps) {
  const serverToday = useServerTime();

  /* ── 조회 조건 상태 ── */
  const [searchDateFrom, setSearchDateFrom] = useState('');
  const [searchDateTo, setSearchDateTo] = useState('');

  /* 서버 시간 로드 시 날짜 초기값 설정 */
  useEffect(() => {
    if (serverToday && !searchDateFrom) {
      setSearchDateFrom(serverToday);
      setSearchDateTo(serverToday);
      setForm((prev) => ({ ...prev, planDate: prev.planDate || serverToday }));
    }
  }, [serverToday, searchDateFrom]);
  const [searchLineCode, setSearchLineCode] = useState('');

  /* ── 등록/수정 폼 상태 ── */
  const [form, setForm] = useState<FormState>({ ...EMPTY_FORM });
  const [editMode, setEditMode] = useState(false);
  const [runCardModalOpen, setRunCardModalOpen] = useState(false);
  const [message, setMessage] = useState<{ type: 'error' | 'success'; text: string } | null>(null);
  const [dupConfirmOpen, setDupConfirmOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [selectedLinesCsv, setSelectedLinesCsv] = useState(() => getSelectedLines(screenId));
  const t = useTranslations('productionPlan');

  /* ── 조회 API URL ── */
  const apiUrl = buildDisplayApiUrl('20', {
    orgId: DEFAULT_ORG_ID,
    planDateFrom: searchDateFrom,
    planDateTo: searchDateTo,
    ...(searchLineCode ? { lineCode: searchLineCode } : {}),
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
    ? null
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

  /** 폼 필드 변경 */
  const onChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
      setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    },
    [],
  );

  /** 신규 버튼 */
  const handleNew = () => {
    setForm({ ...EMPTY_FORM, planDate: searchDateFrom || serverToday });
    setEditMode(false);
    setMessage(null);
  };

  /** 저장/수정 (force=true 시 중복 덮어쓰기) */
  const handleSave = async (force = false) => {
    if (!form.planDate || !form.lineCode) {
      setMessage({ type: 'error', text: t('requiredFields') });
      return;
    }
    const method = editMode ? 'PUT' : 'POST';
    const body = { ...form, orgId: DEFAULT_ORG_ID, enterBy: 'SYSTEM', modifyBy: 'SYSTEM', ...(force ? { force: true } : {}) };
    try {
      const res = await fetch('/api/display/20', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      /* 중복 감지 → 확인 모달 표시 */
      if (res.status === 409) {
        setDupConfirmOpen(true);
        return;
      }
      if (!res.ok) throw new Error('요청 실패');
      await mutate(apiUrl);
      handleNew();
      setMessage({ type: 'success', text: editMode ? t('editSuccess') : t('saveSuccess') });
    } catch (err) {
      console.error(err);
      setMessage({ type: 'error', text: editMode ? t('editFailed') : t('saveFailed') });
    }
  };

  /** 삭제 확인 모달 표시 */
  const handleDeleteClick = () => {
    if (!editMode) return;
    setDeleteConfirmOpen(true);
  };

  /** 삭제 실행 */
  const handleDeleteConfirm = async () => {
    setDeleteConfirmOpen(false);
    try {
      const params = new URLSearchParams({
        planDate: form.planDate,
        lineCode: form.lineCode,
        orgId: DEFAULT_ORG_ID,
        ...(form.shiftCode ? { shiftCode: form.shiftCode } : {}),
        ...(form.modelName ? { modelName: form.modelName } : {}),
      });
      const res = await fetch(`/api/display/20?${params}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('삭제 실패');
      await mutate(apiUrl);
      handleNew();
      setMessage({ type: 'success', text: t('deleteSuccess') });
    } catch (err) {
      console.error(err);
      setMessage({ type: 'error', text: t('deleteFailed') });
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
    setMessage(null);
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

  /** 조회 버튼 핸들러 */
  const handleSearch = () => mutate(apiUrl);

  return (
    <DisplayLayout screenId={screenId}>
      <RunCardSelectModal
        isOpen={runCardModalOpen}
        lineCode={form.lineCode}
        onSelect={handleRunCardSelect}
        onClose={() => setRunCardModalOpen(false)}
      />

      {/* ═══════ 중복 확인 모달 ═══════ */}
      {dupConfirmOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50">
          <div className="w-96 rounded-xl border border-zinc-200 bg-white p-6 shadow-2xl dark:border-zinc-700 dark:bg-zinc-900">
            <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">{t('duplicateTitle')}</h3>
            <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
              {t('duplicateMessage', { date: form.planDate, line: form.lineCode, shift: form.shiftCode, model: form.modelName || '-' })}
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <button
                onClick={() => setDupConfirmOpen(false)}
                className={`${btnBase} bg-zinc-200 text-zinc-700 hover:bg-zinc-300 dark:bg-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-600`}
              >
                {t('cancelBtn')}
              </button>
              <button
                onClick={() => { setDupConfirmOpen(false); handleSave(true); }}
                className={`${btnBase} bg-orange-600 text-white hover:bg-orange-700`}
              >
                {t('overwriteBtn')}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* ═══════ 삭제 확인 모달 ═══════ */}
      {deleteConfirmOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50">
          <div className="w-96 rounded-xl border border-zinc-200 bg-white p-6 shadow-2xl dark:border-zinc-700 dark:bg-zinc-900">
            <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">{t('deleteTitle')}</h3>
            <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
              {t('deleteMessage', { date: form.planDate, line: form.lineCode, shift: form.shiftCode, model: form.modelName || '-' })}
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <button
                onClick={() => setDeleteConfirmOpen(false)}
                className={`${btnBase} bg-zinc-200 text-zinc-700 hover:bg-zinc-300 dark:bg-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-600`}
              >
                {t('cancelBtn')}
              </button>
              <button
                onClick={handleDeleteConfirm}
                className={`${btnBase} bg-red-600 text-white hover:bg-red-700`}
              >
                {t('deleteBtn')}
              </button>
            </div>
          </div>
        </div>
      )}
      <div className="flex h-full flex-col gap-2 overflow-auto p-3">

        {/* ═══════ 조회 영역 ═══════ */}
        <section className="rounded-lg border border-indigo-200 bg-indigo-50/50 p-3 dark:border-indigo-900 dark:bg-indigo-950/30">
          <div className={sectionTitle}>{t('searchSection')}</div>
          <div className="flex flex-wrap items-end gap-3">
            <Field label={t('dateFrom')}>
              <input
                type="date" value={searchDateFrom}
                onChange={(e) => setSearchDateFrom(e.target.value)}
                className={`${inputCls} w-40`}
              />
            </Field>
            <span className="pb-1 text-sm text-zinc-400">~</span>
            <Field label={t('dateTo')}>
              <input
                type="date" value={searchDateTo}
                onChange={(e) => setSearchDateTo(e.target.value)}
                className={`${inputCls} w-40`}
              />
            </Field>
            <Field label={t('lineCode')}>
              <select
                value={searchLineCode}
                onChange={(e) => setSearchLineCode(e.target.value)}
                className={`${inputCls} w-44`}
              >
                <option value="">{t('allLines')}</option>
                {lineGroups.map((g) => (
                  <optgroup key={g.division} label={g.division}>
                    {g.lines.map((l) => (
                      <option key={l.lineCode} value={l.lineCode}>{l.lineName}</option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </Field>
            <button
              onClick={handleSearch}
              className={`${btnBase} bg-indigo-600 text-white hover:bg-indigo-700`}
            >
              {t('searchBtn')}
            </button>
            <span className="pb-1 text-xs text-zinc-500 dark:text-zinc-400">
              {t('totalCount', { count: rows.length })}
            </span>
          </div>
        </section>

        {/* ═══════ 등록/수정 영역 ═══════ */}
        <section className="rounded-lg border border-zinc-200 bg-zinc-50 p-3 dark:border-zinc-700 dark:bg-zinc-900">
          <div className={sectionTitle}>
            {editMode ? t('editSection') : t('registerSection')}
          </div>
          <div className="grid grid-cols-4 gap-x-4 gap-y-2">
            <Field label={t('planDate')}>
              <input type="date" name="planDate" value={form.planDate} onChange={onChange} className={inputCls} />
            </Field>
            <Field label={t('lineCode')}>
              <select
                name="lineCode" value={form.lineCode} onChange={onChange}
                disabled={editMode} className={`${inputCls} ${editMode ? 'opacity-60' : ''}`}
              >
                <option value="">{t('selectLine')}</option>
                {lineGroups.map((g) => (
                  <optgroup key={g.division} label={g.division}>
                    {g.lines.map((l) => (
                      <option key={l.lineCode} value={l.lineCode}>{l.lineName}</option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </Field>
            <Field label={t('shift')}>
              <select name="shiftCode" value={form.shiftCode} onChange={onChange} className={inputCls}>
                <option value="A">A</option>
                <option value="B">B</option>
              </select>
            </Field>
            <Field label={t('modelName')}>
              <div className="flex gap-1">
                <input type="text" name="modelName" value={form.modelName} onChange={onChange} className={`${inputCls} flex-1`} readOnly />
                <button
                  type="button"
                  disabled={!form.lineCode}
                  onClick={() => setRunCardModalOpen(true)}
                  className="shrink-0 rounded border border-zinc-300 bg-zinc-100 px-2 text-xs hover:bg-zinc-200 dark:border-zinc-600 dark:bg-zinc-700 dark:hover:bg-zinc-600"
                >
                  {t('searchModel')}
                </button>
              </div>
            </Field>
            <Field label={t('itemCode')}>
              <input type="text" name="itemCode" value={form.itemCode} onChange={onChange} className={inputCls} readOnly />
            </Field>
            <Field label={t('uph')}>
              <input type="number" name="uph" value={form.uph} onChange={onChange} className={inputCls} />
            </Field>
            <Field label={t('planQty')}>
              <input type="number" name="planQty" value={form.planQty} onChange={onChange} className={inputCls} />
            </Field>
            <Field label={t('workerQty')}>
              <input type="number" name="workerQty" value={form.workerQty} onChange={onChange} className={inputCls} />
            </Field>
            <Field label={t('leaderId')}>
              <input type="text" name="leaderId" value={form.leaderId} onChange={onChange} className={inputCls} />
            </Field>
            <Field label={t('subLeaderId')}>
              <input type="text" name="subLeaderId" value={form.subLeaderId} onChange={onChange} className={inputCls} />
            </Field>
            <Field label={t('notice')} span={2}>
              <input type="text" name="comments" value={form.comments} onChange={onChange} className={inputCls} />
            </Field>
          </div>

          {/* 버튼 + 메시지 */}
          <div className="mt-3 flex items-center gap-2">
            <button onClick={handleNew} className={`${btnBase} bg-zinc-200 text-zinc-700 hover:bg-zinc-300 dark:bg-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-600`}>
              {t('newBtn')}
            </button>
            <button onClick={() => handleSave()} className={`${btnBase} bg-blue-600 text-white hover:bg-blue-700`}>
              {editMode ? t('editBtn') : t('saveBtn')}
            </button>
            {editMode && (
              <button onClick={handleDeleteClick} className={`${btnBase} bg-red-600 text-white hover:bg-red-700`}>
                {t('deleteBtn')}
              </button>
            )}
            {message && (
              <span className={`ml-2 text-xs ${message.type === 'error' ? 'text-red-500' : 'text-green-500'}`}>
                {message.text}
              </span>
            )}
          </div>
        </section>

        {/* ═══════ 목록 테이블 ═══════ */}
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
                  key={`${r.PLAN_DATE}-${r.LINE_CODE}-${r.SHIFT_CODE}-${i}`}
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
                    {t('noData')}
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
