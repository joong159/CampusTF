# Cursor 에이전트 작업 종료 후 변경사항이 있으면 커밋·푸시
$ErrorActionPreference = "SilentlyContinue"
Set-Location $PSScriptRoot\..\..

$status = git status --porcelain 2>$null
if (-not $status) { exit 0 }

git add -A
$msg = "chore: auto sync $(Get-Date -Format 'yyyy-MM-dd HH:mm')"
git commit -m $msg 2>$null
if ($LASTEXITCODE -eq 0) {
  $branch = git rev-parse --abbrev-ref HEAD
  git push -u origin $branch 2>$null
  if ($LASTEXITCODE -ne 0) { git push origin $branch 2>$null }
}
