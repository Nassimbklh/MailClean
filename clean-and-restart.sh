#!/bin/bash

echo "🧹 Nettoyage complet du projet..."

# 1. Supprimer tous les caches
echo "📦 Suppression des caches..."
rm -rf .next
rm -rf node_modules/.cache
rm -rf node_modules/.prisma
rm -rf node_modules/@prisma
find . -name "*.tsbuildinfo" -delete

# 2. Réinstaller Prisma
echo "💎 Réinstallation de Prisma..."
npm install @prisma/client prisma --force

# 3. Régénérer le client Prisma
echo "🔄 Régénération du client Prisma..."
npx prisma generate

# 4. Vérification
echo ""
echo "✅ Nettoyage terminé !"
echo ""
echo "⚠️  MAINTENANT, REDÉMARREZ LE SERVEUR MANUELLEMENT :"
echo "   1. Arrêtez le serveur avec Ctrl+C"
echo "   2. Lancez: npm run dev"
echo ""
