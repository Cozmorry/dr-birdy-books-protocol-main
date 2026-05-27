# prepare_submission.ps1
# Automates the clean packaging of the repository for Project Silver submission.

$ErrorActionPreference = "Stop"

Write-Host ">>> Preparing Project Silver Submission Zip..." -ForegroundColor Cyan

$sourceDir = (Get-Item -Path ".\").FullName
$tempDir = Join-Path $sourceDir "artifacts\submission_temp"
$zipFile = Join-Path $sourceDir "artifacts\dr-birdy-books-protocol-submission.zip"

# Clean up any existing artifacts
if (Test-Path $tempDir) {
    Write-Host "Cleaning up old temp directory..." -ForegroundColor Yellow
    Remove-Item -Path $tempDir -Recurse -Force
}
if (Test-Path $zipFile) {
    Write-Host "Removing old submission zip..." -ForegroundColor Yellow
    Remove-Item -Path $zipFile -Force
}

# Create temp directory
New-Item -ItemType Directory -Path $tempDir -Force | Out-Null

Write-Host "Copying files to temporary directory (excluding node_modules and caches)..." -ForegroundColor Cyan

# Use robust Windows robocopy to replicate structure excluding heavy folders
# /XD excludes directories
# /XF excludes files
# /S copies subdirectories
# /R:0 /W:0 disables retries to speed up
$excludeDirs = @("node_modules", "cache", "artifacts", ".openzeppelin", "backend\node_modules", "frontend\node_modules", "frontend\build", "backend\uploads")
$excludeFiles = @("*.zip", "AfterQuerySilver.pdf", "AfterQuerySilver.txt")
robocopy $sourceDir $tempDir /S /E /R:0 /W:0 /XD $excludeDirs /XF $excludeFiles | Out-Null

# Explicitly copy the .git directory (since it is hidden, robocopy skips it by default in root copies)
if (Test-Path "$sourceDir\.git") {
    Write-Host "Copying .git repository history..." -ForegroundColor Cyan
    robocopy "$sourceDir\.git" "$tempDir\.git" /S /E /R:0 /W:0 | Out-Null
}

Write-Host "Compressing repository into a single zip file..." -ForegroundColor Cyan
# PowerShell built-in archiving (Get-ChildItem with -Force captures hidden files like .git)
$compressPaths = Get-ChildItem -Path $tempDir -Force
Compress-Archive -Path $compressPaths -DestinationPath $zipFile -Force

Write-Host "Cleaning up temporary files..." -ForegroundColor Cyan
Remove-Item -Path $tempDir -Recurse -Force

Write-Host "SUCCESS! Submission package created successfully." -ForegroundColor Green
Write-Host "Package Location: $zipFile" -ForegroundColor Green
Write-Host "You can now upload this zip file directly to Project Silver!" -ForegroundColor Cyan
