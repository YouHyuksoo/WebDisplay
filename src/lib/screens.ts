/**
 * @file screens.ts
 * @description MES 디스플레이 화면 레지스트리. 모든 화면의 메타데이터.
 * 초보자 가이드: 각 화면의 ID, 제목, PB 윈도우명, 그룹 분류를 정의한다.
 */
export interface ScreenConfig {
  id: string;
  title: string;
  titleKo: string;
  window: string;
  group: string;
  /** true이면 라인 선택 필터가 필요한 화면 (최초 접속 시 자동 팝업) */
  lineFilter?: boolean;
}

export const SCREENS: Record<string, ScreenConfig> = {
  '18': { id: '18', title: 'Display Option', titleKo: '옵션 설정', window: 'w_display_option', group: 'favorites' },
  '24': { id: '24', title: 'SMD Production Status', titleKo: 'SMD 생산현황', window: 'w_display_machine_status_smd', group: 'smd-monitoring', lineFilter: true },
  '25': { id: '25', title: 'Foolproof Status', titleKo: '종합F/P현황', window: 'w_display_machine_foolproof_status', group: 'smd-monitoring', lineFilter: true },
  '26': { id: '26', title: 'Line Production KPI', titleKo: '라인별생산현황', window: 'w_display_product_kpi_status', group: 'smd-monitoring', lineFilter: true },
  '27': { id: '27', title: 'SMD Dual Production Status', titleKo: 'SMD 듀얼생산현황', window: 'w_display_machine_status_single_smd', group: 'smd-monitoring', lineFilter: true },

  '21': { id: '21', title: 'PBA Production Status', titleKo: '제품생산현황', window: 'w_display_assy_production_status', group: 'pba-monitoring', lineFilter: true },
  '29': { id: '29', title: 'MSL Warning List (Mount)', titleKo: 'MSL(장착기준)', window: 'w_display_msl_warning_list', group: 'quality' },
  '30': { id: '30', title: 'MSL Warning List (Issue)', titleKo: 'MSL(출고기준)', window: 'w_display_msl_warning_list_issue_item', group: 'quality' },
  '31': { id: '31', title: 'Solder Paste Mgmt', titleKo: 'Solder Paste 관리', window: 'w_display_solderpaste_mgmt', group: 'quality' },
  '37': { id: '37', title: 'Temp & Humidity', titleKo: '온습도', window: 'w_display_temp_mgmt', group: 'quality' },

  '34': { id: '34', title: 'SMT Pickup Rate (Base)', titleKo: '픽업률현황(BASE)', window: 'w_display_smt_pickup_rate_base', group: 'equipment' },
  '35': { id: '35', title: 'SMT Pickup Rate (Head)', titleKo: '픽업률현황(HEAD)', window: 'w_display_smt_pickup_rate_head', group: 'equipment' },

  '40': { id: '40', title: 'SPI Chart Analysis', titleKo: 'SPI 차트분석', window: 'w_display_spi_chart', group: 'charts' },
  '41': { id: '41', title: 'AOI Chart Analysis', titleKo: 'AOI 차트분석', window: 'w_display_aoi_chart', group: 'charts' },
  '42': { id: '42', title: 'FCT Chart Analysis', titleKo: 'FCT 차트분석', window: 'w_display_fct_chart', group: 'charts' },
  '43': { id: '43', title: 'VISION Chart Analysis', titleKo: 'VISION 차트분석', window: 'w_display_vision_chart', group: 'charts' },
};
