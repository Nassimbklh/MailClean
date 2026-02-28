import { NextRequest, NextResponse } from "next/server";
import { getIronSession } from "iron-session";
import { sessionOptions } from "@/lib/session";
import { cookies } from "next/headers";
import prisma from "@/lib/prisma";

/**
 * POST /api/unsubscribe/execute
 *
 * Marquer un expéditeur comme désabonné
 * - Met à jour unsubscribed = true et unsubscribedAt
 * - Met emailsCount à 0 (garde la ligne visible)
 * - Crée un log d'activité (NON annulable car action externe)
 *
 * Body params:
 * - senderEmail: string - Email de l'expéditeur
 */
export async function POST(request: NextRequest) {
  console.log("📧 [unsubscribe/execute] Début de la requête");

  try {
    // 1. Vérifier la session
    const session = await getIronSession(await cookies(), sessionOptions);

    if (!session.user) {
      console.warn("⚠️ [unsubscribe/execute] Session non trouvée");
      return NextResponse.json(
        {
          error: "Non authentifié",
          code: "NOT_AUTHENTICATED",
        },
        { status: 401 }
      );
    }

    // 2. Parser le body
    const body = await request.json();
    const { senderEmail } = body;

    console.log(`📧 [unsubscribe/execute] Désabonnement pour: ${senderEmail}`);

    if (!senderEmail) {
      console.error("❌ [unsubscribe/execute] Email manquant");
      return NextResponse.json(
        { error: "Email de l'expéditeur manquant" },
        { status: 400 }
      );
    }

    // 3. Récupérer l'utilisateur depuis la DB
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return NextResponse.json(
        { error: "Utilisateur introuvable" },
        { status: 404 }
      );
    }

    // 4. Récupérer les informations du sender
    const senderStat = await prisma.senderStat.findUnique({
      where: {
        userId_senderKey: {
          userId: user.id,
          senderKey: senderEmail,
        },
      },
    });

    if (!senderStat) {
      return NextResponse.json(
        { error: "Expéditeur introuvable" },
        { status: 404 }
      );
    }

    // 5. Vérifier que le désabonnement est disponible
    if (!senderStat.unsubAvailable) {
      return NextResponse.json(
        {
          error: "Désabonnement non disponible",
          code: "UNSUBSCRIBE_NOT_AVAILABLE",
          details: "Cet expéditeur ne fournit pas de lien de désabonnement.",
        },
        { status: 400 }
      );
    }

    // 6. Mettre à jour la base de données (mais garder la ligne visible!)
    await prisma.senderStat.update({
      where: {
        userId_senderKey: {
          userId: user.id,
          senderKey: senderEmail,
        },
      },
      data: {
        unsubscribed: true,
        unsubscribedAt: new Date(),
        emailsCount: 0, // Marquer comme nettoyé
        cleanedCount: { increment: senderStat.emailsCount || senderStat.count },
      },
    });

    // 7. Créer un log d'activité (NON annulable car action externe)
    await prisma.activityLog.create({
      data: {
        userId: user.id,
        actionType: "unsubscribe",
        senderKey: senderEmail,
        senderName: senderStat.name,
        count: senderStat.emailsCount || senderStat.count,
        undoable: false, // Le désabonnement ne peut pas être annulé depuis l'app
        undoPayload: JSON.stringify({
          senderEmail,
          unsubUrl: senderStat.unsubUrl,
          unsubMailto: senderStat.unsubMailto,
          timestamp: new Date().toISOString(),
        }),
      },
    });

    // 8. Limiter les logs à 30 (supprimer les plus anciens)
    const allLogs = await prisma.activityLog.findMany({
      where: { userId: user.id },
      orderBy: { timestamp: "desc" },
    });

    if (allLogs.length > 30) {
      const toDelete = allLogs.slice(30);
      await prisma.activityLog.deleteMany({
        where: {
          id: { in: toDelete.map((log) => log.id) },
        },
      });
    }

    console.log(`✅ [unsubscribe/execute] Désabonnement marqué: emailsCount=0, log créé`);

    // 9. Retourner les informations de désabonnement pour le frontend
    return NextResponse.json({
      success: true,
      unsubUrl: senderStat.unsubUrl,
      unsubMailto: senderStat.unsubMailto,
      message: "Désabonnement marqué avec succès",
    });
  } catch (error: any) {
    console.error("❌ [unsubscribe/execute] Erreur globale:");
    console.error(`  - Message: ${error.message}`);
    console.error(`  - Stack: ${error.stack}`);
    return NextResponse.json(
      {
        error: "Erreur interne du serveur",
        code: "INTERNAL_ERROR",
        details: error.message,
      },
      { status: 500 }
    );
  }
}
