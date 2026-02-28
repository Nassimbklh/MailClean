import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { trashEmailsFromSender } from "@/lib/gmail";

// Route pour supprimer (mettre en corbeille) tous les emails d'un expéditeur
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

    const count = await trashEmailsFromSender(
      session.user.accessToken,
      senderEmail
    );

    return NextResponse.json({
      success: true,
      count,
      message: `${count} email${count > 1 ? "s" : ""} mis à la corbeille`,
    });
  } catch (error) {
    console.error("Erreur lors de la suppression des emails:", error);
    return NextResponse.json(
      { error: "Erreur lors de la suppression des emails" },
      { status: 500 }
    );
  }
}
