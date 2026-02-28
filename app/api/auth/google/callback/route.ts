import { NextRequest, NextResponse } from "next/server";
import { getTokensFromCode, getOAuth2Client } from "@/lib/gmail";
import { saveUserToSession } from "@/lib/session";
import { google } from "googleapis";
import { getOrCreateUser } from "@/lib/user-service";
import { sendWelcomeEmail } from "@/lib/email-service";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Route de callback OAuth Google
export async function GET(request: NextRequest) {
  console.log("🔵 [callback] Début du callback OAuth");
  console.log(`🔵 [callback] URL complète: ${request.url}`);

  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get("code");
  const error = searchParams.get("error");

  console.log(`🔵 [callback] Code présent: ${code ? "✅" : "❌"}`);
  console.log(`🔵 [callback] Erreur OAuth: ${error || "aucune"}`);

  // Si l'utilisateur refuse l'autorisation
  if (error) {
    console.error(`❌ [callback] Utilisateur a refusé: ${error}`);
    return NextResponse.redirect(new URL("/?error=access_denied", request.url));
  }

  if (!code) {
    console.error("❌ [callback] Pas de code dans l'URL");
    return NextResponse.redirect(new URL("/?error=no_code", request.url));
  }

  try {
    console.log("🔄 [callback] Échange du code contre des tokens...");
    // Échanger le code contre des tokens
    const tokens = await getTokensFromCode(code);
    console.log(`✅ [callback] Tokens reçus:`);
    console.log(`  - access_token: ${tokens.access_token ? "✅ présent" : "❌ absent"}`);
    console.log(`  - refresh_token: ${tokens.refresh_token ? "✅ présent" : "❌ absent"}`);
    console.log(`  - expires_in: ${tokens.expiry_date ? new Date(tokens.expiry_date).toISOString() : "non défini"}`);

    if (!tokens.access_token) {
      throw new Error("Pas de token d'accès reçu");
    }

    // 🔍 DIAGNOSTIC: Vérifier les scopes accordés par Google
    console.log("🔍 [callback] Vérification des scopes accordés par Google...");
    try {
      const tokenInfoUrl = `https://oauth2.googleapis.com/tokeninfo?access_token=${tokens.access_token}`;
      const tokenInfoResponse = await fetch(tokenInfoUrl);
      const tokenInfo = await tokenInfoResponse.json();

      if (tokenInfoResponse.ok && tokenInfo.scope) {
        const grantedScopes = tokenInfo.scope.split(" ");
        console.log("✅ [callback] Scopes accordés par Google:");
        grantedScopes.forEach((scope: string) => {
          console.log(`  - ${scope}`);
        });

        // Vérifier si les scopes critiques sont présents
        const hasGmailMetadata = grantedScopes.some((s: string) =>
          s.includes("gmail.metadata") || s.includes("gmail.readonly")
        );
        const hasGmailModify = grantedScopes.some((s: string) =>
          s.includes("gmail.modify")
        );

        console.log("\n🔍 [callback] Analyse des scopes:");
        console.log(`  - gmail.metadata/readonly: ${hasGmailMetadata ? "✅ PRÉSENT" : "❌ MANQUANT"}`);
        console.log(`  - gmail.modify: ${hasGmailModify ? "✅ PRÉSENT" : "❌ MANQUANT"}`);

        if (!hasGmailModify) {
          console.warn("\n⚠️⚠️⚠️ [callback] ATTENTION: gmail.modify N'EST PAS ACCORDÉ!");
          console.warn("⚠️ L'utilisateur ne pourra PAS supprimer d'emails!");
          console.warn("⚠️ Il devra réautoriser l'application.");
        } else {
          console.log("\n✅✅✅ [callback] Tous les scopes critiques sont présents!");
        }
      } else {
        console.warn("⚠️ [callback] Impossible de vérifier les scopes via tokeninfo");
      }
    } catch (scopeCheckError) {
      console.warn("⚠️ [callback] Erreur lors de la vérification des scopes:", scopeCheckError);
      // Continue quand même, ce n'est qu'un diagnostic
    }

    console.log("🔄 [callback] Récupération des infos utilisateur...");
    // Récupérer les infos de l'utilisateur
    const oauth2Client = getOAuth2Client();
    oauth2Client.setCredentials(tokens);

    const oauth2 = google.oauth2({ version: "v2", auth: oauth2Client });
    const userInfo = await oauth2.userinfo.get();

    console.log(`✅ [callback] Infos utilisateur récupérées:`);
    console.log(`  - Email: ${userInfo.data.email}`);
    console.log(`  - Nom: ${userInfo.data.name || "non défini"}`);
    console.log(`  - Photo: ${userInfo.data.picture ? "✅" : "❌"}`);

    console.log("🔄 [callback] Création/mise à jour de l'utilisateur en DB...");
    // Créer ou mettre à jour l'utilisateur dans la base de données
    const { user: dbUser, isNewUser } = await getOrCreateUser({
      email: userInfo.data.email!,
      googleId: userInfo.data.id || undefined,
      name: userInfo.data.name || undefined,
      picture: userInfo.data.picture || undefined,
    });

    console.log(`✅ [callback] Utilisateur ${isNewUser ? 'créé' : 'mis à jour'} en DB (ID: ${dbUser.id})`);

    // Envoyer l'email de bienvenue si c'est un nouvel utilisateur
    if (isNewUser && !dbUser.welcomeEmailSentAt) {
      console.log(`📧 [callback] Envoi de l'email de bienvenue à ${dbUser.email}...`);

      // Envoyer l'email en arrière-plan (ne pas bloquer la connexion)
      sendWelcomeEmail({
        email: dbUser.email,
        name: dbUser.name,
      })
        .then(async () => {
          console.log(`✅ [callback] Email de bienvenue envoyé à ${dbUser.email}`);
          await prisma.user.update({
            where: { id: dbUser.id },
            data: { welcomeEmailSentAt: new Date() },
          });
          console.log(`✅ [callback] welcomeEmailSentAt mis à jour pour ${dbUser.email}`);
        })
        .catch(err => {
          console.error(`❌ [callback] Échec de l'envoi de l'email de bienvenue à ${dbUser.email}:`, err);
        });
    }

    console.log("🔄 [callback] Sauvegarde de la session...");
    // Sauvegarder l'utilisateur dans la session
    await saveUserToSession({
      email: userInfo.data.email!,
      name: userInfo.data.name || undefined,
      picture: userInfo.data.picture || undefined,
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token || undefined,
    });

    console.log("✅ [callback] Session sauvegardée avec succès");
    console.log("🔄 [callback] Redirection vers /dashboard-new...");

    // Rediriger vers le nouveau dashboard
    const redirectUrl = new URL("/dashboard-new", request.url);
    console.log(`🔵 [callback] URL de redirection: ${redirectUrl}`);
    return NextResponse.redirect(redirectUrl);
  } catch (error: any) {
    console.error("❌ [callback] Erreur lors du callback OAuth:");
    console.error(`  - Message: ${error.message}`);
    console.error(`  - Stack: ${error.stack}`);
    console.error(`  - Détails complets:`, error);
    return NextResponse.redirect(new URL("/?error=auth_failed&details=" + encodeURIComponent(error.message), request.url));
  }
}
