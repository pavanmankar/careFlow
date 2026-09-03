# CareFlow demo video recorder
# Verifies services are up, then runs the Playwright demo recording.

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot

function Test-Endpoint($url, $label) {
    try {
        $response = Invoke-WebRequest -Uri $url -UseBasicParsing -TimeoutSec 5
        Write-Host "[OK] $label ($($response.StatusCode))" -ForegroundColor Green
        return $true
    } catch {
        Write-Host "[FAIL] $label is not reachable at $url" -ForegroundColor Red
        return $false
    }
}

Write-Host "CareFlow Demo Recorder" -ForegroundColor Cyan
Write-Host "======================" -ForegroundColor Cyan
Write-Host ""

$frontendOk = Test-Endpoint "http://localhost:3000/login" "Frontend"
$backendOk = Test-Endpoint "http://localhost:3001/health/live" "Backend API"

if (-not $frontendOk -or -not $backendOk) {
    Write-Host ""
    Write-Host "Start the app before recording:" -ForegroundColor Yellow
    Write-Host "  cd backend && npm run dev"
    Write-Host "  cd frontend && npm run dev"
    Write-Host ""
    Write-Host "Ensure demo data is seeded:" -ForegroundColor Yellow
    Write-Host "  cd backend && npm run db:migrate && npm run db:seed:demo"
    exit 1
}

Write-Host ""
Write-Host "Starting demo recording (~8-10 min)..." -ForegroundColor Cyan
Write-Host "Output: frontend/e2e/recordings/" -ForegroundColor Gray
Write-Host ""

Push-Location (Join-Path $root "frontend")
try {
    npm run demo:record
    if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
    Write-Host ""
    Write-Host "Recording complete." -ForegroundColor Green
    $latest = Get-ChildItem -Path "e2e/recordings" -Recurse -Filter "video.webm" -ErrorAction SilentlyContinue |
        Sort-Object LastWriteTime -Descending |
        Select-Object -First 1
    if ($latest) {
        Write-Host "Video: $($latest.FullName)" -ForegroundColor Green
    }
} finally {
    Pop-Location
}
