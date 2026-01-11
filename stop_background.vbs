Set WshShell = CreateObject("WScript.Shell")

' Yumna Panel v3.0 Background Stopper
' Stops WHM, Agent, and related processes

' 1. Stop Node.js Services
' Kills processes marked with our titles or general cleanup
WshShell.Run "cmd /c taskkill /F /FI ""WINDOWTITLE eq yumna-whm""", 0, True
WshShell.Run "cmd /c taskkill /F /FI ""WINDOWTITLE eq yumna-agent""", 0, True

' Fallback: Kill all node.exe if running from this dedicated environment
' Warning: This might be too aggressive if user runs other node apps.
' Uncomment the next line if you want Total Shutdown:
' WshShell.Run "cmd /c taskkill /F /IM node.exe", 0, True

' 2. Stop Legacy Portable Binaries (if any)
WshShell.Run "cmd /c taskkill /F /IM mysqld.exe", 0, True
WshShell.Run "cmd /c taskkill /F /IM nginx.exe", 0, True
WshShell.Run "cmd /c taskkill /F /IM httpd.exe", 0, True

Set WshShell = Nothing
