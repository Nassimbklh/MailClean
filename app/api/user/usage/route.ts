import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import prisma from "@/lib/prisma";
import {
  getScanLimit,
  getMonthlyDeleteLimit,
  getMonthlyUnsubscribeLimit,
  isUnlimited,
} from "@/lib/plan-limits";

/**
 * GET /api/user/usage
 *
 * Récupère l'utilisation mensuelle de l'utilisateur (quotas)
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getSession();

    if (!session.isLoggedIn || !session.user) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    // Récupérer l'utilisateur
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: {
        scanState: true,
        subscription: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: "Utilisateur introuvable" },
        { status: 404 }
      );
    }

    const userPlan = user.plan || "free";

    // Calculer le début du mois en cours (pour les stats mensuelles)
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // Récupérer les actions du mois en cours
    const monthlyActions = await prisma.activityLog.groupBy({
      by: ["actionType"],
      where: {
        userId: user.id,
        timestamp: {
          gte: startOfMonth,
        },
        undone: false, // Exclure les actions annulées
      },
      _sum: {
        count: true,
      },
    });

    const monthlyDeletes =
      monthlyActions.find((s) => s.actionType === "trash")?._sum.count || 0;
    const monthlyUnsubscribes =
      monthlyActions.find((s) => s.actionType === "unsubscribe")?._sum.count ||
      0;

    // Récupérer les limites du plan
    const scanLimit = getScanLimit(userPlan);
    const deleteLimit = getMonthlyDeleteLimit(userPlan);
    const unsubscribeLimit = getMonthlyUnsubscribeLimit(userPlan);

    // Calculer les stats de scan
    const emailsScanned = user.scanState?.scannedCount || 0;
    const scanStatus = user.scanState?.status || "INCOMPLETE";

    // Date de renouvellement (fin de période d'abonnement)
    const renewalDate = user.subscription?.currentPeriodEnd || null;

    const usage = {
      // Utilisation mensuelle
      monthly: {
        deletes: {
          used: monthlyDeletes,
          limit: deleteLimit,
          unlimited: isUnlimited(deleteLimit),
          remaining: isUnlimited(deleteLimit)
            ? -1
            : Math.max(0, deleteLimit - monthlyDeletes),
        },
        unsubscribes: {
          used: monthlyUnsubscribes,
          limit: unsubscribeLimit,
          unlimited: isUnlimited(unsubscribeLimit),
          remaining: isUnlimited(unsubscribeLimit)
            ? -1
            : Math.max(0, unsubscribeLimit - monthlyUnsubscribes),
        },
      },

      // Utilisation scan
      scan: {
        used: emailsScanned,
        limit: scanLimit,
        unlimited: isUnlimited(scanLimit),
        status: scanStatus,
        percentage: isUnlimited(scanLimit) ? 0 : Math.min(100, Math.round((emailsScanned / scanLimit) * 100)),
      },

      // Info plan
      plan: userPlan,
      renewalDate: renewalDate ? renewalDate.toISOString() : null,
    };

    return NextResponse.json(usage);
  } catch (error: any) {
    console.error("❌ [user/usage] Erreur:", error);
    return NextResponse.json(
      {
        error: "Erreur lors de la récupération de l'utilisation",
        details: error.message,
      },
      { status: 500 }
    );
  }
}
