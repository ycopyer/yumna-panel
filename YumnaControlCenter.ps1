<#
.SYNOPSIS
    Yumna Control Center
.DESCRIPTION
    GUI Dashboard to manage Yumna Panel services (WHM/Agent) on Windows.
#>

Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing

# --- CONFIG ---
$BasePath = "C:\YumnaPanel"
$IconFile = "$BasePath\public\favicon.ico" # Try to find an icon
$WhmPath = "$BasePath\whm"
$AgentPath = "$BasePath\agent"

# --- FORM SETUP ---
$Form = New-Object System.Windows.Forms.Form
$Form.Text = "Yumna Control Center v3.0"
$Form.Size = New-Object System.Drawing.Size(500, 450)
$Form.StartPosition = "CenterScreen"
$Form.BackColor = [System.Drawing.Color]::FromArgb(240, 240, 240)
$Form.FormBorderStyle = "FixedSingle"
$Form.MaximizeBox = $false

# --- HEADER ---
$Title = New-Object System.Windows.Forms.Label
$Title.Text = "Yumna Panel"
$Title.Font = New-Object System.Drawing.Font("Segoe UI", 18, [System.Drawing.FontStyle]::Bold)
$Title.Location = New-Object System.Drawing.Point(20, 20)
$Title.Size = New-Object System.Drawing.Size(300, 40)
$Form.Controls.Add($Title)

$SubTitle = New-Object System.Windows.Forms.Label
$SubTitle.Text = "Universal Control Plane"
$SubTitle.Font = New-Object System.Drawing.Font("Segoe UI", 10)
$SubTitle.ForeColor = [System.Drawing.Color]::Gray
$SubTitle.Location = New-Object System.Drawing.Point(22, 55)
$SubTitle.Size = New-Object System.Drawing.Size(300, 20)
$Form.Controls.Add($SubTitle)

# --- STATUS INDICATORS ---
function Create-StatusLight($y) {
    $p = New-Object System.Windows.Forms.Panel
    $p.Location = New-Object System.Drawing.Point(300, $y)
    $p.Size = New-Object System.Drawing.Size(15, 15)
    $p.BackColor = [System.Drawing.Color]::Red # Default Off
    $p.BorderStyle = "FixedSingle"
    return $p
}

$WhmStatus = Create-StatusLight 115
$Form.Controls.Add($WhmStatus)

$AgentStatus = Create-StatusLight 175
$Form.Controls.Add($AgentStatus)

# --- BUTTONS ---
function Create-Btn($text, $x, $y, $w, $handler) {
    $btn = New-Object System.Windows.Forms.Button
    $btn.Text = $text
    $btn.Location = New-Object System.Drawing.Point($x, $y)
    $btn.Size = New-Object System.Drawing.Size($w, 35)
    $btn.Font = New-Object System.Drawing.Font("Segoe UI", 10)
    $btn.BackColor = [System.Drawing.Color]::White
    $btn.FlatStyle = "Flat"
    $btn.Add_Click($handler)
    return $btn
}

# WHM Controls
$LblWhm = New-Object System.Windows.Forms.Label
$LblWhm.Text = "WHM Service (Port 4000)"
$LblWhm.Font = New-Object System.Drawing.Font("Segoe UI", 10, [System.Drawing.FontStyle]::Bold)
$LblWhm.Location = New-Object System.Drawing.Point(30, 110)
$LblWhm.Size = New-Object System.Drawing.Size(200, 20)
$Form.Controls.Add($LblWhm)

$BtnStartWhm = Create-Btn "Start" 30 140 80 { Start-Process "npm" -ArgumentList "start" -WorkingDirectory $WhmPath -WindowStyle Minimized }
$Form.Controls.Add($BtnStartWhm)

$BtnStopWhm = Create-Btn "Stop" 120 140 80 { Stop-Process -Name "node" -ErrorAction SilentlyContinue } # Crude stop, kills all node
$Form.Controls.Add($BtnStopWhm)

$BtnLogsWhm = Create-Btn "View Logs" 210 140 100 { Start-Process "notepad" "$WhmPath\error.log" } # Placeholder logs
# $Form.Controls.Add($BtnLogsWhm)

# Agent Controls
$LblAgent = New-Object System.Windows.Forms.Label
$LblAgent.Text = "Agent Service (Port 3000)"
$LblAgent.Font = New-Object System.Drawing.Font("Segoe UI", 10, [System.Drawing.FontStyle]::Bold)
$LblAgent.Location = New-Object System.Drawing.Point(30, 200)
$LblAgent.Size = New-Object System.Drawing.Size(200, 20)
$Form.Controls.Add($LblAgent)

$BtnStartAgent = Create-Btn "Start" 30 230 80 { Start-Process "npm" -ArgumentList "start" -WorkingDirectory $AgentPath -WindowStyle Minimized }
$Form.Controls.Add($BtnStartAgent)

$BtnStopAgent = Create-Btn "Stop" 120 230 80 { Stop-Process -Name "node" -ErrorAction SilentlyContinue }
$Form.Controls.Add($BtnStopAgent)


# Tools
$BtnBrowser = Create-Btn "Open Dashboard" 30 320 200 { Start-Process "http://localhost:3000" }
$BtnBrowser.BackColor = [System.Drawing.Color]::FromArgb(0, 120, 215)
$BtnBrowser.ForeColor = [System.Drawing.Color]::White
$Form.Controls.Add($BtnBrowser)

$BtnInstaller = Create-Btn "Run Installer" 240 320 200 { Start-Process "powershell" -ArgumentList "-ExecutionPolicy Bypass -File $BasePath\scripts\deploy\deploy_v3.ps1" }
$Form.Controls.Add($BtnInstaller)


# --- REFRESH TIMER ---
$Timer = New-Object System.Windows.Forms.Timer
$Timer.Interval = 2000 # 2s
$Timer.Add_Tick({
        # Check Ports
        $whmOpen = $false
        try { $c = New-Object System.Net.Sockets.TcpClient; $c.Connect("localhost", 4000); $whmOpen = $true; $c.Close() } catch {}
    
        $agentOpen = $false
        try { $c = New-Object System.Net.Sockets.TcpClient; $c.Connect("localhost", 3000); $agentOpen = $true; $c.Close() } catch {}

        if ($whmOpen) { $WhmStatus.BackColor = [System.Drawing.Color]::LimeGreen } else { $WhmStatus.BackColor = [System.Drawing.Color]::Red }
        if ($agentOpen) { $AgentStatus.BackColor = [System.Drawing.Color]::LimeGreen } else { $AgentStatus.BackColor = [System.Drawing.Color]::Red }
    })
$Timer.Start()

$Form.ShowDialog()
