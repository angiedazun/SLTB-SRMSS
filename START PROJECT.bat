@echo off
title SLTB SRMSS - Starting...
echo.
echo  ==========================================
echo   SLTB SRMSS System - Starting All Services
echo  ==========================================
echo.

:: Kill any existing node processes on these ports
echo  Stopping any existing servers...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":5000 "') do taskkill /PID %%a /F >nul 2>&1
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":5173 "') do taskkill /PID %%a /F >nul 2>&1
timeout /t 1 /nobreak >nul

:: Start backend in new window
echo  [1/2] Starting Backend (port 5000)...
start "SLTB Backend :5000" cmd /k "cd /d "%~dp0backend" && color 0A && echo Backend starting... && node server.js"

:: Wait for backend to start
timeout /t 3 /nobreak >nul

:: Start frontend in new window
echo  [2/2] Starting Frontend (port 5173)...
start "SLTB Frontend :5173" cmd /k "cd /d "%~dp0frontend" && color 0B && echo Frontend starting... && npm run dev"

:: Wait then open browser
timeout /t 5 /nobreak >nul
echo.
echo  ==========================================
echo   Both services started!
echo   Opening http://localhost:5173 ...
echo  ==========================================
echo.
start "" "http://localhost:5173"

echo  You can close this window. The two server
echo  windows must stay open while using the app.
echo.
pause
