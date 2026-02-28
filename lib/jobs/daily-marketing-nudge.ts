import { PrismaClient } from '@prisma/client';
import { sendMarketingNudge } from '../email-service';

const prisma = new PrismaClient();

export async function sendDailyMarketingNudges() {
  console.log('🕒 [Job] Démarrage du job de relance marketing...');

  // Calculer la date d'il y a 2 jours
  const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);

  try {
    // Trouver les utilisateurs éligibles pour le nudge
    const eligibleUsers = await prisma.user.findMany({
      where: {
        firstLoginAt: {
          lte: twoDaysAgo, // Première connexion il y a au moins 2 jours
        },
        marketingNudgeSentAt: null, // Nudge pas encore envoyé
        marketingOptIn: true, // Opt-in marketing
        marketingUnsubscribedAt: null, // Pas désabonné
        plan: 'free', // Seulement les utilisateurs gratuits
      },
      take: 100, // Limiter par batch pour ne pas surcharger
    });

    console.log(`📧 [Job] ${eligibleUsers.length} utilisateur(s) éligible(s) pour le nudge marketing`);

    let successCount = 0;
    let errorCount = 0;

    for (const user of eligibleUsers) {
      try {
        console.log(`📤 [Job] Envoi du nudge à ${user.email}...`);

        await sendMarketingNudge({
          email: user.email,
          name: user.name,
          plan: user.plan,
        });

        // Marquer le nudge comme envoyé
        await prisma.user.update({
          where: { id: user.id },
          data: { marketingNudgeSentAt: new Date() },
        });

        successCount++;
        console.log(`✅ [Job] Nudge envoyé avec succès à ${user.email}`);
      } catch (error) {
        errorCount++;
        console.error(`❌ [Job] Échec de l'envoi du nudge à ${user.email}:`, error);
      }
    }

    console.log(`✅ [Job] Job terminé: ${successCount} succès, ${errorCount} échecs`);
  } catch (error) {
    console.error('❌ [Job] Erreur lors de l\'exécution du job de nudge marketing:', error);
  }
}
