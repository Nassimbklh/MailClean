import { NextRequest, NextResponse } from "next/server";
import { verifyUnsubscribeToken } from "@/lib/email-service";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function POST(request: NextRequest) {
  try {
    const { token } = await request.json();

    if (!token) {
      return NextResponse.json(
        { error: "Token manquant" },
        { status: 400 }
      );
    }

    // Vérifier le token
    const verified = verifyUnsubscribeToken(token);
    if (!verified) {
      return NextResponse.json(
        { error: "Token invalide ou expiré" },
        { status: 400 }
      );
    }

    // Marquer l'utilisateur comme désabonné
    const user = await prisma.user.update({
      where: { id: verified.userId },
      data: {
        marketingOptIn: false,
        marketingUnsubscribedAt: new Date(),
      },
    });

    console.log(`✅ [Unsubscribe] Utilisateur ${user.email} désabonné du marketing`);

    return NextResponse.json({
      success: true,
      message: "Vous avez été désabonné avec succès"
    });
  } catch (error) {
    console.error("❌ [Unsubscribe] Erreur:", error);
    return NextResponse.json(
      { error: "Erreur lors du désabonnement" },
      { status: 500 }
    );
  }
}
