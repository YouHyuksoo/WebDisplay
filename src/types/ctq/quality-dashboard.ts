/**
 * @file src/types/ctq/quality-dashboard.ts
 * @description 품질 분석 대시보드 타입 정의
 *
 * 초보자 가이드:
 * 1. QC 테이블 10종 차트 데이터 + 요약 + 수리율
 * 2. RAW 테이블 6종 인사이트 데이터
 * 3. 사이드바 설정: 레이아웃/높이/팔레트/17종 토글
 */

export interface ChartItem {
  name: string;
  count: number;
}

export interface FpyItem {
  name: string;
  today: number;
  yesterday: number;
  todayTotal: number;
  yesterdayTotal: number;
}

export interface RetestItem {
  name: string;
  total: number;
  distinctPid: number;
  rate: number;
}

export interface NgMatrixItem {
  name: string;
  [proc: string]: string | number;
}

export interface WeeklyTrendItem {
  date: string;
  [proc: string]: string | number;
}

export interface RawInsightsResponse {
  inspectionVolume: ChartItem[];
  hourlyInspection: ChartItem[];
  lineProduction: ChartItem[];
  ngMatrix: NgMatrixItem[];
  retestRate: RetestItem[];
  weeklyTrend: WeeklyTrendItem[];
  lastUpdated: string;
}

export interface LeadTimeItem {
  name: string;
  avgHours: number;
  maxHours: number;
  count: number;
}

export interface RepairStats {
  total: number;
  repaired: number;
  pending: number;
}

export interface SummaryData {
  totalDefects: number;
  repairRate: number;
  topProcess: string;
  topBadCode: string;
}

export interface QualityDashboardResponse {
  process: ChartItem[];
  badCode: ChartItem[];
  line: ChartItem[];
  model: ChartItem[];
  hourly: ChartItem[];
  repair: RepairStats;
  defectItem: ChartItem[];
  location: ChartItem[];
  repairWorkstage: ChartItem[];
  receipt: ChartItem[];
  fpy: FpyItem[];
  repairLeadTimeLine: LeadTimeItem[];
  repairLeadTimeModel: LeadTimeItem[];
  summary: SummaryData;
  lastUpdated: string;
}

export interface DashboardSettings {
  layout: "2x3" | "3x2" | "2x2+1";
  chartHeight: number;
  palette: "blue" | "rainbow" | "warm" | "cool";
  showProcess: boolean;
  showBadCode: boolean;
  showLine: boolean;
  showRepair: boolean;
  showHourly: boolean;
  showModel: boolean;
  showDefectItem: boolean;
  showLocation: boolean;
  showRepairWorkstage: boolean;
  showReceipt: boolean;
  showFpy: boolean;
  showInspVolume: boolean;
  showHourlyInsp: boolean;
  showLineProd: boolean;
  showNgMatrix: boolean;
  showRetestRate: boolean;
  showWeeklyTrend: boolean;
  showRepairLeadTimeLine: boolean;
  showRepairLeadTimeModel: boolean;
  showSummary: boolean;
}

export const DEFAULT_SETTINGS: DashboardSettings = {
  layout: "2x3",
  chartHeight: 200,
  palette: "blue",
  showProcess: true,
  showBadCode: true,
  showLine: true,
  showRepair: true,
  showHourly: true,
  showModel: true,
  showDefectItem: false,
  showLocation: false,
  showRepairWorkstage: false,
  showReceipt: false,
  showFpy: true,
  showInspVolume: false,
  showHourlyInsp: false,
  showLineProd: false,
  showNgMatrix: false,
  showRetestRate: false,
  showWeeklyTrend: false,
  showRepairLeadTimeLine: false,
  showRepairLeadTimeModel: false,
  showSummary: true,
};

export const PALETTES: Record<string, string[]> = {
  blue: ["#3b82f6", "#60a5fa", "#93c5fd", "#2563eb", "#1d4ed8", "#1e40af", "#dbeafe", "#bfdbfe", "#7dd3fc", "#38bdf8"],
  rainbow: ["#f87171", "#fb923c", "#facc15", "#4ade80", "#60a5fa", "#a78bfa", "#f472b6", "#34d399", "#38bdf8", "#c084fc"],
  warm: ["#f87171", "#fb923c", "#facc15", "#fbbf24", "#f59e0b", "#d97706", "#fca5a5", "#fdba74", "#fde68a", "#fef08a"],
  cool: ["#6ee7b7", "#34d399", "#2dd4bf", "#22d3ee", "#38bdf8", "#60a5fa", "#818cf8", "#a78bfa", "#67e8f9", "#5eead4"],
};
