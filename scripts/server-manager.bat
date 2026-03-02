@echo off
chcp 65001 >nul
setlocal EnableDelayedExpansion

:: ============================================================================
:: @file scripts/server-manager.bat
:: @description
:: MES Display 서버 관리 스크립트
:: PM2 및 GitHub Actions Self-hosted Runner 설치/관리 도구
::
:: 초보자 가이드:
:: 이 스크립트는 서버에서 MES Display를 운영하기 위한 도구입니다.
:: PM2(프로세스 관리자)와 GitHub Runner(자동 배포)를 설치/관리합니다.
:: Oracle Instant Client가 시스템 PATH에 포함되어 있어야 DB 연결이 됩니다.
::
:: 사용법: server-manager.bat 실행 후 메뉴 선택
:: ============================================================================

set "PROJECT_PATH=C:\Project\WebDisplay"
set "RUNNER_PATH=C:\actions-runner-display"
set "RUNNER_VERSION=2.321.0"
set "PM2_APP_NAME=mes-display"
set "APP_PORT=3100"

:MAIN_MENU
cls
echo.
echo  ╔═══════════════════════════════════════════════════════════════╗
echo  ║           MES Display Server Manager v1.0                     ║
echo  ╠═══════════════════════════════════════════════════════════════╣
echo  ║                                                               ║
echo  ║   [1] PM2 Setup         - PM2 설치 및 서비스 등록             ║
echo  ║   [2] PM2 Manage        - PM2 관리 (시작/중지/재시작)         ║
echo  ║   [3] Runner Setup      - GitHub Self-hosted Runner 설치      ║
echo  ║   [4] Runner Manage     - Runner 서비스 관리                  ║
echo  ║   [5] Full Deploy       - 전체 배포 (pull/build/restart)      ║
echo  ║   [6] View Logs         - 로그 보기                           ║
echo  ║   [7] Status Check      - 전체 상태 확인                      ║
echo  ║   [8] Kill Port         - 포트 강제 종료                      ║
echo  ║                                                               ║
echo  ║   [0] Exit              - 종료                                ║
echo  ║                                                               ║
echo  ╚═══════════════════════════════════════════════════════════════╝
echo.
set /p choice="  선택하세요: "

if "%choice%"=="1" goto PM2_SETUP_MENU
if "%choice%"=="2" goto PM2_MANAGE_MENU
if "%choice%"=="3" goto RUNNER_SETUP_MENU
if "%choice%"=="4" goto RUNNER_MANAGE_MENU
if "%choice%"=="5" goto FULL_DEPLOY
if "%choice%"=="6" goto LOG_MENU
if "%choice%"=="7" goto STATUS_CHECK
if "%choice%"=="8" goto KILL_PORT
if "%choice%"=="0" goto EXIT
goto MAIN_MENU

:: ============================================================================
:: PM2 설치 메뉴
:: ============================================================================
:PM2_SETUP_MENU
cls
echo.
echo  ╔═══════════════════════════════════════════════════════════════╗
echo  ║                    PM2 Setup Menu                             ║
echo  ╠═══════════════════════════════════════════════════════════════╣
echo  ║                                                               ║
echo  ║   [1] PM2 전역 설치                                           ║
echo  ║   [2] PM2 Windows Startup 설치                                ║
echo  ║   [3] ecosystem.config.js 확인                                ║
echo  ║   [4] logs 폴더 생성                                          ║
echo  ║   [5] PM2 앱 최초 등록 및 저장                                ║
echo  ║   [A] 전체 자동 설치 (1-2, 4-5 실행)                         ║
echo  ║                                                               ║
echo  ║   [0] 메인 메뉴로                                             ║
echo  ║                                                               ║
echo  ╚═══════════════════════════════════════════════════════════════╝
echo.
set /p choice="  선택하세요: "

if "%choice%"=="1" goto PM2_INSTALL
if "%choice%"=="2" goto PM2_STARTUP
if "%choice%"=="3" goto PM2_CHECK_ECOSYSTEM
if "%choice%"=="4" goto PM2_CREATE_LOGS
if "%choice%"=="5" goto PM2_REGISTER_APP
if /i "%choice%"=="A" goto PM2_AUTO_SETUP
if "%choice%"=="0" goto MAIN_MENU
goto PM2_SETUP_MENU

:PM2_INSTALL
echo.
echo  [INFO] PM2 전역 설치 중...
call npm install -g pm2
echo.
echo  [DONE] PM2 설치 완료!
pause
goto PM2_SETUP_MENU

:PM2_STARTUP
echo.
echo  [INFO] PM2 Windows Startup 설치 중...
call npm install -g pm2-windows-startup
call pm2-startup install
echo.
echo  [DONE] PM2 Startup 설치 완료!
pause
goto PM2_SETUP_MENU

:PM2_CHECK_ECOSYSTEM
echo.
echo  [INFO] ecosystem.config.js 확인:
echo  ---------------------------------------------------------------
if exist "%PROJECT_PATH%\ecosystem.config.js" (
  type "%PROJECT_PATH%\ecosystem.config.js"
) else (
  echo  [WARN] ecosystem.config.js 파일이 없습니다!
  echo  [HINT] 프로젝트 루트에 ecosystem.config.js를 먼저 배치하세요.
)
echo.
echo  ---------------------------------------------------------------
pause
goto PM2_SETUP_MENU

:PM2_CREATE_LOGS
echo.
echo  [INFO] logs 폴더 생성 중...
if not exist "%PROJECT_PATH%\logs" mkdir "%PROJECT_PATH%\logs"
echo.
echo  [DONE] logs 폴더 생성 완료!
pause
goto PM2_SETUP_MENU

:PM2_REGISTER_APP
echo.
echo  [INFO] PM2 앱 등록 중...
cd /d "%PROJECT_PATH%"
call pm2 start ecosystem.config.js
call pm2 save
echo.
echo  [DONE] PM2 앱 등록 및 저장 완료!
pause
goto PM2_SETUP_MENU

:PM2_AUTO_SETUP
echo.
echo  ============================================================
echo  [AUTO] PM2 전체 자동 설치 시작
echo  ============================================================
echo.
echo  [1/4] PM2 전역 설치...
call npm install -g pm2
echo.
echo  [2/4] PM2 Windows Startup 설치...
call npm install -g pm2-windows-startup
call pm2-startup install
echo.
echo  [3/4] logs 폴더 생성...
if not exist "%PROJECT_PATH%\logs" mkdir "%PROJECT_PATH%\logs"
echo.
echo  [4/4] PM2 앱 등록 및 저장...
cd /d "%PROJECT_PATH%"
call pm2 start ecosystem.config.js
call pm2 save
echo.
echo  ============================================================
echo  [DONE] PM2 전체 자동 설치 완료!
echo  ============================================================
pause
goto PM2_SETUP_MENU

:: ============================================================================
:: PM2 관리 메뉴
:: ============================================================================
:PM2_MANAGE_MENU
cls
echo.
echo  ╔═══════════════════════════════════════════════════════════════╗
echo  ║                    PM2 Manage Menu                            ║
echo  ╠═══════════════════════════════════════════════════════════════╣
echo  ║                                                               ║
echo  ║   [1] 상태 확인        (pm2 status)                           ║
echo  ║   [2] 앱 시작          (pm2 start)                            ║
echo  ║   [3] 앱 중지          (pm2 stop)                             ║
echo  ║   [4] 앱 재시작        (pm2 restart)                          ║
echo  ║   [5] 앱 리로드        (pm2 reload - 무중단)                  ║
echo  ║   [6] 앱 삭제          (pm2 delete)                           ║
echo  ║   [7] 전체 중지        (pm2 stop all)                         ║
echo  ║   [8] 상태 저장        (pm2 save)                             ║
echo  ║   [9] 모니터링         (pm2 monit)                            ║
echo  ║                                                               ║
echo  ║   [0] 메인 메뉴로                                             ║
echo  ║                                                               ║
echo  ╚═══════════════════════════════════════════════════════════════╝
echo.
set /p choice="  선택하세요: "

if "%choice%"=="1" (call pm2 status & pause & goto PM2_MANAGE_MENU)
if "%choice%"=="2" (call pm2 start %PM2_APP_NAME% & pause & goto PM2_MANAGE_MENU)
if "%choice%"=="3" (call pm2 stop %PM2_APP_NAME% & pause & goto PM2_MANAGE_MENU)
if "%choice%"=="4" (call pm2 restart %PM2_APP_NAME% & pause & goto PM2_MANAGE_MENU)
if "%choice%"=="5" (call pm2 reload %PM2_APP_NAME% & pause & goto PM2_MANAGE_MENU)
if "%choice%"=="6" (call pm2 delete %PM2_APP_NAME% & pause & goto PM2_MANAGE_MENU)
if "%choice%"=="7" (call pm2 stop all & pause & goto PM2_MANAGE_MENU)
if "%choice%"=="8" (call pm2 save & pause & goto PM2_MANAGE_MENU)
if "%choice%"=="9" (call pm2 monit & goto PM2_MANAGE_MENU)
if "%choice%"=="0" goto MAIN_MENU
goto PM2_MANAGE_MENU

:: ============================================================================
:: Runner 설치 메뉴
:: ============================================================================
:RUNNER_SETUP_MENU
cls
echo.
echo  ╔═══════════════════════════════════════════════════════════════╗
echo  ║               GitHub Runner Setup Menu                        ║
echo  ╠═══════════════════════════════════════════════════════════════╣
echo  ║                                                               ║
echo  ║   [1] Runner 폴더 생성                                        ║
echo  ║   [2] Runner 다운로드                                         ║
echo  ║   [3] Runner 압축 해제                                        ║
echo  ║   [4] Runner 설정 (config.cmd 실행)                           ║
echo  ║                                                               ║
echo  ║   [0] 메인 메뉴로                                             ║
echo  ║                                                               ║
echo  ╚═══════════════════════════════════════════════════════════════╝
echo.
echo  [NOTE] GitHub Repository - Settings - Actions - Runners 에서
echo         토큰을 먼저 확인하세요!
echo.
echo  [NOTE] 이미 wbsmaster용 Runner가 설치되어 있다면,
echo         같은 Runner를 공유하거나 별도 Runner를 설치할 수 있습니다.
echo.
set /p choice="  선택하세요: "

if "%choice%"=="1" goto RUNNER_CREATE_FOLDER
if "%choice%"=="2" goto RUNNER_DOWNLOAD
if "%choice%"=="3" goto RUNNER_EXTRACT
if "%choice%"=="4" goto RUNNER_CONFIG
if "%choice%"=="0" goto MAIN_MENU
goto RUNNER_SETUP_MENU

:RUNNER_CREATE_FOLDER
echo.
echo  [INFO] Runner 폴더 생성 중...
if not exist "%RUNNER_PATH%" mkdir "%RUNNER_PATH%"
echo.
echo  [DONE] %RUNNER_PATH% 폴더 생성 완료!
pause
goto RUNNER_SETUP_MENU

:RUNNER_DOWNLOAD
echo.
echo  [INFO] GitHub Actions Runner v%RUNNER_VERSION% 다운로드 중...
cd /d "%RUNNER_PATH%"
powershell -Command "Invoke-WebRequest -Uri 'https://github.com/actions/runner/releases/download/v%RUNNER_VERSION%/actions-runner-win-x64-%RUNNER_VERSION%.zip' -OutFile 'actions-runner.zip'"
echo.
echo  [DONE] 다운로드 완료!
pause
goto RUNNER_SETUP_MENU

:RUNNER_EXTRACT
echo.
echo  [INFO] 압축 해제 중...
cd /d "%RUNNER_PATH%"
powershell -Command "Expand-Archive -Path 'actions-runner.zip' -DestinationPath '.' -Force"
echo.
echo  [DONE] 압축 해제 완료!
pause
goto RUNNER_SETUP_MENU

:RUNNER_CONFIG
echo.
echo  ============================================================
echo  [INFO] Runner 설정을 시작합니다.
echo  ============================================================
echo.
echo  GitHub에서 제공하는 URL과 토큰을 입력하세요.
echo  (Repository - Settings - Actions - Runners - New self-hosted runner)
echo.
cd /d "%RUNNER_PATH%"
call config.cmd
echo.
echo  [DONE] 설정 완료!
pause
goto RUNNER_SETUP_MENU

:: ============================================================================
:: Runner 관리 메뉴
:: ============================================================================
:RUNNER_MANAGE_MENU
cls
echo.
echo  ╔═══════════════════════════════════════════════════════════════╗
echo  ║               GitHub Runner Manage Menu                       ║
echo  ╠═══════════════════════════════════════════════════════════════╣
echo  ║                                                               ║
echo  ║   [1] 서비스 설치       (svc.cmd install)                     ║
echo  ║   [2] 서비스 시작       (svc.cmd start)                       ║
echo  ║   [3] 서비스 중지       (svc.cmd stop)                        ║
echo  ║   [4] 서비스 제거       (svc.cmd uninstall)                   ║
echo  ║   [5] 서비스 상태 확인                                        ║
echo  ║   [6] Runner 수동 실행  (run.cmd - 테스트용)                  ║
echo  ║                                                               ║
echo  ║   [0] 메인 메뉴로                                             ║
echo  ║                                                               ║
echo  ╚═══════════════════════════════════════════════════════════════╝
echo.
set /p choice="  선택하세요: "

if "%choice%"=="1" (cd /d "%RUNNER_PATH%" & call svc.cmd install & pause & goto RUNNER_MANAGE_MENU)
if "%choice%"=="2" (cd /d "%RUNNER_PATH%" & call svc.cmd start & pause & goto RUNNER_MANAGE_MENU)
if "%choice%"=="3" (cd /d "%RUNNER_PATH%" & call svc.cmd stop & pause & goto RUNNER_MANAGE_MENU)
if "%choice%"=="4" (cd /d "%RUNNER_PATH%" & call svc.cmd uninstall & pause & goto RUNNER_MANAGE_MENU)
if "%choice%"=="5" goto RUNNER_STATUS
if "%choice%"=="6" (cd /d "%RUNNER_PATH%" & call run.cmd & goto RUNNER_MANAGE_MENU)
if "%choice%"=="0" goto MAIN_MENU
goto RUNNER_MANAGE_MENU

:RUNNER_STATUS
echo.
echo  [INFO] GitHub Actions Runner 서비스 상태:
sc query actions.runner.* 2>nul || echo  [WARN] Runner 서비스를 찾을 수 없습니다.
echo.
pause
goto RUNNER_MANAGE_MENU

:: ============================================================================
:: 전체 배포
:: ============================================================================
:FULL_DEPLOY
cls
echo.
echo  ============================================================
echo  [DEPLOY] MES Display 전체 배포 시작
echo  ============================================================
echo.
cd /d "%PROJECT_PATH%"
echo  [1/4] Git Pull...
call git pull origin main
echo.
echo  [2/4] 의존성 설치...
call npm ci
echo.
echo  [3/4] 프로덕션 빌드...
call npm run build
echo.
echo  [4/4] PM2 재시작...
call pm2 restart %PM2_APP_NAME% || call pm2 start ecosystem.config.js
call pm2 save
echo.
echo  ============================================================
echo  [DONE] 배포 완료! (http://localhost:%APP_PORT%)
echo  ============================================================
pause
goto MAIN_MENU

:: ============================================================================
:: 로그 메뉴
:: ============================================================================
:LOG_MENU
cls
echo.
echo  ╔═══════════════════════════════════════════════════════════════╗
echo  ║                      Log Viewer Menu                          ║
echo  ╠═══════════════════════════════════════════════════════════════╣
echo  ║                                                               ║
echo  ║   [1] PM2 실시간 로그   (pm2 logs)                            ║
echo  ║   [2] PM2 에러 로그     (error.log)                           ║
echo  ║   [3] PM2 출력 로그     (out.log)                             ║
echo  ║   [4] PM2 로그 비우기   (pm2 flush)                           ║
echo  ║                                                               ║
echo  ║   [0] 메인 메뉴로                                             ║
echo  ║                                                               ║
echo  ╚═══════════════════════════════════════════════════════════════╝
echo.
set /p choice="  선택하세요: "

if "%choice%"=="1" (call pm2 logs %PM2_APP_NAME% & goto LOG_MENU)
if "%choice%"=="2" (type "%PROJECT_PATH%\logs\error.log" 2>nul || echo [WARN] 로그 파일이 없습니다. & pause & goto LOG_MENU)
if "%choice%"=="3" (type "%PROJECT_PATH%\logs\out.log" 2>nul || echo [WARN] 로그 파일이 없습니다. & pause & goto LOG_MENU)
if "%choice%"=="4" (call pm2 flush & echo [DONE] 로그 비우기 완료! & pause & goto LOG_MENU)
if "%choice%"=="0" goto MAIN_MENU
goto LOG_MENU

:: ============================================================================
:: 상태 확인
:: ============================================================================
:STATUS_CHECK
cls
echo.
echo  ============================================================
echo  [STATUS] MES Display 전체 상태 확인
echo  ============================================================
echo.
echo  --- PM2 상태 ---
call pm2 status
echo.
echo  --- Node.js 버전 ---
call node -v
echo.
echo  --- NPM 버전 ---
call npm -v
echo.
echo  --- 포트 %APP_PORT% 사용 현황 ---
netstat -ano | findstr :%APP_PORT%
echo.
echo  --- Oracle Instant Client 확인 ---
where oci.dll 2>nul && echo  [OK] Oracle Instant Client 발견 || echo  [WARN] Oracle Instant Client를 PATH에서 찾을 수 없습니다
echo.
echo  --- GitHub Runner 서비스 ---
sc query actions.runner.* 2>nul || echo  [WARN] Runner 서비스를 찾을 수 없습니다.
echo.
echo  ============================================================
pause
goto MAIN_MENU

:: ============================================================================
:: 포트 강제 종료
:: ============================================================================
:KILL_PORT
echo.
echo  [INFO] 포트 %APP_PORT% 사용 프로세스 확인 중...
echo.
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :%APP_PORT% ^| findstr LISTENING') do (
  echo  [FOUND] PID: %%a
  set /p confirm="  이 프로세스를 종료하시겠습니까? (Y/N): "
  if /i "!confirm!"=="Y" (
    taskkill /PID %%a /F
    echo  [DONE] PID %%a 종료 완료!
  ) else (
    echo  [SKIP] 종료 취소됨
  )
)
echo.
pause
goto MAIN_MENU

:: ============================================================================
:: 종료
:: ============================================================================
:EXIT
echo.
echo  안녕히 가세요!
echo.
exit /b 0
