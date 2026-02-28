import { NextRequest, NextResponse } from "next/server";
import { getIronSession } from "iron-session";
import { sessionOptions } from "@/lib/session";
import { cookies } from "next/headers";
import prisma from "@/lib/prisma";
import { getOrCreateUser } from "@/lib/user-helpers";

/**
 * POST /api/scan/resume
 *
 * Reprend un scan mis en pause (PAUSED_RATE_LIMIT)
 * Vérifie que resumeAfter est dépassé avant de reprendre
 */
export async function POST(request: NextRequest) {
  console.log("▶️ [scan/resume] Début de la requête");

  try {
    // 1. Vérifier la session
    const session = await getIronSession(await cookies(), sessionOptions);

    if (!session.user?.email) {
      return NextResponse.json(
        { error: "Non authentifié", code: "NOT_AUTHENTICATED" },
        { status: 401 }
      );
    }

    // 2. Récupérer l'utilisateur
    const user = await getOrCreateUser(
      session.user.email,
      session.user.name,
      session.user.picture
    );

    // 3. Vérifier l'état du scan
    const scanState = await prisma.scanState.findUnique({
      where: { userId: user.id },
    });

    if (!scanState) {
      return NextResponse.json(
        { error: "Aucun scan trouvé", code: "NO_SCAN" },
        { status: 404 }
      );
    }

    if (scanState.status !== "PAUSED_RATE_LIMIT") {
      return NextResponse.json({
        success: false,
        error: "Le scan n'est pas en pause",
        code: "NOT_PAUSED",
        status: scanState.status,
        message: `Le scan est en statut ${scanState.status}, impossible de reprendre.`,
      });
    }

    // 4. Vérifier que resumeAfter est dépassé
    if (scanState.resumeAfter && new Date() < scanState.resumeAfter) {
      const remainingSeconds = Math.ceil((scanState.resumeAfter.getTime() - Date.now()) / 1000);

      return NextResponse.json({
        success: false,
        error: "Trop tôt pour reprendre",
        code: "TOO_EARLY",
        resumeAfter: scanState.resumeAfter.toISOString(),
        remainingSeconds,
        message: `Veuillez attendre encore ${remainingSeconds} secondes avant de reprendre le scan.`,
      }, { status: 429 });
    }

    // 5. Réinitialiser le status à SCANNING
    await prisma.scanState.update({
      where: { userId: user.id },
      data: {
        status: "SCANNING",
        resumeAfter: null,
      },
    });

    console.log("✅ [scan/resume] Scan repris avec succès");

    return NextResponse.json({
      success: true,
      message: "Le scan a été repris. Vous pouvez continuer.",
      status: "SCANNING",
      nextPageToken: scanState.nextPageToken,
      scannedCount: scanState.scannedCount,
    });
  } catch (error: any) {
    console.error("❌ [scan/resume] Erreur:", error);
    return NextResponse.json(
      {
        error: "Erreur interne du serveur",
        code: "INTERNAL_ERROR",
        details: error.message,
      },
      { status: 500 }
    );
  }
}
