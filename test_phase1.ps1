$ErrorActionPreference = "SilentlyContinue"

Write-Host "========================================" -ForegroundColor Yellow
Write-Host "GROUNDWORKOS PHASE 1 TEST SUITE" -ForegroundColor Yellow
Write-Host "========================================" -ForegroundColor Yellow

$baseUrl = "http://localhost:3000"
$passed = 0
$failed = 0

function Test-Endpoint {
    param(
        [string]$Url,
        [string]$Description
    )

    Write-Host ""
    Write-Host "Testing: $Description" -ForegroundColor Cyan
    try {
        $response = Invoke-WebRequest -Uri $Url -Method GET -TimeoutSec 10
        $statusCode = [int]$response.StatusCode
        Write-Host ("  Status: " + $statusCode) -ForegroundColor Green
        $passed++
        return $true
    }
    catch {
        Write-Host ("  Failed: " + $_.Exception.Message) -ForegroundColor Red
        $failed++
        return $false
    }
}

Write-Host ""
Write-Host "--- HTTP Tests ---" -ForegroundColor Cyan

Test-Endpoint -Url "$baseUrl/login" -Description "Login Page"
Test-Endpoint -Url "$baseUrl/dashboard" -Description "Dashboard Page"
Test-Endpoint -Url "$baseUrl/" -Description "Root Redirect"

Write-Host ""
Write-Host "========================================" -ForegroundColor Yellow
Write-Host "BUILD CHECK" -ForegroundColor Yellow
Write-Host "========================================" -ForegroundColor Yellow

Set-Location "c:\Users\lauho\Desktop\GroundworkOS\groundworkos"
$buildResult = npm run build 2>&1

if ($LASTEXITCODE -eq 0) {
    Write-Host "Build: PASSED" -ForegroundColor Green
    $passed++
} else {
    Write-Host "Build: FAILED" -ForegroundColor Red
    $failed++
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Yellow
Write-Host "TEST SUMMARY" -ForegroundColor Yellow
Write-Host "========================================" -ForegroundColor Yellow
Write-Host ("Passed: $passed") -ForegroundColor Green
Write-Host ("Failed: $failed") -ForegroundColor $(if ($failed -gt 0) { "Red" } else { "Green" })

if ($failed -eq 0) {
    Write-Host ""
    Write-Host "All Phase 1 tests passed!" -ForegroundColor Green
}
