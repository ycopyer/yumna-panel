# Yumna Panel - Add Server Helper
# PowerShell wrapper untuk add-server.js

param(
    [string]$WhmUrl = "http://localhost:4000",
    [string]$Token = ""
)

Write-Host ""
Write-Host "╔════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║   🌐 Yumna Panel - Multi-Server Integration Tool     ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

# Check if Node.js is installed
$nodeVersion = node --version 2>$null
if (-not $nodeVersion) {
    Write-Host "❌ Node.js tidak terinstall!" -ForegroundColor Red
    Write-Host "   Download dari: https://nodejs.org" -ForegroundColor Yellow
    exit 1
}

# Navigate to script directory
$scriptPath = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $scriptPath

# Run the Node.js script
node add-server.js

Write-Host ""
Write-Host "Press any key to exit..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
