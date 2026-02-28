import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import prisma from "@/lib/prisma";
import { generateUniqueInviteCode } from "@/lib/invite-helpers";

/**
 * POST /api/teams/invite/create
 *
 * Crée un code d'invitation pour une équipe
 *
 * Body (optionnel):
 * - expiresInDays: number (par défaut 7 jours)
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();

    if (!session.isLoggedIn || !session.user) {
      return NextResponse.json(
        { error: "Non authentifié" },
        { status: 401 }
      );
    }

    // Récupérer l'utilisateur depuis la DB
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: {
        ownedTeam: {
          include: {
            members: true,
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: "Utilisateur introuvable" },
        { status: 404 }
      );
    }

    // Vérifier que l'utilisateur a un plan Family ou Pro
    if (!["family", "pro"].includes(user.plan)) {
      return NextResponse.json(
        {
          error: "Vous devez avoir un plan Family ou Pro pour inviter des membres",
        },
        { status: 403 }
      );
    }

    // Créer une team si elle n'existe pas encore
    let team = user.ownedTeam;

    if (!team) {
      // Déterminer seatsTotal selon le plan
      const seatsTotal = user.plan === "family" ? 5 : 10; // Pro: par défaut 10, sera mis à jour par Stripe

      team = await prisma.team.create({
        data: {
          ownerUserId: user.id,
          plan: user.plan,
          seatsTotal: seatsTotal,
          seatsUsed: 1, // Le owner compte pour 1 seat
        },
        include: {
          members: true,
        },
      });

      console.log(`✨ [team] Team créée pour ${user.email} (plan: ${user.plan}, seats: ${seatsTotal})`);
    }

    // Vérifier qu'il reste des places disponibles
    if (team.seatsUsed >= team.seatsTotal) {
      return NextResponse.json(
        {
          error: `Votre équipe a atteint sa limite de ${team.seatsTotal} membres`,
        },
        { status: 400 }
      );
    }

    // Générer un code unique
    const code = await generateUniqueInviteCode();

    // Calculer la date d'expiration
    const body = await request.json().catch(() => ({}));
    const expiresInDays = body.expiresInDays || 7;
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + expiresInDays);

    // Créer le code d'invitation
    const maxUses = team.seatsTotal - team.seatsUsed; // Places restantes

    const inviteCode = await prisma.inviteCode.create({
      data: {
        teamId: team.id,
        code,
        maxUses,
        expiresAt,
      },
    });

    console.log(`✅ [invite] Code créé: ${code} pour l'équipe ${team.id} (expire: ${expiresAt.toISOString()})`);

    return NextResponse.json({
      success: true,
      code: inviteCode.code,
      expiresAt: inviteCode.expiresAt,
      maxUses: inviteCode.maxUses,
      inviteUrl: `${process.env.NEXT_PUBLIC_APP_URL}/join?code=${inviteCode.code}`,
      team: {
        plan: team.plan,
        seatsTotal: team.seatsTotal,
        seatsUsed: team.seatsUsed,
        seatsAvailable: team.seatsTotal - team.seatsUsed,
      },
    });
  } catch (error: any) {
    console.error("❌ [invite/create] Erreur:", error);
    return NextResponse.json(
      {
        error: "Erreur lors de la création du code d'invitation",
        details: error.message,
      },
      { status: 500 }
    );
  }
}
