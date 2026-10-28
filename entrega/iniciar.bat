@echo off
title Rodovia Lanches
cd /d "%~dp0"

rem ============================================================
rem  Caminho do Java.
rem  Mantenha "java" quando o computador tiver Java 17 ou
rem  superior instalado (verifique com: java -version).
rem
rem  Se aparecer "UnsupportedClassVersionError", o Java do
rem  sistema e antigo. Descomente a linha abaixo e ajuste o
rem  caminho para a pasta do Java 17+ instalado:
rem
rem  set JAVA=C:\Program Files\Java\jdk-17\bin\java.exe
rem ============================================================
if not defined JAVA set JAVA=java

rem Abre a janela do sistema (ela precisa ficar aberta enquanto
rem o Rodovia Lanches estiver em uso) e depois o navegador.
start "Rodovia Lanches - nao fechar esta janela" cmd /k ""%JAVA%" -jar "%~dp0rodovia-lanches.jar""

rem Espera o sistema iniciar (cerca de 15 segundos) e abre a pagina.
ping -n 16 127.0.0.1 >nul
start "" http://localhost:8080
