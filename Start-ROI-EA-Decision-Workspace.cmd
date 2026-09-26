@echo off
setlocal

powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0Start-ROI-EA-Decision-Workspace.ps1" %*
if errorlevel 1 (
  echo Unable to start ROI-EA. See the error above.
  pause
  exit /b 1
)
endlocal
