@echo off
set PORT=5000
echo [YUMNA-SERVICE] Checking for processes on port %PORT%...

for /f "tokens=5" %%a in ('netstat -aon ^| findstr :%PORT%') do (
    echo [YUMNA-SERVICE] Killing zombie process PID: %%a
    taskkill /f /pid %%a >nul 2>&1
)

echo [YUMNA-SERVICE] Restarting Yumna Panel Server...
cd /d "%~dp0"
npm start
