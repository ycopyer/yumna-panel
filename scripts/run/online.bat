@echo off
title Yumna Panel v3.0 Installer
color 0A

echo ===================================================
echo      Yumna Panel v3.0 - Windows Installer
echo ===================================================
echo.
echo Launching Universal PowerShell Installer...
echo.

:: Check Admin
net session >nul 2>&1
if %errorLevel% == 0 (
    echo [Admin Access Confirmed]
) else (
    echo [Error] Please Run as Administrator!
    pause
    exit
)

:: Execute PowerShell Script
:: Assumes the ps1 script is located at ../deploy/deploy_v3.ps1 relative to this bat
pushd "%~dp0"
cd ..\deploy
powershell -ExecutionPolicy Bypass -File .\deploy_v3.ps1
popd

pause
