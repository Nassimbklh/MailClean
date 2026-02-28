import { Resend } from 'resend';
import crypto from 'crypto';
import prisma from '@/lib/prisma';

const resend = new Resend(process.env.RESEND_API_KEY);

const FROM_EMAIL = process.env.FROM_EMAIL || 'noreply@mailclean.app';
const FROM_NAME = process.env.FROM_NAME || 'MailClean';
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3300';

/**
 * Générer un token de désinscription sécurisé
 */
export function generateUnsubscribeToken(userId: string, purpose: string = 'marketing'): string {
  const secret = process.env.UNSUBSCRIBE_TOKEN_SECRET || 'default-secret-change-me';
  const expiry = Date.now() + 30 * 24 * 60 * 60 * 1000; // 30 jours

  const payload = JSON.stringify({ userId, purpose, expiry });
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(payload);
  const signature = hmac.digest('hex');

  return Buffer.from(JSON.stringify({ payload: payload, signature })).toString('base64');
}

/**
 * Vérifier un token de désinscription
 */
export function verifyUnsubscribeToken(token: string): { userId: string; purpose: string } | null {
  try {
    const secret = process.env.UNSUBSCRIBE_TOKEN_SECRET || 'default-secret-change-me';
    const decoded = JSON.parse(Buffer.from(token, 'base64').toString('utf-8'));
    const { payload, signature } = decoded;

    // Vérifier la signature
    const hmac = crypto.createHmac('sha256', secret);
    hmac.update(payload);
    const expectedSignature = hmac.digest('hex');

    if (signature !== expectedSignature) {
      console.error('Invalid signature');
      return null;
    }

    // Vérifier l'expiration
    const data = JSON.parse(payload);
    if (data.expiry < Date.now()) {
      console.error('Token expired');
      return null;
    }

    return { userId: data.userId, purpose: data.purpose };
  } catch (error) {
    console.error('Error verifying unsubscribe token:', error);
    return null;
  }
}

/**
 * Template de base pour tous les emails (style premium)
 */
function getEmailTemplate(content: string, unsubscribeUrl: string): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', sans-serif;
      line-height: 1.6;
      color: #1a1a1a;
      background-color: #f8f9fa;
    }
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: #f8f9fa;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8f9fa; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);">

          <!-- Header with logo -->
          <tr>
            <td style="padding: 32px 24px 24px 24px; background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); text-align: center;">
              <div style="display: inline-block; background-color: rgba(255, 255, 255, 0.15); padding: 12px 20px; border-radius: 12px; backdrop-filter: blur(10px);">
                <h1 style="margin: 0; font-size: 24px; font-weight: 700; color: #ffffff; letter-spacing: -0.5px;">
                  MailClean
                </h1>
                <p style="margin: 4px 0 0 0; font-size: 12px; font-weight: 400; color: rgba(255, 255, 255, 0.9); text-transform: uppercase; letter-spacing: 1px;">
                  Inbox cleaner
                </p>
              </div>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 40px 24px;">
              ${content}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 24px; background-color: #f8f9fa; border-top: 1px solid #e5e7eb;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="text-align: center;">
                    <p style="margin: 0; font-size: 13px; color: #6b7280;">
                      <a href="${APP_URL}" style="color: #6b7280; text-decoration: none; margin: 0 8px;">MailClean</a>
                      <span style="color: #d1d5db;">•</span>
                      <a href="mailto:support@mailclean.app" style="color: #6b7280; text-decoration: none; margin: 0 8px;">Support</a>
                      <span style="color: #d1d5db;">•</span>
                      <a href="${unsubscribeUrl}" style="color: #6b7280; text-decoration: none; margin: 0 8px;">Se désinscrire</a>
                    </p>
                    <p style="margin: 12px 0 0 0; font-size: 12px; color: #9ca3af;">
                      © ${new Date().getFullYear()} MailClean. Tous droits réservés.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;
}

/**
 * Bouton CTA moderne
 */
function getCtaButton(text: string, url: string, isPrimary: boolean = true): string {
  const bgColor = isPrimary ? '#6366f1' : '#f3f4f6';
  const textColor = isPrimary ? '#ffffff' : '#1f2937';
  const hoverBg = isPrimary ? '#4f46e5' : '#e5e7eb';

  return `
    <table width="100%" cellpadding="0" cellspacing="0" style="margin: 32px 0;">
      <tr>
        <td align="center">
          <a href="${url}" style="display: inline-block; padding: 14px 32px; background-color: ${bgColor}; color: ${textColor}; text-decoration: none; border-radius: 12px; font-weight: 600; font-size: 15px; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1); transition: all 0.2s;">
            ${text}
          </a>
        </td>
      </tr>
    </table>
  `;
}

/**
 * Envoyer l'email de bienvenue
 */
export async function sendWelcomeEmail(user: { email: string; name?: string | null }) {
  const unsubscribeToken = generateUnsubscribeToken(user.email, 'transactional');
  const unsubscribeUrl = `${APP_URL}/unsubscribe?token=${unsubscribeToken}`;

  const firstName = user.name?.split(' ')[0] || 'là';

  const content = `
    <h2 style="margin: 0 0 8px 0; font-size: 28px; font-weight: 700; color: #1f2937; letter-spacing: -0.5px;">
      Bienvenue ${firstName} ! 👋
    </h2>

    <p style="margin: 16px 0 0 0; font-size: 16px; color: #4b5563; line-height: 1.6;">
      Merci de nous faire confiance pour nettoyer votre boîte Gmail.
    </p>

    <div style="margin: 32px 0; padding: 24px; background-color: #f9fafb; border-radius: 12px; border-left: 3px solid #6366f1;">
      <p style="margin: 0 0 16px 0; font-size: 15px; font-weight: 600; color: #1f2937;">
        Voici ce que vous pouvez faire :
      </p>
      <ul style="margin: 0; padding-left: 20px; color: #4b5563; font-size: 15px; line-height: 1.8;">
        <li>Identifier les expéditeurs qui encombrent votre boîte</li>
        <li>Supprimer des milliers d'emails en un clic</li>
        <li>Se désabonner automatiquement des newsletters</li>
        <li>Suivre vos statistiques de nettoyage</li>
      </ul>
    </div>

    ${getCtaButton('Accéder à mon tableau de bord', `${APP_URL}/dashboard-new`)}

    <div style="margin: 40px 0 0 0; padding: 20px 0; border-top: 1px solid #e5e7eb;">
      <p style="margin: 0; font-size: 14px; color: #6b7280; text-align: center;">
        Une question ? Répondez simplement à cet email.
      </p>
    </div>
  `;

  const html = getEmailTemplate(content, unsubscribeUrl);

  const text = `
Bienvenue ${firstName} !

Merci de nous faire confiance pour nettoyer votre boîte Gmail.

Voici ce que vous pouvez faire :
• Identifier les expéditeurs qui encombrent votre boîte
• Supprimer des milliers d'emails en un clic
• Se désabonner automatiquement des newsletters
• Suivre vos statistiques de nettoyage

Accédez à votre tableau de bord : ${APP_URL}/dashboard-new

Une question ? Répondez simplement à cet email.

---
MailClean • Support • Se désinscrire : ${unsubscribeUrl}
  `;

  try {
    const { data, error } = await resend.emails.send({
      from: `${FROM_NAME} <${FROM_EMAIL}>`,
      to: [user.email],
      subject: 'Bienvenue sur MailClean ! 👋',
      html,
      text,
    });

    if (error) {
      console.error('Error sending welcome email:', error);
      throw error;
    }

    console.log('✅ Welcome email sent to:', user.email);
    return { success: true, emailId: data?.id };
  } catch (error) {
    console.error('Failed to send welcome email:', error);
    throw error;
  }
}

/**
 * Envoyer l'email de relance marketing (J+2)
 */
export async function sendMarketingNudge(user: { email: string; name?: string | null; plan: string }) {
  const unsubscribeToken = generateUnsubscribeToken(user.email, 'marketing');
  const unsubscribeUrl = `${APP_URL}/unsubscribe?token=${unsubscribeToken}`;

  const firstName = user.name?.split(' ')[0] || 'là';

  const content = `
    <h2 style="margin: 0 0 8px 0; font-size: 28px; font-weight: 700; color: #1f2937; letter-spacing: -0.5px;">
      Passez à Premium 💎
    </h2>

    <p style="margin: 16px 0 0 0; font-size: 16px; color: #4b5563; line-height: 1.6;">
      Bonjour ${firstName},
    </p>

    <p style="margin: 16px 0 0 0; font-size: 16px; color: #4b5563; line-height: 1.6;">
      Vous utilisez MailClean depuis quelques jours et nous espérons que l'expérience vous plaît !
    </p>

    <div style="margin: 32px 0; padding: 24px; background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%); border-radius: 12px; border: 1px solid #bfdbfe;">
      <p style="margin: 0 0 16px 0; font-size: 15px; font-weight: 600; color: #1f2937;">
        Avec Premium, débloquez :
      </p>
      <ul style="margin: 0; padding-left: 20px; color: #374151; font-size: 15px; line-height: 1.8;">
        <li><strong>Nettoyage illimité</strong> – aucune restriction</li>
        <li><strong>Désabonnement automatique</strong> – toutes les newsletters</li>
        <li><strong>Statistiques avancées</strong> – suivez vos progrès</li>
        <li><strong>Support prioritaire</strong> – réponse rapide</li>
      </ul>
    </div>

    ${getCtaButton('Découvrir les plans Premium', `${APP_URL}/tarifs`)}

    <p style="margin: 32px 0 0 0; font-size: 14px; color: #6b7280; text-align: center; line-height: 1.6;">
      Pas intéressé pour le moment ? Aucun problème.<br>
      Vous pouvez continuer à utiliser la version gratuite.
    </p>
  `;

  const html = getEmailTemplate(content, unsubscribeUrl);

  const text = `
Passez à Premium

Bonjour ${firstName},

Vous utilisez MailClean depuis quelques jours et nous espérons que l'expérience vous plaît !

Avec Premium, débloquez :
• Nettoyage illimité – aucune restriction
• Désabonnement automatique – toutes les newsletters
• Statistiques avancées – suivez vos progrès
• Support prioritaire – réponse rapide

Découvrir les plans Premium : ${APP_URL}/tarifs

Pas intéressé pour le moment ? Aucun problème.
Vous pouvez continuer à utiliser la version gratuite.

---
MailClean • Support • Se désinscrire : ${unsubscribeUrl}
  `;

  try {
    const { data, error } = await resend.emails.send({
      from: `${FROM_NAME} <${FROM_EMAIL}>`,
      to: [user.email],
      subject: '💎 Découvrez MailClean Premium',
      html,
      text,
    });

    if (error) {
      console.error('Error sending marketing nudge:', error);
      throw error;
    }

    console.log('✅ Marketing nudge sent to:', user.email);
    return { success: true, emailId: data?.id };
  } catch (error) {
    console.error('Failed to send marketing nudge:', error);
    throw error;
  }
}

/**
 * Générer un code promo aléatoire unique
 */
function generatePromoCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Sans caractères ambigus (I,O,0,1)
  let code = '';
  for (let i = 0; i < 10; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

/**
 * Envoyer un email promotion Premium avec code -10% généré automatiquement (MENSUEL UNIQUEMENT)
 * Ce code est unique à chaque utilisateur et valable 7 jours
 */
export async function sendPremiumPromoEmail(user: {
  email: string;
  name?: string | null;
  userId: string;
}) {
  // Générer un code promo unique
  let promoCode = generatePromoCode();

  // Vérifier l'unicité
  let attempts = 0;
  while (attempts < 10) {
    const existing = await prisma.promoCode.findUnique({
      where: { code: promoCode }
    });

    if (!existing) break;

    promoCode = generatePromoCode();
    attempts++;
  }

  if (attempts >= 10) {
    throw new Error('Impossible de générer un code promo unique');
  }

  // Créer le code promo en base de données
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7); // Valable 7 jours

  const dbPromoCode = await prisma.promoCode.create({
    data: {
      code: promoCode,
      discountPercent: 10,
      maxUses: 1, // Unique par utilisateur
      expiresAt,
      allowedBillingPeriod: 'MONTHLY',
      isActive: true,
      createdBy: 'system_auto_promo',
    }
  });

  console.log(`✅ Code promo généré: ${promoCode} pour ${user.email}`);

  // Envoyer l'email avec le code
  const result = await sendPromoCodeEmail(user, {
    code: dbPromoCode.code,
    discountPercent: dbPromoCode.discountPercent,
    expiresAt: dbPromoCode.expiresAt,
    allowedBillingPeriod: dbPromoCode.allowedBillingPeriod,
  });

  return result;
}

/**
 * Envoyer un email avec code promo -10% (MENSUEL UNIQUEMENT)
 * Fonction interne - utilisez sendPremiumPromoEmail() pour générer automatiquement le code
 */
export async function sendPromoCodeEmail(user: {
  email: string;
  name?: string | null
}, promoCode: {
  code: string;
  discountPercent: number;
  expiresAt: Date;
  allowedBillingPeriod: string;
}) {
  const unsubscribeToken = generateUnsubscribeToken(user.email, 'marketing');
  const unsubscribeUrl = `${APP_URL}/unsubscribe?token=${unsubscribeToken}`;

  const firstName = user.name?.split(' ')[0] || 'là';
  const expiryDate = new Date(promoCode.expiresAt).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  const content = `
    <h2 style="margin: 0 0 8px 0; font-size: 28px; font-weight: 700; color: #1f2937; letter-spacing: -0.5px;">
      🎁 Votre code -${promoCode.discountPercent}% (mensuel)
    </h2>

    <p style="margin: 16px 0 0 0; font-size: 16px; color: #4b5563; line-height: 1.6;">
      Bonjour ${firstName},
    </p>

    <p style="margin: 16px 0 0 0; font-size: 16px; color: #4b5563; line-height: 1.6;">
      Nous avons une <strong>offre exclusive</strong> pour vous !
    </p>

    <!-- Coupon Code -->
    <div style="margin: 32px 0; padding: 32px; background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); border-radius: 16px; text-align: center;">
      <p style="margin: 0 0 12px 0; font-size: 13px; color: rgba(255, 255, 255, 0.8); text-transform: uppercase; letter-spacing: 1.5px; font-weight: 600;">
        Code promo
      </p>
      <div style="background-color: #ffffff; display: inline-block; padding: 16px 40px; border-radius: 12px; box-shadow: 0 8px 16px rgba(0, 0, 0, 0.15);">
        <p style="margin: 0; font-size: 36px; font-weight: 800; color: #6366f1; font-family: 'Courier New', monospace; letter-spacing: 4px;">
          ${promoCode.code}
        </p>
      </div>
      <p style="margin: 20px 0 0 0; font-size: 20px; font-weight: 700; color: #ffffff;">
        -${promoCode.discountPercent}% de réduction
      </p>
      <p style="margin: 8px 0 0 0; font-size: 14px; color: rgba(255, 255, 255, 0.9); font-weight: 500;">
        Offre mensuelle uniquement
      </p>
    </div>

    <!-- Restriction Warning -->
    <div style="margin: 24px 0; padding: 20px; background-color: #fef3c7; border-left: 4px solid #f59e0b; border-radius: 8px;">
      <p style="margin: 0; font-size: 14px; color: #92400e; font-weight: 600;">
        ⚠️ Valable uniquement sur les abonnements mensuels
      </p>
      <p style="margin: 8px 0 0 0; font-size: 13px; color: #92400e;">
        Non valable sur l'abonnement annuel.
      </p>
    </div>

    <!-- How to use -->
    <div style="margin: 32px 0; padding: 24px; background-color: #f9fafb; border-radius: 12px;">
      <p style="margin: 0 0 16px 0; font-size: 15px; font-weight: 600; color: #1f2937;">
        Comment utiliser votre code :
      </p>
      <ol style="margin: 0; padding-left: 20px; color: #4b5563; font-size: 15px; line-height: 1.8;">
        <li>Cliquez sur le bouton ci-dessous</li>
        <li>Choisissez un <strong>plan mensuel</strong> (Solo ou Famille)</li>
        <li>Entrez le code <strong>${promoCode.code}</strong> lors du paiement</li>
        <li>Profitez de vos -${promoCode.discountPercent}% !</li>
      </ol>
    </div>

    ${getCtaButton('Activer mon -' + promoCode.discountPercent + '%', `${APP_URL}/pricing?promo=${promoCode.code}`)}

    <!-- Expiry -->
    <div style="margin: 32px 0; padding: 16px; background-color: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; text-align: center;">
      <p style="margin: 0; font-size: 14px; color: #991b1b; font-weight: 600;">
        ⏰ Offre valable jusqu'au ${expiryDate}
      </p>
    </div>

    <div style="margin: 40px 0 0 0; padding: 20px 0; border-top: 1px solid #e5e7eb;">
      <p style="margin: 0; font-size: 14px; color: #6b7280; text-align: center; line-height: 1.6;">
        Pourquoi Premium ? Nettoyage illimité • Désabonnement automatique<br>
        Statistiques avancées • Support prioritaire
      </p>
    </div>
  `;

  const html = getEmailTemplate(content, unsubscribeUrl);

  const text = `
🎁 Votre code -${promoCode.discountPercent}% (mensuel)

Bonjour ${firstName},

Nous avons une offre exclusive pour vous !

━━━━━━━━━━━━━━━━━
CODE PROMO : ${promoCode.code}
-${promoCode.discountPercent}% de réduction
Offre mensuelle uniquement
━━━━━━━━━━━━━━━━━

⚠️ Valable uniquement sur les abonnements mensuels
Non valable sur l'abonnement annuel.

Comment utiliser votre code :
1. Accédez à nos plans Premium
2. Choisissez un plan mensuel (Solo ou Famille)
3. Entrez le code ${promoCode.code} lors du paiement
4. Profitez de vos -${promoCode.discountPercent}% !

Activer mon code : ${APP_URL}/pricing?promo=${promoCode.code}

⏰ Offre valable jusqu'au ${expiryDate}

Pourquoi Premium ?
• Nettoyage illimité
• Désabonnement automatique
• Statistiques avancées
• Support prioritaire

---
MailClean • Support • Se désinscrire : ${unsubscribeUrl}
  `;

  try {
    const { data, error } = await resend.emails.send({
      from: `${FROM_NAME} <${FROM_EMAIL}>`,
      to: [user.email],
      subject: `🎁 ${promoCode.code} : -${promoCode.discountPercent}% sur MailClean (mensuel uniquement)`,
      html,
      text,
    });

    if (error) {
      console.error('Error sending promo code email:', error);
      throw error;
    }

    console.log(`✅ Promo code email sent to: ${user.email} (code: ${promoCode.code})`);
    return { success: true, emailId: data?.id };
  } catch (error) {
    console.error('Failed to send promo code email:', error);
    throw error;
  }
}

/**
 * Envoyer l'email de confirmation après achat d'abonnement
 */
export async function sendPurchaseConfirmationEmail(data: {
  user: {
    email: string;
    name?: string | null;
  };
  subscription: {
    planId: string;
    billing: string;
    currentPeriodStart: Date;
    currentPeriodEnd: Date;
    amount: number; // en centimes
  };
  invoice?: {
    invoiceNumber: string;
    transactionId?: string;
  };
}) {
  const unsubscribeToken = generateUnsubscribeToken(data.user.email, 'transactional');
  const unsubscribeUrl = `${APP_URL}/unsubscribe?token=${unsubscribeToken}`;

  const firstName = data.user.name?.split(' ')[0] || 'là';

  // Noms de plans
  const planNames: Record<string, string> = {
    solo: 'Solo',
    family: 'Famille',
    pro: 'Pro',
  };

  const planName = planNames[data.subscription.planId] || data.subscription.planId;
  const billingLabel = data.subscription.billing === 'yearly' ? 'Annuel' : 'Mensuel';
  const amountFormatted = (data.subscription.amount / 100).toFixed(2);

  const startDate = new Date(data.subscription.currentPeriodStart).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });

  const endDate = new Date(data.subscription.currentPeriodEnd).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });

  // Avantages selon le plan
  const benefits: Record<string, string[]> = {
    solo: [
      'Scan jusqu\'à 20 000 emails',
      'Désabonnement automatique illimité',
      'Suppression en masse',
      'Statistiques détaillées',
      'Support prioritaire'
    ],
    family: [
      'Jusqu\'à 5 comptes',
      'Scan jusqu\'à 20 000 emails par compte',
      'Désabonnement automatique illimité',
      'Suppression en masse',
      'Statistiques détaillées',
      'Support prioritaire familial'
    ],
    pro: [
      'Comptes illimités',
      'Scan jusqu\'à 20 000 emails par compte',
      'Désabonnement automatique illimité',
      'Suppression en masse',
      'Statistiques avancées',
      'Support prioritaire dédié',
      'Gestion d\'équipe'
    ]
  };

  const planBenefits = benefits[data.subscription.planId] || benefits.solo;

  const content = `
    <div style="text-align: center; margin-bottom: 24px;">
      <div style="display: inline-block; padding: 12px 24px; background-color: #dcfce7; border-radius: 8px;">
        <p style="margin: 0; font-size: 16px; font-weight: 600; color: #166534;">
          ✅ Abonnement activé
        </p>
      </div>
    </div>

    <h2 style="margin: 0 0 8px 0; font-size: 28px; font-weight: 700; color: #1f2937; letter-spacing: -0.5px; text-align: center;">
      Merci ${firstName} ! 🎉
    </h2>

    <p style="margin: 16px 0 0 0; font-size: 16px; color: #4b5563; line-height: 1.6; text-align: center;">
      Votre abonnement <strong>${planName} ${billingLabel}</strong> est maintenant actif.
    </p>

    <!-- Subscription Details -->
    <div style="margin: 32px 0; padding: 24px; background-color: #f9fafb; border-radius: 12px; border: 1px solid #e5e7eb;">
      <p style="margin: 0 0 20px 0; font-size: 15px; font-weight: 600; color: #1f2937;">
        📋 Détails de votre abonnement
      </p>
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td style="padding: 8px 0; font-size: 14px; color: #6b7280;">Plan choisi</td>
          <td style="padding: 8px 0; font-size: 14px; color: #1f2937; font-weight: 600; text-align: right;">${planName} ${billingLabel}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; font-size: 14px; color: #6b7280;">Date de début</td>
          <td style="padding: 8px 0; font-size: 14px; color: #1f2937; font-weight: 600; text-align: right;">${startDate}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; font-size: 14px; color: #6b7280;">Prochain renouvellement</td>
          <td style="padding: 8px 0; font-size: 14px; color: #1f2937; font-weight: 600; text-align: right;">${endDate}</td>
        </tr>
        ${data.invoice ? `
        <tr>
          <td style="padding: 8px 0; font-size: 14px; color: #6b7280;">Numéro de facture</td>
          <td style="padding: 8px 0; font-size: 14px; color: #1f2937; font-weight: 600; text-align: right;">${data.invoice.invoiceNumber}</td>
        </tr>
        ` : ''}
        ${data.invoice?.transactionId ? `
        <tr>
          <td style="padding: 8px 0; font-size: 14px; color: #6b7280;">Transaction</td>
          <td style="padding: 8px 0; font-size: 14px; color: #1f2937; font-weight: 600; text-align: right; font-family: monospace; font-size: 12px;">${data.invoice.transactionId.substring(0, 20)}...</td>
        </tr>
        ` : ''}
        <tr>
          <td style="padding: 8px 0; border-top: 1px solid #e5e7eb; font-size: 15px; color: #1f2937; font-weight: 600;">Montant</td>
          <td style="padding: 8px 0; border-top: 1px solid #e5e7eb; font-size: 15px; color: #1f2937; font-weight: 700; text-align: right;">${amountFormatted} €</td>
        </tr>
      </table>
    </div>

    <!-- Benefits -->
    <div style="margin: 32px 0; padding: 24px; background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%); border-radius: 12px; border: 1px solid #bae6fd;">
      <p style="margin: 0 0 16px 0; font-size: 15px; font-weight: 600; color: #1f2937;">
        🎁 Vos avantages ${planName}
      </p>
      <ul style="margin: 0; padding-left: 20px; color: #374151; font-size: 15px; line-height: 1.8;">
        ${planBenefits.map(benefit => `<li>${benefit}</li>`).join('\n        ')}
      </ul>
    </div>

    ${getCtaButton('Accéder à mon tableau de bord', `${APP_URL}/dashboard-new`)}

    ${data.invoice ? `
    <div style="margin: 32px 0; padding: 16px; background-color: #fefce8; border: 1px solid #fde047; border-radius: 8px; text-align: center;">
      <p style="margin: 0; font-size: 14px; color: #854d0e;">
        📄 Téléchargez votre facture depuis la page <a href="${APP_URL}/account/billing" style="color: #6366f1; text-decoration: underline;">Mon abonnement</a>
      </p>
    </div>
    ` : ''}

    <div style="margin: 40px 0 0 0; padding: 20px 0; border-top: 1px solid #e5e7eb;">
      <p style="margin: 0 0 8px 0; font-size: 14px; color: #1f2937; font-weight: 600; text-align: center;">
        Gérer mon abonnement
      </p>
      <p style="margin: 0; font-size: 14px; color: #6b7280; text-align: center; line-height: 1.6;">
        Vous pouvez modifier ou annuler votre abonnement à tout moment<br>
        depuis votre <a href="${APP_URL}/account/billing" style="color: #6366f1; text-decoration: underline;">espace abonnement</a>.
      </p>
    </div>

    <div style="margin: 32px 0 0 0; padding: 20px 0; border-top: 1px solid #e5e7eb;">
      <p style="margin: 0; font-size: 14px; color: #6b7280; text-align: center;">
        Une question ? Contactez-nous à support@mailclean.app
      </p>
    </div>
  `;

  const html = getEmailTemplate(content, unsubscribeUrl);

  const text = `
Votre abonnement MailClean est activé ✅

Merci ${firstName} !

Votre abonnement ${planName} ${billingLabel} est maintenant actif.

━━━━━━━━━━━━━━━━━━━━━━━━━━━
Détails de votre abonnement
━━━━━━━━━━━━━━━━━━━━━━━━━━━

Plan choisi: ${planName} ${billingLabel}
Date de début: ${startDate}
Prochain renouvellement: ${endDate}
${data.invoice ? `Numéro de facture: ${data.invoice.invoiceNumber}` : ''}
${data.invoice?.transactionId ? `Transaction: ${data.invoice.transactionId}` : ''}
Montant: ${amountFormatted} €

━━━━━━━━━━━━━━━━━━━━━━━━━━━
Vos avantages ${planName}
━━━━━━━━━━━━━━━━━━━━━━━━━━━

${planBenefits.map(benefit => `• ${benefit}`).join('\n')}

Accéder à mon tableau de bord : ${APP_URL}/dashboard-new

${data.invoice ? `📄 Téléchargez votre facture : ${APP_URL}/account/billing` : ''}

Gérer mon abonnement :
Vous pouvez modifier ou annuler votre abonnement à tout moment depuis ${APP_URL}/account/billing

Une question ? Contactez-nous à support@mailclean.app

---
MailClean • Support • Se désinscrire : ${unsubscribeUrl}
  `;

  try {
    const { data: emailData, error } = await resend.emails.send({
      from: `${FROM_NAME} <${FROM_EMAIL}>`,
      to: [data.user.email],
      subject: '✅ Votre abonnement MailClean est activé',
      html,
      text,
    });

    if (error) {
      console.error('Error sending purchase confirmation email:', error);
      throw error;
    }

    console.log(`✅ Purchase confirmation email sent to: ${data.user.email}`);
    return { success: true, emailId: emailData?.id };
  } catch (error) {
    console.error('Failed to send purchase confirmation email:', error);
    throw error;
  }
}

/**
 * Envoyer l'email de confirmation de désabonnement
 */
export async function sendUnsubscribeConfirmationEmail(data: {
  user: {
    email: string;
    name?: string | null;
  };
  subscription: {
    planId: string;
    billing: string;
    currentPeriodEnd: Date;
  };
}) {
  const unsubscribeToken = generateUnsubscribeToken(data.user.email, 'transactional');
  const unsubscribeUrl = `${APP_URL}/unsubscribe?token=${unsubscribeToken}`;

  const firstName = data.user.name?.split(' ')[0] || 'là';

  // Noms de plans
  const planNames: Record<string, string> = {
    solo: 'Solo',
    family: 'Famille',
    pro: 'Pro',
  };

  const planName = planNames[data.subscription.planId] || data.subscription.planId;
  const billingLabel = data.subscription.billing === 'yearly' ? 'Annuel' : 'Mensuel';

  const endDate = new Date(data.subscription.currentPeriodEnd).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });

  const content = `
    <div style="text-align: center; margin-bottom: 24px;">
      <div style="display: inline-block; padding: 12px 24px; background-color: #fef3c7; border-radius: 8px;">
        <p style="margin: 0; font-size: 16px; font-weight: 600; color: #92400e;">
          ⚠️ Désabonnement confirmé
        </p>
      </div>
    </div>

    <h2 style="margin: 0 0 8px 0; font-size: 28px; font-weight: 700; color: #1f2937; letter-spacing: -0.5px; text-align: center;">
      Votre désabonnement est confirmé
    </h2>

    <p style="margin: 16px 0 0 0; font-size: 16px; color: #4b5563; line-height: 1.6; text-align: center;">
      Bonjour ${firstName},
    </p>

    <p style="margin: 16px 0 0 0; font-size: 16px; color: #4b5563; line-height: 1.6; text-align: center;">
      Nous avons bien reçu votre demande d'annulation pour votre abonnement <strong>${planName} ${billingLabel}</strong>.
    </p>

    <!-- Important Notice -->
    <div style="margin: 32px 0; padding: 24px; background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); border-radius: 12px; border: 1px solid #fbbf24;">
      <p style="margin: 0 0 16px 0; font-size: 16px; font-weight: 600; color: #92400e; text-align: center;">
        📅 Informations importantes
      </p>
      <ul style="margin: 0; padding-left: 20px; color: #78350f; font-size: 15px; line-height: 1.8;">
        <li>Votre abonnement restera <strong>actif jusqu'au ${endDate}</strong></li>
        <li>Vous pourrez continuer à utiliser toutes les fonctionnalités Premium jusqu'à cette date</li>
        <li><strong>Vous ne serez pas prélevé après le ${endDate}</strong></li>
        <li>Votre compte passera automatiquement en plan Gratuit après cette date</li>
      </ul>
    </div>

    <!-- What happens next -->
    <div style="margin: 32px 0; padding: 24px; background-color: #f9fafb; border-radius: 12px; border: 1px solid #e5e7eb;">
      <p style="margin: 0 0 16px 0; font-size: 15px; font-weight: 600; color: #1f2937;">
        📋 Que se passe-t-il ensuite ?
      </p>
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td style="padding: 8px 0; font-size: 14px; color: #6b7280;">Jusqu'au ${endDate}</td>
          <td style="padding: 8px 0; font-size: 14px; color: #1f2937; font-weight: 600; text-align: right;">Accès Premium complet</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; font-size: 14px; color: #6b7280;">Après le ${endDate}</td>
          <td style="padding: 8px 0; font-size: 14px; color: #1f2937; font-weight: 600; text-align: right;">Passage au plan Gratuit</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; font-size: 14px; color: #6b7280;">Prochaine facturation</td>
          <td style="padding: 8px 0; font-size: 14px; color: #16a34a; font-weight: 700; text-align: right;">Aucune 🎉</td>
        </tr>
      </table>
    </div>

    <!-- Reactivate option -->
    <div style="margin: 32px 0; padding: 24px; background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%); border-radius: 12px; border: 1px solid #bae6fd;">
      <p style="margin: 0 0 12px 0; font-size: 15px; font-weight: 600; color: #1f2937; text-align: center;">
        💡 Vous avez changé d'avis ?
      </p>
      <p style="margin: 0; font-size: 14px; color: #374151; text-align: center; line-height: 1.6;">
        Vous pouvez réactiver votre abonnement à tout moment avant le ${endDate}<br>
        depuis votre <a href="${APP_URL}/account/billing" style="color: #6366f1; text-decoration: underline;">espace abonnement</a>.
      </p>
    </div>

    ${getCtaButton('Gérer mon abonnement', `${APP_URL}/account/billing`, false)}

    <div style="margin: 40px 0 0 0; padding: 20px 0; border-top: 1px solid #e5e7eb;">
      <p style="margin: 0; font-size: 14px; color: #6b7280; text-align: center; line-height: 1.6;">
        Nous sommes désolés de vous voir partir !<br>
        Si vous avez des suggestions pour améliorer MailClean,<br>
        n'hésitez pas à nous écrire à <a href="mailto:support@mailclean.app" style="color: #6366f1; text-decoration: underline;">support@mailclean.app</a>
      </p>
    </div>
  `;

  const html = getEmailTemplate(content, unsubscribeUrl);

  const text = `
Votre désabonnement est confirmé ⚠️

Bonjour ${firstName},

Nous avons bien reçu votre demande d'annulation pour votre abonnement ${planName} ${billingLabel}.

━━━━━━━━━━━━━━━━━━━━━━━━━━━
Informations importantes
━━━━━━━━━━━━━━━━━━━━━━━━━━━

• Votre abonnement restera actif jusqu'au ${endDate}
• Vous pourrez continuer à utiliser toutes les fonctionnalités Premium jusqu'à cette date
• Vous ne serez pas prélevé après le ${endDate}
• Votre compte passera automatiquement en plan Gratuit après cette date

━━━━━━━━━━━━━━━━━━━━━━━━━━━
Que se passe-t-il ensuite ?
━━━━━━━━━━━━━━━━━━━━━━━━━━━

Jusqu'au ${endDate}: Accès Premium complet
Après le ${endDate}: Passage au plan Gratuit
Prochaine facturation: Aucune 🎉

💡 Vous avez changé d'avis ?
Vous pouvez réactiver votre abonnement à tout moment avant le ${endDate} depuis ${APP_URL}/account/billing

Gérer mon abonnement : ${APP_URL}/account/billing

Nous sommes désolés de vous voir partir !
Si vous avez des suggestions pour améliorer MailClean, n'hésitez pas à nous écrire à support@mailclean.app

---
MailClean • Support • Se désinscrire : ${unsubscribeUrl}
  `;

  try {
    const { data: emailData, error } = await resend.emails.send({
      from: `${FROM_NAME} <${FROM_EMAIL}>`,
      to: [data.user.email],
      subject: '⚠️ Confirmation de désabonnement - MailClean',
      html,
      text,
    });

    if (error) {
      console.error('Error sending unsubscribe confirmation email:', error);
      throw error;
    }

    console.log(`✅ Unsubscribe confirmation email sent to: ${data.user.email}`);
    return { success: true, emailId: emailData?.id };
  } catch (error) {
    console.error('Failed to send unsubscribe confirmation email:', error);
    throw error;
  }
}
