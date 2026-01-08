@echo off
SETLOCAL EnableDelayedExpansion

echo ====================================================
echo   YUMNA PANEL - WINDOWS PRODUCTION SETUP
echo ====================================================

:: 0. Handle STOP Command
if /i "%~1"=="stop" (
    taskkill /IM mysqld.exe /F >nul 2>nul
    taskkill /IM nginx.exe /F >nul 2>nul
    taskkill /IM httpd.exe /F >nul 2>nul
    cd /d "%PANEL_ROOT%\app"
    call pm2 delete yumna-panel >nul 2>nul
    call pm2 save >nul 2>nul
    exit /b
)

:: Ensure a clean environment by killing previous instances first
if "%HIDDEN_MODE%"=="Y" (
    taskkill /IM mysqld.exe /F >nul 2>nul
    taskkill /IM nginx.exe /F >nul 2>nul
    taskkill /IM httpd.exe /F >nul 2>nul
)

:: 1. Auto-Detect Existing Installations
set "PANEL_ROOT=C:\YumnaPanel"
set "NGINX_STATUS=(Not Installed)"
if exist "%PANEL_ROOT%\bin\web\nginx" set "NGINX_STATUS=(ALREADY INSTALLED)"
set "APACHE_STATUS=(Not Installed)"
if exist "%PANEL_ROOT%\bin\web\apache" set "APACHE_STATUS=(ALREADY INSTALLED)"
set "MARIA_STATUS=(Not Installed)"
if exist "%PANEL_ROOT%\bin\database\mariadb" set "MARIA_STATUS=(ALREADY INSTALLED)"
set "CLAM_STATUS=(Not Installed)"
if exist "%PANEL_ROOT%\bin\security\clamav" set "CLAM_STATUS=(ALREADY INSTALLED)"

:: Automatically skip if MariaDB and at least one web server is installed
set "AUTO_SKIP=N"
if "%MARIA_STATUS%"=="(ALREADY INSTALLED)" (
    if "%NGINX_STATUS%"=="(ALREADY INSTALLED)" set "AUTO_SKIP=Y"
    if "%APACHE_STATUS%"=="(ALREADY INSTALLED)" set "AUTO_SKIP=Y"
)

if "%AUTO_SKIP%"=="Y" (
    :: Start MariaDB
    taskkill /IM mysqld.exe /F >nul 2>nul
    start /B "" "%PANEL_ROOT%\bin\database\mariadb\bin\mysqld.exe" --datadir="%PANEL_ROOT%\data\mysql" >nul 2>&1
    
    :: Start PM2 Panel
    cd /d "%PANEL_ROOT%\app"
    call pm2 delete yumna-panel >nul 2>nul
    call pm2 start ecosystem.config.js --env production >nul 2>nul
    
    :: Start Web Server
    if exist "%PANEL_ROOT%\bin\web\nginx\nginx.exe" (
        taskkill /IM nginx.exe /F >nul 2>nul
        start /B "" /D "%PANEL_ROOT%\bin\web\nginx" "%PANEL_ROOT%\bin\web\nginx\nginx.exe" >nul 2>&1
    ) else if exist "%PANEL_ROOT%\bin\web\apache\bin\httpd.exe" (
        taskkill /IM httpd.exe /F >nul 2>nul
        start /B "" "%PANEL_ROOT%\bin\web\apache\bin\httpd.exe" >nul 2>&1
    )
    
    goto :FINISH_SETUP
)

:: 2. Initialize Managed Paths (Only if not skipping)
echo [INFO] Initializing managed binary environment...
if not exist "%PANEL_ROOT%" mkdir "%PANEL_ROOT%"
if not exist "%PANEL_ROOT%\bin\php" mkdir "%PANEL_ROOT%\bin\php"
if not exist "%PANEL_ROOT%\bin\web" mkdir "%PANEL_ROOT%\bin\web"
if not exist "%PANEL_ROOT%\bin\database" mkdir "%PANEL_ROOT%\bin\database"
if not exist "%PANEL_ROOT%\bin\security" mkdir "%PANEL_ROOT%\bin\security"
if not exist "%PANEL_ROOT%\etc\nginx\sites-enabled" mkdir "%PANEL_ROOT%\etc\nginx\sites-enabled"
if not exist "%PANEL_ROOT%\etc\apache2\sites-enabled" mkdir "%PANEL_ROOT%\etc\apache2\sites-enabled"
if not exist "%PANEL_ROOT%\app" mkdir "%PANEL_ROOT%\app"

:: 2.1 Copy Application Files to Managed Path (Excluding node_modules for speed)
echo [INFO] Migrating application core to %PANEL_ROOT%\app...
robocopy "client" "%PANEL_ROOT%\app\client" /E /XD node_modules dist /NFL /NDL /NJH /NJS /nc /ns /np >nul
robocopy "server" "%PANEL_ROOT%\app\server" /E /XD node_modules uploads data /NFL /NDL /NJH /NJS /nc /ns /np >nul
copy /y "ecosystem.config.js" "%PANEL_ROOT%\app\" >nul
copy /y "package.json" "%PANEL_ROOT%\app\" >nul
if exist "provision" robocopy "provision" "%PANEL_ROOT%\app\provision" /E /NFL /NDL /NJH /NJS /nc /ns /np >nul

:: 3. Detection Summary
echo.
echo [DETECTION RESULT]
echo - Nginx: %NGINX_STATUS%
echo - Apache: %APACHE_STATUS%
echo - MariaDB: %MARIA_STATUS%
echo - ClamAV: %CLAM_STATUS%
echo.

if "%QUICK_START%"=="" set "QUICK_START=Y"
if /i "%QUICK_START%"=="Y" (
    echo [INFO] Skipping installation steps...
    if "%MARIA_STATUS%"=="(ALREADY INSTALLED)" set "DB_CHOICE=1"
    set "WS_CHOICE=3"
    set "SEC_CHOICE=2"
    
    set /p SKIP_BUILD="Skip Frontend/Backend build? (Faster start) [Y/N] (Default: Y): "
    if "%SKIP_BUILD%"=="" set "SKIP_BUILD=Y"
    
    goto :START_SERVICES
)

:: 3. Menu Choices (Mirroring Linux deploy.sh)
echo.
echo [WEB SERVER SELECTION]
echo 1) Nginx %NGINX_STATUS%
echo 2) Apache HTTP Server %APACHE_STATUS%
echo 3) Skip Web Server Installation
set /p WS_CHOICE="Select Option [1-3]: "

echo.
echo [DATABASE SELECTION]
echo 1) Install/Update MariaDB %MARIA_STATUS%
echo 2) Skip Database Installation
set /p DB_CHOICE="Select Option [1-2]: "

echo.
echo [SECURITY SELECTION]
echo 1) Install/Update ClamAV %CLAM_STATUS%
echo 2) Skip Security Installation
set /p SEC_CHOICE="Select Option [1-2]: "

set "USER_AGENT=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"

:: 3. Provision Web Server
if "%WS_CHOICE%"=="1" (
    if not exist "%PANEL_ROOT%\bin\web\nginx" (
        echo [INFO] Provisioning Nginx Native...
        set "NGINX_URL=https://nginx.org/download/nginx-1.26.2.zip"
        set "ZIP_FILE=%PANEL_ROOT%\bin\web\nginx.zip"
        curl -L -A "%USER_AGENT%" -o "!ZIP_FILE!" "!NGINX_URL!" --fail
        if !ERRORLEVEL! EQU 0 (
            powershell -Command "Add-Type -AssemblyName System.IO.Compression.FileSystem; [System.IO.Compression.ZipFile]::ExtractToDirectory('!ZIP_FILE!', '%PANEL_ROOT%\bin\web\tmp')"
            move "%PANEL_ROOT%\bin\web\tmp\nginx*" "%PANEL_ROOT%\bin\web\nginx"
            rd /s /q "%PANEL_ROOT%\bin\web\tmp"
            del "!ZIP_FILE!"
            echo [INFO] Syncing Nginx base configuration...
            copy /y /b "provision\nginx\nginx.conf" "%PANEL_ROOT%\bin\web\nginx\conf\nginx.conf"
            echo [SUCCESS] Nginx deployed to %PANEL_ROOT%\bin\web\nginx
        )
    ) else (
        echo [INFO] Nginx already present.
    )
)

if "%WS_CHOICE%"=="2" (
    if not exist "%PANEL_ROOT%\bin\web\apache" (
        echo [INFO] Provisioning Apache Native...
        :: URL from ApacheLounge (Stable VS17 x64)
        set "APACHE_URL=https://www.apachelounge.com/download/VS17/binaries/httpd-2.4.63-241219-win64-VS17.zip"
        set "ZIP_FILE=%PANEL_ROOT%\bin\web\apache.zip"
        curl -L -A "%USER_AGENT%" -o "!ZIP_FILE!" "!APACHE_URL!" --fail
        if !ERRORLEVEL! EQU 0 (
            powershell -Command "Add-Type -AssemblyName System.IO.Compression.FileSystem; [System.IO.Compression.ZipFile]::ExtractToDirectory('!ZIP_FILE!', '%PANEL_ROOT%\bin\web\tmp')"
            move "%PANEL_ROOT%\bin\web\tmp\Apache24" "%PANEL_ROOT%\bin\web\apache"
            rd /s /q "%PANEL_ROOT%\bin\web\tmp"
            del "!ZIP_FILE!"
            echo [INFO] Syncing Apache base configuration...
            copy /y /b "provision\apache\httpd.conf" "%PANEL_ROOT%\bin\web\apache\conf\httpd.conf"
            echo [SUCCESS] Apache deployed to %PANEL_ROOT%\bin\web\apache
        )
    ) else (
        echo [INFO] Apache already present.
    )
)

:: 4. Provision ClamAV
if "%SEC_CHOICE%"=="1" (
    if not exist "%PANEL_ROOT%\bin\security\clamav" (
        echo [INFO] Provisioning ClamAV Native...
        set "CLAM_URL=https://www.clamav.net/downloads/production/ClamAV-1.4.1.win.x64.zip"
        set "ZIP_FILE=%PANEL_ROOT%\bin\security\clamav.zip"
        curl -L -A "%USER_AGENT%" -o "!ZIP_FILE!" "!CLAM_URL!" --fail
        if !ERRORLEVEL! EQU 0 (
            powershell -Command "Add-Type -AssemblyName System.IO.Compression.FileSystem; [System.IO.Compression.ZipFile]::ExtractToDirectory('!ZIP_FILE!', '%PANEL_ROOT%\bin\security\clamav')"
            del "!ZIP_FILE!"
            echo [SUCCESS] ClamAV deployed to %PANEL_ROOT%\bin\security\clamav
        )
    ) else (
        echo [INFO] ClamAV already present.
    )

    :: 4.1 Provision Win-ACME (SSL)
    if not exist "%PANEL_ROOT%\bin\security\acme" (
        echo [INFO] Provisioning Win-ACME SSL Client...
        set "ACME_URL=https://github.com/win-acme/win-acme/releases/download/v2.2.8.1635/win-acme.v2.2.8.1635.x64.pluggable.zip"
        set "ZIP_FILE=%PANEL_ROOT%\bin\security\acme.zip"
        curl -L -A "%USER_AGENT%" -o "!ZIP_FILE!" "!ACME_URL!" --fail
        if !ERRORLEVEL! EQU 0 (
             powershell -Command "Add-Type -AssemblyName System.IO.Compression.FileSystem; [System.IO.Compression.ZipFile]::ExtractToDirectory('!ZIP_FILE!', '%PANEL_ROOT%\bin\security\acme')"
             del "!ZIP_FILE!"
             echo [SUCCESS] Win-ACME deployed to %PANEL_ROOT%\bin\security\acme
        )
    ) else (
        echo [INFO] Win-ACME already present.
    )
    ) else (
        echo [INFO] ClamAV already present.
    )
)

:: 5. Provision MariaDB
if "%DB_CHOICE%"=="1" (
    if not exist "%PANEL_ROOT%\bin\database\mariadb" (
        echo [INFO] Provisioning MariaDB Native...
        set "MARIA_URL=https://archive.mariadb.org/mariadb-11.4.2/winx64-packages/mariadb-11.4.2-winx64.zip"
        set "ZIP_FILE=%PANEL_ROOT%\bin\database\mariadb.zip"
        curl -L -A "%USER_AGENT%" -o "!ZIP_FILE!" "!MARIA_URL!" --fail
        if !ERRORLEVEL! EQU 0 (
            powershell -Command "Add-Type -AssemblyName System.IO.Compression.FileSystem; [System.IO.Compression.ZipFile]::ExtractToDirectory('!ZIP_FILE!', '%PANEL_ROOT%\bin\database\tmp')"
            move "%PANEL_ROOT%\bin\database\tmp\mariadb*" "%PANEL_ROOT%\bin\database\mariadb"
            rd /s /q "%PANEL_ROOT%\bin\database\tmp"
            del "!ZIP_FILE!"
            echo [SUCCESS] MariaDB deployed to %PANEL_ROOT%\bin\database\mariadb
            
            :: Initialize Data Dir if not present
            if not exist "%PANEL_ROOT%\data\mysql" (
                mkdir "%PANEL_ROOT%\data\mysql"
                echo [INFO] Initializing MariaDB Data Directory...
                "%PANEL_ROOT%\bin\database\mariadb\bin\mysql_install_db.exe" --datadir="%PANEL_ROOT%\data\mysql"
            )
        )
    ) else (
        echo [INFO] MariaDB already present.
    )
)

:START_SERVICES
:: 6. Auto-start Native Services for Standalone Mode
if "%DB_CHOICE%"=="1" (
    if not "%HIDDEN_MODE%"=="Y" echo [INFO] Restarting MariaDB Native Service...
    taskkill /IM mysqld.exe /F >nul 2>nul
    start /B "" "%PANEL_ROOT%\bin\database\mariadb\bin\mysqld.exe" --datadir="%PANEL_ROOT%\data\mysql" >nul 2>&1
    timeout /t 5 /nobreak >nul
)

:: 7. Check for PM2
where pm2 >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [INFO] PM2 not found. Installing globally...
    call npm install pm2 -g
)

:: 6. Build Frontend
if /i "%SKIP_BUILD%"=="Y" (
    echo [INFO] Skipping builds...
    goto :PREPARE_BACKEND
)

echo [1/4] Building Frontend Assets...
cd /d "%PANEL_ROOT%\app\client"
call npm install
call npm run build
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Frontend build failed!
    pause
    exit /b %ERRORLEVEL%
)

:PREPARE_BACKEND
:: 7. Prepare Backend
echo [2/4] Preparing Backend Server...
cd /d "%PANEL_ROOT%\app\server"
if /i "%SKIP_BUILD%"=="N" call npm install

:: 8. Start with PM2
echo [3/4] Starting Yumna Panel with PM2...
cd /d "%PANEL_ROOT%\app"
call pm2 delete yumna-panel >nul 2>nul
call pm2 start ecosystem.config.js --env production
call pm2 save

:: 9. Start Web Server if provisioned
if exist "%PANEL_ROOT%\bin\web\nginx\nginx.exe" (
    if not "%HIDDEN_MODE%"=="Y" echo [4/4] Starting Nginx...
    taskkill /IM nginx.exe /F >nul 2>nul
    start /B "" /D "%PANEL_ROOT%\bin\web\nginx" "%PANEL_ROOT%\bin\web\nginx\nginx.exe" >nul 2>&1
)

:FINISH_SETUP
if "%HIDDEN_MODE%"=="Y" (
    exit /b
) else (
    echo ====================================================
    echo   SUCCESS! YUMNA PANEL is now running.
    echo   Access it at http://your-ip-or-domain:5000
    echo   Use "pm2 logs" to see activity.
    echo   Use "pm2 status" to check status.
    echo ====================================================
    pause
)
