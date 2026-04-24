/**
 * @file src/components/mxvc/MxvcSpcControlChart.tsx
 * @description 멕시코전장 SPC 관리도 보기 — X-bar-R Chart + Cp/Cpk 공정능력지수
 *
 * 초보자 가이드:
 * 1. 기존 SPC 관리도(display/60)와 동일한 UI, 다른 API 엔드포인트 사용
 * 2. apiBase prop으로 멕시코전장 전용 API(/api/mxvc/spc)를 호출
 * 3. 상단 조회영역: 공정 선택 → 측정항목 선택 → 조회
 * 4. 중단: X-bar Chart(평균 관리도) + R Chart(범위 관리도) 그래프
 * 5. 하단: Cp/Cpk 게이지 + 통계 요약 테이블
 */
'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ReferenceLine, ResponsiveContainer,
  ComposedChart, Bar, Cell,
} from 'recharts';
import * as XLSX from 'xlsx';
import { fetcher } from '@/lib/fetcher';
import { useServerTime } from '@/hooks/useServerTime';
import Modal from '@/components/ui/Modal';

/* -- 타입 정의 -- */

interface MeasItem {
  id: string;
  name: string;
  itemName?: string;
  volt?: string;
}

interface Subgroup {
  id: number;
  date: string;
  dateLabel: string;
  samples: number[];
  xbar: number;
  range: number;
}

interface SpcStats {
  xbarBar: number; rBar: number;
  xbarUCL: number; xbarLCL: number; xbarCL: number;
  rUCL: number; rLCL: number; rCL: number;
  cp: number; cpk: number; sigmaEst: number;
  usl: number; lsl: number; target: number;
  sampleSize: number; subgroupCount: number;
  oocPoints: number[];
}

interface SpcData {
  name: string;
  item: { id: string; name: string; volt?: string; unit: string; usl: number; lsl: number; target: number };
  dateFrom: string;
  dateTo: string;
  subgroups: Subgroup[];
  stats: SpcStats | null;
  message?: string;
}

/* -- 스타일 상수 -- */

const inputCls = 'rounded border border-zinc-300 bg-white px-2 py-1.5 text-sm text-zinc-900 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100';
const labelCls = 'text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-0.5';
const btnBase = 'rounded px-4 py-1.5 text-sm font-semibold transition-colors whitespace-nowrap';

/** 테마 감지 훅 — recharts는 Tailwind 미지원이라 JS로 색상 전달 */
function useChartTheme() {
  const [isDark, setIsDark] = useState(true);
  useEffect(() => {
    const check = () => setIsDark(document.documentElement.classList.contains('dark'));
    check();
    const obs = new MutationObserver(check);
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => obs.disconnect();
  }, []);
  return {
    grid: isDark ? '#333' : '#e5e7eb',
    tick: isDark ? '#999' : '#6b7280',
    tooltip: { bg: isDark ? '#1a1a2e' : '#ffffff', border: isDark ? '#333' : '#e5e7eb' },
    textMuted: isDark ? 'text-zinc-500' : 'text-zinc-400',
    textSub: isDark ? 'text-zinc-600' : 'text-zinc-400',
    sectionBg: isDark ? 'bg-indigo-950/30 border-indigo-800/50' : 'bg-indigo-50 border-indigo-200',
  };
}

/* -- Cpk 등급 판정 -- */

function getCpkGrade(cpk: number, t: (key: string) => string): { label: string; color: string; bg: string } {
  if (cpk >= 1.67) return { label: t('gradeA'), color: '#22c55e', bg: 'bg-green-900/30 border-green-700/50' };
  if (cpk >= 1.33) return { label: t('gradeB'), color: '#3b82f6', bg: 'bg-blue-900/30 border-blue-700/50' };
  if (cpk >= 1.0)  return { label: t('gradeC'), color: '#f59e0b', bg: 'bg-yellow-900/30 border-yellow-700/50' };
  return { label: t('gradeD'), color: '#ef4444', bg: 'bg-red-900/30 border-red-700/50' };
}

/* -- OOC 점 강조 Dot (이탈점 클릭 가능) -- */

function OocDot(props: {
  cx?: number; cy?: number;
  payload?: { id: number };
  oocPoints: number[];
  onOocClick?: (id: number) => void;
}) {
  const { cx, cy, payload, oocPoints, onOocClick } = props;
  if (!cx || !cy || !payload) return null;
  if (oocPoints.includes(payload.id)) {
    return (
      <g onClick={(e) => { e.stopPropagation(); onOocClick?.(payload.id); }}
         onMouseDown={(e) => e.stopPropagation()}
         style={{ cursor: 'pointer' }}>
        <circle cx={cx} cy={cy} r={12} fill="transparent" />
        <circle cx={cx} cy={cy} r={6} fill="#ef4444" stroke="#fff" strokeWidth={2} />
      </g>
    );
  }
  return <circle cx={cx} cy={cy} r={3} fill="#8b5cf6" />;
}

/* -- 히스토그램 + 정규분포 곡선 데이터 생성 -- */

function buildHistogram(subgroups: Subgroup[], stats: SpcStats, binCount = 15) {
  const allSamples = subgroups.flatMap((s) => s.samples);
  const min = Math.min(...allSamples, stats.lsl);
  const max = Math.max(...allSamples, stats.usl);
  const margin = (max - min) * 0.1;
  const rangeMin = min - margin;
  const rangeMax = max + margin;
  const binWidth = (rangeMax - rangeMin) / binCount;

  const mean = allSamples.reduce((s, v) => s + v, 0) / allSamples.length;
  const variance = allSamples.reduce((s, v) => s + (v - mean) ** 2, 0) / allSamples.length;
  const std = Math.sqrt(variance);
  const n = allSamples.length;

  const normalPdf = (x: number) =>
    (1 / (std * Math.sqrt(2 * Math.PI))) * Math.exp(-0.5 * ((x - mean) / std) ** 2);

  return Array.from({ length: binCount }, (_, i) => {
    const lo = rangeMin + i * binWidth;
    const hi = lo + binWidth;
    const mid = (lo + hi) / 2;
    const count = allSamples.filter((v) => v >= lo && v < hi).length;
    const inSpec = mid >= stats.lsl && mid <= stats.usl;
    const normal = Number((normalPdf(mid) * n * binWidth).toFixed(2));
    return { lo, hi, mid: Number(mid.toFixed(2)), count, inSpec, normal };
  });
}

/* -- 메인 컴포넌트 -- */

interface Props {
  /** API 경로 베이스 (기본값: /api/mxvc/spc) */
  apiBase?: string;
}

export default function MxvcSpcControlChart({ apiBase = '/api/mxvc/spc' }: Props) {
  const t = useTranslations('common');
  const ts = useTranslations('mxvcSpc');
  const theme = useChartTheme();
  const serverToday = useServerTime();

  const [models, setModels] = useState<string[]>([]);
  const [selectedModel, setSelectedModel] = useState('');
  const [items, setItems] = useState<MeasItem[]>([]);
  const [selectedItem, setSelectedItem] = useState('');
  const selectedItemMeta = useMemo(
    () => items.find((i) => i.id === selectedItem) ?? null,
    [items, selectedItem],
  );
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [data, setData] = useState<SpcData | null>(null);
  const [loading, setLoading] = useState(false);

  /* 서버 시간 로드 시 날짜 초기값 설정 */
  useEffect(() => {
    if (serverToday && !dateFrom) {
      const d = new Date(serverToday + 'T00:00:00');
      d.setDate(d.getDate() - 30);
      setDateFrom(d.toISOString().slice(0, 10));
      setDateTo(serverToday);
    }
  }, [serverToday, dateFrom]);

  /* 모델 목록 로드 (최초 1회) */
  useEffect(() => {
    fetcher(`${apiBase}?mode=models`).then((res: { models: string[] }) => {
      setModels(res.models ?? []);
    });
  }, [apiBase]);

  /* 측정항목 목록 로드 — 모델 변경 시 재로드 */
  useEffect(() => {
    const url = selectedModel ? `${apiBase}?model=${encodeURIComponent(selectedModel)}` : apiBase;
    fetcher(url).then((res: { items: MeasItem[] }) => {
      setItems(res.items ?? []);
      setSelectedItem(res.items?.[0]?.id ?? '');
      setData(null);
    });
  }, [apiBase, selectedModel]);

  /* SPC 데이터 조회 */
  const handleSearch = useCallback(async () => {
    if (!selectedItemMeta) return;
    setLoading(true);
    try {
      const modelParam = selectedModel ? `&model=${encodeURIComponent(selectedModel)}` : '';
      const nameParam = encodeURIComponent(selectedItemMeta.itemName ?? selectedItemMeta.name);
      const voltParam = selectedItemMeta.volt ? `&volt=${encodeURIComponent(selectedItemMeta.volt)}` : '';
      const res = await fetcher(
        `${apiBase}?name=${nameParam}${voltParam}&dateFrom=${dateFrom}&dateTo=${dateTo}${modelParam}`
      ) as SpcData;
      setData(res);
    } finally {
      setLoading(false);
    }
  }, [apiBase, selectedItemMeta, selectedModel, dateFrom, dateTo]);

  /* 항목 선택 후 자동 조회 */
  useEffect(() => {
    if (selectedItem && dateFrom && dateTo) handleSearch();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedItem]);

  /* OOC(이탈점) 상세 모달 */
  const [oocSubgroup, setOocSubgroup] = useState<Subgroup | null>(null);

  const handleOocClick = useCallback((sgId: number) => {
    const sg = data?.subgroups.find((s) => s.id === sgId);
    if (sg) setOocSubgroup(sg);
  }, [data]);

  /* RAW 데이터 모달 */
  const [rawOpen, setRawOpen] = useState(false);
  const [rawRows, setRawRows] = useState<Record<string, unknown>[]>([]);
  const [rawLoading, setRawLoading] = useState(false);

  const handleRawOpen = useCallback(async () => {
    if (!selectedItemMeta) return;
    setRawOpen(true);
    setRawLoading(true);
    try {
      const modelParam = selectedModel ? `&model=${encodeURIComponent(selectedModel)}` : '';
      const nameParam = encodeURIComponent(selectedItemMeta.itemName ?? selectedItemMeta.name);
      const voltParam = selectedItemMeta.volt ? `&volt=${encodeURIComponent(selectedItemMeta.volt)}` : '';
      const res = await fetcher(
        `${apiBase}?mode=raw&name=${nameParam}${voltParam}&dateFrom=${dateFrom}&dateTo=${dateTo}${modelParam}`
      ) as { rows: Record<string, unknown>[] };
      setRawRows(res.rows ?? []);
    } finally {
      setRawLoading(false);
    }
  }, [apiBase, selectedItemMeta, selectedModel, dateFrom, dateTo]);

  const handleExcelDownload = useCallback(() => {
    if (rawRows.length === 0) return;
    const ws = XLSX.utils.json_to_sheet(rawRows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'SPC_RAW');
    const name = selectedItemMeta?.itemName ?? selectedItemMeta?.name ?? selectedItem;
    const volt = selectedItemMeta?.volt ? `_${selectedItemMeta.volt}` : '';
    XLSX.writeFile(wb, `SPC_RAW_${name}${volt}_${dateFrom}_${dateTo}.xlsx`);
  }, [rawRows, selectedItemMeta, selectedItem, dateFrom, dateTo]);

  const RAW_COLUMNS = ['LOG_TIME', 'EQUIPMENT_ID', 'BARCODE', 'MODEL', 'LINE_CODE', 'NAME', 'VOLT_V', 'LSL', 'TARGET', 'USL', 'MEAS_VAL', 'STEP_RESULT'];

  const s = data?.stats;

  return (
    <div className="flex h-full flex-col gap-2 overflow-auto p-3">

      {/* ═══════ 조회 영역 ═══════ */}
      <section className={`rounded-lg border p-3 ${theme.sectionBg}`}>
        <div className="flex flex-wrap items-end gap-4">
          <div>
            <div className={labelCls}>{ts('period')}</div>
            <div className="flex items-center gap-1">
              <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className={`${inputCls} w-36`} />
              <span className={`text-sm ${theme.textMuted}`}>~</span>
              <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className={`${inputCls} w-36`} />
            </div>
          </div>
          <div>
            <div className={labelCls}>{ts('model')}</div>
            <select value={selectedModel} onChange={(e) => setSelectedModel(e.target.value)} className={`${inputCls} w-48`}>
              <option value="">{t('all')}</option>
              {models.map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>
          <div>
            <div className={labelCls}>{ts('measItem')}</div>
            <select value={selectedItem} onChange={(e) => setSelectedItem(e.target.value)} className={`${inputCls} w-44`}>
              {items.map((i) => (
                <option key={i.id} value={i.id}>{i.name}</option>
              ))}
            </select>
          </div>
          <button onClick={handleSearch} disabled={loading}
            className={`${btnBase} bg-indigo-600 text-white hover:bg-indigo-500 disabled:opacity-50`}>
            {loading ? t('loading') : t('refresh')}
          </button>
          <button onClick={handleRawOpen} disabled={!selectedItem}
            className={`${btnBase} bg-zinc-600 text-white hover:bg-zinc-500 disabled:opacity-50`}>
            {ts('rawData')}
          </button>

          {data && (
            <div className={`ml-auto flex items-center gap-4 text-xs ${theme.textMuted}`}>
              <span>{data.dateFrom} ~ {data.dateTo}</span>
              <span className={theme.textSub}>|</span>
              <span>USL: <b className="text-red-400">{data.item.usl}</b></span>
              <span>Target: <b className="text-green-400">{data.item.target}</b></span>
              <span>LSL: <b className="text-blue-400">{data.item.lsl}</b></span>
              <span className={theme.textSub}>|</span>
              <span>n={s?.sampleSize}, k={s?.subgroupCount}</span>
            </div>
          )}
        </div>
      </section>

      {data && s && (
        <>
          {/* ═══════ Cp/Cpk 게이지 + 통계 요약 ═══════ */}
          <section className="grid grid-cols-[1fr_1fr_2fr] gap-2">
            <div className="rounded-lg border border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-900 p-3 text-center">
              <div className="text-xs text-zinc-400 dark:text-zinc-500 mb-1">{ts('cpLabel')}</div>
              <div className="text-3xl font-black" style={{ color: getCpkGrade(s.cp, ts).color }}>{s.cp.toFixed(3)}</div>
              <div className="text-xs text-zinc-500 mt-1">{getCpkGrade(s.cp, ts).label}</div>
            </div>
            <div className="rounded-lg border border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-900 p-3 text-center">
              <div className="text-xs text-zinc-400 dark:text-zinc-500 mb-1">{ts('cpkLabel')}</div>
              <div className="text-3xl font-black" style={{ color: getCpkGrade(s.cpk, ts).color }}>{s.cpk.toFixed(3)}</div>
              <div className="text-xs text-zinc-500 mt-1">{getCpkGrade(s.cpk, ts).label}</div>
            </div>
            <div className="rounded-lg border border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-900 p-3">
              <div className="grid grid-cols-4 gap-x-6 gap-y-1 text-xs">
                <StatRow label={ts('xbarMean')} value={s.xbarBar} />
                <StatRow label={ts('rBar')} value={s.rBar} />
                <StatRow label={ts('sigmaEst')} value={s.sigmaEst} />
                <StatRow label={ts('oocCount')} value={s.oocPoints.length} unit={ts('countUnit')} color={s.oocPoints.length > 0 ? '#ef4444' : '#22c55e'} />
                <StatRow label="X-bar UCL" value={s.xbarUCL} color="#ef4444" />
                <StatRow label="X-bar LCL" value={s.xbarLCL} color="#3b82f6" />
                <StatRow label="R UCL" value={s.rUCL} color="#ef4444" />
                <StatRow label="R LCL" value={s.rLCL} color="#3b82f6" />
              </div>
            </div>
          </section>

          {/* ═══════ X-bar Chart + Histogram ═══════ */}
          <section className="rounded-lg border border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-900 p-3 flex-1 min-h-[220px]">
            <div className="mb-2 flex items-center gap-2">
              <span className="text-sm font-bold text-zinc-300">X-bar Chart</span>
              <span className="text-xs text-zinc-500">— {ts('meanChart')}</span>
              <span className="text-xs text-zinc-600 ml-auto">Histogram →</span>
            </div>
            <div className="flex h-[85%] gap-1">
              <div className="flex-1">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={data.subgroups} margin={{ top: 5, right: 10, bottom: 5, left: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={theme.grid} />
                    <XAxis dataKey="dateLabel" tick={{ fontSize: 10, fill: theme.tick }} interval="preserveStartEnd" />
                    <YAxis
                      domain={[
                        (min: number) => {
                          const lo = Math.min(min, s.xbarLCL);
                          const hi = Math.max(min, s.xbarUCL);
                          const margin = (hi - lo) * 0.5 || 1;
                          return Number((lo - margin).toFixed(2));
                        },
                        (max: number) => {
                          const lo = Math.min(max, s.xbarLCL);
                          const hi = Math.max(max, s.xbarUCL);
                          const margin = (hi - lo) * 0.5 || 1;
                          return Number((hi + margin).toFixed(2));
                        },
                      ]}
                      tick={{ fontSize: 11, fill: theme.tick }}
                    />
                    <Tooltip
                      contentStyle={{ background: theme.tooltip.bg, border: `1px solid ${theme.tooltip.border}`, borderRadius: 8 }}
                      labelStyle={{ color: '#999' }}
                      formatter={(value) => [Number(value).toFixed(4), 'X-bar']}
                    />
                    <ReferenceLine y={s.usl} stroke="#ff6b6b" strokeWidth={2} label={{ value: 'USL', fill: '#ff6b6b', fontSize: 10, position: 'right' }} />
                    <ReferenceLine y={s.lsl} stroke="#4dabf7" strokeWidth={2} label={{ value: 'LSL', fill: '#4dabf7', fontSize: 10, position: 'right' }} />
                    <ReferenceLine y={s.xbarUCL} stroke="#ef4444" strokeDasharray="5 5" label={{ value: 'UCL', fill: '#ef4444', fontSize: 10 }} />
                    <ReferenceLine y={s.xbarCL} stroke="#22c55e" strokeDasharray="3 3" label={{ value: 'CL', fill: '#22c55e', fontSize: 10 }} />
                    <ReferenceLine y={s.xbarLCL} stroke="#3b82f6" strokeDasharray="5 5" label={{ value: 'LCL', fill: '#3b82f6', fontSize: 10 }} />
                    <Line
                      type="monotone" dataKey="xbar" stroke="#8b5cf6" strokeWidth={2}
                      dot={(props) => <OocDot {...props} oocPoints={s.oocPoints} onOocClick={handleOocClick} />}
                      activeDot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <div className="w-[350px] shrink-0">
                <Histogram subgroups={data.subgroups} stats={s} theme={theme} />
              </div>
            </div>
          </section>

          {/* ═══════ R Chart + 공정능력 분석도 ═══════ */}
          <section className="rounded-lg border border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-900 p-3 flex-1 min-h-[220px]">
            <div className="mb-2 flex items-center gap-2">
              <span className="text-sm font-bold text-zinc-300">R Chart</span>
              <span className="text-xs text-zinc-500">— {ts('rangeChart')}</span>
              <span className="text-xs text-zinc-600 ml-auto">Process Capability →</span>
            </div>
            <div className="flex h-[85%] gap-1">
              <div className="flex-1">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={data.subgroups} margin={{ top: 5, right: 10, bottom: 5, left: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={theme.grid} />
                    <XAxis dataKey="dateLabel" tick={{ fontSize: 10, fill: theme.tick }} interval="preserveStartEnd" />
                    <YAxis domain={[0, 'auto']} tick={{ fontSize: 11, fill: theme.tick }} />
                    <Tooltip
                      contentStyle={{ background: theme.tooltip.bg, border: `1px solid ${theme.tooltip.border}`, borderRadius: 8 }}
                      labelStyle={{ color: '#999' }}
                      formatter={(value) => [Number(value).toFixed(4), 'R']}
                    />
                    <ReferenceLine y={s.rUCL} stroke="#ef4444" strokeDasharray="5 5" label={{ value: 'UCL', fill: '#ef4444', fontSize: 10 }} />
                    <ReferenceLine y={s.rCL} stroke="#22c55e" strokeDasharray="3 3" label={{ value: 'CL', fill: '#22c55e', fontSize: 10 }} />
                    <ReferenceLine y={s.rLCL} stroke="#3b82f6" strokeDasharray="5 5" label={{ value: 'LCL', fill: '#3b82f6', fontSize: 10 }} />
                    <Line
                      type="monotone" dataKey="range" stroke="#f59e0b" strokeWidth={2}
                      dot={{ r: 3, fill: '#f59e0b' }}
                      activeDot={{ r: 5, fill: '#fbbf24' }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <div className="w-[350px] shrink-0">
                <CapabilityChart subgroups={data.subgroups} stats={s} theme={theme} />
              </div>
            </div>
          </section>
        </>
      )}

      {data && !s && data.message && (
        <div className="flex-1 flex items-center justify-center text-yellow-500 text-sm">
          {data.message}
        </div>
      )}

      {!data && !loading && (
        <div className="flex-1 flex items-center justify-center text-zinc-600 text-sm">
          {ts('selectItemHint')}
        </div>
      )}

      {/* ═══════ RAW 데이터 모달 ═══════ */}
      <Modal
        isOpen={rawOpen}
        onClose={() => setRawOpen(false)}
        title={ts('rawTitle', { name: selectedItemMeta?.name ?? selectedItem })}
        subtitle={ts('rawSubtitle', { from: dateFrom, to: dateTo, count: rawRows.length })}
        size="full"
        footer={
          <button onClick={handleExcelDownload} disabled={rawRows.length === 0}
            className={`${btnBase} bg-green-600 text-white hover:bg-green-500 disabled:opacity-50`}>
            {ts('excelDownload')}
          </button>
        }
      >
        {rawLoading ? (
          <div className="flex items-center justify-center py-10 text-zinc-400">{t('loading')}</div>
        ) : rawRows.length === 0 ? (
          <div className="flex items-center justify-center py-10 text-zinc-500">{ts('noData')}</div>
        ) : (
          <div className="overflow-auto max-h-[60vh]">
            <table className="w-full text-xs border-collapse">
              <thead className="sticky top-0 bg-zinc-800 text-zinc-300">
                <tr>
                  <th className="px-2 py-1.5 border border-zinc-700 text-center">#</th>
                  {RAW_COLUMNS.map((col) => (
                    <th key={col} className="px-2 py-1.5 border border-zinc-700 text-center whitespace-nowrap">{col}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rawRows.map((row, i) => (
                  <tr key={i} className="hover:bg-zinc-800/50">
                    <td className="px-2 py-1 border border-zinc-700 text-center text-zinc-500">{i + 1}</td>
                    {RAW_COLUMNS.map((col) => (
                      <td key={col} className={`px-2 py-1 border border-zinc-700 whitespace-nowrap ${
                        col === 'MEAS_VAL' ? 'text-right font-mono font-semibold text-indigo-300' : 'text-center'
                      }`}>
                        {String(row[col] ?? '-')}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Modal>

      {/* ═══════ OOC 이탈점 상세 모달 ═══════ */}
      <Modal
        isOpen={!!oocSubgroup}
        onClose={() => setOocSubgroup(null)}
        title={ts('oocTitle', { date: oocSubgroup?.dateLabel ?? '' })}
        subtitle={ts('oocSubtitle', { id: oocSubgroup?.id ?? '', xbar: oocSubgroup?.xbar ?? '', range: oocSubgroup?.range ?? '' })}
        size="lg"
      >
        {oocSubgroup && s && (
          <div className="space-y-4">
            {/* 요약 카드 */}
            <div className="grid grid-cols-4 gap-3">
              <div className="bg-zinc-100 dark:bg-zinc-800 rounded-lg p-3 text-center">
                <div className="text-lg font-bold font-mono text-red-400">{oocSubgroup.xbar.toFixed(4)}</div>
                <div className="text-[10px] text-zinc-500 mt-1">{ts('xbarShort')}</div>
              </div>
              <div className="bg-zinc-100 dark:bg-zinc-800 rounded-lg p-3 text-center">
                <div className="text-lg font-bold font-mono text-yellow-400">{oocSubgroup.range.toFixed(4)}</div>
                <div className="text-[10px] text-zinc-500 mt-1">{ts('rRange')}</div>
              </div>
              <div className="bg-zinc-100 dark:bg-zinc-800 rounded-lg p-3 text-center">
                <div className="text-sm font-mono text-zinc-300">
                  UCL: <span className="text-red-400">{s.xbarUCL.toFixed(4)}</span>
                </div>
                <div className="text-sm font-mono text-zinc-300">
                  LCL: <span className="text-blue-400">{s.xbarLCL.toFixed(4)}</span>
                </div>
              </div>
              <div className="bg-zinc-100 dark:bg-zinc-800 rounded-lg p-3 text-center">
                <div className={`text-lg font-bold ${oocSubgroup.xbar > s.xbarUCL ? 'text-red-400' : 'text-blue-400'}`}>
                  {oocSubgroup.xbar > s.xbarUCL ? ts('uclExceed') : ts('lclShort')}
                </div>
                <div className="text-[10px] text-zinc-500 mt-1">{ts('oocType')}</div>
              </div>
            </div>

            {/* 샘플 데이터 테이블 */}
            <div>
              <h4 className="text-xs font-bold text-zinc-400 uppercase mb-2">{ts('sampleData', { count: oocSubgroup.samples.length })}</h4>
              <div className="rounded-lg border border-zinc-700 overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-zinc-800 text-zinc-400">
                    <tr>
                      <th className="px-3 py-2 text-center w-16">#</th>
                      <th className="px-3 py-2 text-right">{ts('measValue')}</th>
                      <th className="px-3 py-2 text-center">{ts('vsUsl')}</th>
                      <th className="px-3 py-2 text-center">{ts('vsLsl')}</th>
                      <th className="px-3 py-2 text-center">{ts('judgment')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {oocSubgroup.samples.map((val, i) => {
                      const inSpec = val >= s.lsl && val <= s.usl;
                      return (
                        <tr key={i} className="border-t border-zinc-700">
                          <td className="px-3 py-1.5 text-center text-zinc-500">{i + 1}</td>
                          <td className={`px-3 py-1.5 text-right font-mono font-semibold ${inSpec ? 'text-indigo-300' : 'text-red-400'}`}>
                            {val.toFixed(2)}
                          </td>
                          <td className="px-3 py-1.5 text-center text-xs text-zinc-500">
                            {(s.usl - val).toFixed(2)}
                          </td>
                          <td className="px-3 py-1.5 text-center text-xs text-zinc-500">
                            {(val - s.lsl).toFixed(2)}
                          </td>
                          <td className={`px-3 py-1.5 text-center text-xs font-semibold ${inSpec ? 'text-green-400' : 'text-red-400'}`}>
                            {inSpec ? 'OK' : 'NG'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

/* -- 히스토그램 + 정규분포 곡선 컴포넌트 -- */

type ChartTheme = ReturnType<typeof useChartTheme>;

function Histogram({ subgroups, stats, theme }: { subgroups: Subgroup[]; stats: SpcStats; theme: ChartTheme }) {
  const ts = useTranslations('mxvcSpc');
  const bins = useMemo(() => buildHistogram(subgroups, stats), [subgroups, stats]);

  return (
    <ResponsiveContainer width="100%" height="100%">
      <ComposedChart data={bins} margin={{ top: 10, right: 10, bottom: 25, left: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={theme.grid} vertical={false} />
        <XAxis
          dataKey="mid"
          type="number"
          domain={['dataMin', 'dataMax']}
          tick={{ fontSize: 9, fill: theme.tick }}
          angle={-45}
          textAnchor="end"
          height={40}
        />
        <YAxis tick={{ fontSize: 10, fill: theme.tick }} width={30} />
        <Tooltip
          contentStyle={{ background: theme.tooltip.bg, border: `1px solid ${theme.tooltip.border}`, borderRadius: 8 }}
          formatter={(value, name) => [value, name === 'count' ? ts('frequency') : ts('normalDist')]}
          labelFormatter={(label) => ts('bin', { value: String(label) })}
        />
        <ReferenceLine x={stats.usl} stroke="#ff6b6b" strokeWidth={2} label={{ value: 'USL', fill: '#ff6b6b', fontSize: 10, position: 'top' }} />
        <ReferenceLine x={stats.lsl} stroke="#4dabf7" strokeWidth={2} label={{ value: 'LSL', fill: '#4dabf7', fontSize: 10, position: 'top' }} />
        <Bar dataKey="count" radius={[2, 2, 0, 0]} barSize={20}>
          {bins.map((bin, i) => (
            <Cell key={i} fill={bin.inSpec ? '#fbbf24' : '#ef4444'} fillOpacity={0.85} stroke={bin.inSpec ? '#f59e0b' : '#dc2626'} strokeWidth={1} />
          ))}
        </Bar>
        <Line type="monotone" dataKey="normal" stroke="#3b82f6" strokeWidth={2.5} dot={false} activeDot={false} />
      </ComposedChart>
    </ResponsiveContainer>
  );
}

/* -- 공정능력 분석도 (Process Capability Chart) -- */

function CapabilityChart({ subgroups, stats, theme }: { subgroups: Subgroup[]; stats: SpcStats; theme: ChartTheme }) {
  const ts = useTranslations('mxvcSpc');
  const chartData = useMemo(() => {
    const allSamples = subgroups.flatMap((s) => s.samples);
    const mean = allSamples.reduce((s, v) => s + v, 0) / allSamples.length;
    const variance = allSamples.reduce((s, v) => s + (v - mean) ** 2, 0) / allSamples.length;
    const std = Math.sqrt(variance);

    const xMin = Math.min(stats.lsl, mean - 4 * std);
    const xMax = Math.max(stats.usl, mean + 4 * std);
    const step = (xMax - xMin) / 60;

    const normalPdf = (x: number) =>
      (1 / (std * Math.sqrt(2 * Math.PI))) * Math.exp(-0.5 * ((x - mean) / std) ** 2);

    const points = [];
    for (let x = xMin; x <= xMax; x += step) {
      const pdf = normalPdf(x);
      const inSpec = x >= stats.lsl && x <= stats.usl;
      points.push({
        x: Number(x.toFixed(3)),
        pdf: Number(pdf.toFixed(6)),
        fill: inSpec ? Number(pdf.toFixed(6)) : 0,
        outOfSpec: !inSpec ? Number(pdf.toFixed(6)) : 0,
      });
    }

    return { points };
  }, [subgroups, stats]);

  const { points } = chartData;
  const grade = getCpkGrade(stats.cpk, ts);

  return (
    <div className="flex h-full flex-col">
      <ResponsiveContainer width="100%" height="80%">
        <ComposedChart data={points} margin={{ top: 10, right: 10, bottom: 25, left: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={theme.grid} vertical={false} />
          <XAxis dataKey="x" type="number" domain={['dataMin', 'dataMax']} tick={{ fontSize: 9, fill: theme.tick }} tickCount={8} />
          <YAxis tick={false} width={5} />
          <Tooltip
            contentStyle={{ background: theme.tooltip.bg, border: `1px solid ${theme.tooltip.border}`, borderRadius: 8 }}
            formatter={(value) => [Number(value).toFixed(4), '']}
            labelFormatter={(label) => ts('value', { value: String(label) })}
          />
          <Bar dataKey="fill" fill="#22c55e" fillOpacity={0.25} barSize={8} isAnimationActive={false} />
          <Bar dataKey="outOfSpec" fill="#ef4444" fillOpacity={0.35} barSize={8} isAnimationActive={false} />
          <ReferenceLine x={stats.usl} stroke="#ff6b6b" strokeWidth={2} label={{ value: 'USL', fill: '#ff6b6b', fontSize: 10, position: 'top' }} />
          <ReferenceLine x={stats.lsl} stroke="#4dabf7" strokeWidth={2} label={{ value: 'LSL', fill: '#4dabf7', fontSize: 10, position: 'top' }} />
          <ReferenceLine x={stats.target} stroke="#22c55e" strokeWidth={1.5} strokeDasharray="4 4" label={{ value: 'T', fill: '#22c55e', fontSize: 10, position: 'top' }} />
          <Line type="monotone" dataKey="pdf" stroke="#a78bfa" strokeWidth={2.5} dot={false} activeDot={false} />
        </ComposedChart>
      </ResponsiveContainer>
      <div className="flex items-center justify-center gap-4 mt-1">
        <div className="flex items-center gap-1.5 text-xs">
          <span className="text-zinc-500">Cp</span>
          <span className="font-mono font-bold" style={{ color: getCpkGrade(stats.cp, ts).color }}>{stats.cp.toFixed(3)}</span>
        </div>
        <div className="flex items-center gap-1.5 text-xs">
          <span className="text-zinc-500">Cpk</span>
          <span className="font-mono font-bold" style={{ color: grade.color }}>{stats.cpk.toFixed(3)}</span>
        </div>
        <span className={`text-[10px] px-1.5 py-0.5 rounded border ${grade.bg}`} style={{ color: grade.color }}>
          {grade.label}
        </span>
      </div>
    </div>
  );
}

/* -- 통계 행 컴포넌트 -- */

function StatRow({ label, value, unit, color }: { label: string; value: number; unit?: string; color?: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-zinc-500">{label}</span>
      <span className="font-mono font-semibold" style={{ color: color ?? '#e2e8f0' }}>
        {typeof value === 'number' ? (Number.isInteger(value) ? value : value.toFixed(4)) : value}
        {unit && <span className="text-zinc-600 ml-0.5">{unit}</span>}
      </span>
    </div>
  );
}
