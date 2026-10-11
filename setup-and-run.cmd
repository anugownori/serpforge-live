@echo off
setlocal
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Node.js 20.11 or newer is required. Install it from https://nodejs.org/
  pause
  exit /b 1
)
echo.
echo === SERPForge secure setup ===
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\configure-windows.ps1"
if errorlevel 1 goto :fail
echo.
echo === Verifying real SerpApi access ===
node scripts\check-serpapi.mjs
if errorlevel 1 goto :fail
echo.
echo === Installing dependencies ===
call npm install --no-audit --no-fund
if errorlevel 1 goto :fail
echo.
echo === Running automated tests ===
call npm test
if errorlevel 1 goto :fail
echo.
echo === Checking production build ===
call npm run build
if errorlevel 1 goto :fail
echo.
echo All checks passed. Open http://localhost:3000 after the server starts.
call npm run dev
exit /b %errorlevel%
:fail
echo.
echo Setup or verification FAILED. No deployment has occurred.
echo Read the error above and correct it before sharing SERPForge.
pause
exit /b 1
