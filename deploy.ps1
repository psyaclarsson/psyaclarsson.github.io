# Deploy script for GitHub Pages
param (
    [string]$CommitMessage = "Deploy update $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
)

Write-Host ">>> Checking status..." -ForegroundColor Cyan
git status

Write-Host ">>> Staging files..." -ForegroundColor Cyan
git add -A

# Check if there are changes to commit
$status = git status --porcelain
if ($status) {
    Write-Host ">>> Committing: $CommitMessage" -ForegroundColor Cyan
    git commit -m "$CommitMessage"
} else {
    Write-Host ">>> No new local changes to commit. Proceeding to push..." -ForegroundColor Yellow
}

Write-Host ">>> Pushing to origin main..." -ForegroundColor Cyan
git push origin main

if ($LASTEXITCODE -eq 0) {
    Write-Host ">>> Deployment successfully pushed to GitHub Pages!" -ForegroundColor Green
} else {
    Write-Host ">>> Push failed. Please verify your GitHub credentials/permissions." -ForegroundColor Red
}
