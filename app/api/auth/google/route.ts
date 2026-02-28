import { NextRequest, NextResponse } from "next/server";
import { getAuthUrl } from "@/lib/gmail";

// Route pour initier la connexion Google OAuth
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const reauth = searchParams.get('reauth') === 'true';

    console.log(`🔐 [auth/google] Initiating OAuth flow (reauth=${reauth})`);

    const authUrl = getAuthUrl(reauth); // ✅ Passer forceConsent si reauth=true
    return NextResponse.redirect(authUrl);
  } catch (error) {
    console.error("❌ [auth/google] Erreur lors de la génération de l'URL d'auth:", error);
    return NextResponse.json(
      { error: "Erreur lors de la connexion" },
      { status: 500 }
    );
  }
}
