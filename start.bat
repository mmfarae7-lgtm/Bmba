@echo off
title Bomba Predictions - Production Server
cd /d "%~dp0"
echo Starting Bomba Predictions on http://localhost:3333 ...
echo Press Ctrl+C to stop.
call npm run build -- --webpack
if errorlevel 1 (
  echo Build failed!
  pause
  exit /b 1
)
call npx next start -p 3333
pause