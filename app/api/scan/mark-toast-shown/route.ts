import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import prisma from "@/lib/prisma";

/**
 * POST /api/scan/mark-toast-shown
 *
 * Marque le toast de premier scan comme affiché
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

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return NextResponse.json(
        { error: "Utilisateur introuvable" },
        { status: 404 }
      );
    }

    await prisma.scanState.update({
      where: { userId: user.id },
      data: { hasShownFirstScanToast: true },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("❌ [scan/mark-toast-shown] Erreur:", error);
    return NextResponse.json(
      {
        error: "Erreur lors de la mise à jour",
        details: error.message,
      },
      { status: 500 }
    );
  }
}
