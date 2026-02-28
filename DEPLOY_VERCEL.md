# 🚀 Déployer MailClean sur Vercel

## ⚠️ Note importante sur SQLite

**SQLite n'est PAS recommandé pour Vercel** car le système de fichiers est éphémère (les données seront perdues à chaque déploiement).

### Solutions pour la production :

1. **PostgreSQL** (recommandé) - Utiliser Vercel Postgres ou Supabase
2. **MySQL** - Utiliser PlanetScale ou Vercel MySQL
3. **MongoDB** - Utiliser MongoDB Atlas

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
DATABASE_URL=file:./dev.db
```
⚠️ **Pour production, remplacer par une vraie base de données** :
- PostgreSQL : `postgresql://user:password@host:5432/database`
- MySQL : `mysql://user:password@host:3306/database`

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

## 📊 Migration vers PostgreSQL (recommandé pour production)

### Option 1 : Vercel Postgres

1. Dans Vercel, aller dans **Storage** → **Create Database**
2. Choisir **Postgres**
3. Créer la base de données
4. Copier le `DATABASE_URL` fourni par Vercel
5. Mettre à jour dans **Environment Variables**

### Option 2 : Supabase

1. Créer un compte sur https://supabase.com
2. Créer un nouveau projet
3. Aller dans **Settings** → **Database**
4. Copier le **Connection String** (mode Session)
5. Format : `postgresql://postgres:[password]@db.[project].supabase.co:5432/postgres`

### Migration du schéma :

```bash
# Localement, mettre à jour le DATABASE_URL
DATABASE_URL="postgresql://..."

# Générer la migration
npx prisma migrate dev --name init

# Pousser le schéma
npx prisma db push
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

### Les données disparaissent après chaque déploiement
→ SQLite n'est pas persistant sur Vercel, migrer vers PostgreSQL

---

## 🎉 Prochaines étapes

1. Configurer un domaine personnalisé (au lieu de `.vercel.app`)
2. Migrer vers PostgreSQL pour la production
3. Configurer Stripe en mode production
4. Ajouter un monitoring (Vercel Analytics)
5. Configurer les webhooks Stripe

---

Créé le : 28 février 2026
