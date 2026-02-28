import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Récupérer les préférences email de l'utilisateur
export async function GET() {
  try {
    const session = await getSession();

    if (!session.isLoggedIn || !session.user?.email) {
      return NextResponse.json(
        { error: "Non autorisé" },
        { status: 401 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: {
        marketingOptIn: true,
        marketingOptInAt: true,
        marketingUnsubscribedAt: true,
        marketingNudgeSentAt: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: "Utilisateur introuvable" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      marketingOptIn: user.marketingOptIn,
      marketingOptInAt: user.marketingOptInAt,
      marketingUnsubscribedAt: user.marketingUnsubscribedAt,
      marketingNudgeSentAt: user.marketingNudgeSentAt,
    });
  } catch (error) {
    console.error("Erreur lors de la récupération des préférences:", error);
    return NextResponse.json(
      { error: "Erreur serveur" },
      { status: 500 }
    );
  }
}

// Mettre à jour les préférences email de l'utilisateur
export async function PUT(request: NextRequest) {
  try {
    const session = await getSession();

    if (!session.isLoggedIn || !session.user?.email) {
      return NextResponse.json(
        { error: "Non autorisé" },
        { status: 401 }
      );
    }

    const { marketingOptIn } = await request.json();

    if (typeof marketingOptIn !== 'boolean') {
      return NextResponse.json(
        { error: "Paramètre marketingOptIn invalide" },
        { status: 400 }
      );
    }

    const updateData: any = {
      marketingOptIn,
    };

    // Si l'utilisateur se réabonne, enregistrer la date
    if (marketingOptIn) {
      updateData.marketingOptInAt = new Date();
      updateData.marketingUnsubscribedAt = null;
    } else {
      // Si l'utilisateur se désabonne, enregistrer la date
      updateData.marketingUnsubscribedAt = new Date();
    }

    const user = await prisma.user.update({
      where: { email: session.user.email },
      data: updateData,
    });

    console.log(`✅ [EmailPreferences] Utilisateur ${user.email} a ${marketingOptIn ? 'activé' : 'désactivé'} le marketing`);

    return NextResponse.json({
      success: true,
      marketingOptIn: user.marketingOptIn,
      message: marketingOptIn
        ? "Vous êtes réabonné aux emails marketing"
        : "Vous êtes désabonné des emails marketing"
    });
  } catch (error) {
    console.error("Erreur lors de la mise à jour des préférences:", error);
    return NextResponse.json(
      { error: "Erreur serveur" },
      { status: 500 }
    );
  }
}
