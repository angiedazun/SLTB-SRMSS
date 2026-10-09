@echo off
title SLTB Frontend - Port 5173
color 0B
cd /d "%~dp0frontend"
echo.
echo  ==========================================
echo   SLTB SRMSS Frontend (Vite Dev Server)
echo  ==========================================
echo   URL: http://localhost:5173
echo   Press Ctrl+C to stop
echo  ==========================================
echo.
npm run dev
pause
