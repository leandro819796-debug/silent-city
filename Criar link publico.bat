@echo off
title Silent City - Link publico
echo Com o servidor ja ligado (Iniciar servidor.bat), este comando cria um link para amigos.
echo Copie o endereco https://....trycloudflare.com que aparecer e mande aos amigos.
echo.
where cloudflared >nul 2>nul
if errorlevel 1 (
  echo Instalando cloudflared...
  winget install --id Cloudflare.cloudflared -e
  echo Feche e abra esta janela de novo depois de instalar.
  pause
  exit /b
)
cloudflared tunnel --url http://localhost:3000
pause
