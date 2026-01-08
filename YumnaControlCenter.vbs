Set WshShell = CreateObject("WScript.Shell")

' 1. Start the Backend API in total silence (0)
WshShell.Run "node C:\YumnaPanel\ControlCenterBackend.js", 0, False

' 2. Give it a second to wake up
WScript.Sleep 1000

' 3. Launch the UI in App Mode (This makes it look like a real EXE window)
' pointing to our local server to bypass security restrictions
Dim app_cmd
app_cmd = "powershell.exe -ExecutionPolicy Bypass -WindowStyle Hidden -File C:\YumnaPanel\scripts\run\launch_gui.ps1"

' Run the UI window
WshShell.Run app_cmd, 0, False

Set WshShell = Nothing
