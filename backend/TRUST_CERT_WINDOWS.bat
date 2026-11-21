@echo off
title Trust UOS SSL Certificate (172.200.32.10.sslip.io)
echo ================================================================
echo    UNIVERSITY OF SAHIWAL - TRUST SSL CERTIFICATE
echo ================================================================
echo.
echo Installing SSL Certificate into Windows Trusted Root Store...
cd /d "%~dp0"
if exist "certs\server.crt" (
    certutil.exe -addstore -f "Root" "certs\server.crt"
    echo.
    echo ================================================================
    echo [SUCCESS] Certificate installed into Windows Trusted Root Store!
    echo Browsers will now open https://172.200.32.10.sslip.io securely.
    echo ================================================================
) else (
    echo [ERROR] certs\server.crt not found!
)
pause
