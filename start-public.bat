@echo off
chcp 65001 >nul

echo ============================================
echo   MyBlog 一键公网部署脚本
echo ============================================
echo.

set "CLOUDFLARED=C:\Program Files (x86)\cloudflared\cloudflared.exe"

if not exist "%CLOUDFLARED%" (
    echo [错误] 未找到 cloudflared
    echo   winget install Cloudflare.cloudflared
    pause
    exit /b 1
)

REM 1. 清理旧的进程和日志
echo [0/6] 清理旧服务...
taskkill /F /IM cloudflared.exe /T 2>nul

REM 通过端口号杀死占用 3001 和 5174 的 node 进程
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":3001" ^| findstr "LISTENING"') do taskkill /F /PID %%a 2>nul
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":5174" ^| findstr "LISTENING"') do taskkill /F /PID %%a 2>nul

timeout /t 1 /nobreak >nul
del /f /q tunnel_*.log 2>nul
del /f /q tunnel_*.err 2>nul
echo   清理完成
echo.

REM 2. 启动后端
echo [1/6] 启动后端 Server...
cd /d "%~dp0server"
start "MyBlog Backend Server" npm start
cd /d "%~dp0"
echo   后端已启动 (端口 3001)
timeout /t 2 /nobreak >nul
echo.

REM 3. 启动 Cloudflare 隧道
echo [2/6] 启动 Cloudflare 隧道 (端口 3001)...
start "Cloudflare 3001" cmd /c ""%CLOUDFLARED%" tunnel --url http://localhost:3001 >> tunnel_3001.log 2>&1"

echo [3/6] 启动 Cloudflare 隧道 (端口 5174)...
start "Cloudflare 5174" cmd /c ""%CLOUDFLARED%" tunnel --url http://localhost:5174 >> tunnel_5174.log 2>&1"

REM 4. 等待并获取公网地址
echo [4/6] 等待隧道创建并获取公网地址...
set "max_attempts=60"
set "attempt=0"

:wait_url
set /a attempt+=1
if %attempt% gtr %max_attempts% (
    echo [错误] 获取公网地址超时
    echo   请检查 tunnel_3001.log 内容
    type tunnel_3001.log 2>nul
    pause
    exit /b 1
)

REM 使用 PowerShell 精确提取 URL
for /f "delims=" %%a in ('powershell -Command "$url = Select-String -Pattern 'https://[a-zA-Z0-9-]+\.trycloudflare\.com' -Path tunnel_3001.log -AllMatches | ForEach-Object { $_.Matches.Value }; if ($url) { Write-Output $url }"') do (
    set "server_url=%%a"
    goto :url_found
)

echo   等待隧道创建... (%attempt%/%max_attempts%)
timeout /t 1 /nobreak >nul
goto :wait_url

:url_found
if "%server_url%"=="" (
    echo [错误] 未找到后端公网地址
    pause
    exit /b 1
)
echo   后端公网地址: %server_url%
echo.

REM 等待并获取前端公网地址
echo   等待前端隧道创建...
set "attempt=0"
:wait_web_url
set /a attempt+=1
if %attempt% gtr %max_attempts% (
    echo [警告] 获取前端公网地址超时，将使用后端地址
    set "web_url=%server_url%"
    goto :url_continue
)

for /f "delims=" %%a in ('powershell -Command "$url = Select-String -Pattern 'https://[a-zA-Z0-9-]+\.trycloudflare\.com' -Path tunnel_5174.log -AllMatches | ForEach-Object { $_.Matches.Value }; if ($url) { Write-Output $url }"') do (
    set "web_url=%%a"
    goto :url_continue
)

if %attempt% lss 5 (
    timeout /t 1 /nobreak >nul
    goto :wait_web_url
) else (
    echo   等待前端隧道创建... (%attempt%/%max_attempts%)
    timeout /t 1 /nobreak >nul
    goto :wait_web_url
)

:url_continue
if "%web_url%"=="" (
    echo [警告] 未找到前端公网地址，将使用后端地址
    set "web_url=%server_url%"
)
echo   前端公网地址: %web_url%
echo.

REM 5. 更新 web/.env
echo [5/6] 更新 web/.env 配置文件...
set "env_file=%~dp0web\.env"
for /f "tokens=1* delims=]" %%a in ('type "%env_file%" ^| find /n /v ""') do (
    set "line=%%b"
    echo %%b | findstr /R "^VITE_API_URL=" >nul
    if not errorlevel 1 (
        echo VITE_API_URL=%server_url%/api
    ) else (
        echo %%b
    )
) > "%env_file%.new"
move /y "%env_file%.new" "%env_file%" >nul
echo   已更新 VITE_API_URL 为: %server_url%/api
echo.

REM 6. 启动前端
echo [6/6] 启动 Web Server...
cd /d "%~dp0web"
start "MyBlog Web Server" npm run dev
cd /d "%~dp0"
echo   前端已启动 (端口 5174)
echo.

echo ============================================
echo   部署完成！
echo ============================================
echo.
echo   后端地址: %server_url%
echo   前端地址: http://localhost:5174
echo   公网访问: %web_url%
echo.
echo   正在生成二维码...
echo.

python public-address.py "%web_url%"

if exist "url.png" (
    echo   二维码已保存到: url.png
    echo   请使用手机扫描二维码访问！
)

echo.
pause
