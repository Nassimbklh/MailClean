import { NextRequest, NextResponse } from "next/server";
import { getIronSession } from "iron-session";
import { sessionOptions } from "@/lib/session";
import { cookies } from "next/headers";
import { archiveEmailsFromSender } from "@/lib/gmail-scanner";
import { addActivity } from "@/lib/activity-store";
import { incrementUserStats } from "@/lib/stats-helper";

/**
 * POST /api/bulk/archive
 *
 * Archiver tous les emails d'un expéditeur
 *
 * Body params:
 * - senderEmail: string - Email de l'expéditeur
 */
export async function POST(request: NextRequest) {
  const session = await getIronSession(await cookies(), sessionOptions);

  if (!session.user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { senderEmail } = body;

    if (!senderEmail) {
      return NextResponse.json(
        { error: "Email de l'expéditeur manquant" },
        { status: 400 }
      );
    }

    const accessToken = session.user.accessToken;

    // Archiver tous les emails
    const count = await archiveEmailsFromSender(accessToken, senderEmail);

    // Enregistrer l'activité
    addActivity(session.user.email, {
      type: "archive",
      target: senderEmail,
      count,
      canUndo: true,
    });

    // Incrémenter les statistiques utilisateur
    if (count > 0) {
      await incrementUserStats(session.user.email, 'archived', count);
    }

    return NextResponse.json({
      success: true,
      count,
      message: `${count} email(s) archivé(s)`,
    });
  } catch (error: any) {
    console.error("Erreur lors de l'archivage:", error);
    return NextResponse.json(
      {
        error: "Erreur lors de l'archivage",
        details: error.message,
      },
      { status: 500 }
    );
  }
}
