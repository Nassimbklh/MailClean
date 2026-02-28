import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import prisma from "@/lib/prisma";

/**
 * GET /api/user/subscription
 *
 * Récupère les détails de l'abonnement de l'utilisateur connecté
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

    // Récupérer l'utilisateur avec son abonnement
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: {
        subscription: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: "Utilisateur introuvable" },
        { status: 404 }
      );
    }

    if (!user.subscription) {
      return NextResponse.json(
        { error: "Aucun abonnement trouvé" },
        { status: 404 }
      );
    }

    return NextResponse.json(user.subscription);
  } catch (error: any) {
    console.error("❌ [user/subscription] Erreur:", error);
    return NextResponse.json(
      {
        error: "Erreur lors de la récupération de l'abonnement",
        details: error.message,
      },
      { status: 500 }
    );
  }
}
