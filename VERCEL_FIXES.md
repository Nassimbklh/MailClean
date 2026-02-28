# 🔧 Corrections pour déploiement Vercel

## ❌ PROBLÈMES TROUVÉS

### 1. Fichiers parasites dans le dossier parent

**Problème :**
```
/Users/nassim/Documents/MailClean/
├── package.json          ← PARASITE
├── package-lock.json     ← PARASITE
└── node_modules/         ← PARASITE
```

**Solution :**
```bash
cd /Users/nassim/Documents/MailClean
rm package.json
rm package-lock.json
rm -rf node_modules
```

---

### 2. ✅ Migration PostgreSQL (COMPLÉTÉ)

**État :**
- ✅ Le projet utilise maintenant PostgreSQL
- ✅ Le schéma Prisma a été mis à jour
- ✅ Compatible avec l'environnement serverless de Vercel

**Configuration PostgreSQL sur Vercel :**

**Option 1 : Neon (Recommandé - intégration native)**
1. Dans Vercel, aller dans votre projet
2. Onglet **Storage** → **Create Database**
3. Choisir **Neon Postgres**
4. Le `DATABASE_URL` sera automatiquement configuré

**Option 2 : Vercel Postgres**
1. Storage → Create Database → Postgres
2. Le `DATABASE_URL` sera automatiquement ajouté

**Option 3 : Supabase**
1. Créer un compte sur https://supabase.com
2. Créer un nouveau projet
3. Settings → Database → Connection String (Session mode)
4. Ajouter manuellement le `DATABASE_URL` dans Vercel

**Synchronisation du schéma :**

Après avoir connecté la base PostgreSQL :

```bash
# Push direct du schéma (recommandé pour la première fois)
npx prisma db push

# Ou créer une migration
npx prisma migrate deploy
```

---

## ✅ CONFIGURATION VERCEL

### Variables d'environnement requises

Dans Vercel → Settings → Environment Variables :

```env
# Database (OBLIGATOIRE - remplacer par votre URL PostgreSQL)
DATABASE_URL=postgresql://user:password@host:5432/database

# Google OAuth (OBLIGATOIRE)
GOOGLE_CLIENT_ID=your_client_id
GOOGLE_CLIENT_SECRET=your_client_secret
GOOGLE_REDIRECT_URI=https://your-app.vercel.app/api/auth/google/callback

# Session (OBLIGATOIRE)
SESSION_SECRET=votre_secret_aleatoire_32_caracteres_minimum

# App URL (OBLIGATOIRE)
NEXT_PUBLIC_APP_URL=https://your-app.vercel.app

# Stripe (Optionnel)
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...

# Resend (Optionnel)
RESEND_API_KEY=re_...
FROM_EMAIL=noreply@yourapp.com
CONTACT_EMAIL=support@yourapp.com
```

---

## 📋 CHECKLIST AVANT DÉPLOIEMENT

- [x] Supprimer les fichiers parasites du dossier parent
- [x] Migrer de SQLite vers PostgreSQL
- [ ] Tester le build localement : `npm run build`
- [ ] Pousser sur GitHub
- [ ] Configurer les variables d'environnement sur Vercel
- [ ] Créer et connecter une base PostgreSQL (Neon/Vercel/Supabase)
- [ ] Synchroniser le schéma avec `npx prisma db push`
- [ ] Mettre à jour Google OAuth redirect URIs

---

## 🚀 DÉPLOIEMENT

### Étape 1 : Nettoyer le dossier parent

```bash
cd /Users/nassim/Documents/MailClean
rm package.json package-lock.json
rm -rf node_modules
```

### Étape 2 : Pousser sur GitHub

```bash
cd mailclean-web
git add .
git commit -m "Prepare for Vercel deployment"
git push origin main
```

### Étape 3 : Importer sur Vercel

1. Aller sur https://vercel.com
2. New Project → Import `Nassimbklh/MailClean`
3. **Root Directory** : `mailclean-web` ← IMPORTANT
4. Ajouter les variables d'environnement
5. Deploy

### Étape 4 : Mettre à jour Google OAuth

1. Google Cloud Console → OAuth consent screen
2. Authorized domains : ajouter `vercel.app`
3. OAuth 2.0 Client ID → Authorized redirect URIs :
   ```
   https://your-app.vercel.app/api/auth/google/callback
   ```

---

## 🐛 DÉPANNAGE

### Erreur : "Prisma Client not initialized"
→ Les scripts `postinstall` et `build` devraient gérer ça automatiquement

### Erreur : "Database connection failed"
→ Vérifier que `DATABASE_URL` est bien configuré dans Vercel

### Erreur 404 sur /
→ Vérifier que Root Directory = `mailclean-web` sur Vercel

### Erreur "Table does not exist"
→ Exécuter `npx prisma db push` pour synchroniser le schéma avec PostgreSQL

---

## ✅ VÉRIFICATIONS POST-DÉPLOIEMENT

- [ ] La page d'accueil (/) s'affiche
- [ ] La connexion Google OAuth fonctionne
- [ ] Le dashboard s'affiche après connexion
- [ ] Les pages /privacy, /terms, /contact fonctionnent
- [ ] Le scan Gmail fonctionne (si DB configurée)
- [ ] Les logs Vercel ne montrent pas d'erreurs

---

Créé le : 28 février 2026
