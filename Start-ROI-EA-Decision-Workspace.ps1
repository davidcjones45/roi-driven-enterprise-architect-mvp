[CmdletBinding()]
param(
  [switch]$NoBrowser
)

$ErrorActionPreference = 'Stop'

# Explicit local paths for this installed ROI-EA workspace.
$repoPath = 'C:\Users\david\Documents\Codex\2026-08-14\notion-plugin-notion-openai-curated-remote-2\work\roi-driven-enterprise-architect-mvp'
$serverScript = 'C:\Users\david\Documents\Codex\2026-08-14\notion-plugin-notion-openai-curated-remote-2\work\roi-driven-enterprise-architect-mvp\serve-roi-ea.py'
$applicationUrl = 'http://127.0.0.1:8766/index.html'

if (-not (Test-Path -LiteralPath $repoPath -PathType Container)) {
  throw "ROI-EA repository was not found at: $repoPath"
}
if (-not (Test-Path -LiteralPath $serverScript -PathType Leaf)) {
  throw "ROI-EA launcher was not found at: $serverScript"
}

function Test-LocalServer {
  try {
    $client = [System.Net.Sockets.TcpClient]::new()
    $client.Connect('127.0.0.1', 8766)
    $client.Dispose()
    return $true
  } catch {
    return $false
  }
}

if (-not (Test-LocalServer)) {
  $python = Get-Command python -ErrorAction SilentlyContinue
  if (-not $python) {
    throw 'Python was not found on PATH. Install Python 3, then run this launcher again.'
  }
  Start-Process -FilePath $python.Source -ArgumentList @($serverScript) -WorkingDirectory $repoPath -WindowStyle Hidden
  $ready = $false
  for ($attempt = 0; $attempt -lt 20; $attempt++) {
    Start-Sleep -Milliseconds 250
    if (Test-LocalServer) { $ready = $true; break }
  }
  if (-not $ready) {
    throw 'ROI-EA did not start on http://127.0.0.1:8766. Check whether another process is using the port.'
  }
}

Write-Host "ROI-EA Decision Workspace is available at $applicationUrl"
if (-not $NoBrowser) { Start-Process $applicationUrl }
