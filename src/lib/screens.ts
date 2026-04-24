/**
 * @file screens.ts
 * @description MES 디스플레이 화면 레지스트리. 모든 화면의 메타데이터.
 * 초보자 가이드: 각 화면의 ID, 제목, PB 윈도우명, 그룹 분류를 정의한다.
 */
export interface ScreenConfig {
  id: string;
  /** 영문 제목 (기본 / fallback) */
  title: string;
  /** 한국어 제목 */
  titleKo: string;
  /** 스페인어 제목 (선택) */
  titleEs?: string;
  /** 베트남어 제목 (선택) */
  titleVi?: string;
  window: string;
  group: string;
  /** true이면 라인 선택 필터가 필요한 화면 (최초 접속 시 자동 팝업) */
  lineFilter?: boolean;
}

/**
 * 화면 레지스트리 — Single Source of Truth
 * 화면 제목(한/영/스)은 여기서만 관리. i18n JSON의 screens 네임스페이스 사용 금지.
 */
export const SCREENS: Record<string, ScreenConfig> = {
  '18': { id: '18', title: 'Display Option', titleKo: '옵션 설정', titleEs: 'Configuración de opciones', titleVi: 'Cài đặt tùy chọn', window: 'w_display_option', group: 'favorites' },
  '24': { id: '24', title: 'SMD Production Status', titleKo: 'SMD 생산현황', titleEs: 'Estado de producción SMD', titleVi: 'Tình trạng sản xuất SMD', window: 'w_display_machine_status_smd', group: 'smd-monitoring', lineFilter: true },
  '25': { id: '25', title: 'Foolproof Status', titleKo: '종합F/P현황', titleEs: 'Estado Foolproof', titleVi: 'Tình trạng Foolproof', window: 'w_display_machine_foolproof_status', group: 'smd-monitoring', lineFilter: true },
  '26': { id: '26', title: 'Line Production KPI', titleKo: '라인별생산현황', titleEs: 'KPI de producción por línea', titleVi: 'KPI sản xuất theo Line', window: 'w_display_product_kpi_status', group: 'smd-monitoring', lineFilter: true },
  '27': { id: '27', title: 'SMD Dual Production Status', titleKo: 'SMD 듀얼생산현황', titleEs: 'Estado de producción dual SMD', titleVi: 'Tình trạng sản xuất kép SMD', window: 'w_display_machine_status_single_smd', group: 'smd-monitoring', lineFilter: true },

  '20': { id: '20', title: 'Production Plan Register', titleKo: '생산계획등록', titleVi: 'Đăng ký kế hoạch sản xuất', window: '', group: 'pba-monitoring', lineFilter: true },
  '21': { id: '21', title: 'PBA Production Status', titleKo: '제품생산현황', titleEs: 'Estado de producción PBA', titleVi: 'Tình trạng sản xuất PBA', window: 'w_display_assy_production_status', group: 'pba-monitoring', lineFilter: true },
  '22': { id: '22', title: 'Product Input Status', titleKo: '제품투입현황', titleVi: 'Tình trạng nhập sản phẩm', window: '', group: 'pba-monitoring', lineFilter: true },
  '23': { id: '23', title: 'Product Packaging Status', titleKo: '제품포장현황', titleVi: 'Tình trạng đóng gói sản phẩm', window: '', group: 'pba-monitoring', lineFilter: true },
  '29': { id: '29', title: 'MSL Warning List (Mount)', titleKo: 'MSL(장착기준)', titleEs: 'Lista de alertas MSL (montaje)', titleVi: 'Cảnh báo MSL (lắp đặt)', window: 'w_display_msl_warning_list', group: 'quality' },
  '30': { id: '30', title: 'MSL Warning List (Issue)', titleKo: 'MSL(출고기준)', titleEs: 'Lista de alertas MSL (emisión)', titleVi: 'Cảnh báo MSL (xuất kho)', window: 'w_display_msl_warning_list_issue_item', group: 'quality' },
  '31': { id: '31', title: 'Solder Paste Mgmt', titleKo: 'Solder Paste 관리', titleEs: 'Gestión de pasta de soldadura', titleVi: 'Quản lý Solder Paste', window: 'w_display_solderpaste_mgmt', group: 'quality' },
  '37': { id: '37', title: 'Temp & Humidity', titleKo: '온습도', titleEs: 'Temperatura y humedad', titleVi: 'Nhiệt độ & Độ ẩm', window: 'w_display_temp_mgmt', group: 'quality' },

  '34': { id: '34', title: 'SMT Pickup Rate (Base)', titleKo: '픽업률현황(BASE)', titleEs: 'Tasa de recogida SMT (Base)', titleVi: 'Tỷ lệ Pickup SMT (Base)', window: 'w_display_smt_pickup_rate_base', group: 'equipment' },
  '35': { id: '35', title: 'SMT Pickup Rate (Head)', titleKo: '픽업률현황(HEAD)', titleEs: 'Tasa de recogida SMT (Head)', titleVi: 'Tỷ lệ Pickup SMT (Head)', window: 'w_display_smt_pickup_rate_head', group: 'equipment' },

  '40': { id: '40', title: 'SPI Chart Analysis', titleKo: 'SPI 차트분석', titleEs: 'Análisis de gráficos SPI', titleVi: 'Phân tích biểu đồ SPI', window: 'w_display_spi_chart', group: 'charts' },
  '41': { id: '41', title: 'AOI Chart Analysis', titleKo: 'AOI 차트분석', titleEs: 'Análisis de gráficos AOI', titleVi: 'Phân tích biểu đồ AOI', window: 'w_display_aoi_chart', group: 'charts' },
  '42': { id: '42', title: 'FCT Chart Analysis', titleKo: 'FCT 차트분석', titleEs: 'Análisis de gráficos FCT', titleVi: 'Phân tích biểu đồ FCT', window: 'w_display_fct_chart', group: 'charts' },
  '43': { id: '43', title: 'VISION Chart Analysis', titleKo: 'VISION 차트분석', titleEs: 'Análisis de gráficos VISION', titleVi: 'Phân tích biểu đồ VISION', window: 'w_display_vision_chart', group: 'charts' },

  '50': { id: '50', title: 'Equipment Call History Search', titleKo: '설비호출이력검색', titleEs: 'Búsqueda de historial de llamadas', titleVi: 'Tìm kiếm lịch sử cuộc gọi thiết bị', window: 'w_display_equipment_log', group: 'equipment' },

  '60': { id: '60', title: 'SPC Control Chart', titleKo: '관리도보기', titleEs: 'Gráfico de control SPC', titleVi: 'Biểu đồ kiểm soát SPC', window: '', group: 'spc-monitoring' },

  // 멕시코전장 독립 화면 (display/ 화면과 별도 라인 선택 저장)
  'mxvc-production-kpi': { id: 'mxvc-production-kpi', title: 'Line Production KPI (MXVC)', titleKo: '라인별생산현황(멕시코전장)', titleEs: 'KPI de producción por línea (MXVC)', titleVi: 'KPI sản xuất theo Line (MXVC)', window: '', group: 'mxvc', lineFilter: true },
  'mxvc-post-process': { id: 'mxvc-post-process', title: 'Post-Process Production Status (MXVC)', titleKo: '후공정생산현황(멕시코전장)', titleEs: 'Estado de Producción Post-Proceso (MXVC)', titleVi: 'Tình trạng sản xuất hậu công đoạn (MXVC)', window: '', group: 'mxvc', lineFilter: true },
  'mxvc-repair-status': { id: 'mxvc-repair-status', title: 'Repair Status (MXVC)', titleKo: '수리현황(멕시코전장)', titleEs: 'Estado de Reparación (MXVC)', titleVi: 'Tình trạng sửa chữa (MXVC)', window: '', group: 'mxvc', lineFilter: false },
  'mxvc-process-history': { id: 'mxvc-process-history', title: 'Process Pass History (MXVC)', titleKo: '공정통과이력(멕시코전장)', titleEs: 'Historial de Paso de Proceso (MXVC)', titleVi: 'Lịch sử đi qua công đoạn (MXVC)', window: '', group: 'mxvc', lineFilter: false },

  // 멕시코전장 카드 메뉴 (cards.json /mxvc/* URL 매핑)
  'mxvc-log':            { id: 'mxvc-log',            title: 'Log Inquiry',                titleKo: '로그조회',          titleEs: 'Consulta de registros',         titleVi: 'Tra cứu nhật ký',                  window: '', group: 'mxvc' },
  'mxvc-fpy':            { id: 'mxvc-fpy',            title: 'Yield (FPY)',                titleKo: '직행율',            titleEs: 'Rendimiento (FPY)',             titleVi: 'Tỷ lệ trực hành (FPY)',           window: '', group: 'mxvc' },
  'mxvc-interlock':      { id: 'mxvc-interlock',      title: 'Equipment Call Analysis',    titleKo: '설비호출이력분석',  titleEs: 'Análisis de llamadas de equipo', titleVi: 'Phân tích cuộc gọi thiết bị',     window: '', group: 'mxvc' },
  'mxvc-inspect-result': { id: 'mxvc-inspect-result', title: 'Equipment Call History',     titleKo: '설비호출저장이력',  titleEs: 'Historial de llamadas de equipo', titleVi: 'Lịch sử cuộc gọi thiết bị',      window: '', group: 'mxvc' },
  'mxvc-traceability':   { id: 'mxvc-traceability',   title: 'Forward Trace (PCB→Material)', titleKo: '정추적(PCB→자재)', titleEs: 'Trazabilidad directa (PCB→Material)', titleVi: 'Truy vết xuôi (PCB→Vật liệu)', window: '', group: 'mxvc' },
  'mxvc-reverse-trace':  { id: 'mxvc-reverse-trace',  title: 'Reverse Trace (Material→PCB)', titleKo: '역추적(자재→PCB)', titleEs: 'Trazabilidad inversa (Material→PCB)', titleVi: 'Truy vết ngược (Vật liệu→PCB)', window: '', group: 'mxvc' },
  'mxvc-spc':            { id: 'mxvc-spc',            title: 'SPC Control Chart',          titleKo: 'SPC 관리도보기',    titleEs: 'Gráfico de control SPC',        titleVi: 'Biểu đồ kiểm soát SPC',           window: '', group: 'mxvc' },
  'mxvc-foolproof':      { id: 'mxvc-foolproof',      title: 'Foolproof Status',           titleKo: '종합F/P현황',       titleEs: 'Estado Foolproof',              titleVi: 'Tình trạng Foolproof',            window: '', group: 'mxvc' },
  'mxvc-p-chart':        { id: 'mxvc-p-chart',        title: 'p Control Chart',            titleKo: 'p 관리도',          titleEs: 'Gráfico de control p',          titleVi: 'Biểu đồ kiểm soát p',             window: '', group: 'mxvc' },
};
