import { NextResponse } from "next/server";
import { getIronSession } from "iron-session";
import { sessionOptions } from "@/lib/session";
import { cookies } from "next/headers";

/**
 * GET /api/debug/session
 *
 * Endpoint de debug pour vérifier l'état de la session
 * ⚠️ À supprimer en production !
 */
export async function GET() {
  console.log("🔍 [debug/session] Début de la requête");

  try {
    const session = await getIronSession(await cookies(), sessionOptions);

    if (!session.user) {
      return NextResponse.json({
        authenticated: false,
        session: null,
        message: "Aucune session trouvée",
      });
    }

    // Ne PAS exposer les tokens complets
    return NextResponse.json({
      authenticated: true,
      session: {
        email: session.user.email,
        name: session.user.name,
        picture: session.user.picture,
        hasAccessToken: !!session.user.accessToken,
        accessTokenLength: session.user.accessToken?.length || 0,
        hasRefreshToken: !!session.user.refreshToken,
        refreshTokenLength: session.user.refreshToken?.length || 0,
      },
      message: "Session valide",
    });
  } catch (error: any) {
    console.error("❌ [debug/session] Erreur:", error);
    return NextResponse.json(
      {
        authenticated: false,
        error: error.message,
        stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}
