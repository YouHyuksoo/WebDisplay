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
