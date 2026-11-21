$ErrorActionPreference = "Stop"
$root = (Resolve-Path "$PSScriptRoot\..\..").Path
$deployDir = "$root\deployment\uos-attendance-server"

Write-Host "Creating deployment directory: $deployDir..."
if (Test-Path $deployDir) {
    Remove-Item -Path $deployDir -Recurse -Force
}
New-Item -ItemType Directory -Path $deployDir -Force | Out-Null

Write-Host "Copying backend src, prisma, dist, package.json, and .env..."
Copy-Item -Path "$root\backend\src" -Destination "$deployDir\src" -Recurse
Copy-Item -Path "$root\backend\prisma" -Destination "$deployDir\prisma" -Recurse
Copy-Item -Path "$root\backend\dist" -Destination "$deployDir\dist" -Recurse
Copy-Item -Path "$root\backend\package.json" -Destination "$deployDir\package.json"
Copy-Item -Path "$root\backend\.env" -Destination "$deployDir\.env"
Copy-Item -Path "$root\backend\Faculty_Official_Credentials.csv" -Destination "$deployDir\Faculty_Official_Credentials.csv"

Write-Host "Copying pre-installed node_modules (this may take 15-30s)..."
Copy-Item -Path "$root\backend\node_modules" -Destination "$deployDir\node_modules" -Recurse

# Create 1-click startup bat file
$batContent = @"
@echo off
title University of Sahiwal - Attendance Server
echo ================================================================
echo    UNIVERSITY OF SAHIWAL - ACADEMIC ATTENDANCE SERVER
echo ================================================================
echo Starting server on Port 5000...
echo.
cd /d "%~dp0"
node src/server.js
pause
"@

Set-Content -Path "$deployDir\START_SERVER.bat" -Value $batContent

# Create 1-click firewall rule script
$fwContent = @"
@echo off
title Open Windows Firewall Port 5000
echo Allowing Inbound TCP Port 5000 for UOS Attendance Portal...
powershell -Command "New-NetFirewallRule -DisplayName 'UOS Attendance Portal' -Direction Inbound -LocalPort 5000 -Protocol TCP -Action Allow"
echo Firewall rule added! You can now access the portal from campus Wi-Fi.
pause
"@

Set-Content -Path "$deployDir\SETUP_FIREWALL.bat" -Value $fwContent

Write-Host "Creating single deployment zip: $root\deployment\UOS_Attendance_Server_Package.zip..."
$zipPath = "$root\deployment\UOS_Attendance_Server_Package.zip"
if (Test-Path $zipPath) {
    Remove-Item -Path $zipPath -Force
}

Compress-Archive -Path "$deployDir" -DestinationPath $zipPath -CompressionLevel Fastest
Write-Host "ZIP PACKAGE READY AT: $zipPath"
