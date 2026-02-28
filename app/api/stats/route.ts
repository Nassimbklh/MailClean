import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function GET() {
  try {
    const session = await getSession();

    if (!session.isLoggedIn || !session.user?.email) {
      return NextResponse.json(
        { error: "Non autorisé" },
        { status: 401 }
      );
    }

    // Récupérer l'utilisateur
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: {
        userMetrics: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: "Utilisateur introuvable" },
        { status: 404 }
      );
    }

    // Créer UserMetrics si n'existe pas
    let metrics = user.userMetrics;
    if (!metrics) {
      metrics = await prisma.userMetrics.create({
        data: {
          userId: user.id,
        },
      });
    }

    // Préparer la réponse
    const response = {
      deletedCount: metrics.totalDeleted,
      unsubscribedCount: metrics.totalUnsubscribes,
      archivedCount: metrics.totalArchived,
      mailboxTotalCount: metrics.mailboxTotalCount || null,
      lastMailboxSync: metrics.lastMailboxSync || null,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Error fetching stats:", error);
    return NextResponse.json(
      { error: "Erreur serveur" },
      { status: 500 }
    );
  }
}
