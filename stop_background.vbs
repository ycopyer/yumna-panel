Set WshShell = CreateObject("WScript.Shell")
WshShell.Run "cmd /c taskkill /F /IM mysqld.exe /T & taskkill /F /IM nginx.exe /T & taskkill /F /IM httpd.exe /T & taskkill /F /IM node.exe /T", 0, True
WshShell.Run "cmd /c pm2 delete yumna-panel", 0, True
Set WshShell = Nothing
