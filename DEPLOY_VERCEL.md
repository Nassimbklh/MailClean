# 🚀 Déployer MailClean sur Vercel

## ✅ Base de données PostgreSQL

Le projet utilise **PostgreSQL** comme base de données, compatible avec l'environnement serverless de Vercel.

### Solutions PostgreSQL pour production :

1. **Neon** (recommandé) - PostgreSQL serverless avec intégration Vercel native
2. **Vercel Postgres** - PostgreSQL managé directement dans Vercel
3. **Supabase** - PostgreSQL avec API REST et temps réel

---

## 📋 Étapes de déploiement

### 1. Importer le projet sur Vercel

1. Aller sur https://vercel.com
2. Cliquer sur **"Add New Project"**
3. Importer depuis GitHub : `Nassimbklh/MailClean`
4. Cliquer sur **"Import"**

---

### 2. Configurer les variables d'environnement

Dans Vercel, aller dans **"Environment Variables"** et ajouter :

#### **Variables obligatoires :**

```
DATABASE_URL=postgresql://user:password@host:5432/database
```
💡 **Exemple avec Neon** :
```
DATABASE_URL=postgresql://user:password@ep-example-123456.us-east-1.aws.neon.tech/mailclean?sslmode=require
```

```
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_REDIRECT_URI=https://votre-app.vercel.app/api/auth/google/callback
```

```
SESSION_SECRET=votre_secret_aleatoire_tres_long_au_moins_32_caracteres
```

```
NEXT_PUBLIC_APP_URL=https://votre-app.vercel.app
```

#### **Variables optionnelles (Stripe) :**

```
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_PRICE_ID_SOLO_MONTHLY=price_...
STRIPE_PRICE_ID_SOLO_YEARLY=price_...
STRIPE_PRICE_ID_FAMILY_MONTHLY=price_...
STRIPE_PRICE_ID_FAMILY_YEARLY=price_...
STRIPE_PRICE_ID_PRO_MONTHLY=price_...
STRIPE_PRICE_ID_PRO_YEARLY=price_...
```

#### **Variables optionnelles (Emails) :**

```
RESEND_API_KEY=re_...
FROM_EMAIL=noreply@votre-domaine.com
CONTACT_EMAIL=support@votre-domaine.com
```

---

### 3. Déployer

1. Cliquer sur **"Deploy"**
2. Attendre la fin du build (~2-3 minutes)
3. Votre app sera disponible sur `https://mail-clean.vercel.app`

---

## 🔧 Configuration Google OAuth

Une fois déployé, mettre à jour Google Cloud Console :

1. Aller sur https://console.cloud.google.com/
2. **OAuth consent screen** → Modifier
3. **Authorized domains** → Ajouter `vercel.app`
4. **OAuth 2.0 Client ID** → Modifier
5. **Authorized redirect URIs** → Ajouter :
   ```
   https://votre-app.vercel.app/api/auth/google/callback
   ```

---

## 📊 Configuration PostgreSQL

### Option 1 : Neon (Recommandé - intégration native Vercel)

1. Dans Vercel, aller dans votre projet
2. Onglet **Storage** → **Create Database**
3. Choisir **Neon Postgres**
4. Le `DATABASE_URL` sera automatiquement ajouté aux variables d'environnement

### Option 2 : Vercel Postgres

1. Dans Vercel, aller dans **Storage** → **Create Database**
2. Choisir **Postgres**
3. Créer la base de données
4. Le `DATABASE_URL` sera automatiquement configuré

### Option 3 : Supabase

1. Créer un compte sur https://supabase.com
2. Créer un nouveau projet
3. Aller dans **Settings** → **Database**
4. Copier le **Connection String** (mode Session)
5. Format : `postgresql://postgres:[password]@db.[project].supabase.co:5432/postgres`
6. Ajouter manuellement dans **Environment Variables** sur Vercel

### Synchronisation du schéma :

Après avoir connecté la base de données :

```bash
# Méthode 1 : Push direct du schéma (recommandé pour la première fois)
npx prisma db push

# Méthode 2 : Créer une migration (pour versioning)
npx prisma migrate deploy
```

---

## ✅ Vérifications post-déploiement

- [ ] Le site est accessible
- [ ] La connexion Google OAuth fonctionne
- [ ] Le scan Gmail fonctionne
- [ ] Les pages `/privacy`, `/terms`, `/contact` sont accessibles
- [ ] Le dark mode fonctionne
- [ ] Les logs Vercel ne montrent pas d'erreurs

---

## 🐛 Dépannage

### Erreur "Prisma Client not initialized"
→ Le build inclut maintenant `prisma generate`, ça devrait fonctionner

### Erreur "Database connection failed"
→ Vérifier que `DATABASE_URL` est correctement configuré

### Erreur OAuth "redirect_uri_mismatch"
→ Vérifier que l'URL de callback est bien ajoutée dans Google Cloud Console

### Erreur "Table does not exist"
→ Exécuter `npx prisma db push` pour synchroniser le schéma avec la base de données

---

## 🎉 Prochaines étapes

1. Configurer un domaine personnalisé (au lieu de `.vercel.app`)
2. Configurer Stripe en mode production
3. Ajouter un monitoring (Vercel Analytics)
4. Configurer les webhooks Stripe
5. Soumettre l'app Google OAuth pour vérification (voir GOOGLE_OAUTH_PRODUCTION.md)

---

Créé le : 28 février 2026
