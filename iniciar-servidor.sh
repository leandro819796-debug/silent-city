#!/bin/bash
# Silent City - liga o servidor dedicado (use no GitHub Codespaces)
cd "$(dirname "$0")"
SALA="${1:-sala1}"
echo "Preparando (na primeira vez demora uns 2 minutos)..."
npm install --no-audit --no-fund --silent
( cd dedicado && npm install --no-audit --no-fund --silent && npx playwright install --with-deps chromium >/dev/null 2>&1 )
if [ -n "$CODESPACE_NAME" ]; then
  ( sleep 10; gh codespace ports visibility 3000:public -c "$CODESPACE_NAME" >/dev/null 2>&1 ) &
  echo ""
  echo "=================================================================="
  echo " ENDEREÇO DO SERVIDOR (coloque no campo Servidor do jogo):"
  echo "   ${CODESPACE_NAME}-3000.${GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN}"
  echo " Sala: $SALA"
  echo "=================================================================="
  echo ""
fi
node dedicado/dedicado.js "$SALA"
