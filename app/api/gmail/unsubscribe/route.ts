import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { getUnsubscribeInfo } from "@/lib/gmail";

// Route pour obtenir les infos de désabonnement d'un expéditeur
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();

    if (!session.isLoggedIn || !session.user?.accessToken) {
      return NextResponse.json(
        { error: "Non authentifié" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { senderEmail } = body;

    if (!senderEmail) {
      return NextResponse.json(
        { error: "Email de l'expéditeur requis" },
        { status: 400 }
      );
    }

    const unsubscribeInfo = await getUnsubscribeInfo(
      session.user.accessToken,
      senderEmail
    );

    return NextResponse.json(unsubscribeInfo);
  } catch (error) {
    console.error("Erreur lors de la récupération des infos de désabonnement:", error);
    return NextResponse.json(
      { error: "Erreur lors de la récupération des infos de désabonnement" },
      { status: 500 }
    );
  }
}
