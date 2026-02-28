import { NextRequest, NextResponse } from "next/server";
import { validateInviteCode } from "@/lib/invite-helpers";

/**
 * POST /api/teams/invite/validate
 *
 * Valide un code d'invitation (sans l'utiliser)
 *
 * Body:
 * - code: string (10 caractères)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { code } = body;

    if (!code || code.length !== 10) {
      return NextResponse.json(
        { error: "Code d'invitation invalide (doit contenir 10 caractères)" },
        { status: 400 }
      );
    }

    // Valider le code
    const validation = await validateInviteCode(code);

    if (!validation.valid) {
      return NextResponse.json(
        {
          valid: false,
          error: validation.error,
        },
        { status: 200 } // Retourne 200 même si invalide (pas une erreur serveur)
      );
    }

    // Code valide, retourner les infos de l'équipe
    return NextResponse.json({
      valid: true,
      code: validation.inviteCode?.code,
      team: {
        plan: validation.team?.plan,
        seatsTotal: validation.team?.seatsTotal,
        seatsUsed: validation.team?.seatsUsed,
        seatsAvailable: (validation.team?.seatsTotal || 0) - (validation.team?.seatsUsed || 0),
        ownerName: validation.team?.owner?.name || validation.team?.owner?.email,
      },
      expiresAt: validation.inviteCode?.expiresAt,
      maxUses: validation.inviteCode?.maxUses,
      usedCount: validation.inviteCode?.usedCount,
    });
  } catch (error: any) {
    console.error("❌ [invite/validate] Erreur:", error);
    return NextResponse.json(
      {
        error: "Erreur lors de la validation du code",
        details: error.message,
      },
      { status: 500 }
    );
  }
}
