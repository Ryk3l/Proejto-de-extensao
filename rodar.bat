@echo off
chcp 65001 >nul
title Rodovia Lanches - Backend + Frontend

echo ==========================================
echo   RODOVIA LANCHES - Iniciando sistema
echo ==========================================
echo.

:: Verifica se mvnd existe (Maven Daemon)
where mvnd >nul 2>nul
if %errorlevel% neq 0 (
    echo [AVISO] 'mvnd' nao encontrado no PATH.
    echo          Tentando usar 'mvn' como fallback...
    set MVN_CMD=mvn
) else (
    set MVN_CMD=mvnd
)

:: Verifica se npm existe
where npm >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERRO] 'npm' nao encontrado no PATH. Instale Node.js.
    pause
    exit /b 1
)

echo [INFO] Iniciando Backend (Spring Boot na porta 8080)...
echo [INFO] Comando: %MVN_CMD% spring-boot:run
echo.

:: Inicia backend em janela separada
start "Rodovia Lanches - BACKEND" cmd /k "
    cd /d E:\Projects\Jaime\Proejto de extensao\rodovialanches-backend
    echo [BACKEND] Diretorio: %cd%
    echo [BACKEND] Executando: %MVN_CMD% spring-boot:run
    echo.
    %MVN_CMD% spring-boot:run
"

:: Aguarda um pouco para o backend subir
timeout /t 3 >nul

echo [INFO] Iniciando Frontend (Vite + React na porta 5173)...
echo.

:: Inicia frontend em janela separada
start "Rodovia Lanches - FRONTEND" cmd /k "
    cd /d E:\Projects\Jaime\Proejto de extensao\rodovialanches-frontend
    echo [FRONTEND] Diretorio: %cd%
    echo [FRONTEND] Executando: npm run dev
    echo.
    npm run dev
"

echo.
echo ==========================================
echo   Ambos os servidores estao iniciando...
echo ==========================================
echo.
echo Backend:  http://localhost:8080
echo Frontend: http://localhost:5173
echo.
echo Feche as janelas dos servidores para parar.
echo ==========================================
pause