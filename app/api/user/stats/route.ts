import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import prisma from "@/lib/prisma";

/**
 * GET /api/user/stats
 *
 * Récupère les statistiques réelles de l'utilisateur connecté
 * Calculées depuis ActivityLog et ScanState
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getSession();

    if (!session.isLoggedIn || !session.user) {
      return NextResponse.json(
        { error: "Non authentifié" },
        { status: 401 }
      );
    }

    // Récupérer l'utilisateur avec son scanState
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: {
        scanState: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: "Utilisateur introuvable" },
        { status: 404 }
      );
    }

    // Calculer les statistiques depuis ActivityLog
    // Grouper par type d'action et sommer les counts (en excluant les actions annulées)
    const activityStats = await prisma.activityLog.groupBy({
      by: ['actionType'],
      where: {
        userId: user.id,
        undone: false, // Exclure les actions annulées
      },
      _sum: {
        count: true,
      },
    });

    // Construire les statistiques
    const deletedCount = activityStats.find(s => s.actionType === 'trash')?._sum.count || 0;
    const archivedCount = activityStats.find(s => s.actionType === 'archive')?._sum.count || 0;
    const unsubscribedCount = activityStats.find(s => s.actionType === 'unsubscribe')?._sum.count || 0;

    // Total nettoyé = supprimé + archivé + désabonné
    const totalCleaned = deletedCount + archivedCount + unsubscribedCount;

    // Emails scannés depuis scanState
    const totalEmailsScanned = user.scanState?.scannedCount || 0;

    // Nombre d'expéditeurs détectés
    const totalSenders = await prisma.senderStat.count({
      where: { userId: user.id },
    });

    const stats = {
      deletedCount,
      unsubscribedCount,
      archivedCount,
      totalCleaned,
      totalEmailsScanned,
      totalSenders,
      totalRemaining: Math.max(0, totalEmailsScanned - totalCleaned),
      lastScanAt: user.scanState?.lastScanAt || null,
      scanStatus: user.scanState?.status || null,
    };

    return NextResponse.json(stats);
  } catch (error: any) {
    console.error("❌ [user/stats] Erreur:", error);
    return NextResponse.json(
      {
        error: "Erreur lors de la récupération des statistiques",
        details: error.message,
      },
      { status: 500 }
    );
  }
}
