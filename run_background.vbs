Set WshShell = CreateObject("WScript.Shell")

' Yumna Panel v3.0 Background Launcher
' Starts WHM and Agent processes silently

Dim panel_root
panel_root = "C:\YumnaPanel"

' 1. Cleanup Old Processes (Optional, to ensure restart)
WshShell.Run "cmd /c taskkill /F /IM node.exe /FI ""WINDOWTITLE eq yumna-whm""", 0, True
WshShell.Run "cmd /c taskkill /F /IM node.exe /FI ""WINDOWTITLE eq yumna-agent""", 0, True

' 2. Start WHM Service (Port 4000)
' We run npm start but wrap it to give it a title for later killing
WshShell.CurrentDirectory = panel_root & "\whm"
WshShell.Run "cmd /c title yumna-whm && npm start", 0, False

' 3. Start Agent Service (Port 3000)
WshShell.CurrentDirectory = panel_root & "\agent"
WshShell.Run "cmd /c title yumna-agent && npm start", 0, False

' 4. Optional: Check for Portable Database (Legacy Support)
Dim mariadb_exe, mysql_data
mariadb_exe = panel_root & "\bin\database\mariadb\bin\mysqld.exe"
mysql_data = panel_root & "\data\mysql"

Set fso = CreateObject("Scripting.FileSystemObject")
If fso.FileExists(mariadb_exe) Then
    WshShell.Run chr(34) & mariadb_exe & chr(34) & " --datadir=" & chr(34) & mysql_data & chr(34), 0, False
End If

Set WshShell = Nothing
