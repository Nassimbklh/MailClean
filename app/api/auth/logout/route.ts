import { NextResponse } from "next/server";
import { logoutUser } from "@/lib/session";

// Route pour déconnecter l'utilisateur
export async function POST() {
  try {
    await logoutUser();
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Erreur lors de la déconnexion:", error);
    return NextResponse.json(
      { error: "Erreur lors de la déconnexion" },
      { status: 500 }
    );
  }
}
