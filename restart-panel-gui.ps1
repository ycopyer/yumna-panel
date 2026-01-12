# Yumna Panel - Restart Panel GUI
# This script will restart the frontend GUI properly

Write-Host "Restarting Yumna Panel GUI..." -ForegroundColor Cyan
Write-Host ""

# Step 1: Kill any existing node processes on port 5173
Write-Host "Step 1: Stopping existing Panel processes..." -ForegroundColor Yellow

# Find process using port 5173
$port5173 = netstat -ano | findstr ":5173"
if ($port5173) {
    $pid = ($port5173 -split '\s+')[-1]
    if ($pid) {
        Write-Host "   Killing process on port 5173 (PID: $pid)" -ForegroundColor Red
        Stop-Process -Id $pid -Force -ErrorAction SilentlyContinue
        Start-Sleep -Seconds 2
    }
}

# Step 2: Navigate to panel directory
Write-Host "Step 2: Navigating to panel directory..." -ForegroundColor Yellow
Set-Location -Path "c:\YumnaPanel\panel"

# Step 3: Check if node_modules exists
if (-not (Test-Path "node_modules")) {
    Write-Host "Installing dependencies..." -ForegroundColor Magenta
    npm install
}

# Step 4: Start the Panel GUI
Write-Host "Step 3: Starting Panel GUI on port 5173..." -ForegroundColor Yellow
Write-Host ""
Write-Host "Panel GUI will be available at:" -ForegroundColor Green
Write-Host "   http://localhost:5173" -ForegroundColor Cyan
Write-Host ""
Write-Host "Press Ctrl+C to stop the server" -ForegroundColor Gray
Write-Host ""

# Start Vite dev server
npm run dev
