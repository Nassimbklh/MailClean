import { NextResponse } from "next/server";
import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
import { sessionOptions, type SessionData } from "@/lib/session";
import { prisma } from "@/lib/db";

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getIronSession<SessionData>(
      await cookies(),
      sessionOptions
    );

    if (!session.user) {
      return NextResponse.json(
        { error: "Non authentifié" },
        { status: 401 }
      );
    }

    const { id } = await params;
    const userId = session.user.id;

    // Vérifier que l'activité existe et appartient à l'utilisateur
    const activity = await prisma.activityLog.findUnique({
      where: { id },
      select: { userId: true },
    });

    if (!activity) {
      return NextResponse.json(
        { error: "Activité introuvable" },
        { status: 404 }
      );
    }

    if (activity.userId !== userId) {
      return NextResponse.json(
        { error: "Non autorisé" },
        { status: 403 }
      );
    }

    // Supprimer l'activité
    await prisma.activityLog.delete({
      where: { id },
    });

    console.log(`✅ Activité ${id} supprimée par ${userId}`);

    return NextResponse.json({
      success: true,
      message: "Activité supprimée avec succès",
    });
  } catch (error) {
    console.error("❌ Erreur API DELETE /api/activity/[id]:", error);
    return NextResponse.json(
      { error: "Erreur serveur" },
      { status: 500 }
    );
  }
}
