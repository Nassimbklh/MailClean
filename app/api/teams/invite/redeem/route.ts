import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import prisma from "@/lib/prisma";
import { redeemInviteCode } from "@/lib/invite-helpers";

/**
 * POST /api/teams/invite/redeem
 *
 * Utilise un code d'invitation pour rejoindre une équipe
 *
 * Body:
 * - code: string (10 caractères)
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();

    if (!session.isLoggedIn || !session.user) {
      return NextResponse.json(
        { error: "Vous devez être connecté pour utiliser un code d'invitation" },
        { status: 401 }
      );
    }

    // Récupérer l'utilisateur depuis la DB
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return NextResponse.json(
        { error: "Utilisateur introuvable" },
        { status: 404 }
      );
    }

    const body = await request.json();
    const { code } = body;

    if (!code || code.length !== 10) {
      return NextResponse.json(
        { error: "Code d'invitation invalide (doit contenir 10 caractères)" },
        { status: 400 }
      );
    }

    // Extraire IP et User-Agent
    const ipAddress = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "unknown";
    const userAgent = request.headers.get("user-agent") || "unknown";

    // Utiliser le code
    const result = await redeemInviteCode({
      code: code.toUpperCase(),
      userId: user.id,
      userEmail: user.email,
      ipAddress,
      userAgent,
    });

    return NextResponse.json({
      success: true,
      message: `Vous avez rejoint l'équipe ${result.team.plan.toUpperCase()} !`,
      team: {
        plan: result.team.plan,
        seatsTotal: result.team.seatsTotal,
        seatsUsed: result.team.seatsUsed + 1, // +1 car l'utilisateur vient de rejoindre
      },
      newPlan: result.team.plan,
    });
  } catch (error: any) {
    console.error("❌ [invite/redeem] Erreur:", error);
    return NextResponse.json(
      {
        error: error.message || "Erreur lors de l'utilisation du code d'invitation",
      },
      { status: 400 }
    );
  }
}
