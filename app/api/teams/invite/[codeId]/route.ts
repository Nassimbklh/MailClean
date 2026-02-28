import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import prisma from "@/lib/prisma";

/**
 * DELETE /api/teams/invite/[codeId]
 *
 * Révoque (désactive) un code d'invitation
 * Seul le propriétaire de l'équipe peut révoquer les codes
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ codeId: string }> }
) {
  const { codeId } = await params;
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

    // Récupérer le code d'invitation
    const inviteCode = await prisma.inviteCode.findUnique({
      where: { id: codeId },
    });

    if (!inviteCode) {
      return NextResponse.json(
        { error: "Code d'invitation introuvable" },
        { status: 404 }
      );
    }

    // Vérifier que le code appartient bien à l'équipe de l'utilisateur
    if (inviteCode.teamId !== user.ownedTeam.id) {
      return NextResponse.json(
        { error: "Ce code d'invitation n'appartient pas à votre équipe" },
        { status: 403 }
      );
    }

    // Désactiver le code (au lieu de le supprimer)
    const updatedCode = await prisma.inviteCode.update({
      where: { id: codeId },
      data: {
        disabledAt: new Date(),
      },
    });

    console.log(`✅ [invite/revoke] Code ${updatedCode.code} révoqué par ${user.email}`);

    return NextResponse.json({
      success: true,
      message: `Code d'invitation ${updatedCode.code} révoqué`,
      code: {
        id: updatedCode.id,
        code: updatedCode.code,
        disabledAt: updatedCode.disabledAt,
      },
    });
  } catch (error: any) {
    console.error("❌ [invite/revoke] Erreur:", error);
    return NextResponse.json(
      {
        error: "Erreur lors de la révocation du code",
        details: error.message,
      },
      { status: 500 }
    );
  }
}
