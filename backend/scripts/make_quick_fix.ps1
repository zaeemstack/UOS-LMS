$root = (Resolve-Path "$PSScriptRoot\..\..").Path
$updateDir = "$root\deployment\uos-update-files"

if (Test-Path $updateDir) {
    Remove-Item -Path $updateDir -Recurse -Force
}
Copy-Item -Path "$root\backend\src" -Destination "$updateDir\src" -Recurse -Force
Copy-Item -Path "$root\backend\.env" -Destination "$updateDir\.env" -Force
Copy-Item -Path "$root\backend\certs" -Destination "$updateDir\certs" -Recurse -Force
Copy-Item -Path "$root\frontend\dist" -Destination "$updateDir\dist" -Recurse -Force
Copy-Item -Path "$root\deployment\uos-attendance-server\SETUP_FIREWALL.bat" -Destination "$updateDir\SETUP_FIREWALL.bat" -Force
Copy-Item -Path "$root\deployment\uos-attendance-server\START_SERVER.bat" -Destination "$updateDir\START_SERVER.bat" -Force
Copy-Item -Path "$root\backend\START_BACKGROUND_SERVICE.bat" -Destination "$updateDir\START_BACKGROUND_SERVICE.bat" -Force
Copy-Item -Path "$root\backend\TRUST_CERT_WINDOWS.bat" -Destination "$updateDir\TRUST_CERT_WINDOWS.bat" -Force
Copy-Item -Path "$root\backend\Faculty_Official_Credentials.csv" -Destination "$updateDir\Faculty_Official_Credentials.csv" -Force

$zipPath = "$root\deployment\UOS_Quick_Fix.zip"
if (Test-Path $zipPath) {
    Remove-Item -Path $zipPath -Force
}

Set-Location -Path $updateDir
tar.exe -a -cf $zipPath *
$sizeMb = (Get-Item $zipPath).Length / 1MB
Write-Host "UOS_Quick_Fix.zip created successfully! Size: $sizeMb MB"
