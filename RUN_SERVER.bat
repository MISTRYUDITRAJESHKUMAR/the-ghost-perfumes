@echo off
title The Ghost Store Server
cd /d "%~dp0"
echo.
echo ==============================================================
echo    THE GHOST STORE - Local Web Server
echo ==============================================================
echo.
powershell -ExecutionPolicy Bypass -File "%~dp0start-server.ps1"
pause
