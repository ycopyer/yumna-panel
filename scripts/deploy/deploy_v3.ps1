<#
.SYNOPSIS
    Yumna Panel v3.0 - Universal Windows Installer
.DESCRIPTION
    Automated deployment script for Yumna Panel on Windows.
    Supports Master, Worker, and WHM Only modes.
    Handles dependencies and environment configuration.
.AUTHOR
    Yumna Panel Team
#>

Write-Host "██╗   ██╗██╗   ██╗███╗   ███╗███╗   ██╗ █████╗ " -ForegroundColor Blue
Write-Host "╚██╗ ██╔╝██║   ██║████╗ ████║████╗  ██║██╔══██╗" -ForegroundColor Blue
Write-Host " ╚████╔╝ ██║   ██║██╔████╔██║██╔██╗ ██║███████║" -ForegroundColor Blue
Write-Host "  ╚██╔╝  ██║   ██║██║╚██╔╝██║██║╚██╗██║██╔══██║" -ForegroundColor Blue
Write-Host "   ██║   ╚██████╔╝██║ ╚═╝ ██║██║ ╚████║██║  ██║" -ForegroundColor Blue
Write-Host "   ╚═╝    ╚═════╝ ╚═╝     ╚═╝╚═╝  ╚═══╝╚═╝  ╚═╝" -ForegroundColor Blue
Write-Host ""
Write-Host "Yumna Panel v3.0 - Windows Installer" -ForegroundColor Green
Write-Host "------------------------------------------------" -ForegroundColor White

# --- Check Administrator ---
$currentPrincipal = New-Object Security.Principal.WindowsPrincipal([Security.Principal.WindowsIdentity]::GetCurrent())
if (-not $currentPrincipal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
    Write-Host "[-] Please run this script as Administrator!" -ForegroundColor Red
    Write-Host "    Right-click > Run with PowerShell > Run as Administrator" -ForegroundColor Red
    exit
}

# --- Dependencies Check ---
Write-Host "[1/X] Checking Dependencies..." -ForegroundColor Cyan

# 1. Node.js
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Host "[-] Node.js not found. Installing via Winget..." -ForegroundColor Yellow
    winget install OpenJS.NodeJS.LTS
    if (-not $?) {
        Write-Host "[-] Automated install failed. Please install Node.js manually from nodejs.org" -ForegroundColor Red
        exit
    }
    Write-Host "[+] Node.js installed. Please restart installing script to reload PATH." -ForegroundColor Green
    exit
}
else {
    Write-Host "[+] Node.js detected: $(node -v)" -ForegroundColor Green
}

# 2. Git
if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
    Write-Host "[-] Git not found. Installing via Winget..." -ForegroundColor Yellow
    winget install Git.Git
    if (-not $?) {
        Write-Host "[-] Automated install failed. Please install Git manually." -ForegroundColor Red
        exit
    }
    exit
}
else {
    Write-Host "[+] Git detected: $(git --version)" -ForegroundColor Green
}

# --- Mode Selection ---
Write-Host ""
Write-Host "Select Installation Mode:" -ForegroundColor Yellow
Write-Host "1) Full Control Panel (Master Node + Agent)"
Write-Host "2) Worker Node Only (Agent)"
Write-Host "3) WHM Core Only (API)"
$installMode = Read-Host "Enter Choice [1-3] (Default: 1)"
if ([string]::IsNullOrWhiteSpace($installMode)) { $installMode = "1" }

# --- Directory Setup ---
$installDir = "C:\YumnaPanel"
if (Test-Path $installDir) {
    Write-Host "[!] $installDir exists. Updating..." -ForegroundColor Yellow
    Set-Location $installDir
    git pull
}
else {
    Write-Host "[+] Cloning to $installDir..." -ForegroundColor Cyan
    git clone https://github.com/ycopyer/yumna-panel.git $installDir
    Set-Location $installDir
}

# --- Random Helpers ---
function Get-RandomHex($length) {
    $bytes = New-Object Byte[] ($length / 2)
    (New-Object Security.Cryptography.RNGCryptoServiceProvider).GetBytes($bytes)
    return [BitConverter]::ToString($bytes).Replace("-", "").ToLower()
}

# --- MASTER CONFIG ---
if ($installMode -eq "1" -or $installMode -eq "3") {
    Write-Host "=== MASTER SETUP ===" -ForegroundColor Blue
    Set-Location "$installDir\whm"
    
    if (-not (Test-Path .env)) {
        if (Test-Path .env.example) { Copy-Item .env.example .env }
        else { 
            "NODE_ENV=production`nPORT=4000" | Out-File .env -Encoding utf8 
        }
        
        # Secrets
        $s1 = Get-RandomHex 64
        $s2 = Get-RandomHex 64
        (Get-Content .env) -replace 'change_this_to_a_secure_random_string_v3', $s1 | Set-Content .env
        (Get-Content .env) -replace 'change_this_shared_secret_for_nodes', $s2 | Set-Content .env
        (Get-Content .env) -replace '^AGENT_SECRET=.*', "AGENT_SECRET=$s2" | Set-Content .env
    }
    
    # Get Current Secret
    $envContent = Get-Content .env
    $agentSecretLine = $envContent | Where-Object { $_ -match "^AGENT_SECRET=" }
    $CURRENT_AGENT_SECRET = $agentSecretLine -replace "AGENT_SECRET=", ""

    Write-Host "[*] Installing WHM Dependencies..." -ForegroundColor Cyan
    npm install --production

    if ($installMode -eq "1") {
        Set-Location "$installDir\panel"
        Write-Host "[*] Building Panel Frontend..." -ForegroundColor Cyan
        npm install
        npm run build
    }
}

# --- AGENT CONFIG ---
if ($installMode -ne "3") {
    Write-Host "=== AGENT SETUP ===" -ForegroundColor Blue
    Set-Location "$installDir\agent"
    
    $whmUrl = "http://localhost:4000"
    if ($installMode -eq "2") {
        $inputUrl = Read-Host "Enter WHM Master URL (e.g. http://panel.domain.com:4000)"
        if (-not [string]::IsNullOrWhiteSpace($inputUrl)) { $whmUrl = $inputUrl }
    }

    if (-not (Test-Path .env)) {
        if (Test-Path .env.example) { Copy-Item .env.example .env }
        else { "NODE_ENV=production`nPORT=3000" | Out-File .env -Encoding utf8 }
        
        $secret = $CURRENT_AGENT_SECRET
        if ([string]::IsNullOrWhiteSpace($secret)) { $secret = "change_me" }
        
        if ($installMode -eq "2") {
            $inputSecret = Read-Host "Enter Agent Secret (from Master)"
            if (-not [string]::IsNullOrWhiteSpace($inputSecret)) { $secret = $inputSecret }
        }

        # Update Config
        (Get-Content .env) -replace 'WHM_URL=.*', "WHM_URL=$whmUrl" | Set-Content .env
        (Get-Content .env) -replace 'change_this_shared_secret_for_nodes', $secret | Set-Content .env
        (Get-Content .env) -replace '^AGENT_SECRET=.*', "AGENT_SECRET=$secret" | Set-Content .env
        
        # Web Stack (Windows Default: IIS/Apache usually manual, assume Nginx/Apache via XAMPP)
        # We just set to 'custom' or 'apache' for Win
        Add-Content .env "`nWEB_SERVER_STACK=custom"
    }

    Write-Host "[*] Installing Agent Dependencies..." -ForegroundColor Cyan
    npm install --production
}

# --- FINISHING ---
Write-Host ""
Write-Host "=====================================" -ForegroundColor Green
Write-Host "    INSTALLATION COMPLETE! 🎊       " -ForegroundColor Green
Write-Host "=====================================" -ForegroundColor Green
Write-Host "Path: $installDir"
Write-Host "To Start:"
Write-Host "1. cd $installDir\whm && npm start (for Master)"
Write-Host "2. cd $installDir\agent && npm start (for Agent)"
Write-Host ""
Write-Host "NOTE: For persistent background service on Windows, we recommend installing PM2:"
Write-Host "npm install -g pm2"
Write-Host "pm2 start $installDir\whm\src\index.js --name yumna-whm"
Write-Host "pm2 start $installDir\agent\src\index.js --name yumna-agent"
Write-Host "pm2 save && pm2-startup install"
Write-Host ""
Pause
