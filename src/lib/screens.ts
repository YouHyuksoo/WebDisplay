/**
 * @file screens.ts
 * @description MES 디스플레이 화면 레지스트리. 모든 16개 화면의 메타데이터.
 * 초보자 가이드: 각 화면의 ID, 제목, PB 윈도우명, 그룹 분류를 정의한다.
 */
export interface ScreenConfig {
  id: string;
  title: string;
  titleKo: string;
  window: string;
  group: 'favorites' | 'smd-monitoring' | 'pba-monitoring' | 'equipment' | 'quality' | 'management';
}

export const SCREENS: Record<string, ScreenConfig> = {
  '18': { id: '18', title: 'Display Option', titleKo: '옵션 설정', window: 'w_display_option', group: 'favorites' },
  '24': { id: '24', title: 'SMD Production Status', titleKo: 'SMD 생산현황', window: 'w_display_machine_status_smd', group: 'smd-monitoring' },
  '25': { id: '25', title: 'SMD Production', titleKo: 'SMD 생산량', window: 'w_display_production_smd', group: 'smd-monitoring' },

  '28': { id: '28', title: 'Machine Operation Rate', titleKo: '설비 가동률', window: 'w_display_machine_operation_rate', group: 'equipment' },
  '21': { id: '21', title: 'ASSY Production Status', titleKo: 'ASSY 생산현황', window: 'w_display_machine_status_assy', group: 'pba-monitoring' },
  '22': { id: '22', title: 'ASSY Production', titleKo: 'ASSY 생산량', window: 'w_display_production_assy', group: 'pba-monitoring' },
  '23': { id: '23', title: 'AOI Yield', titleKo: 'AOI 수율', window: 'w_display_aoi_yield', group: 'quality' },
  '27': { id: '27', title: 'MSL Management', titleKo: 'MSL 관리', window: 'w_display_msl_mgmt', group: 'quality' },
  '29': { id: '29', title: 'MSL Warning List (Mount)', titleKo: 'MSL(장착기준)', window: 'w_display_msl_warning_list', group: 'quality' },
  '30': { id: '30', title: 'MSL Warning List (Issue)', titleKo: 'MSL(출고기준)', window: 'w_display_msl_warning_list_issue_item', group: 'quality' },
  '31': { id: '31', title: 'Solder Paste Mgmt', titleKo: 'Solder Paste 관리', window: 'w_display_solderpaste_mgmt', group: 'quality' },
  '32': { id: '32', title: 'Stencil Mgmt', titleKo: 'Stencil 관리', window: 'w_display_stencil_mgmt', group: 'quality' },
  '37': { id: '37', title: 'Temp & Humidity', titleKo: '온습도', window: 'w_display_temp_mgmt', group: 'quality' },
};
