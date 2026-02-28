import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { google } from "googleapis";

/**
 * GET /api/auth/scopes
 *
 * Endpoint de diagnostic pour vérifier les scopes Gmail disponibles
 * Retourne si gmail.modify est présent ou non
 */
export async function GET() {
  console.log("🔍 [auth/scopes] Vérification des scopes...");

  try {
    // 1. Récupérer la session
    const session = await getSession();

    if (!session.user) {
      console.warn("⚠️ [auth/scopes] Pas de session");
      return NextResponse.json({
        authenticated: false,
        error: "Non authentifié",
      });
    }

    const accessToken = session.user.accessToken;

    if (!accessToken) {
      console.warn("⚠️ [auth/scopes] Pas d'access token");
      return NextResponse.json({
        authenticated: true,
        hasAccessToken: false,
        error: "Token manquant",
      });
    }

    console.log(`✅ [auth/scopes] Token présent pour ${session.user.email}`);

    // 2. Vérifier les scopes via Google tokeninfo API
    try {
      const tokenInfoUrl = `https://oauth2.googleapis.com/tokeninfo?access_token=${accessToken}`;
      const tokenInfoResponse = await fetch(tokenInfoUrl);
      const tokenInfo = await tokenInfoResponse.json();

      console.log("📋 [auth/scopes] Token info reçu:");
      console.log(`  - scope: ${tokenInfo.scope}`);
      console.log(`  - expires_in: ${tokenInfo.expires_in}`);

      if (!tokenInfoResponse.ok) {
        console.error("❌ [auth/scopes] Token invalide:", tokenInfo);
        return NextResponse.json({
          authenticated: true,
          hasAccessToken: true,
          valid: false,
          error: tokenInfo.error_description || "Token invalide",
        });
      }

      // 3. Parser les scopes
      const scopeString = tokenInfo.scope || "";
      const scopes = scopeString.split(" ");

      const hasGmailMetadata = scopes.some(
        (s: string) =>
          s.includes("gmail.metadata") || s.includes("gmail.readonly")
      );
      const hasGmailModify = scopes.some((s: string) =>
        s.includes("gmail.modify")
      );
      const hasEmail = scopes.some((s: string) => s.includes("email"));
      const hasProfile = scopes.some((s: string) => s.includes("profile"));

      console.log("✅ [auth/scopes] Scopes détectés:");
      console.log(`  - gmail.metadata/readonly: ${hasGmailMetadata}`);
      console.log(`  - gmail.modify: ${hasGmailModify}`);
      console.log(`  - email: ${hasEmail}`);
      console.log(`  - profile: ${hasProfile}`);

      return NextResponse.json({
        authenticated: true,
        hasAccessToken: true,
        valid: true,
        email: session.user.email,
        scopes: {
          all: scopes,
          hasGmailMetadata,
          hasGmailModify,
          hasEmail,
          hasProfile,
        },
        tokenInfo: {
          expiresIn: tokenInfo.expires_in,
          scope: tokenInfo.scope,
        },
        diagnosis: {
          canReadEmails: hasGmailMetadata,
          canDeleteEmails: hasGmailModify,
          needsReauth: !hasGmailModify,
        },
      });
    } catch (tokenError: any) {
      console.error("❌ [auth/scopes] Erreur tokeninfo:", tokenError);

      // 4. Fallback: Tester avec un appel Gmail API
      try {
        console.log("🔄 [auth/scopes] Fallback: test Gmail API...");

        const oauth2Client = new google.auth.OAuth2();
        oauth2Client.setCredentials({ access_token: accessToken });
        const gmail = google.gmail({ version: "v1", auth: oauth2Client });

        // Tester un appel simple
        await gmail.users.getProfile({ userId: "me" });

        console.log("✅ [auth/scopes] Gmail API accessible");

        return NextResponse.json({
          authenticated: true,
          hasAccessToken: true,
          valid: true,
          email: session.user.email,
          testResult: "Gmail API accessible",
          warning:
            "Impossible de vérifier les scopes spécifiques via tokeninfo",
          diagnosis: {
            canReadEmails: true,
            canDeleteEmails: null, // Inconnu
            needsReauth: null, // Inconnu
          },
        });
      } catch (gmailError: any) {
        console.error("❌ [auth/scopes] Gmail API échoue:", gmailError);

        return NextResponse.json({
          authenticated: true,
          hasAccessToken: true,
          valid: false,
          email: session.user.email,
          error: "Token invalide ou scopes insuffisants",
          gmailError: gmailError.message,
        });
      }
    }
  } catch (error: any) {
    console.error("❌ [auth/scopes] Erreur globale:", error);
    return NextResponse.json(
      {
        error: "Erreur serveur",
        details: error.message,
      },
      { status: 500 }
    );
  }
}
