import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { getSenderGroups } from "@/lib/gmail";

// Route pour récupérer la liste des expéditeurs groupés
export async function GET() {
  try {
    const session = await getSession();

    if (!session.isLoggedIn || !session.user?.accessToken) {
      return NextResponse.json(
        { error: "Non authentifié" },
        { status: 401 }
      );
    }

    const senders = await getSenderGroups(session.user.accessToken);

    return NextResponse.json({ senders });
  } catch (error) {
    console.error("Erreur lors de la récupération des expéditeurs:", error);
    return NextResponse.json(
      { error: "Erreur lors de la récupération des expéditeurs" },
      { status: 500 }
    );
  }
}
