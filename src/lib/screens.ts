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
  group: 'management' | 'monitoring' | 'quality';
}

export const SCREENS: Record<string, ScreenConfig> = {
  '12': { id: '12', title: 'ASSY Production Status', titleKo: 'ASSY 생산 현황', window: 'w_display_assy_production_status', group: 'management' },
  '16': { id: '16', title: 'Machine Log Error', titleKo: '설비 로그 수집 오류', window: 'w_display_machine_log_gather_error_list', group: 'management' },
  '18': { id: '18', title: 'Display Option', titleKo: '옵션 설정', window: 'w_display_option', group: 'management' },
  '21': { id: '21', title: 'ASSY Machine Status', titleKo: 'ASSY 기계 상태', window: 'w_display_machine_status_assy', group: 'monitoring' },
  '22': { id: '22', title: 'ASSY Production', titleKo: 'ASSY 생산량', window: 'w_display_production_assy', group: 'monitoring' },
  '23': { id: '23', title: 'AOI Yield', titleKo: 'AOI 수율', window: 'w_display_aoi_yield', group: 'monitoring' },
  '24': { id: '24', title: 'SMD Machine Status', titleKo: 'SMD 기계 상태', window: 'w_display_machine_status_smd', group: 'monitoring' },
  '25': { id: '25', title: 'SMD Production', titleKo: 'SMD 생산량', window: 'w_display_production_smd', group: 'monitoring' },
  '26': { id: '26', title: 'Material Input', titleKo: '자재 투입 현황', window: 'w_display_material_input', group: 'monitoring' },
  '27': { id: '27', title: 'MSL Management', titleKo: 'MSL 관리', window: 'w_display_msl_mgmt', group: 'monitoring' },
  '28': { id: '28', title: 'Machine Operation Rate', titleKo: '설비 가동률', window: 'w_display_machine_operation_rate', group: 'monitoring' },
  '31': { id: '31', title: 'Solder Paste Mgmt', titleKo: 'Solder Paste 관리', window: 'w_display_solderpaste_mgmt', group: 'quality' },
  '32': { id: '32', title: 'Stencil Mgmt', titleKo: 'Stencil 관리', window: 'w_display_stencil_mgmt', group: 'quality' },
  '34': { id: '34', title: 'Vision Defect', titleKo: '비전 불량', window: 'w_display_vision_defect', group: 'quality' },
  '37': { id: '37', title: 'Temperature Mgmt', titleKo: '온도 관리', window: 'w_display_temp_mgmt', group: 'quality' },
  '38': { id: '38', title: 'Humidity Mgmt', titleKo: '습도 관리', window: 'w_display_humidity_mgmt', group: 'quality' },
};
