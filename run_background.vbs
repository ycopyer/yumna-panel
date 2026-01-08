Set WshShell = CreateObject("WScript.Shell")

' 1. Define Paths
Dim panel_root, mariadb_exe, nginx_exe, nginx_dir, mysql_data
panel_root = "C:\YumnaPanel"
mariadb_exe = panel_root & "\bin\database\mariadb\bin\mysqld.exe"
mysql_data = panel_root & "\data\mysql"
nginx_exe = panel_root & "\bin\web\nginx\nginx.exe"
nginx_dir = panel_root & "\bin\web\nginx"
pm2_cmd = "pm2.cmd"

' 2. Silent Cleanup
' We use cmd /c with 0 to hide it.
WshShell.Run "cmd /c taskkill /F /IM mysqld.exe /T", 0, True
WshShell.Run "cmd /c taskkill /F /IM nginx.exe /T", 0, True
WshShell.Run "cmd /c taskkill /F /IM httpd.exe /T", 0, True

' 3. Start MariaDB (0 = Hidden)
WshShell.Run chr(34) & mariadb_exe & chr(34) & " --datadir=" & chr(34) & mysql_data & chr(34), 0, False

' 4. Start Nginx (0 = Hidden)
' Nginx needs to start in its directory
WshShell.CurrentDirectory = nginx_dir
WshShell.Run chr(34) & nginx_exe & chr(34), 0, False

' 5. Start PM2 Panel (0 = Hidden)
WshShell.CurrentDirectory = panel_root & "\app"
WshShell.Run "cmd /c pm2 delete yumna-panel", 0, True
WshShell.Run "cmd /c pm2 start ecosystem.config.js --env production", 0, True
WshShell.Run "cmd /c pm2 save", 0, True

Set WshShell = Nothing
