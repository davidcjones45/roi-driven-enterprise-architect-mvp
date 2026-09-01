[CmdletBinding()]
param(
  [string]$CommitMessage = 'Add consequential decision workspace baseline'
)

$ErrorActionPreference = 'Stop'

# Explicit local repository and approved Increment 1 file paths.
$repoPath = 'C:\Users\david\Documents\Codex\2026-08-14\notion-plugin-notion-openai-curated-remote-2\work\roi-driven-enterprise-architect-mvp'
$branch = 'feature/esa-scalability-inc1'
$approvedFiles = @(
  'C:\Users\david\Documents\Codex\2026-08-14\notion-plugin-notion-openai-curated-remote-2\work\roi-driven-enterprise-architect-mvp\app.js',
  'C:\Users\david\Documents\Codex\2026-08-14\notion-plugin-notion-openai-curated-remote-2\work\roi-driven-enterprise-architect-mvp\index.html',
  'C:\Users\david\Documents\Codex\2026-08-14\notion-plugin-notion-openai-curated-remote-2\work\roi-driven-enterprise-architect-mvp\styles.css',
  'C:\Users\david\Documents\Codex\2026-08-14\notion-plugin-notion-openai-curated-remote-2\work\roi-driven-enterprise-architect-mvp\CONSEQUENTIAL_DECISION_INCREMENT_1C_SPEC_V0.1.md',
  'C:\Users\david\Documents\Codex\2026-08-14\notion-plugin-notion-openai-curated-remote-2\work\roi-driven-enterprise-architect-mvp\Start-ROI-EA-Decision-Workspace.cmd',
  'C:\Users\david\Documents\Codex\2026-08-14\notion-plugin-notion-openai-curated-remote-2\work\roi-driven-enterprise-architect-mvp\Start-ROI-EA-Decision-Workspace.ps1',
  'C:\Users\david\Documents\Codex\2026-08-14\notion-plugin-notion-openai-curated-remote-2\work\roi-driven-enterprise-architect-mvp\consequential-decision-model.mjs',
  'C:\Users\david\Documents\Codex\2026-08-14\notion-plugin-notion-openai-curated-remote-2\work\roi-driven-enterprise-architect-mvp\consequential-decision-model.test.mjs',
  'C:\Users\david\Documents\Codex\2026-08-14\notion-plugin-notion-openai-curated-remote-2\work\roi-driven-enterprise-architect-mvp\consequential-decision-workspace.mjs',
  'C:\Users\david\Documents\Codex\2026-08-14\notion-plugin-notion-openai-curated-remote-2\work\roi-driven-enterprise-architect-mvp\consequential-decision-workspace.test.mjs',
  'C:\Users\david\Documents\Codex\2026-08-14\notion-plugin-notion-openai-curated-remote-2\work\roi-driven-enterprise-architect-mvp\Commit-And-Push-Consequential-Decision.ps1'
)

if (-not (Test-Path -LiteralPath $repoPath -PathType Container)) { throw "Repository not found: $repoPath" }
foreach ($file in $approvedFiles) { if (-not (Test-Path -LiteralPath $file -PathType Leaf)) { throw "Approved file not found: $file" } }

Push-Location $repoPath
try {
  $currentBranch = git branch --show-current
  if ($LASTEXITCODE -ne 0) { throw 'Unable to determine the current Git branch.' }
  if ($currentBranch -ne $branch) { throw "Expected branch '$branch', found '$currentBranch'." }

  git add -- $approvedFiles
  if ($LASTEXITCODE -ne 0) { throw 'Unable to stage the approved files.' }

  git diff --cached --check
  if ($LASTEXITCODE -ne 0) { throw 'Staged changes failed git diff --check.' }

  git diff --cached --quiet
  if ($LASTEXITCODE -eq 1) {
    git commit -m $CommitMessage
    if ($LASTEXITCODE -ne 0) { throw 'Git commit failed.' }
  } elseif ($LASTEXITCODE -ne 0) {
    throw 'Unable to inspect staged changes.'
  } else {
    Write-Host 'No approved uncommitted changes to commit.'
  }

  git push -u origin $branch
  if ($LASTEXITCODE -ne 0) { throw 'GitHub push failed. Confirm GitHub SSH authentication and host-key access, then retry.' }

  Write-Host "Committed approved changes and pushed '$branch' to GitHub." -ForegroundColor Green
  Write-Host 'The unrelated TEKSYSTEMS_CATERPILLAR_ACCOUNT_OPPORTUNITY_BRIEF_v0.1.md file is not staged by this script.'
} finally {
  Pop-Location
}
