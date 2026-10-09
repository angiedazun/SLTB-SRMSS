@echo off
title SLTB Backend - Port 5000
color 0A
cd /d "%~dp0backend"
echo.
echo  ==========================================
echo   SLTB SRMSS Backend Server
echo  ==========================================
echo   URL: http://localhost:5000
echo   Press Ctrl+C to stop
echo  ==========================================
echo.
node server.js
pause
