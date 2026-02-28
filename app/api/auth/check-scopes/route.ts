import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { checkTokenScopes } from "@/lib/gmail";

/**
 * GET /api/auth/check-scopes
 *
 * Vérifie si le token actuel possède tous les scopes requis
 * Retourne les scopes manquants et une URL de réautorisation si nécessaire
 */
export async function GET(request: NextRequest) {
  console.log("🔍 [auth/check-scopes] Vérification des scopes OAuth...");

  try {
    const session = await getSession();

    // Debug: afficher l'état de la session
    console.log("🔍 [auth/check-scopes] État de la session:");
    console.log(`  - isLoggedIn: ${session.isLoggedIn}`);
    console.log(`  - user exists: ${session.user ? '✅' : '❌'}`);
    if (session.user) {
      console.log(`  - user.email: ${session.user.email}`);
      console.log(`  - user.accessToken: ${session.user.accessToken ? '✅ présent' : '❌ absent'}`);
    }

    // 1. Vérifier la session
    if (!session.isLoggedIn || !session.user) {
      console.warn("⚠️ [auth/check-scopes] Utilisateur non authentifié");
      console.warn("  - Conseil: Tester /api/auth/whoami pour diagnostiquer");
      return NextResponse.json({
        ok: false,
        authenticated: false,
        reason: "NOT_AUTHENTICATED",
        message: "Utilisateur non authentifié",
      });
    }

    const accessToken = session.user.accessToken;

    if (!accessToken) {
      console.warn("⚠️ [auth/check-scopes] Access token absent");
      return NextResponse.json({
        ok: false,
        authenticated: true,
        reason: "TOKEN_MISSING",
        message: "Token d'accès manquant",
        reauthUrl: "/api/auth/google?reauth=true",
      });
    }

    // 2. Vérifier les scopes via Google tokeninfo
    const scopeCheck = await checkTokenScopes(accessToken);

    if (scopeCheck.valid) {
      console.log("✅ [auth/check-scopes] Tous les scopes sont présents");
      return NextResponse.json({
        ok: true,
        authenticated: true,
        hasModify: scopeCheck.hasModify,
        hasReadonly: scopeCheck.hasReadonly,
        grantedScopes: scopeCheck.grantedScopes,
        missingScopes: [],
      });
    }

    // 3. Scopes manquants
    console.warn("⚠️ [auth/check-scopes] Scopes manquants:", scopeCheck.missingScopes);

    return NextResponse.json({
      ok: false,
      authenticated: true,
      reason: "INSUFFICIENT_SCOPES",
      message: "Certains scopes Gmail sont manquants",
      hasModify: scopeCheck.hasModify,
      hasReadonly: scopeCheck.hasReadonly,
      grantedScopes: scopeCheck.grantedScopes,
      missingScopes: scopeCheck.missingScopes,
      reauthUrl: "/api/auth/google?reauth=true",
    });
  } catch (error: any) {
    console.error("❌ [auth/check-scopes] Erreur:", error.message);
    return NextResponse.json({
      ok: false,
      authenticated: false,
      reason: "CHECK_FAILED",
      message: "Erreur lors de la vérification des scopes",
      error: error.message,
    }, { status: 500 });
  }
}
