Set WshShell = CreateObject("WScript.Shell")
Set args = WScript.Arguments

If args.Count > 0 Then
    url = args(0)
    ' 1 = Normal window, False = Don't wait
    WshShell.Run "cmd /c start " & chr(34) & chr(34) & " " & chr(34) & url & chr(34), 1, False
End If

Set WshShell = Nothing
