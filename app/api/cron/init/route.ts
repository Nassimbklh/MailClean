import { NextResponse } from 'next/server';
import { startScheduler } from '@/lib/jobs/scheduler';

// Initialiser le scheduler au démarrage
// Cette route peut être appelée manuellement ou via un système de healthcheck
export async function GET() {
  try {
    startScheduler();
    return NextResponse.json({
      success: true,
      message: 'Scheduler initialisé avec succès'
    });
  } catch (error) {
    console.error('Erreur lors de l\'initialisation du scheduler:', error);
    return NextResponse.json({
      success: false,
      error: 'Échec de l\'initialisation du scheduler'
    }, { status: 500 });
  }
}
