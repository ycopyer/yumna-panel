Set WshShell = CreateObject("WScript.Shell")

' Yumna Panel v3.0 Background Launcher
' Description: Starts WHM (Port 4000) and Agent (Port 3000) services silently in background.
' Usage: Double click to run. Use stop_background.vbs to stop.

' 1. Determine Panel Root Path
' Assumes this script is in C:\YumnaPanel\run_background.vbs
Dim panel_root
panel_root = "C:\YumnaPanel"

' 2. Start WHM Service (Backend Control Plane)
' Command: npm start (Production)
' Directory: C:\YumnaPanel\whm
WshShell.CurrentDirectory = panel_root & "\whm"
' We use "cmd /c" to leverage window titling for easier cleanup later
WshShell.Run "cmd /c title yumna-whm && npm start", 0, False

' 3. Start Agent Service (Worker Node)
' Command: npm start (Production)
' Directory: C:\YumnaPanel\agent
WshShell.CurrentDirectory = panel_root & "\agent"
WshShell.Run "cmd /c title yumna-agent && npm start", 0, False

' 4. Note on Frontend (Panel)
' The Frontend is a static build (HTML/JS) served by WHM or Nginx.
' It does not need a separate background node process in production,
' unless you are running independent SSR or Vite preview.
' For v3.0 production, WHM usually serves the built static files/api, 
' or Nginx serves them. So no separate process needed here.

Set WshShell = Nothing
