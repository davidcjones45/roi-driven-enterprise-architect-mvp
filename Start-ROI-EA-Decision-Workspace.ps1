[CmdletBinding()]
param(
  [switch]$NoBrowser,
  [string]$PythonExecutable
)

$ErrorActionPreference = 'Stop'

$repoPath = $PSScriptRoot
$serverScript = Join-Path $repoPath 'serve-roi-ea.py'
$applicationUrl = 'http://127.0.0.1:8766/index.html'

if (-not (Test-Path -LiteralPath $repoPath -PathType Container)) {
  throw "ROI-EA repository was not found at: $repoPath"
}
if (-not (Test-Path -LiteralPath $serverScript -PathType Leaf)) {
  throw "ROI-EA launcher was not found at: $serverScript"
}

function Test-LocalServer {
  try {
    $health = Invoke-RestMethod -Uri 'http://127.0.0.1:8766/api/local/health' -TimeoutSec 2
    return ($health.ok -eq $true -and $health.workspace_directory -eq $repoPath)
  } catch {
    return $false
  }
}

if (-not (Test-LocalServer)) {
  $client = [System.Net.Sockets.TcpClient]::new()
  try { $client.Connect('127.0.0.1', 8766); $portOccupied = $true }
  catch { $portOccupied = $false }
  finally { $client.Dispose() }
  if ($portOccupied) {
    throw 'Port 8766 is serving another application or checkout. Close that server before launching this workspace; it has not been stopped automatically.'
  }
  if (-not $PythonExecutable) {
    $pythonCommand = Get-Command python -ErrorAction SilentlyContinue
    if ($pythonCommand -and $pythonCommand.Source -notlike '*\WindowsApps\*') {
      $PythonExecutable = $pythonCommand.Source
    } else {
      $PythonExecutable = Join-Path $env:USERPROFILE '.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe'
    }
  }
  if (-not (Test-Path -LiteralPath $PythonExecutable -PathType Leaf)) {
    throw 'Python was not found. Install Python 3 or pass -PythonExecutable with its full path.'
  }
  $logDirectory = Join-Path $repoPath 'local-data'
  New-Item -ItemType Directory -Path $logDirectory -Force | Out-Null
  $logSuffix = [guid]::NewGuid().ToString('N')
  $errorLog = Join-Path $logDirectory "server-$logSuffix.err.log"
  $outputLog = Join-Path $logDirectory "server-$logSuffix.out.log"
  Start-Process -FilePath $PythonExecutable -ArgumentList @('-u', ('"{0}"' -f $serverScript)) -WorkingDirectory $repoPath -WindowStyle Hidden -RedirectStandardError $errorLog -RedirectStandardOutput $outputLog
  $ready = $false
  for ($attempt = 0; $attempt -lt 20; $attempt++) {
    Start-Sleep -Milliseconds 250
    if (Test-LocalServer) { $ready = $true; break }
  }
  if (-not $ready) {
    throw "ROI-EA did not start. See $errorLog"
  }
}

Write-Host "ROI-EA Decision Workspace is available at $applicationUrl"
if (-not $NoBrowser) { Start-Process $applicationUrl }
