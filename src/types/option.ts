/**
 * @file option.ts
 * @description 옵션 설정 화면(Screen 18)의 타입 정의.
 * 초보자 가이드: 페이지 롤링 설정과 DB 연결 설정의 인터페이스를 정의한다.
 */

/** 페이지 롤링(자동 순환) 설정 */
export interface RollingConfig {
  enabled: boolean;
  /** 전환 간격 (초). 5~600, 기본 30 */
  intervalSeconds: number;
  /** 순환할 화면 ID 배열. 예: ['24','29','37'] */
  screens: string[];
}

/** Oracle DB 연결 설정 */
export interface DatabaseConfig {
  host: string;
  /** 기본 1521 */
  port: number;
  connectionType: 'SID' | 'SERVICE_NAME';
  sidOrService: string;
  username: string;
  password: string;
}

/** RollingConfig 기본값 */
export const DEFAULT_ROLLING_CONFIG: RollingConfig = {
  enabled: false,
  intervalSeconds: 30,
  screens: [],
};

/** 디스플레이 공통 타이밍 설정 */
export interface DisplayTimingConfig {
  /** 데이터 새로고침 간격 (초). 5~300, 기본 30 */
  refreshSeconds: number;
  /** 페이지 자동 전환 간격 (초). 3~60, 기본 5 */
  scrollSeconds: number;
}

/** DisplayTimingConfig 기본값 */
export const DEFAULT_TIMING_CONFIG: DisplayTimingConfig = {
  refreshSeconds: 30,
  scrollSeconds: 5,
};

/** Solder Paste 경고 임계값 설정 */
export interface SolderThresholdConfig {
  /** 개봉후경과 위험 (기본 '11:30') */
  gap3Danger: string;
  /** 개봉후경과 주의 (기본 '10:00') */
  gap3Warning: string;
  /** 해동후경과 위험 (기본 '23:30') */
  unfreezingDanger: string;
  /** 해동후경과 주의 (기본 '22:00') */
  unfreezingWarning: string;
  /** 유효기간 만료 기준일 (기본 0) */
  validExpired: number;
  /** 유효기간 주의 기준일 (기본 2) */
  validWarning: number;
}

/** SolderThresholdConfig 기본값 — PB 원본 기준 */
export const DEFAULT_SOLDER_THRESHOLDS: SolderThresholdConfig = {
  gap3Danger: '11:30',
  gap3Warning: '10:00',
  unfreezingDanger: '23:30',
  unfreezingWarning: '22:00',
  validExpired: 0,
  validWarning: 2,
};
