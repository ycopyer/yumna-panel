$url = "http://localhost:5001"
$width = 1020
$height = 770

$signature = @"
[DllImport("user32.dll", SetLastError = true)]
public static extern IntPtr FindWindow(string lpClassName, string lpWindowName);
[DllImport("user32.dll")]
public static extern int GetWindowLong(IntPtr hWnd, int nIndex);
[DllImport("user32.dll")]
public static extern int SetWindowLong(IntPtr hWnd, int nIndex, int dwNewLong);
[DllImport("user32.dll")]
public static extern bool SetWindowPos(IntPtr hWnd, IntPtr hWndInsertAfter, int X, int Y, int cx, int cy, uint uFlags);
[DllImport("user32.dll")]
public static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);
"@

$type = Add-Type -MemberDefinition $signature -Name "Win32Utils" -Namespace "WindowFix" -PassThru

# Start Edge in App Mode
$proc = Start-Process "msedge" -ArgumentList "--app=$url --window-size=$width,$height" -PassThru

# Wait for window to exist and be visible
Start-Sleep -Seconds 2

$hwnd = 0
$title = "Yumna Panel Control Center"

# Loop to find the window handle more reliably
for($i=0; $i -lt 20; $i++) {
    $hwnd = $type::FindWindow("Chrome_WidgetWin_1", $title)
    if ($hwnd -and $hwnd -ne 0) { break }
    
    # Fallback search by process
    $hwnd = (Get-Process -Name msedge | Where-Object { $_.MainWindowTitle -eq $title }).MainWindowHandle
    if ($hwnd -and $hwnd -ne 0) { break }
    
    Start-Sleep -Milliseconds 500
}

if ($hwnd -and $hwnd -ne 0) {
    $GWL_STYLE = -16
    # WS_CAPTION (0x00C00000) | WS_SYSMENU (0x00080000)
    # We explicitly EXCLUDE WS_MINIMIZEBOX (0x00020000), WS_MAXIMIZEBOX (0x00010000), and WS_THICKFRAME (0x00040000)
    $newStyle = 0x00C80000 
    
    # Apply the clean style
    $type::SetWindowLong($hwnd, $GWL_STYLE, $newStyle)
    
    # Refresh frame
    $type::SetWindowPos($hwnd, 0, 0, 0, 0, 0, 0x0027) # SWP_FRAMECHANGED | SWP_NOMOVE | SWP_NOSIZE | SWP_NOZORDER
    
    # Force a redraw
    $type::ShowWindow($hwnd, 5) # SW_SHOW
}
