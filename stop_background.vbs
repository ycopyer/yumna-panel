Set WshShell = CreateObject("WScript.Shell")

' Yumna Panel v3.0 Background Stopper
' Description: Stops WHM and Agent services started by run_background.vbs

' 1. Stop WHM Service
' Kills the cmd window titled 'yumna-whm' including its child node process
WshShell.Run "cmd /c taskkill /F /FI ""WINDOWTITLE eq yumna-whm"" /T", 0, True

' 2. Stop Agent Service
' Kills the cmd window titled 'yumna-agent' including its child node process
WshShell.Run "cmd /c taskkill /F /FI ""WINDOWTITLE eq yumna-agent"" /T", 0, True

' 3. Cleanup Legacy/Lost Node Processes (Optional - Use with Caution)
' Uncomment below if you want to force kill ALL node.exe processes
' WshShell.Run "cmd /c taskkill /F /IM node.exe", 0, True

Set WshShell = Nothing
