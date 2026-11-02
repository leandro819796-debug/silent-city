@echo off
title Silent City - Servidor Online
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Node.js nao encontrado. Instale em https://nodejs.org ^(botao LTS^) e rode de novo.
  pause
  exit /b
)
echo Servidor ligando... deixe esta janela ABERTA enquanto jogar.
node server.js
pause
