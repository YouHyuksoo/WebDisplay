/**
 * @file ecosystem.config.js
 * @description
 * PM2 프로세스 관리 설정 파일
 * Windows 환경에서 Next.js 서버를 실행합니다.
 *
 * 초보자 가이드:
 * - 시작: pm2 start ecosystem.config.js
 * - 재시작: pm2 restart mes-display
 * - 중지: pm2 stop mes-display
 * - 로그: pm2 logs mes-display
 *
 * 주의: Oracle Instant Client가 시스템 PATH에 포함되어 있어야 합니다.
 */
module.exports = {
  apps: [
    {
      name: "mes-display",
      // Windows에서는 next를 직접 실행
      script: "node_modules/next/dist/bin/next",
      args: "start -H 0.0.0.0 -p 3100",
      cwd: "D:\\Project\\WebDisplay",
      env: {
        NODE_ENV: "production",
        PORT: 3100,
      },
      // 재시작 설정
      watch: false,
      max_memory_restart: "1G",
      // 로그 설정
      error_file: "D:\\Project\\WebDisplay\\logs\\error.log",
      out_file: "D:\\Project\\WebDisplay\\logs\\out.log",
      log_date_format: "YYYY-MM-DD HH:mm:ss",
      // 재시작 정책
      exp_backoff_restart_delay: 100,
      max_restarts: 10,
    },
  ],
};
