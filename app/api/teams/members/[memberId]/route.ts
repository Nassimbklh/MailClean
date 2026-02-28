import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import prisma from "@/lib/prisma";

/**
 * DELETE /api/teams/members/[memberId]
 *
 * Retire un membre de l'équipe
 * Seul le propriétaire de l'équipe peut retirer des membres
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ memberId: string }> }
) {
  const { memberId } = await params;
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
        ownedTeam: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: "Utilisateur introuvable" },
        { status: 404 }
      );
    }

    // Vérifier que l'utilisateur est le propriétaire d'une équipe
    if (!user.ownedTeam) {
      return NextResponse.json(
        { error: "Vous n'êtes pas propriétaire d'une équipe" },
        { status: 403 }
      );
    }

    // Récupérer le membre à retirer
    const member = await prisma.teamMember.findUnique({
      where: { id: memberId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
      },
    });

    if (!member) {
      return NextResponse.json(
        { error: "Membre introuvable" },
        { status: 404 }
      );
    }

    // Vérifier que le membre appartient bien à l'équipe de l'utilisateur
    if (member.teamId !== user.ownedTeam.id) {
      return NextResponse.json(
        { error: "Ce membre n'appartient pas à votre équipe" },
        { status: 403 }
      );
    }

    // Transaction : retirer le membre et décrémenter seatsUsed
    await prisma.$transaction(async (tx) => {
      // 1. Supprimer le TeamMember
      await tx.teamMember.delete({
        where: { id: memberId },
      });

      // 2. Décrémenter seatsUsed
      await tx.team.update({
        where: { id: user.ownedTeam!.id },
        data: {
          seatsUsed: {
            decrement: 1,
          },
        },
      });

      // 3. Rétrograder l'utilisateur au plan "free"
      await tx.user.update({
        where: { id: member.user.id },
        data: {
          plan: "free",
        },
      });

      // 4. Désactiver son abonnement (s'il en avait un créé manuellement)
      const existingSubscription = await tx.subscription.findFirst({
        where: {
          userId: member.user.id,
          status: { in: ["active", "manual", "trialing"] },
        },
      });

      if (existingSubscription) {
        await tx.subscription.update({
          where: { id: existingSubscription.id },
          data: {
            status: "canceled",
            canceledAt: new Date(),
          },
        });
      }
    });

    console.log(`✅ [teams/members] Membre ${member.user.email} retiré de l'équipe ${user.ownedTeam.id}`);

    return NextResponse.json({
      success: true,
      message: `${member.user.email} a été retiré de l'équipe`,
      member: {
        id: member.id,
        email: member.user.email,
        name: member.user.name,
      },
    });
  } catch (error: any) {
    console.error("❌ [teams/members/delete] Erreur:", error);
    return NextResponse.json(
      {
        error: "Erreur lors de la suppression du membre",
        details: error.message,
      },
      { status: 500 }
    );
  }
}
