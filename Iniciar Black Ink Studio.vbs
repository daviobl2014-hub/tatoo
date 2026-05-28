' ============================================
'  BLACK INK STUDIO — Launcher
'  Inicia o icone de bandeja sem abrir janela de terminal.
'  Basta dar duplo clique neste arquivo.
' ============================================

Dim shell, scriptDir
Set shell = CreateObject("WScript.Shell")
scriptDir = Left(WScript.ScriptFullName, InStrRev(WScript.ScriptFullName, "\"))

shell.Run "powershell -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File """ & scriptDir & "tray.ps1""", 0, False
