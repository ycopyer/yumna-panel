Set WshShell = CreateObject("WScript.Shell")

' Yumna Panel v3.0 Background Launcher (DEBUG MODE)
' Description: Starts WHM (Port 4000) and Agent (Port 3000) services.

Dim panel_root
panel_root = "C:\YumnaPanel"

' 1. Start WHM Service
' We use npm.cmd specifically for Windows
WshShell.CurrentDirectory = panel_root & "\whm"
' Using Flag 1 (Visible) to see errors. Change back to 0 later.
WshShell.Run "cmd /k title yumna-whm && echo Starting WHM... && npm.cmd start", 1, False

' 2. Start Agent Service
WshShell.CurrentDirectory = panel_root & "\agent"
WshShell.Run "cmd /k title yumna-agent && echo Starting Agent... && npm.cmd start", 1, False

Set WshShell = Nothing
