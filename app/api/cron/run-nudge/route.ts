import { NextResponse } from 'next/server';
import { runNudgeJobNow } from '@/lib/jobs/scheduler';

// Route pour exécuter manuellement le job de relance marketing
// Utile pour les tests
export async function POST() {
  try {
    await runNudgeJobNow();
    return NextResponse.json({
      success: true,
      message: 'Job de relance marketing exécuté avec succès'
    });
  } catch (error) {
    console.error('Erreur lors de l\'exécution manuelle du job:', error);
    return NextResponse.json({
      success: false,
      error: 'Échec de l\'exécution du job'
    }, { status: 500 });
  }
}
