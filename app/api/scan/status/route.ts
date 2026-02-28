import { NextResponse } from "next/server";
import { getIronSession } from "iron-session";
import { sessionOptions } from "@/lib/session";
import { cookies } from "next/headers";
import { getUserByEmail } from "@/lib/user-helpers";

/**
 * GET /api/scan/status
 *
 * Récupère le statut actuel du scan progressif depuis la DB
 */
export async function GET() {
  console.log("📊 [scan/status] Début de la requête");

  try {
    // 1. Vérifier la session
    const session = await getIronSession(await cookies(), sessionOptions);

    if (!session.user) {
      console.warn("⚠️ [scan/status] Session non trouvée ou utilisateur absent");
      return NextResponse.json(
        {
          error: "Non authentifié",
          code: "UNAUTHORIZED",
          details: "Vous devez être connecté pour accéder au statut du scan",
        },
        { status: 401 }
      );
    }

    if (!session.user.email) {
      console.error("❌ [scan/status] Email utilisateur absent de la session");
      return NextResponse.json(
        {
          error: "Session invalide",
          code: "INVALID_SESSION",
          details: "L'email utilisateur est manquant dans la session",
        },
        { status: 401 }
      );
    }

    console.log(`✅ [scan/status] Session valide pour ${session.user.email}`);

    // 2. Récupérer l'utilisateur et son état de scan
    let user;
    try {
      user = await getUserByEmail(session.user.email);
    } catch (e: any) {
      console.error("❌ [scan/status] Erreur lors de getUserByEmail:", e);
      return NextResponse.json(
        {
          error: "Erreur de base de données",
          code: "DB_USER_ERROR",
          details: e.message,
        },
        { status: 500 }
      );
    }

    // 3. Vérifier si l'utilisateur et le scan existent
    if (!user || !user.scanState) {
      console.log(`ℹ️ [scan/status] Aucun scan trouvé pour ${session.user.email}`);
      return NextResponse.json({
        exists: false,
        totalScanned: 0,
        senderCount: 0,
        isComplete: false,
        isScanning: false,
        status: "INCOMPLETE",
        hasMore: false,
        updatedAt: null,
      });
    }

    const scanState = user.scanState;

    console.log(
      `✅ [scan/status] Scan trouvé: ${scanState.scannedCount} emails, status: ${scanState.status}`
    );

    // 4. Calculer le temps restant si en pause
    let remainingSeconds: number | undefined;
    if (scanState.status === "PAUSED_RATE_LIMIT" && scanState.resumeAfter) {
      const now = Date.now();
      const resume = scanState.resumeAfter.getTime();
      remainingSeconds = Math.max(0, Math.ceil((resume - now) / 1000));
    }

    // 5. Retourner le statut
    return NextResponse.json({
      exists: true,
      totalScanned: scanState.scannedCount,
      senderCount: scanState.senderCount,
      status: scanState.status, // "INCOMPLETE", "COMPLETE", "SCANNING", "PAUSED_RATE_LIMIT"
      isComplete: scanState.status === "COMPLETE",
      isScanning: scanState.status === "SCANNING",
      isPaused: scanState.status === "PAUSED_RATE_LIMIT",
      hasMore: scanState.nextPageToken !== null,
      resumeAfter: scanState.resumeAfter?.toISOString(),
      remainingSeconds,
      updatedAt: scanState.updatedAt.toISOString(),
    });
  } catch (error: any) {
    console.error("❌ [scan/status] Erreur globale non gérée:", error);
    console.error("Stack trace:", error.stack);

    return NextResponse.json(
      {
        error: "Erreur interne du serveur",
        code: "INTERNAL_ERROR",
        details: error.message,
        stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}
