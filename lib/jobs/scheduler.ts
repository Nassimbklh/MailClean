import cron from 'node-cron';
import { sendDailyMarketingNudges } from './daily-marketing-nudge';

let schedulerStarted = false;

export function startScheduler() {
  if (schedulerStarted) {
    console.log('⚠️  [Scheduler] Le scheduler est déjà démarré');
    return;
  }

  console.log('🚀 [Scheduler] Démarrage du scheduler de jobs...');

  // Job quotidien à 10h (cron expression: '0 10 * * *')
  // Format: seconde minute heure jour mois jour-semaine
  cron.schedule('0 10 * * *', async () => {
    console.log('🕒 [Scheduler] Exécution du job de relance marketing quotidien...');
    try {
      await sendDailyMarketingNudges();
    } catch (error) {
      console.error('❌ [Scheduler] Erreur lors de l\'exécution du job:', error);
    }
  }, {
    scheduled: true,
    timezone: "Europe/Paris" // Fuseau horaire français
  });

  schedulerStarted = true;
  console.log('✅ [Scheduler] Scheduler démarré avec succès');
  console.log('📅 [Scheduler] Job de relance marketing: tous les jours à 10h (Europe/Paris)');
}

// Fonction pour exécuter manuellement le job (utile pour les tests)
export async function runNudgeJobNow() {
  console.log('🔧 [Scheduler] Exécution manuelle du job de relance marketing...');
  await sendDailyMarketingNudges();
}
