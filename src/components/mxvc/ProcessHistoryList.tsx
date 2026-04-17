/**
 * @file src/components/mxvc/ProcessHistoryList.tsx
 * @description 공정통과이력 노멀(리스트) 뷰 — 공정별 그룹 + 시간순 정렬.
 * 초보자 가이드: 피벗 대신 raw 데이터를 공정(WORKSTAGE) 단위로 그룹핑하여
 * 접고/펼칠 수 있는 리스트 형태로 표시한다. 각 그룹 내부는 시간순 정렬.
 */
'use client';

import { useMemo, useState, useCallback } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import type { Workstage } from './ProcessHistoryGrid';

/** raw 행 데이터 */
export interface ListRow {
  PID: string;
  MODEL_NAME: string | null;
  RATING_LABEL: string | null;
  WORKSTAGE_CODE: string;
  WORKSTAGE_NAME: string | null;
  MACHINE_CODE: string | null;
  INSPECT_RESULT: string | null;
  INSPECT_DATE: string | null;
  IS_LAST: string | null;
}

/** QC 검사 행 데이터 */
export interface QcRow {
  SERIAL_NO: string;
  WORKSTAGE_CODE: string | null;
  MACHINE_CODE: string | null;
  QC_RESULT: string | null;
  QC_DATE: string | null;
  BAD_REASON_CODE: string | null;
  BAD_POSITION: string | null;
  LOCATION_CODE: string | null;
  REPAIR_RESULT_CODE: string | null;
  REPAIR_DATE: string | null;
  FILE_NAME: string | null;
}

interface Props {
  rows: ListRow[];
  workstages: Workstage[];
  qcRows?: QcRow[];
}

const PASS_VALUES = new Set(['PASS', 'OK', 'GOOD', 'Y']);

/** QC 결과 코드 → 한글 매핑 */
const QC_RESULT_MAP: Record<string, string> = { O: '가성', N: '진성', W: '대기' };
/** 수리 결과 코드 → 한글 매핑 */
const REPAIR_RESULT_MAP: Record<string, string> = { G: '수리완료', N: '불합격', W: '대기' };

function qcResultLabel(code: string | null): string {
  if (!code) return '-';
  return QC_RESULT_MAP[code.toUpperCase()] ?? code;
}
function repairResultLabel(code: string | null): string {
  if (!code) return '-';
  return REPAIR_RESULT_MAP[code.toUpperCase()] ?? code;
}

/** 공정별 색상 팔레트 */
const PALETTE = [
  { bg: 'bg-blue-50 dark:bg-blue-950/30', header: 'bg-blue-100 dark:bg-blue-900/50', border: 'border-blue-300 dark:border-blue-700', dot: 'bg-blue-500' },
  { bg: 'bg-emerald-50 dark:bg-emerald-950/30', header: 'bg-emerald-100 dark:bg-emerald-900/50', border: 'border-emerald-300 dark:border-emerald-700', dot: 'bg-emerald-500' },
  { bg: 'bg-purple-50 dark:bg-purple-950/30', header: 'bg-purple-100 dark:bg-purple-900/50', border: 'border-purple-300 dark:border-purple-700', dot: 'bg-purple-500' },
  { bg: 'bg-amber-50 dark:bg-amber-950/30', header: 'bg-amber-100 dark:bg-amber-900/50', border: 'border-amber-300 dark:border-amber-700', dot: 'bg-amber-500' },
  { bg: 'bg-pink-50 dark:bg-pink-950/30', header: 'bg-pink-100 dark:bg-pink-900/50', border: 'border-pink-300 dark:border-pink-700', dot: 'bg-pink-500' },
  { bg: 'bg-teal-50 dark:bg-teal-950/30', header: 'bg-teal-100 dark:bg-teal-900/50', border: 'border-teal-300 dark:border-teal-700', dot: 'bg-teal-500' },
];

/** 공정통과이력 리스트 뷰 — 공정별 그룹 + 시간순 */
export default function ProcessHistoryList({ rows, workstages, qcRows = [] }: Props) {
  /** 그룹별 접힘 상태 (기본: 모두 펼침) */
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  const toggle = useCallback((code: string) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(code)) next.delete(code);
      else next.add(code);
      return next;
    });
  }, []);

  const expandAll = useCallback(() => setCollapsed(new Set()), []);
  const collapseAll = useCallback(() => {
    setCollapsed(new Set(workstages.map((w) => w.code)));
  }, [workstages]);

  /** 공정별 그룹핑 — workstages 순서 유지 */
  const groups = useMemo(() => {
    const map = new Map<string, ListRow[]>();
    for (const w of workstages) map.set(w.code, []);
    for (const r of rows) {
      const arr = map.get(r.WORKSTAGE_CODE);
      if (arr) arr.push(r);
      else map.set(r.WORKSTAGE_CODE, [r]);
    }
    return workstages
      .map((w, i) => ({
        code: w.code,
        name: w.name,
        rows: map.get(w.code) ?? [],
        palette: PALETTE[i % PALETTE.length],
      }))
      ; /* 데이터 없는 공정도 섹션 표시 */
  }, [rows, workstages]);

  const totalNg = useMemo(() => {
    return rows.filter((r) => r.INSPECT_RESULT && !PASS_VALUES.has(r.INSPECT_RESULT.toUpperCase())).length;
  }, [rows]);

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* 상단 도구 바 */}
      <div className="shrink-0 flex items-center gap-3 px-3 py-1.5 border-b border-gray-200 dark:border-gray-700">
        <button onClick={expandAll} className="text-xs text-blue-500 hover:text-blue-400">전체 펼치기</button>
        <button onClick={collapseAll} className="text-xs text-blue-500 hover:text-blue-400">전체 접기</button>
        <span className="ml-auto text-xs text-gray-500 dark:text-gray-400">
          {groups.length}개 공정 · {rows.length}건
          {totalNg > 0 && <span className="ml-2 text-red-500 font-semibold">NG {totalNg}건</span>}
        </span>
      </div>

      {/* 스크롤 영역 */}
      <div className="flex-1 min-h-0 overflow-auto px-3 py-2 space-y-2">
        {groups.map((g) => {
          const isOpen = !collapsed.has(g.code);
          const ngCount = g.rows.filter((r) => r.INSPECT_RESULT && !PASS_VALUES.has(r.INSPECT_RESULT.toUpperCase())).length;

          return (
            <div key={g.code} className={`rounded-lg border ${g.palette.border} overflow-hidden`}>
              {/* 그룹 헤더 */}
              <button
                onClick={() => toggle(g.code)}
                className={`w-full flex items-center gap-2 px-4 py-2.5 text-left transition-colors ${g.palette.header}`}
              >
                {isOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                <span className={`inline-block h-3 w-3 rounded-full ${g.palette.dot}`} />
                <span className="font-bold text-sm text-gray-800 dark:text-gray-100">
                  {g.name}
                </span>
                <span className="text-xs text-gray-500 dark:text-gray-400">({g.code})</span>
                <span className="ml-auto text-xs text-gray-500 dark:text-gray-400">
                  {g.rows.length}건
                </span>
                {ngCount > 0 && (
                  <span className="text-xs font-bold text-red-600 dark:text-red-400">NG {ngCount}</span>
                )}
              </button>

              {/* 데이터 테이블 */}
              {isOpen && g.rows.length === 0 && (
                <div className={`${g.palette.bg} px-4 py-3 text-xs text-gray-400 dark:text-gray-500`}>
                  데이터 없음
                </div>
              )}
              {isOpen && g.rows.length > 0 && (
                <div className={g.palette.bg}>
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-200 dark:border-gray-700 text-xs text-gray-500 dark:text-gray-400">
                        <th className="px-3 py-1.5 text-center font-medium w-[80px]">공정코드</th>
                        <th className="px-3 py-1.5 text-left font-medium w-[120px]">공정명</th>
                        <th className="px-4 py-1.5 text-left font-medium w-[220px]">PID</th>
                        <th className="px-3 py-1.5 text-left font-medium w-[120px]">모델명</th>
                        <th className="px-3 py-1.5 text-left font-medium w-[360px]">Rating Label</th>
                        <th className="px-3 py-1.5 text-center font-medium w-[100px]">머신</th>
                        <th className="px-3 py-1.5 text-center font-medium w-[80px]">결과</th>
                        <th className="px-3 py-1.5 text-center font-medium w-[60px]">IS_LAST</th>
                        <th className="px-3 py-1.5 text-center font-medium w-[180px]">검사일시</th>
                      </tr>
                    </thead>
                    <tbody>
                      {g.rows.map((r, idx) => {
                        const isPass = r.INSPECT_RESULT ? PASS_VALUES.has(r.INSPECT_RESULT.toUpperCase()) : true;
                        return (
                          <tr
                            key={`${r.PID}-${idx}`}
                            className={`border-b border-gray-100 dark:border-gray-800 last:border-b-0 ${
                              !isPass ? 'bg-red-50/50 dark:bg-red-950/20' : ''
                            }`}
                          >
                            <td className="px-3 py-1.5 text-center text-xs font-mono text-gray-500 dark:text-gray-400">{r.WORKSTAGE_CODE}</td>
                            <td className="px-3 py-1.5 text-xs text-gray-600 dark:text-gray-400 truncate">{r.WORKSTAGE_NAME ?? '-'}</td>
                            <td className="px-4 py-1.5 font-mono text-xs text-gray-700 dark:text-gray-300 truncate">{r.PID}</td>
                            <td className="px-3 py-1.5 text-xs text-gray-600 dark:text-gray-400 truncate">{r.MODEL_NAME ?? '-'}</td>
                            <td className="px-3 py-1.5 font-mono text-[11px] text-gray-500 dark:text-gray-400 truncate" title={r.RATING_LABEL ?? undefined}>{r.RATING_LABEL ?? '-'}</td>
                            <td className="px-3 py-1.5 text-center text-xs text-gray-600 dark:text-gray-400">{r.MACHINE_CODE ?? '-'}</td>
                            <td className={`px-3 py-1.5 text-center text-xs font-bold ${
                              isPass ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                            }`}>
                              {r.INSPECT_RESULT ?? '-'}
                            </td>
                            <td className={`px-3 py-1.5 text-center text-xs font-semibold ${
                              r.IS_LAST === 'Y' ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400 dark:text-gray-600'
                            }`}>
                              {r.IS_LAST ?? '-'}
                            </td>
                            <td className="px-3 py-1.5 text-center text-xs font-mono text-gray-500 dark:text-gray-400">
                              {r.INSPECT_DATE ?? '-'}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          );
        })}

        {/* ── QC 검사 섹션 ── */}
        <div className="rounded-lg border border-orange-300 dark:border-orange-700 overflow-hidden">
          <button
            onClick={() => toggle('__QC__')}
            className="w-full flex items-center gap-2 px-4 py-2.5 text-left transition-colors bg-orange-100 dark:bg-orange-900/50"
          >
            {!collapsed.has('__QC__') ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
            <span className="inline-block h-3 w-3 rounded-full bg-orange-500" />
            <span className="font-bold text-sm text-gray-800 dark:text-gray-100">QC 검사</span>
            <span className="text-xs text-gray-500 dark:text-gray-400">(IP_PRODUCT_WORK_QC)</span>
            <span className="ml-auto text-xs text-gray-500 dark:text-gray-400">{qcRows.length}건</span>
          </button>

          {!collapsed.has('__QC__') && qcRows.length === 0 && (
            <div className="bg-orange-50 dark:bg-orange-950/30 px-4 py-3 text-xs text-gray-400 dark:text-gray-500">
              데이터 없음
            </div>
          )}
          {!collapsed.has('__QC__') && qcRows.length > 0 && (
            <div className="bg-orange-50 dark:bg-orange-950/30">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700 text-xs text-gray-500 dark:text-gray-400">
                    <th className="px-4 py-1.5 text-left font-medium w-[220px]">SERIAL_NO</th>
                    <th className="px-3 py-1.5 text-center font-medium w-[80px]">공정</th>
                    <th className="px-3 py-1.5 text-center font-medium w-[100px]">머신</th>
                    <th className="px-3 py-1.5 text-center font-medium w-[60px]">결과</th>
                    <th className="px-3 py-1.5 text-center font-medium w-[180px]">검사일시</th>
                    <th className="px-3 py-1.5 text-center font-medium w-[80px]">불량코드</th>
                    <th className="px-3 py-1.5 text-center font-medium w-[100px]">불량위치</th>
                    <th className="px-3 py-1.5 text-center font-medium w-[80px]">수리결과</th>
                    <th className="px-3 py-1.5 text-center font-medium w-[180px]">수리일시</th>
                    <th className="px-3 py-1.5 text-left font-medium">파일명</th>
                  </tr>
                </thead>
                <tbody>
                  {qcRows.map((r, idx) => {
                    const isNg = r.QC_RESULT && r.QC_RESULT.toUpperCase() !== 'O';
                    return (
                      <tr
                        key={`qc-${idx}`}
                        className={`border-b border-gray-100 dark:border-gray-800 last:border-b-0 ${
                          isNg ? 'bg-red-50/50 dark:bg-red-950/20' : ''
                        }`}
                      >
                        <td className="px-4 py-1.5 font-mono text-xs text-gray-700 dark:text-gray-300 truncate">{r.SERIAL_NO}</td>
                        <td className="px-3 py-1.5 text-center text-xs font-mono text-gray-500 dark:text-gray-400">{r.WORKSTAGE_CODE ?? '-'}</td>
                        <td className="px-3 py-1.5 text-center text-xs text-gray-600 dark:text-gray-400">{r.MACHINE_CODE ?? '-'}</td>
                        <td className={`px-3 py-1.5 text-center text-xs font-bold ${
                          isNg ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'
                        }`}>
                          {qcResultLabel(r.QC_RESULT)}
                        </td>
                        <td className="px-3 py-1.5 text-center text-xs font-mono text-gray-500 dark:text-gray-400">{r.QC_DATE ?? '-'}</td>
                        <td className="px-3 py-1.5 text-center text-xs text-gray-600 dark:text-gray-400">{r.BAD_REASON_CODE ?? '-'}</td>
                        <td className="px-3 py-1.5 text-center text-xs text-gray-600 dark:text-gray-400">{r.BAD_POSITION ?? '-'}</td>
                        <td className="px-3 py-1.5 text-center text-xs text-gray-600 dark:text-gray-400">{repairResultLabel(r.REPAIR_RESULT_CODE)}</td>
                        <td className="px-3 py-1.5 text-center text-xs font-mono text-gray-500 dark:text-gray-400">{r.REPAIR_DATE ?? '-'}</td>
                        <td className="px-3 py-1.5 text-xs text-gray-500 dark:text-gray-400 truncate max-w-[300px]">{r.FILE_NAME ?? '-'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
