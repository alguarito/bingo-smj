#!/bin/bash
# Publica los cambios del Bingo SMJ en la web (GitHub Pages).
# Uso:  ./deploy.sh "mensaje opcional"
set -e
cd "$(dirname "$0")"

echo "→ Regenerando archivo único…"
python3 bundle.py

echo "→ Subiendo cambios…"
git add -A
git commit -m "${1:-Actualización del Bingo SMJ}" || { echo "Sin cambios para publicar."; exit 0; }
git push origin main

echo ""
echo "✅ Publicado. En ~1 minuto estará actualizado en:"
echo "   https://alguarito.github.io/bingo-smj/"
