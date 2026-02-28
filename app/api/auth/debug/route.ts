import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";

/**
 * Route de debug pour vérifier la configuration OAuth
 * ATTENTION: À supprimer ou sécuriser en production !
 */
export async function GET() {
  console.log("🔍 [debug] Vérification de la configuration OAuth");

  try {
    const session = await getSession();

    const debugInfo = {
      environment: {
        NODE_ENV: process.env.NODE_ENV,
        NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
        GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID
          ? `${process.env.GOOGLE_CLIENT_ID.substring(0, 20)}...`
          : "❌ NON DÉFINI",
        GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET
          ? "✅ DÉFINI"
          : "❌ NON DÉFINI",
        SESSION_SECRET: process.env.SESSION_SECRET ? "✅ DÉFINI" : "❌ NON DÉFINI",
      },
      oauth: {
        redirectUri: `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/google/callback`,
        authUrl: `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/google`,
      },
      session: {
        isLoggedIn: session.isLoggedIn,
        hasUser: !!session.user,
        userEmail: session.user?.email || null,
        hasAccessToken: !!session.user?.accessToken,
        hasRefreshToken: !!session.user?.refreshToken,
      },
      checks: {
        envFileExists: true, // Si cette route fonctionne, le .env est chargé
        sessionSecretLength: process.env.SESSION_SECRET
          ? process.env.SESSION_SECRET.length
          : 0,
        sessionSecretValid: process.env.SESSION_SECRET
          ? process.env.SESSION_SECRET.length >= 32
          : false,
      },
      instructions: {
        googleCloudConsole: {
          authorizedJavaScriptOrigins: [process.env.NEXT_PUBLIC_APP_URL],
          authorizedRedirectUris: [
            `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/google/callback`,
          ],
        },
        nextSteps: session.isLoggedIn
          ? "✅ Vous êtes connecté !"
          : "❌ Pas de session active. Essayez de vous connecter via /api/auth/google",
      },
    };

    return NextResponse.json(debugInfo, { status: 200 });
  } catch (error: any) {
    console.error("❌ [debug] Erreur:", error);
    return NextResponse.json(
      {
        error: "Erreur lors de la vérification",
        message: error.message,
        stack: error.stack,
      },
      { status: 500 }
    );
  }
}
