#!/bin/bash

echo "🚨 FORCE RESTART - Nettoyage TOTAL"
echo ""

# 1. Tuer TOUS les processus Node
echo "1️⃣ Arrêt de tous les processus Node.js..."
pkill -9 node 2>/dev/null || echo "   Aucun processus Node à tuer"
sleep 2

# 2. Nettoyer TOUS les caches
echo "2️⃣ Suppression de TOUS les caches..."
rm -rf .next
rm -rf node_modules/.cache
rm -rf node_modules/.prisma
rm -rf node_modules/@prisma
find . -name "*.tsbuildinfo" -delete
find . -name "tsconfig.tsbuildinfo" -delete
echo "   ✅ Caches supprimés"

# 3. Réinstaller Prisma
echo "3️⃣ Réinstallation de Prisma..."
npm install @prisma/client prisma --force --silent
echo "   ✅ Prisma réinstallé"

# 4. Régénérer le client Prisma
echo "4️⃣ Régénération du client Prisma..."
npx prisma generate --silent
echo "   ✅ Client Prisma régénéré"

# 5. Vérifier que le port est libre
echo "5️⃣ Vérification du port 3300..."
lsof -ti:3300 | xargs kill -9 2>/dev/null
echo "   ✅ Port 3300 libre"

echo ""
echo "✅ NETTOYAGE TERMINÉ !"
echo ""
echo "🚀 Démarrez maintenant le serveur avec :"
echo "   npm run dev"
echo ""
echo "⚠️  IMPORTANT : Après le démarrage, faites Ctrl+Shift+R dans le navigateur pour vider le cache !"
echo ""
