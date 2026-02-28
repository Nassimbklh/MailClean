import { NextRequest, NextResponse } from "next/server";
import { getIronSession } from "iron-session";
import { sessionOptions, type SessionData } from "@/lib/session";
import { cookies } from "next/headers";
import prisma from "@/lib/prisma";

/**
 * GET /api/activity
 *
 * Récupère l'historique des activités avec pagination
 *
 * Query params:
 * - page: number (défaut 1)
 * - limit: number (défaut 10, max 100)
 */
export async function GET(request: NextRequest) {
  console.log("📜 [activity] Début de la requête GET");

  try {
    // 1. Vérifier la session
    const session = await getIronSession<SessionData>(
      await cookies(),
      sessionOptions
    );

    if (!session.user) {
      console.warn("⚠️ [activity] Session non trouvée");
      return NextResponse.json(
        {
          error: "Non authentifié",
          code: "NOT_AUTHENTICATED",
        },
        { status: 401 }
      );
    }

    // 2. Récupérer l'utilisateur depuis la DB
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return NextResponse.json(
        { error: "Utilisateur introuvable" },
        { status: 404 }
      );
    }

    // 3. Pagination
    const searchParams = request.nextUrl.searchParams;
    const page = Math.max(parseInt(searchParams.get("page") || "1"), 1);
    const limit = Math.min(
      parseInt(searchParams.get("limit") || "10"),
      100
    );
    const skip = (page - 1) * limit;

    // 4. Récupérer le total + activités
    const [total, activities] = await Promise.all([
      prisma.activityLog.count({ where: { userId: user.id } }),
      prisma.activityLog.findMany({
        where: { userId: user.id },
        orderBy: { timestamp: "desc" },
        skip,
        take: limit,
      }),
    ]);

    const totalPages = Math.ceil(total / limit);

    console.log(
      `✅ [activity] ${activities.length}/${total} activités (page ${page}/${totalPages})`
    );

    return NextResponse.json({
      success: true,
      activities: activities.map((activity) => ({
        id: activity.id,
        actionType: activity.actionType,
        senderKey: activity.senderKey,
        senderName: activity.senderName,
        count: activity.count,
        timestamp: activity.timestamp.toISOString(),
        undoable: activity.undoable,
        undone: activity.undone,
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasMore: page < totalPages,
      },
    });
  } catch (error: any) {
    console.error("❌ [activity] Erreur globale:");
    console.error(`  - Message: ${error.message}`);
    console.error(`  - Stack: ${error.stack}`);
    return NextResponse.json(
      {
        error: "Erreur lors de la récupération des activités",
        code: "INTERNAL_ERROR",
        details: error.message,
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/activity
 *
 * Supprime TOUTES les activités de l'utilisateur
 */
export async function DELETE() {
  console.log("🗑️ [activity] Début de DELETE ALL");

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

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return NextResponse.json(
        { error: "Utilisateur introuvable" },
        { status: 404 }
      );
    }

    // Supprimer toutes les activités
    const result = await prisma.activityLog.deleteMany({
      where: { userId: user.id },
    });

    console.log(
      `✅ [activity] ${result.count} activités supprimées pour ${user.email}`
    );

    return NextResponse.json({
      success: true,
      message: "Toutes les activités ont été supprimées",
      deletedCount: result.count,
    });
  } catch (error: any) {
    console.error("❌ [activity] Erreur DELETE ALL:");
    console.error(`  - Message: ${error.message}`);
    return NextResponse.json(
      {
        error: "Erreur lors de la suppression",
        code: "INTERNAL_ERROR",
        details: error.message,
      },
      { status: 500 }
    );
  }
}
