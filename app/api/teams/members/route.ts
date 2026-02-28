import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import prisma from "@/lib/prisma";

/**
 * GET /api/teams/members
 *
 * Récupère la liste des membres de l'équipe de l'utilisateur connecté
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

    // Récupérer l'utilisateur depuis la DB
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: {
        ownedTeam: {
          include: {
            members: {
              include: {
                user: {
                  select: {
                    id: true,
                    email: true,
                    name: true,
                    createdAt: true,
                  },
                },
              },
              orderBy: {
                joinedAt: 'asc',
              },
            },
            inviteCodes: {
              where: {
                disabledAt: null,
              },
              orderBy: {
                createdAt: 'desc',
              },
            },
            owner: {
              select: {
                id: true,
                email: true,
                name: true,
              },
            },
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

    // Vérifier que l'utilisateur a une équipe (Family ou Pro)
    if (!user.ownedTeam) {
      return NextResponse.json(
        { error: "Vous n'avez pas d'équipe" },
        { status: 404 }
      );
    }

    const team = user.ownedTeam;

    // Récupérer les stats de chaque membre
    const membersWithStats = await Promise.all(
      team.members.map(async (member) => {
        const scan = await prisma.scan.findUnique({
          where: { userId: member.user.id },
          select: {
            deletedCount: true,
            unsubscribedCount: true,
            archivedCount: true,
            totalEmailsScanned: true,
            lastScanAt: true,
          },
        });

        return {
          id: member.id,
          userId: member.user.id,
          email: member.user.email,
          name: member.user.name,
          role: member.role,
          joinedAt: member.joinedAt,
          stats: scan ? {
            deletedCount: scan.deletedCount || 0,
            unsubscribedCount: scan.unsubscribedCount || 0,
            archivedCount: scan.archivedCount || 0,
            totalEmailsScanned: scan.totalEmailsScanned || 0,
            lastScanAt: scan.lastScanAt,
          } : null,
        };
      })
    );

    return NextResponse.json({
      team: {
        id: team.id,
        plan: team.plan,
        seatsTotal: team.seatsTotal,
        seatsUsed: team.seatsUsed,
        owner: team.owner,
      },
      members: membersWithStats,
      seatsAvailable: team.seatsTotal - team.seatsUsed,
      inviteCodes: team.inviteCodes.map((code) => ({
        id: code.id,
        code: code.code,
        maxUses: code.maxUses,
        usedCount: code.usedCount,
        expiresAt: code.expiresAt,
        createdAt: code.createdAt,
      })),
    });
  } catch (error: any) {
    console.error("❌ [teams/members] Erreur:", error);
    return NextResponse.json(
      {
        error: "Erreur lors de la récupération des membres",
        details: error.message,
      },
      { status: 500 }
    );
  }
}
