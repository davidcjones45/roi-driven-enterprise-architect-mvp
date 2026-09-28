param(
  [Parameter(Mandatory=$false)]
  [string]$RepoPath = (Get-Location).Path,
  [switch]$RunTests
)

$ErrorActionPreference = 'Stop'
$bundle = Split-Path -Parent $MyInvocation.MyCommand.Path
$repo = (Resolve-Path $RepoPath).Path

$required = @('README.md','index.html','dependency-graph-model.mjs','dependency-cif-bridge.mjs')
foreach ($name in $required) {
  if (-not (Test-Path (Join-Path $repo $name))) { throw "Repository check failed: missing $name in $repo" }
}

$copies = @(
  @('continuity-assurance-model.mjs','continuity-assurance-model.mjs'),
  @('continuity-assurance-cif-bridge.mjs','continuity-assurance-cif-bridge.mjs'),
  @('continuity-assurance-ui.mjs','continuity-assurance-ui.mjs'),
  @('continuity-assurance.test.mjs','continuity-assurance.test.mjs'),
  @('continuity-assurance-ui.test.mjs','continuity-assurance-ui.test.mjs'),
  @('continuity-assurance-cif-bridge.test.mjs','continuity-assurance-cif-bridge.test.mjs'),
  @('continuity-assurance-index-wiring.test.mjs','continuity-assurance-index-wiring.test.mjs'),
  @('CONTINUITY_ASSURANCE_V0.1.md','CONTINUITY_ASSURANCE_V0.1.md'),
  @('docs/ADR_CONTINUITY_ASSURANCE_V0.1.md','docs/ADR_CONTINUITY_ASSURANCE_V0.1.md'),
  @('schemas/continuity-assurance-v0.1.schema.json','schemas/continuity-assurance-v0.1.schema.json')
)

foreach ($pair in $copies) {
  $source = Join-Path $bundle $pair[0]
  $target = Join-Path $repo $pair[1]
  if (-not (Test-Path $source)) { throw "Bundle is incomplete: missing $source" }
  $targetDir = Split-Path -Parent $target
  if (-not (Test-Path $targetDir)) { New-Item -ItemType Directory -Force -Path $targetDir | Out-Null }
  Copy-Item -Force $source $target
}

$indexPath = Join-Path $repo 'index.html'
$index = Get-Content -Raw -Path $indexPath
if ($index -notmatch 'continuity-assurance-ui\.mjs') {
  $needle = '<script type="module" src="dependency-graph-ui\.mjs"></script>'
  if ($index -notmatch $needle) { throw 'Could not find dependency-graph-ui.mjs script tag in index.html; refusing an unsafe automatic edit.' }
  $index = [regex]::Replace($index, $needle, '$0' + [Environment]::NewLine + '  <script type="module" src="continuity-assurance-ui.mjs"></script>', 1)
  Set-Content -Path $indexPath -Value $index -Encoding UTF8
}

$readmePath = Join-Path $repo 'README.md'
$readme = Get-Content -Raw -Path $readmePath
if ($readme -notmatch 'Continuity Assurance v0\.1') {
  $item14 = '14. Controlled North Star Mortgage Reference Demonstrator v0.1: a sanitized synthetic fixture projection, deterministic DTI/LTV/reserve calculations, fictional policy comparison, evidence-gap abstention, BACRM configuration boundary, and read-only ERIR source seed. It does not make or recommend a credit decision.'
  if ($readme.Contains($item14)) {
    $addition = $item14 + [Environment]::NewLine + '15. Additive Continuity Assurance v0.1 specialization/application layer for CIF-S-009 / CIF-AP-002: explicit Reliance Claims, evidence-bounded assurance, Designed/Observed/Assured comparison, dependency-accumulation lenses, validated constraining-dependency findings, targeted reassessment, successor assurance, outcome/residual-exposure analysis, optional human-centered patterns, and noncanonical CIF handoff.'
    $readme = $readme.Replace($item14,$addition)
    Set-Content -Path $readmePath -Value $readme -Encoding UTF8
  } else {
    Add-Content -Path $readmePath -Value ([Environment]::NewLine + '## Continuity Assurance v0.1' + [Environment]::NewLine + 'See `CONTINUITY_ASSURANCE_V0.1.md` and `docs/ADR_CONTINUITY_ASSURANCE_V0.1.md`. This additive layer implements CIF-S-009 / CIF-AP-002 without changing CIF Core.') -Encoding UTF8
  }
}

Write-Host "Continuity Assurance files applied to $repo"
Write-Host 'No push was performed.'

if ($RunTests) {
  Push-Location $repo
  try {
    Write-Host 'Running complete Node test discovery...'
    & node --test
    if ($LASTEXITCODE -ne 0) { throw "Node tests failed with exit code $LASTEXITCODE" }
    Write-Host 'Running complete Python unittest discovery...'
    & python -m unittest discover -p '*_test.py'
    if ($LASTEXITCODE -ne 0) { throw "Python tests failed with exit code $LASTEXITCODE" }
  }
  finally { Pop-Location }
}
