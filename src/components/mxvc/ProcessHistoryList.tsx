/**
 * @file src/components/mxvc/ProcessHistoryList.tsx
 * @description 공정통과이력 노멀(리스트) 뷰 — 추적성 스타일 단일 테이블.
 * 초보자 가이드: 공정별 접기 그룹 대신 하나의 테이블에 모든 행을 나열하고
 * 왼쪽 첫 컬럼이 "공정 구분(코드 + 명)"을 배지 형태로 표시한다.
 * QC / 공정 IO 는 각각 별도 테이블이지만 헤더 타이틀만 간소하게.
 */
'use client';

import { useMemo } from 'react';
import type { Workstage } from './ProcessHistoryGrid';

/** raw 행 데이터 */
export interface ListRow {
  PID: string;
  MODEL_NAME: string | null;
  RATING_LABEL: string | null;
  PCB_ITEM: string | null;  // 'T'=Top, 'B'=Bottom, 'S'=PBA
  WORKSTAGE_CODE: string;
  WORKSTAGE_NAME: string | null;
  MACHINE_CODE: string | null;
  INSPECT_RESULT: string | null;
  INSPECT_DATE: string | null;
  IS_LAST: string | null;
}

/** PCB_ITEM 코드 → 색상 배지 스펙. */
function pcbItemBadge(code: string | null): { label: string; cls: string } | null {
  if (!code) return null;
  const c = code.toUpperCase();
  if (c === 'T') return { label: 'Top', cls: 'bg-blue-100 text-blue-700 dark:bg-blue-900/60 dark:text-blue-200' };
  if (c === 'B') return { label: 'Bot', cls: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/60 dark:text-emerald-200' };
  if (c === 'S') return { label: 'PBA', cls: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300' };
  return { label: c, cls: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300' };
}

/** IP_PRODUCT_WORKSTAGE_IO 행 — 공정 단위 In/Out 이력 */
export interface IoRow {
  SERIAL_NO: string;
  WORKSTAGE_CODE: string | null;
  WORKSTAGE_NAME: string | null;
  IO_DEFICIT: string | null;         // 'I'=공정In, 'O'=공정Out
  IO_DATE: string | null;
  OUT_DATE: string | null;
  ACTUAL_DATE: string | null;
  IO_QTY: number | null;
  LINE_CODE: string | null;
  DEST_LINE_CODE: string | null;
  FROM_LINE_CODE: string | null;
  DEST_WORKSTAGE_CODE: string | null;
  MODEL_NAME: string | null;
  SHIFT_CODE: string | null;
  LOT_NO: string | null;
  RUN_NO: string | null;
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
  ioRows?: IoRow[];
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

/** 단일 중립 팔레트 — 섹션간 색상 구분 없음 (사용자 선호). */
const NEUTRAL_PALETTE = {
  bg: 'bg-slate-50 dark:bg-slate-900/40',
  header: 'bg-slate-100 dark:bg-slate-800/60',
  border: 'border-slate-300 dark:border-slate-700',
  dot: 'bg-slate-500',
};
/** PALETTE 배열 API 는 보존하되 모든 인덱스가 동일 중립 색을 반환. */
const PALETTE = new Array(1).fill(NEUTRAL_PALETTE);

/** 공정통과이력 리스트 뷰 — 추적성 스타일 단일 테이블. */
export default function ProcessHistoryList({ rows, workstages, qcRows = [], ioRows = [] }: Props) {
  /** workstages 순서 기반 인덱스 — rows 를 공정 순으로 재정렬할 때 사용. */
  const sortedRows = useMemo(() => {
    const order = new Map(workstages.map((w, i) => [w.code, i]));
    return [...rows].sort((a, b) => {
      const ai = order.get(a.WORKSTAGE_CODE) ?? 999;
      const bi = order.get(b.WORKSTAGE_CODE) ?? 999;
      if (ai !== bi) return ai - bi;
      const pcbA = (a.PCB_ITEM ?? '').localeCompare(b.PCB_ITEM ?? '');
      if (pcbA !== 0) return pcbA;
      return (a.INSPECT_DATE ?? '').localeCompare(b.INSPECT_DATE ?? '');
    });
  }, [rows, workstages]);

  const totalNg = useMemo(
    () => rows.filter((r) => r.INSPECT_RESULT && !PASS_VALUES.has(r.INSPECT_RESULT.toUpperCase())).length,
    [rows],
  );

  /** 공정 코드 → 배지 색상. 추적성처럼 왼쪽 구분 셀에 사용. */
  function stageBadge(code: string): string {
    if (code === 'SPI') return 'bg-slate-200 text-slate-800 dark:bg-slate-700 dark:text-slate-100';
    if (code === 'AOI') return 'bg-slate-200 text-slate-800 dark:bg-slate-700 dark:text-slate-100';
    return 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200';
  }

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* 상단 도구 바 */}
      <div className="shrink-0 flex items-center gap-3 px-3 py-1.5 border-b border-gray-200 dark:border-gray-700">
        <span className="text-xs text-gray-500 dark:text-gray-400">
          공정이력 <b>{sortedRows.length}</b>건
          {totalNg > 0 && <span className="ml-2 text-red-500 font-semibold">NG {totalNg}건</span>}
          <span className="ml-2">· QC <b>{qcRows.length}</b> · 공정IO <b>{ioRows.length}</b></span>
        </span>
      </div>

      {/* 스크롤 영역 */}
      <div className="flex-1 min-h-0 overflow-auto px-3 py-2 space-y-3">
        {/* ── 공정 이력 (추적성 스타일 단일 테이블) ── */}
        <div className={`rounded-lg border ${NEUTRAL_PALETTE.border} overflow-hidden`}>
          <div className={`px-4 py-2 text-sm font-bold text-gray-800 dark:text-gray-100 ${NEUTRAL_PALETTE.header}`}>
            공정 이력 <span className="ml-1 text-xs font-normal text-gray-500">({sortedRows.length}건)</span>
          </div>
          {sortedRows.length === 0 ? (
            <div className={`${NEUTRAL_PALETTE.bg} px-4 py-3 text-xs text-gray-400 dark:text-gray-500`}>
              데이터 없음
            </div>
          ) : (
            <div className={NEUTRAL_PALETTE.bg}>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700 text-xs text-gray-500 dark:text-gray-400">
                    <th className="px-3 py-1.5 text-left font-medium w-[180px]">공정</th>
                    <th className="px-2 py-1.5 text-center font-medium w-[50px]">면</th>
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
                  {sortedRows.map((r, idx) => {
                    const isPass = r.INSPECT_RESULT ? PASS_VALUES.has(r.INSPECT_RESULT.toUpperCase()) : true;
                    const badge = pcbItemBadge(r.PCB_ITEM);
                    const prev = idx > 0 ? sortedRows[idx - 1] : null;
                    /** 이전 행과 같은 공정이면 왼쪽 구분 셀의 시각적 강조를 줄여 그룹감 부여. */
                    const isFirstOfStage = !prev || prev.WORKSTAGE_CODE !== r.WORKSTAGE_CODE;
                    return (
                      <tr
                        key={`${r.PID}-${r.WORKSTAGE_CODE}-${idx}`}
                        className={`border-b border-gray-100 dark:border-gray-800 last:border-b-0 ${
                          !isPass ? 'bg-red-50/50 dark:bg-red-950/20' : ''
                        }`}
                      >
                        <td className="px-3 py-1.5 align-middle">
                          {isFirstOfStage ? (
                            <div className="flex items-center gap-1.5">
                              <span className={`inline-block px-2 py-0.5 rounded text-[11px] font-bold ${stageBadge(r.WORKSTAGE_CODE)}`}>
                                {r.WORKSTAGE_CODE}
                              </span>
                              <span className="text-xs text-gray-700 dark:text-gray-300 truncate">
                                {r.WORKSTAGE_NAME ?? '-'}
                              </span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1.5 opacity-40">
                              <span className={`inline-block px-2 py-0.5 rounded text-[11px] font-bold ${stageBadge(r.WORKSTAGE_CODE)}`}>
                                {r.WORKSTAGE_CODE}
                              </span>
                            </div>
                          )}
                        </td>
                        <td className="px-2 py-1.5 text-center">
                          {badge
                            ? <span className={`inline-block px-1.5 py-0.5 rounded font-bold text-[10px] ${badge.cls}`}>{badge.label}</span>
                            : <span className="text-gray-400 text-xs">—</span>}
                        </td>
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

        {/* ── QC 검사 섹션 ── */}
        <div className={`rounded-lg border ${NEUTRAL_PALETTE.border} overflow-hidden`}>
          <div className={`px-4 py-2 text-sm font-bold text-gray-800 dark:text-gray-100 ${NEUTRAL_PALETTE.header}`}>
            QC 검사 <span className="ml-1 text-xs font-normal text-gray-500">({qcRows.length}건)</span>
          </div>

          {qcRows.length === 0 ? (
            <div className={`${NEUTRAL_PALETTE.bg} px-4 py-3 text-xs text-gray-400 dark:text-gray-500`}>
              데이터 없음
            </div>
          ) : (
            <div className={NEUTRAL_PALETTE.bg}>
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
                {/* IO 섹션 아래에서 이어짐 */}
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

        {/* ── 공정 IO 섹션 (IP_PRODUCT_WORKSTAGE_IO) ── */}
        <div className={`rounded-lg border ${NEUTRAL_PALETTE.border} overflow-hidden`}>
          <div className={`px-4 py-2 text-sm font-bold text-gray-800 dark:text-gray-100 ${NEUTRAL_PALETTE.header}`}>
            공정 IO <span className="ml-1 text-xs font-normal text-gray-500">({ioRows.length}건)</span>
          </div>

          {ioRows.length === 0 ? (
            <div className={`${NEUTRAL_PALETTE.bg} px-4 py-3 text-xs text-gray-400 dark:text-gray-500`}>
              데이터 없음
            </div>
          ) : (
            <div className={`${NEUTRAL_PALETTE.bg} overflow-x-auto`}>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700 text-xs text-gray-500 dark:text-gray-400">
                    <th className="px-4 py-1.5 text-left font-medium w-[220px]">SERIAL_NO</th>
                    <th className="px-3 py-1.5 text-center font-medium w-[80px]">공정코드</th>
                    <th className="px-3 py-1.5 text-left font-medium w-[120px]">공정명</th>
                    <th className="px-3 py-1.5 text-center font-medium w-[60px]">In/Out</th>
                    <th className="px-3 py-1.5 text-center font-medium w-[180px]">IO일시</th>
                    <th className="px-3 py-1.5 text-center font-medium w-[180px]">실적일시</th>
                    <th className="px-3 py-1.5 text-center font-medium w-[60px]">수량</th>
                    <th className="px-3 py-1.5 text-center font-medium w-[80px]">라인</th>
                    <th className="px-3 py-1.5 text-center font-medium w-[80px]">대상라인</th>
                    <th className="px-3 py-1.5 text-center font-medium w-[100px]">대상공정</th>
                    <th className="px-3 py-1.5 text-left font-medium w-[120px]">모델명</th>
                    <th className="px-3 py-1.5 text-center font-medium w-[50px]">교대</th>
                    <th className="px-3 py-1.5 text-left font-medium w-[140px]">LOT/Run</th>
                  </tr>
                </thead>
                <tbody>
                  {ioRows.map((r, idx) => {
                    const io = (r.IO_DEFICIT ?? '').toUpperCase();
                    const ioLabel = io === 'I' ? 'In' : io === 'O' ? 'Out' : (r.IO_DEFICIT ?? '-');
                    const ioCls = io === 'I'
                      ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/60 dark:text-blue-200'
                      : io === 'O'
                        ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-200'
                        : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300';
                    return (
                      <tr
                        key={`io-${idx}`}
                        className="border-b border-gray-100 dark:border-gray-800 last:border-b-0"
                      >
                        <td className="px-4 py-1.5 font-mono text-xs text-gray-700 dark:text-gray-300 truncate">{r.SERIAL_NO}</td>
                        <td className="px-3 py-1.5 text-center text-xs font-mono text-gray-500 dark:text-gray-400">{r.WORKSTAGE_CODE ?? '-'}</td>
                        <td className="px-3 py-1.5 text-xs text-gray-600 dark:text-gray-400 truncate">{r.WORKSTAGE_NAME ?? '-'}</td>
                        <td className="px-3 py-1.5 text-center">
                          <span className={`inline-block px-1.5 py-0.5 rounded font-bold text-[10px] ${ioCls}`}>
                            {ioLabel}
                          </span>
                        </td>
                        <td className="px-3 py-1.5 text-center text-xs font-mono text-gray-500 dark:text-gray-400">{r.IO_DATE ?? '-'}</td>
                        <td className="px-3 py-1.5 text-center text-xs font-mono text-gray-500 dark:text-gray-400">{r.ACTUAL_DATE ?? '-'}</td>
                        <td className="px-3 py-1.5 text-center text-xs text-gray-700 dark:text-gray-300">{r.IO_QTY ?? '-'}</td>
                        <td className="px-3 py-1.5 text-center text-xs text-gray-600 dark:text-gray-400">{r.LINE_CODE ?? '-'}</td>
                        <td className="px-3 py-1.5 text-center text-xs text-gray-600 dark:text-gray-400">{r.DEST_LINE_CODE ?? '-'}</td>
                        <td className="px-3 py-1.5 text-center text-xs font-mono text-gray-500 dark:text-gray-400">{r.DEST_WORKSTAGE_CODE ?? '-'}</td>
                        <td className="px-3 py-1.5 text-xs text-gray-600 dark:text-gray-400 truncate">{r.MODEL_NAME ?? '-'}</td>
                        <td className="px-3 py-1.5 text-center text-xs text-gray-600 dark:text-gray-400">{r.SHIFT_CODE ?? '-'}</td>
                        <td className="px-3 py-1.5 text-xs font-mono text-gray-500 dark:text-gray-400 truncate">{r.LOT_NO ?? r.RUN_NO ?? '-'}</td>
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
