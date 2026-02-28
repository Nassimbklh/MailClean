import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";

/**
 * POST /api/auth/revoke
 *
 * Révoque le token Google et détruit la session locale
 * Force l'utilisateur à se reconnecter complètement
 */
export async function POST() {
  console.log("🔓 [auth/revoke] Début de la révocation...");

  try {
    // 1. Récupérer la session
    const session = await getSession();

    if (!session.user) {
      console.warn("⚠️ [auth/revoke] Pas de session à révoquer");
      return NextResponse.json({
        success: true,
        message: "Aucune session active",
      });
    }

    const accessToken = session.user.accessToken;
    const email = session.user.email;

    console.log(`🔓 [auth/revoke] Révocation pour ${email}`);

    // 2. Révoquer le token Google (si présent)
    if (accessToken) {
      try {
        const revokeUrl = `https://oauth2.googleapis.com/revoke?token=${accessToken}`;
        const response = await fetch(revokeUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
          },
        });

        if (response.ok) {
          console.log("✅ [auth/revoke] Token Google révoqué");
        } else {
          console.warn(
            "⚠️ [auth/revoke] Révocation Google échouée (le token était peut-être déjà invalide)"
          );
        }
      } catch (revokeError) {
        console.warn(
          "⚠️ [auth/revoke] Erreur lors de la révocation Google:",
          revokeError
        );
        // Continue quand même pour détruire la session locale
      }
    }

    // 3. Détruire la session locale
    session.destroy();
    console.log("✅ [auth/revoke] Session locale détruite");

    return NextResponse.json({
      success: true,
      message:
        "Accès révoqué. Vous allez être redirigé vers la page de connexion.",
    });
  } catch (error: any) {
    console.error("❌ [auth/revoke] Erreur:", error);
    return NextResponse.json(
      {
        error: "Erreur lors de la révocation",
        details: error.message,
      },
      { status: 500 }
    );
  }
}
