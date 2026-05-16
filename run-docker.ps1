# run-docker.ps1
# Usage (PowerShell):
# Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass; .\run-docker.ps1

$diagDir = Join-Path $PSScriptRoot 'docker-diagnostic'
if (!(Test-Path $diagDir)) { New-Item -Path $diagDir -ItemType Directory | Out-Null }

Write-Host "Checking Docker availability..."
docker info > (Join-Path $diagDir 'docker_info.txt') 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "Docker does not appear to be running or the Docker CLI is not accessible."
    Write-Host "Start Docker Desktop and re-run this script. See $diagDir\docker_info.txt for details."
    exit 1
}

Write-Host "Building and starting services (detached)..."
docker compose up --build -d 2>&1 | Tee-Object (Join-Path $diagDir 'docker_up_output.txt')

Write-Host "Listing containers..."
docker compose ps | Tee-Object (Join-Path $diagDir 'docker_ps.txt')

Write-Host "Collecting recent app logs (tail 200)..."
docker compose logs --tail 200 app | Tee-Object (Join-Path $diagDir 'app_logs.txt')

Write-Host "If there are errors, open the file: $diagDir\app_logs.txt"
Write-Host "Showing last 200 lines:"
Get-Content (Join-Path $diagDir 'app_logs.txt') -Tail 200 | ForEach-Object { Write-Host $_ }

Write-Host "Done. If you need help, copy-paste the contents of $diagDir\app_logs.txt here."
