import { NextResponse } from "next/server";
import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
import { sessionOptions, type SessionData } from "@/lib/session";
import { prisma } from "@/lib/db";

export async function GET() {
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

    // Récupérer l'utilisateur depuis la base de données avec son email
    const dbUser = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true },
    });

    if (!dbUser) {
      return NextResponse.json(
        { error: "Utilisateur non trouvé" },
        { status: 404 }
      );
    }

    const userId = dbUser.id;

    // Récupérer l'état du scan
    const scanState = await prisma.scanState.findUnique({
      where: { userId },
      select: {
        scannedCount: true,
        senderCount: true,
        status: true,
        lastScanAt: true,
      },
    });

    // Si pas de scan state, compter les expéditeurs dans SenderStat
    let totalSenders = scanState?.senderCount || 0;
    if (!scanState) {
      totalSenders = await prisma.senderStat.count({
        where: { userId },
      });
    }

    return NextResponse.json({
      totalEmailsScanned: scanState?.scannedCount || 0,
      totalSenders,
      scanStatus: scanState?.status || "INCOMPLETE",
      lastScanAt: scanState?.lastScanAt?.toISOString() || null,
    });
  } catch (error) {
    console.error("❌ Erreur API /api/dashboard/stats:", error);
    return NextResponse.json(
      { error: "Erreur serveur" },
      { status: 500 }
    );
  }
}
