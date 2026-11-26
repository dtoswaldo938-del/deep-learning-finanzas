@echo off
cd /d "%~dp0"
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0neural_finance_launcher.ps1" -Accion detener
pause