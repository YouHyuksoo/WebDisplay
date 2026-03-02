@echo off
chcp 65001 >nul
setlocal EnableDelayedExpansion

:: ============================================================================
:: @file scripts/server-manager.bat
:: @description
:: MES Display Server Management Script
:: PM2 and GitHub Actions Self-hosted Runner install/manage tool
::
:: Guide:
:: This script manages MES Display on the deployment server.
:: PM2 (process manager) and GitHub Runner (auto deploy) install/manage.
:: Oracle Instant Client must be in system PATH for DB connection.
::
:: Usage: Run server-manager.bat and select menu option
:: ============================================================================

set "PROJECT_PATH=C:\Project\WebDisplay"
set "RUNNER_PATH=D:\Project\action-runner-display"
set "RUNNER_VERSION=2.321.0"
set "PM2_APP_NAME=mes-display"
set "APP_PORT=3100"

:MAIN_MENU
cls
echo.
echo  +===============================================================+
echo  :           MES Display Server Manager v1.0                     :
echo  +===============================================================+
echo  :                                                               :
echo  :   [1] PM2 Setup         - Install PM2 and register service   :
echo  :   [2] PM2 Manage        - Start / Stop / Restart             :
echo  :   [3] Runner Setup      - Install GitHub Self-hosted Runner  :
echo  :   [4] Runner Manage     - Runner service management          :
echo  :   [5] Full Deploy       - Full deploy (pull/build/restart)   :
echo  :   [6] View Logs         - View logs                          :
echo  :   [7] Status Check      - Check all status                   :
echo  :   [8] Kill Port         - Force kill port process            :
echo  :                                                               :
echo  :   [0] Exit                                                    :
echo  :                                                               :
echo  +===============================================================+
echo.
set /p choice="  Select: "

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
:: PM2 Setup Menu
:: ============================================================================
:PM2_SETUP_MENU
cls
echo.
echo  +===============================================================+
echo  :                    PM2 Setup Menu                             :
echo  +===============================================================+
echo  :                                                               :
echo  :   [1] Install PM2 globally                                    :
echo  :   [2] Install PM2 Windows Startup                             :
echo  :   [3] Check ecosystem.config.js                               :
echo  :   [4] Create logs folder                                      :
echo  :   [5] Register PM2 app and save                               :
echo  :   [A] Auto setup all (1-2, 4-5)                               :
echo  :                                                               :
echo  :   [0] Back to main menu                                       :
echo  :                                                               :
echo  +===============================================================+
echo.
set /p choice="  Select: "

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
echo  [INFO] Installing PM2 globally...
call npm install -g pm2
echo.
echo  [DONE] PM2 installed!
pause
goto PM2_SETUP_MENU

:PM2_STARTUP
echo.
echo  [INFO] Installing PM2 Windows Startup...
call npm install -g pm2-windows-startup
call pm2-startup install
echo.
echo  [DONE] PM2 Startup installed!
pause
goto PM2_SETUP_MENU

:PM2_CHECK_ECOSYSTEM
echo.
echo  [INFO] ecosystem.config.js:
echo  ---------------------------------------------------------------
if exist "%PROJECT_PATH%\ecosystem.config.js" (
  type "%PROJECT_PATH%\ecosystem.config.js"
) else (
  echo  [WARN] ecosystem.config.js not found!
  echo  [HINT] Place ecosystem.config.js in the project root first.
)
echo.
echo  ---------------------------------------------------------------
pause
goto PM2_SETUP_MENU

:PM2_CREATE_LOGS
echo.
echo  [INFO] Creating logs folder...
if not exist "%PROJECT_PATH%\logs" mkdir "%PROJECT_PATH%\logs"
echo.
echo  [DONE] Logs folder created!
pause
goto PM2_SETUP_MENU

:PM2_REGISTER_APP
echo.
echo  [INFO] Registering PM2 app...
cd /d "%PROJECT_PATH%"
call pm2 start ecosystem.config.js
call pm2 save
echo.
echo  [DONE] PM2 app registered and saved!
pause
goto PM2_SETUP_MENU

:PM2_AUTO_SETUP
echo.
echo  ============================================================
echo  [AUTO] PM2 Full Auto Setup
echo  ============================================================
echo.
echo  [1/4] Installing PM2 globally...
call npm install -g pm2
echo.
echo  [2/4] Installing PM2 Windows Startup...
call npm install -g pm2-windows-startup
call pm2-startup install
echo.
echo  [3/4] Creating logs folder...
if not exist "%PROJECT_PATH%\logs" mkdir "%PROJECT_PATH%\logs"
echo.
echo  [4/4] Registering PM2 app and saving...
cd /d "%PROJECT_PATH%"
call pm2 start ecosystem.config.js
call pm2 save
echo.
echo  ============================================================
echo  [DONE] PM2 Full Auto Setup Complete!
echo  ============================================================
pause
goto PM2_SETUP_MENU

:: ============================================================================
:: PM2 Manage Menu
:: ============================================================================
:PM2_MANAGE_MENU
cls
echo.
echo  +===============================================================+
echo  :                    PM2 Manage Menu                            :
echo  +===============================================================+
echo  :                                                               :
echo  :   [1] Status            (pm2 status)                          :
echo  :   [2] Start app         (pm2 start)                           :
echo  :   [3] Stop app          (pm2 stop)                            :
echo  :   [4] Restart app       (pm2 restart)                         :
echo  :   [5] Reload app        (pm2 reload - zero downtime)          :
echo  :   [6] Delete app        (pm2 delete)                          :
echo  :   [7] Stop all          (pm2 stop all)                        :
echo  :   [8] Save state        (pm2 save)                            :
echo  :   [9] Monitor           (pm2 monit)                           :
echo  :                                                               :
echo  :   [0] Back to main menu                                       :
echo  :                                                               :
echo  +===============================================================+
echo.
set /p choice="  Select: "

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
:: Runner Setup Menu
:: ============================================================================
:RUNNER_SETUP_MENU
cls
echo.
echo  +===============================================================+
echo  :               GitHub Runner Setup Menu                        :
echo  +===============================================================+
echo  :                                                               :
echo  :   [1] Create Runner folder                                    :
echo  :   [2] Download Runner                                         :
echo  :   [3] Extract Runner                                          :
echo  :   [4] Configure Runner (config.cmd)                           :
echo  :                                                               :
echo  :   [0] Back to main menu                                       :
echo  :                                                               :
echo  +===============================================================+
echo.
echo  [NOTE] Get your token first from:
echo         GitHub Repo - Settings - Actions - Runners - New self-hosted runner
echo.
set /p choice="  Select: "

if "%choice%"=="1" goto RUNNER_CREATE_FOLDER
if "%choice%"=="2" goto RUNNER_DOWNLOAD
if "%choice%"=="3" goto RUNNER_EXTRACT
if "%choice%"=="4" goto RUNNER_CONFIG
if "%choice%"=="0" goto MAIN_MENU
goto RUNNER_SETUP_MENU

:RUNNER_CREATE_FOLDER
echo.
echo  [INFO] Creating Runner folder...
if not exist "%RUNNER_PATH%" mkdir "%RUNNER_PATH%"
echo.
echo  [DONE] %RUNNER_PATH% created!
pause
goto RUNNER_SETUP_MENU

:RUNNER_DOWNLOAD
echo.
echo  [INFO] Downloading GitHub Actions Runner v%RUNNER_VERSION%...
cd /d "%RUNNER_PATH%"
powershell -Command "Invoke-WebRequest -Uri 'https://github.com/actions/runner/releases/download/v%RUNNER_VERSION%/actions-runner-win-x64-%RUNNER_VERSION%.zip' -OutFile 'actions-runner.zip'"
echo.
echo  [DONE] Download complete!
pause
goto RUNNER_SETUP_MENU

:RUNNER_EXTRACT
echo.
echo  [INFO] Extracting...
cd /d "%RUNNER_PATH%"
powershell -Command "Expand-Archive -Path 'actions-runner.zip' -DestinationPath '.' -Force"
echo.
echo  [DONE] Extraction complete!
pause
goto RUNNER_SETUP_MENU

:RUNNER_CONFIG
echo.
echo  ============================================================
echo  [INFO] Starting Runner configuration.
echo  ============================================================
echo.
echo  Enter the URL and token from GitHub.
echo  (Repository - Settings - Actions - Runners - New self-hosted runner)
echo.
cd /d "%RUNNER_PATH%"
call config.cmd
echo.
echo  [DONE] Configuration complete!
pause
goto RUNNER_SETUP_MENU

:: ============================================================================
:: Runner Manage Menu
:: ============================================================================
:RUNNER_MANAGE_MENU
cls
echo.
echo  +===============================================================+
echo  :               GitHub Runner Manage Menu                       :
echo  +===============================================================+
echo  :                                                               :
echo  :   [1] Install service    (svc.cmd install)                    :
echo  :   [2] Start service      (svc.cmd start)                     :
echo  :   [3] Stop service       (svc.cmd stop)                      :
echo  :   [4] Uninstall service  (svc.cmd uninstall)                 :
echo  :   [5] Check service status                                    :
echo  :   [6] Run manually       (run.cmd - for testing)             :
echo  :                                                               :
echo  :   [0] Back to main menu                                       :
echo  :                                                               :
echo  +===============================================================+
echo.
set /p choice="  Select: "

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
echo  [INFO] GitHub Actions Runner service status:
sc query actions.runner.* 2>nul || echo  [WARN] Runner service not found.
echo.
pause
goto RUNNER_MANAGE_MENU

:: ============================================================================
:: Full Deploy
:: ============================================================================
:FULL_DEPLOY
cls
echo.
echo  ============================================================
echo  [DEPLOY] MES Display Full Deploy
echo  ============================================================
echo.
cd /d "%PROJECT_PATH%"
echo  [1/4] Git Pull...
call git pull origin main
echo.
echo  [2/4] Installing dependencies...
call npm ci
echo.
echo  [3/4] Production build...
call npm run build
echo.
echo  [4/4] PM2 restart...
call pm2 restart %PM2_APP_NAME% || call pm2 start ecosystem.config.js
call pm2 save
echo.
echo  ============================================================
echo  [DONE] Deploy complete! (http://localhost:%APP_PORT%)
echo  ============================================================
pause
goto MAIN_MENU

:: ============================================================================
:: Log Menu
:: ============================================================================
:LOG_MENU
cls
echo.
echo  +===============================================================+
echo  :                      Log Viewer Menu                          :
echo  +===============================================================+
echo  :                                                               :
echo  :   [1] PM2 live logs      (pm2 logs)                          :
echo  :   [2] PM2 error log      (error.log)                         :
echo  :   [3] PM2 output log     (out.log)                           :
echo  :   [4] Flush PM2 logs     (pm2 flush)                         :
echo  :                                                               :
echo  :   [0] Back to main menu                                       :
echo  :                                                               :
echo  +===============================================================+
echo.
set /p choice="  Select: "

if "%choice%"=="1" (call pm2 logs %PM2_APP_NAME% & goto LOG_MENU)
if "%choice%"=="2" (type "%PROJECT_PATH%\logs\error.log" 2>nul || echo [WARN] Log file not found. & pause & goto LOG_MENU)
if "%choice%"=="3" (type "%PROJECT_PATH%\logs\out.log" 2>nul || echo [WARN] Log file not found. & pause & goto LOG_MENU)
if "%choice%"=="4" (call pm2 flush & echo [DONE] Logs flushed! & pause & goto LOG_MENU)
if "%choice%"=="0" goto MAIN_MENU
goto LOG_MENU

:: ============================================================================
:: Status Check
:: ============================================================================
:STATUS_CHECK
cls
echo.
echo  ============================================================
echo  [STATUS] MES Display Full Status Check
echo  ============================================================
echo.
echo  --- PM2 Status ---
call pm2 status
echo.
echo  --- Node.js Version ---
call node -v
echo.
echo  --- NPM Version ---
call npm -v
echo.
echo  --- Port %APP_PORT% Usage ---
netstat -ano | findstr :%APP_PORT%
echo.
echo  --- Oracle Instant Client ---
where oci.dll 2>nul && echo  [OK] Oracle Instant Client found || echo  [WARN] Oracle Instant Client not found in PATH
echo.
echo  --- GitHub Runner Service ---
sc query actions.runner.* 2>nul || echo  [WARN] Runner service not found.
echo.
echo  ============================================================
pause
goto MAIN_MENU

:: ============================================================================
:: Kill Port
:: ============================================================================
:KILL_PORT
echo.
echo  [INFO] Checking processes on port %APP_PORT%...
echo.
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :%APP_PORT% ^| findstr LISTENING') do (
  echo  [FOUND] PID: %%a
  set /p confirm="  Kill this process? (Y/N): "
  if /i "!confirm!"=="Y" (
    taskkill /PID %%a /F
    echo  [DONE] PID %%a killed!
  ) else (
    echo  [SKIP] Cancelled
  )
)
echo.
pause
goto MAIN_MENU

:: ============================================================================
:: Exit
:: ============================================================================
:EXIT
echo.
echo  Bye!
echo.
exit /b 0
