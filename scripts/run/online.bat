@echo off
title Yumna Panel v3.0 - Installer Launcher
color 1F
mode con: cols=80 lines=25

:HEADER
cls
echo.
echo  ==============================================================================
echo.
echo           __   __                                 _____                 _ 
echo           \ \ / /                                ^|  __ \               ^| ^|
echo            \ V / _   _ _ __ ___  _ __   __ _     ^| ^|__) ^|__ _ _ __   ___^| ^|
echo             ^> ^< ^| ^| ^| ^| '_ ` _ \^| '_ \ / _` ^|    ^|  ___/ _` ^| '_ \ / _ \ ^|
echo            / . \ ^| ^|_^| ^| ^| ^| ^| ^| ^| ^| ^| ^| (_^| ^|    ^| ^|  ^| (_^| ^| ^| ^| ^|  __/ ^|
echo           /_/ \_\ \__,_^|_^| ^|_^| ^|_^|_^| ^|_^|\__,_^|    ^|_^|   \__,_^|_^| ^|_^|\___^|_^|
echo.
echo  ==============================================================================
echo                Yumna Panel v3.0 - Universal Windows Installer
echo  ==============================================================================
echo.

:CHECK_ADMIN
echo  [*] Checking Administrator Privileges...
net session >nul 2>&1
if %errorLevel% == 0 (
    echo  [+] Admin Access Confirmed.
) else (
    color 4F
    echo.
    echo  [!] ERROR: Administrator privileges required!
    echo      Please right-click and select "Run as Administrator".
    echo.
    pause
    exit
)

echo.
echo  [*] preparing Installation Environment...
timeout /t 2 >nul

:LAUNCH
echo  [*] Launching PowerShell Installer Engine...
echo.
pushd "%~dp0"
cd ..\deploy
powershell -NoProfile -ExecutionPolicy Bypass -Command "& '.\deploy_v3.ps1'"
popd

echo.
echo  ==============================================================================
echo   Installer has finished. Press any key to exit.
echo  ==============================================================================
pause >nul

