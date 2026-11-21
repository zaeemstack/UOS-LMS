@echo off
title UOS Attendance Portal - 24/7 Background Service
echo ================================================================
echo    UNIVERSITY OF SAHIWAL - 24/7 BACKGROUND DAEMON LAUNCHER
echo ================================================================
echo.
echo Installing PM2 process manager (if not already installed)...
call npm install -g pm2 --silent

echo.
echo Starting UOS Portal in background...
cd /d "%~dp0"
call pm2 start src/server.js --name "uos-portal"
call pm2 save

echo.
echo ================================================================
echo [SUCCESS] Portal is now running in the background 24/7!
echo.
echo You can now SAFELY CLOSE this Remote Desktop (RDP) window.
echo Even if you close the laptop or disconnect RDP, the attendance
echo server will NEVER stop and teachers can use it continuously.
echo ================================================================
echo.
pause
