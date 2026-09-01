@echo off
setlocal

rem Explicit local paths for this installed ROI-EA workspace.
set "REPO_PATH=C:\Users\david\Documents\Codex\2026-08-14\notion-plugin-notion-openai-curated-remote-2\work\roi-driven-enterprise-architect-mvp"
set "SERVER_SCRIPT=C:\Users\david\Documents\Codex\2026-08-14\notion-plugin-notion-openai-curated-remote-2\work\roi-driven-enterprise-architect-mvp\serve-roi-ea.py"
set "APPLICATION_URL=http://127.0.0.1:8766/index.html"

if not exist "%REPO_PATH%\" (
  echo ROI-EA repository was not found at: %REPO_PATH%
  exit /b 1
)
if not exist "%SERVER_SCRIPT%" (
  echo ROI-EA launcher was not found at: %SERVER_SCRIPT%
  exit /b 1
)

where python >nul 2>nul
if errorlevel 1 (
  echo Python was not found on PATH. Install Python 3, then run this launcher again.
  exit /b 1
)

start "ROI-EA local server" /b python "%SERVER_SCRIPT%"
timeout /t 2 /nobreak >nul
start "" "%APPLICATION_URL%"
endlocal
