@echo off
title Bomba Predictions - Dev Server
cd /d "%~dp0"
echo Starting dev server on http://localhost:3000 ...
call npm run dev
pause