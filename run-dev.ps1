# run-dev.ps1
# Usage (PowerShell):
# Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass; .\run-dev.ps1

$logDir = Join-Path $PSScriptRoot 'dev-logs'
if (!(Test-Path $logDir)) { New-Item -Path $logDir -ItemType Directory | Out-Null }

Write-Host "Installing root dependencies..."
npm install 2>&1 | Tee-Object (Join-Path $logDir 'npm_install_root.txt')

Write-Host "Installing backend dependencies..."
Push-Location (Join-Path $PSScriptRoot 'backend')
npm install 2>&1 | Tee-Object (Join-Path $logDir 'npm_install_backend.txt')
Pop-Location

Write-Host "To start dev servers run: npm run dev (this will show logs in console)."
Write-Host "If you want to capture the dev server output to a file, run: npm run dev > dev-logs/dev_run.txt 2>&1"
