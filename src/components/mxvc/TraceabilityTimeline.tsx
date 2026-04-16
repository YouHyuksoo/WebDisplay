/**
 * @file src/components/mxvc/TraceabilityTimeline.tsx
 * @description 추적성분석 — 두 가지 뷰 모드 지원.
 * 초보자 가이드:
 * 1. process 모드: 소스 테이블별 그룹 섹션 + 그리드 표시
 * 2. timeline 모드: 모든 이벤트를 시간순 세로 타임라인으로 표시
 * 3. 수리이력(repair)은 주황 배지, 공정이동(stage_move)은 초록 배지
 * 4. 데이터 없는 테이블은 "데이터 없음" 빈 섹션 표시
 */
'use client';

import { useMemo, useState } from 'react';
import type { TimelineEvent, TimelineEventType } from '@/types/mxvc/traceability';

/** 숨길 컬럼 */
const HIDE_COLS = new Set(['RNUM', 'ROWNUM']);

/** DB 컬럼명 → 한국어 표시명 */
const COL_LABEL: Record<string, string> = {
  LOG_ID: '로그ID',
  LOG_TIMESTAMP: '로그시간',
  LINE_CODE: '라인',
  EQUIPMENT_ID: '설비ID',
  BARCODE: '바코드',
  SERIAL_NO: '시리얼번호',
  MASTER_BARCODE: '마스터바코드',
  MAIN_BARCODE: '메인바코드',
  SUB_BARCODE: '서브바코드',
  MARKED_BARCODE: '마킹바코드',
  ARRAY_BARCODE: '어레이바코드',
  MODEL: '모델',
  MODEL_NAME: '모델명',
  RESULT: '결과',
  PCB_NO: 'PCB번호',
  CREATED_AT: '생성일시',
  IS_LAST: '최종여부',
  IS_SAMPLE: '샘플여부',
  FILE_NAME: '파일명',
  OPERATOR: '작업자',
  INSPECTOR: '검사자',
  LOT_ID: 'LOT ID',
  LANE: '레인',
  MODULE_ID: '모듈ID',
  REF_ID: '참조ID',
  WINDOW_NO: '윈도우번호',
  DEFECT_TYPE: '불량유형',
  PART_NAME: '부품명',
  INSPECTIONS: '검사데이터',
  START_DATE: '시작일시',
  END_DATE: '종료일시',
  DAY: '날짜',
  LOG_TIME: '시간',
  SW_VER: 'SW버전',
  NAME: '이름',
  JOB_NAME: '작업명',
  DATA_ID: '데이터ID',
  DATE_TIME: '일시',
  DEFECT_CODE: '불량코드',
  DEFECT_NAME: '불량명',
  ACTION_CODE: '조치코드',
  REPAIR_ACTION: '수리조치',
  REG_DATE: '등록일',
  CREATE_DATE: '생성일',
  UPDATE_DATE: '수정일',
  IO_DATE: '이동일시',
  FROM_WORKSTAGE: '출발공정',
  TO_WORKSTAGE: '도착공정',
  FROM_STAGE: '출발공정',
  TO_STAGE: '도착공정',
  WORKSTAGE_CODE: '공정코드',
  PID: 'PID',
  INSPECT_RESULT: '검사결과',
  INSPECT_DATE: '검사일시',
  ENTER_DATE: '등록일',
  MACHINE_CODE: '설비코드',
  TXN_TYPE: '트랜잭션유형',
  BOARDSN: 'PCB바코드',
  STARTDT: '시작시간',
  ENDDT: '종료시간',
  PCBFILENM: 'PCB파일명',
  EQPNM: '장비명',
  LINENM: '라인명',
  STEPNO: '스텝번호',
  REFERENCEID: 'Reference ID',
  ARRAYINDEX: 'Array번호',
  BLOCKINDEX: 'Block번호',
  REELCD: '릴바코드',
  PARTNO: '자재번호',
  SLOTNO: '슬롯번호',
};

/** 컬럼명 번역 */
function colLabel(col: string): string {
  return COL_LABEL[col] ?? col;
}

/** 유형별 배지 스타일 */
const BADGE: Record<TimelineEventType, { css: string; dot: string; text: string }> = {
  log: { css: 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-200', dot: 'bg-blue-500', text: '' },
  stage_move: { css: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-200', dot: 'bg-emerald-500', text: '공정이동' },
  repair: { css: 'bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-200', dot: 'bg-amber-500', text: '⚠ 수리' },
};

/** 소스명 → 표시명 */
const SOURCE_LABEL: Record<string, string> = {
  MATERIAL_BOARD: '자재(한화-BOARD)',
  MATERIAL_DETAIL: '자재(한화-상세)',
  MATERIAL_PANASONIC: '자재투입',
  IQ_MACHINE_INSPECT_RESULT: '공정설비통신',
  IP_PRODUCT_2D_BARCODE: '바코드마스터',
  IP_PRODUCT_PACK_SERIAL: '출하정보',
  IP_PRODUCT_WORK_QC: '수리이력',
  IMCN_JIG_INPUT_HIST: '지그투입이력',
  IM_ITEM_SOLDER_INPUT_HIST: '솔더투입이력',
  IP_PRODUCT_WORKSTAGE_IO: '공정이동',
  LOG_LCR: 'LCR 측정로그',
};

function displayName(source: string): string {
  return SOURCE_LABEL[source] ?? source.replace(/^LOG_/i, '').replace(/^IP_PRODUCT_/i, '');
}

/**
 * ISO 날짜 문자열 → 'YYYY-MM-DD HH:MM:SS' (타임존 제거)
 * '2026-04-13T11:37:10.913000' → '2026-04-13 11:37:10'
 */
function fmtDateStr(s: string): string {
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(s)) {
    return s.slice(0, 10) + ' ' + s.slice(11, 19);
  }
  return s;
}

/** 타임스탬프 포맷 (타임라인 헤더용) */
function fmtTs(iso: string): string {
  if (!iso) return '--:--';
  return fmtDateStr(iso);
}

/** 셀 값 포맷 — 날짜 문자열이면 YYYY-MM-DD HH:MM:SS, 아니면 그대로 */
function fmtVal(v: unknown): string {
  if (v == null) return '-';
  const s = String(v);
  return fmtDateStr(s);
}

/** 그룹: 같은 소스의 이벤트 묶음 */
interface Group {
  source: string;
  type: TimelineEventType;
  events: TimelineEvent[];
  earliestTs: string;
}

interface Props {
  events: TimelineEvent[];
  queriedTables?: string[];
  viewMode?: 'process' | 'timeline';
}

export default function TraceabilityTimeline({ events, queriedTables = [], viewMode = 'process' }: Props) {
  const tablesWithData = new Set(events.map((e) => e.source));
  const emptyTables = queriedTables.filter((t) => !tablesWithData.has(t));

  if (events.length === 0 && emptyTables.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-sm text-gray-400 dark:text-gray-500">
        조회된 데이터가 없습니다
      </div>
    );
  }

  return (
    <div className="px-6 py-4 overflow-y-auto flex-1 space-y-4">
      {viewMode === 'process'
        ? <ProcessView events={events} />
        : <TimelineView events={events} />
      }

      {/* 데이터 없는 테이블 */}
      {emptyTables.length > 0 && (
        <EmptyTablesSection tables={emptyTables} />
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════
// 공정별 보기
// ═══════════════════════════════════════════════

function ProcessView({ events }: { events: TimelineEvent[] }) {
  const groups = useMemo(() => {
    const map = new Map<string, Group>();
    for (const e of events) {
      let g = map.get(e.source);
      if (!g) {
        g = { source: e.source, type: e.type, events: [], earliestTs: e.timestamp };
        map.set(e.source, g);
      }
      g.events.push(e);
      if (e.timestamp && (!g.earliestTs || e.timestamp < g.earliestTs)) {
        g.earliestTs = e.timestamp;
      }
    }
    return Array.from(map.values()).sort((a, b) =>
      (a.earliestTs || 'z').localeCompare(b.earliestTs || 'z'),
    );
  }, [events]);

  return (
    <>
      {groups.map((g) => (
        <SectionGrid key={g.source} group={g} />
      ))}
    </>
  );
}

/** 한 소스 테이블의 그리드 섹션 (접기/펼치기 지원) */
function SectionGrid({ group }: { group: Group }) {
  const [collapsed, setCollapsed] = useState(group.events.length >= 10);
  const badge = BADGE[group.type];
  const label = badge.text || displayName(group.source);

  const columns = useMemo(() => {
    const colSet = new Set<string>();
    for (const e of group.events) {
      for (const k of Object.keys(e.data)) {
        if (!HIDE_COLS.has(k)) colSet.add(k);
      }
    }
    return Array.from(colSet);
  }, [group.events]);

  return (
    <div className="rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden flex">
      {/* 좌측 라벨 — 클릭 시 접기/펼치기 */}
      <div
        onClick={() => setCollapsed((v) => !v)}
        className={`shrink-0 w-24 flex flex-col items-center justify-center gap-1 cursor-pointer
                    select-none transition-colors border-r border-gray-200 dark:border-gray-700
                    ${badge.css} hover:brightness-95`}
      >
        <span className="text-xs font-bold text-center leading-tight">{label}</span>
        <span className="text-[10px] opacity-70">{group.events.length}건</span>
        <span className="text-sm mt-1">{collapsed ? '▸' : '▾'}</span>
      </div>

      {/* 우측 그리드 */}
      {collapsed ? (
        <div className="flex-1 flex items-center px-4 text-xs text-gray-400 dark:text-gray-500">
          접힘
        </div>
      ) : (
        <div className="flex-1 overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b-2 border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-700/80">
                {columns.map((col) => (
                  <th key={col} className="px-2 py-1.5 text-left font-semibold text-gray-600 dark:text-gray-300 whitespace-nowrap
                                           border-r border-gray-300 dark:border-gray-600 last:border-r-0">
                    {colLabel(col)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {group.events.map((e, idx) => {
                const isLast = String(e.data['IS_LAST']).toUpperCase() === 'Y';
                return (
                  <tr key={idx} className={`border-b border-gray-100 dark:border-gray-800
                    ${isLast
                      ? 'bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30'
                      : 'hover:bg-gray-50 dark:hover:bg-gray-800/40'}`}
                  >
                    {columns.map((col) => {
                      const val = e.data[col];
                      return (
                        <td key={col} className="px-2 py-1 text-gray-800 dark:text-gray-200 whitespace-nowrap max-w-[300px] truncate
                                              border-r border-gray-200 dark:border-gray-700 last:border-r-0"
                            title={fmtVal(val)}>
                          {fmtVal(val)}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════
// 타임라인 보기
// ═══════════════════════════════════════════════

function TimelineView({ events }: { events: TimelineEvent[] }) {
  /* 소스별 건수 집계 */
  const countMap = useMemo(() => {
    const m = new Map<string, number>();
    for (const e of events) m.set(e.source, (m.get(e.source) ?? 0) + 1);
    return m;
  }, [events]);

  /* 소스별 첫 행만 유지 (시간순 정렬 상태이므로 가장 빠른 이벤트) */
  const firstOnly = useMemo(() => {
    const seen = new Set<string>();
    return events.filter((e) => {
      if (seen.has(e.source)) return false;
      seen.add(e.source);
      return true;
    });
  }, [events]);

  return (
    <>
      {firstOnly.map((event, idx) => (
        <TimelineCard
          key={`${event.source}-${event.timestamp}-${idx}`}
          event={event}
          totalCount={countMap.get(event.source) ?? 1}
        />
      ))}
    </>
  );
}

/** 타임라인 개별 카드 — 클릭 시 상세 펼침 */
function TimelineCard({ event, totalCount = 1 }: { event: TimelineEvent; totalCount?: number }) {
  const [expanded, setExpanded] = useState(false);
  const badge = BADGE[event.type];
  const label = badge.text || displayName(event.source);
  const entries = Object.entries(event.data).filter(
    ([k, v]) => !HIDE_COLS.has(k) && v != null,
  );

  return (
    <div className="flex gap-3">
      {/* 세로선 + 도트 */}
      <div className="flex flex-col items-center shrink-0 w-6">
        <div className={`w-2.5 h-2.5 rounded-full mt-2 shrink-0 ${badge.dot}`} />
        <div className="w-px flex-1 bg-gray-200 dark:bg-gray-700 mt-1" />
      </div>

      {/* 카드 */}
      <div
        onClick={() => setExpanded((v) => !v)}
        className="flex-1 mb-3 rounded-lg border border-gray-200 dark:border-gray-700
                   bg-white dark:bg-gray-800/60 cursor-pointer
                   hover:border-gray-300 dark:hover:border-gray-600 transition-colors"
      >
        {/* 헤더 */}
        <div className="flex items-center gap-2 px-3 py-2">
          <span className="font-mono text-xs text-gray-500 dark:text-gray-400 shrink-0">
            {fmtTs(event.timestamp)}
          </span>
          <span className={`text-[11px] font-bold px-1.5 py-0.5 rounded ${badge.css}`}>
            {label}
          </span>
          {totalCount > 1 && (
            <span className="text-[10px] text-gray-400 dark:text-gray-500">{totalCount}건</span>
          )}
          <span className="ml-auto text-gray-400 text-xs">{expanded ? '▾' : '▸'}</span>
        </div>

        {/* 요약: 첫 3개 필드 */}
        {!expanded && (
          <div className="px-3 pb-2 text-xs text-gray-600 dark:text-gray-300 truncate">
            {entries.slice(0, 3).map(([k, v]) => `${colLabel(k)}: ${fmtVal(v)}`).join(' | ') || '-'}
          </div>
        )}

        {/* 펼침: 전체 데이터 테이블 */}
        {expanded && (
          <div className="border-t border-gray-100 dark:border-gray-700 px-3 py-2">
            <table className="w-full text-xs">
              <tbody>
                {entries.map(([k, v]) => (
                  <tr key={k} className="border-b border-gray-50 dark:border-gray-800 last:border-0">
                    <td className="py-0.5 pr-3 font-medium text-gray-500 dark:text-gray-400 w-40 align-top whitespace-nowrap">{colLabel(k)}</td>
                    <td className="py-0.5 text-gray-800 dark:text-gray-200 break-all">{fmtVal(v)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════
// 데이터 없는 테이블 섹션
// ═══════════════════════════════════════════════

function EmptyTablesSection({ tables }: { tables: string[] }) {
  return (
    <div className="rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
      <div className="px-4 py-2 bg-gray-100 dark:bg-gray-800/80">
        <span className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
          데이터 없음
        </span>
      </div>
      <div className="px-4 py-3 flex flex-wrap gap-2">
        {tables.map((t) => (
          <span key={t} className="text-[11px] px-2 py-1 rounded border
            border-gray-200 dark:border-gray-700 text-gray-400 dark:text-gray-500
            bg-gray-50 dark:bg-gray-900/40">
            {displayName(t)}
          </span>
        ))}
      </div>
    </div>
  );
}
