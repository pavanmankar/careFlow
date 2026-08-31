# Run AFTER closing Cursor completely (File -> Exit).
# Removes the old business-platform folder once careflow is verified.

$ErrorActionPreference = 'Stop'
$root = 'c:\Projects\jiobp'
$oldPath = Join-Path $root 'business-platform'
$newPath = Join-Path $root 'careflow'

if (-not (Test-Path $newPath)) {
    Write-Error "careflow folder not found at $newPath — aborting."
}

if (-not (Test-Path $oldPath)) {
    Write-Host "business-platform already removed. Nothing to do."
    exit 0
}

$cursorRunning = Get-Process Cursor -ErrorAction SilentlyContinue
if ($cursorRunning) {
    Write-Error "Close Cursor completely before running this script (File -> Exit)."
}

Get-Process node -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue

Write-Host "Removing $oldPath ..."
Remove-Item -Recurse -Force $oldPath
Write-Host "Done. Open c:\Projects\jiobp\careflow in Cursor."
