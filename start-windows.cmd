@echo off
setlocal
where node >nul 2>&1 || (echo ERROR: Install Node.js 20 or later. & exit /b 1)
if not exist "node_modules\next" (
  echo Installing Next.js dependencies...
  call npm install || (echo ERROR: Dependency installation failed. & exit /b 1)
)
if not exist ".env.local" copy ".env.example" ".env.local" >nul
echo.
echo Configure SERPAPI_KEY in .env.local before starting a live scan.
echo Dashboard: http://localhost:3000
echo This app scans real public websites; it includes no sample website.
echo.
call npm run dev
