import { NextRequest, NextResponse } from "next/server";
import { getIronSession } from "iron-session";
import { sessionOptions } from "@/lib/session";
import { cookies } from "next/headers";
import { getUnsubscribeInfo, refreshAccessToken, checkTokenScopes } from "@/lib/gmail";
import { prisma } from "@/lib/prisma";

/**
 * POST /api/unsubscribe/check
 *
 * Vérifier si un expéditeur a un lien de désabonnement
 *
 * Body params:
 * - senderEmail: string - Email de l'expéditeur
 */
export async function POST(request: NextRequest) {
  console.log("🔍 [unsubscribe/check] Début de la requête");

  try {
    // 1. Vérifier la session
    const session = await getIronSession(await cookies(), sessionOptions);

    if (!session.user) {
      console.warn("⚠️ [unsubscribe/check] Session non trouvée");
      return NextResponse.json(
        {
          error: "Non authentifié",
          code: "NOT_AUTHENTICATED",
        },
        { status: 401 }
      );
    }

    // 2. Parser le body
    const body = await request.json();
    const { senderEmail } = body;

    console.log(`🔍 [unsubscribe/check] Vérification pour: ${senderEmail}`);

    if (!senderEmail) {
      console.error("❌ [unsubscribe/check] Email manquant");
      return NextResponse.json(
        { error: "Email de l'expéditeur manquant" },
        { status: 400 }
      );
    }

    // 3. Vérifier le token
    let accessToken = session.user.accessToken;
    const refreshToken = session.user.refreshToken;

    if (!accessToken) {
      console.error("❌ [unsubscribe/check] Access token absent");
      return NextResponse.json(
        {
          error: "Token d'accès manquant",
          code: "TOKEN_MISSING_OR_EXPIRED",
          action: "RECONNECT",
        },
        { status: 401 }
      );
    }

    console.log(`✅ [unsubscribe/check] Token présent, vérification des scopes...`);

    // 3.5. Vérifier que le token a le scope gmail.readonly AVANT d'appeler Gmail
    const scopeCheck = await checkTokenScopes(accessToken);

    if (!scopeCheck.hasReadonly) {
      console.error("❌ [unsubscribe/check] Scope gmail.readonly manquant");
      console.error(`  - Scopes accordés: ${scopeCheck.grantedScopes.join(', ')}`);
      console.error(`  - Scopes manquants: ${scopeCheck.missingScopes.join(', ')}`);

      return NextResponse.json(
        {
          error: "Autorisations Gmail manquantes",
          code: "MISSING_SCOPE",
          scope: "gmail.readonly",
          missing: scopeCheck.missingScopes,
          reauthUrl: "/api/auth/google?reauth=true",
          message: "Le scope 'gmail.readonly' est nécessaire pour lire les emails. Veuillez réautoriser l'application.",
        },
        { status: 403 }
      );
    }

    console.log(`✅ [unsubscribe/check] Scopes OK, vérification du cache DB...`);

    // 4. Vérifier le cache en DB (éviter de rechecker à chaque fois)
    const dbUser = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true },
    });

    if (!dbUser) {
      return NextResponse.json(
        { error: "Utilisateur non trouvé", code: "USER_NOT_FOUND" },
        { status: 404 }
      );
    }

    const userId = dbUser.id;

    // Vérifier si on a déjà une entrée en cache (moins de 24h)
    const cachedSender = await prisma.senderStat.findUnique({
      where: {
        userId_senderKey: {
          userId,
          senderKey: senderEmail,
        },
      },
      select: {
        unsubAvailable: true,
        unsubUrl: true,
        unsubMailto: true,
        unsubDetectionLevel: true,
        unsubLastCheckAt: true,
      },
    });

    const ONE_DAY = 24 * 60 * 60 * 1000;
    const cacheExpired = cachedSender?.unsubLastCheckAt
      ? Date.now() - new Date(cachedSender.unsubLastCheckAt).getTime() > ONE_DAY
      : true;

    if (cachedSender && !cacheExpired) {
      console.log(`✅ [unsubscribe/check] Résultat en cache, pas besoin de recheck`);
      return NextResponse.json({
        success: true,
        hasUnsubscribe: cachedSender.unsubAvailable,
        unsubscribeUrl: cachedSender.unsubUrl || undefined,
        unsubscribeMailto: cachedSender.unsubMailto || undefined,
        detectionLevel: cachedSender.unsubDetectionLevel || "none",
        cached: true,
      });
    }

    console.log(`🔄 [unsubscribe/check] Cache expiré ou absent, appel Gmail API...`);

    // 5. Appeler Gmail API pour détecter le désabonnement
    try {
      const unsubInfo = await getUnsubscribeInfo(accessToken, senderEmail);

      console.log(`✅ [unsubscribe/check] Résultat: hasUnsubscribe=${unsubInfo.hasUnsubscribe}, level=${unsubInfo.detectionLevel}`);

      // Mettre à jour le cache en DB
      await prisma.senderStat.upsert({
        where: {
          userId_senderKey: {
            userId,
            senderKey: senderEmail,
          },
        },
        update: {
          unsubAvailable: unsubInfo.hasUnsubscribe,
          unsubUrl: unsubInfo.unsubscribeUrl || null,
          unsubMailto: unsubInfo.unsubscribeMailto || null,
          unsubDetectionLevel: unsubInfo.detectionLevel || "none",
          unsubLastCheckAt: new Date(),
        },
        create: {
          userId,
          senderKey: senderEmail,
          email: senderEmail,
          unsubAvailable: unsubInfo.hasUnsubscribe,
          unsubUrl: unsubInfo.unsubscribeUrl || null,
          unsubMailto: unsubInfo.unsubscribeMailto || null,
          unsubDetectionLevel: unsubInfo.detectionLevel || "none",
          unsubLastCheckAt: new Date(),
        },
      });

      console.log(`✅ [unsubscribe/check] Cache mis à jour en DB`);

      return NextResponse.json({
        success: true,
        hasUnsubscribe: unsubInfo.hasUnsubscribe,
        unsubscribeUrl: unsubInfo.unsubscribeUrl,
        unsubscribeMailto: unsubInfo.unsubscribeMailto,
        message: unsubInfo.message,
        detectionLevel: unsubInfo.detectionLevel,
        cached: false,
      });
    } catch (gmailError: any) {
      console.error("❌ [unsubscribe/check] Erreur Gmail API:");
      console.error(`  - Message: ${gmailError.message}`);
      console.error(`  - Code: ${gmailError.code}`);

      // Déterminer le type d'erreur
      if (gmailError.response?.status) {
        const statusCode = gmailError.response.status;
        console.error(`  - HTTP Status: ${statusCode}`);

        if (statusCode === 401) {
          // Token expiré, tenter un refresh
          console.log("🔄 [unsubscribe/check] Token expiré, tentative de refresh...");

          if (refreshToken) {
            try {
              const newTokens = await refreshAccessToken(refreshToken);
              accessToken = newTokens.access_token!;

              // Mettre à jour la session
              session.user.accessToken = accessToken;
              if (newTokens.refresh_token) {
                session.user.refreshToken = newTokens.refresh_token;
              }
              await session.save();

              console.log("✅ [unsubscribe/check] Token refreshé, retry...");

              // Retry avec le nouveau token
              const unsubInfo = await getUnsubscribeInfo(accessToken, senderEmail);

              return NextResponse.json({
                success: true,
                hasUnsubscribe: unsubInfo.hasUnsubscribe,
                unsubscribeUrl: unsubInfo.unsubscribeUrl,
                unsubscribeMailto: unsubInfo.unsubscribeMailto,
                message: unsubInfo.message,
              });
            } catch (refreshError: any) {
              console.error("❌ [unsubscribe/check] Refresh échoué:", refreshError);
              return NextResponse.json(
                {
                  error: "Token expiré et impossible à rafraîchir",
                  code: "TOKEN_EXPIRED",
                  action: "RECONNECT",
                },
                { status: 401 }
              );
            }
          } else {
            // Pas de refresh token
            return NextResponse.json(
              {
                error: "Token expiré",
                code: "TOKEN_EXPIRED",
                action: "RECONNECT",
              },
              { status: 401 }
            );
          }
        } else if (statusCode === 403) {
          // Permissions insuffisantes
          console.error("❌ [unsubscribe/check] Permissions insuffisantes (403)");
          console.error("  - Response data:", JSON.stringify(gmailError.response.data, null, 2));

          const errorData = gmailError.response.data;
          const errorMessage = errorData?.error?.message || 'Permissions insuffisantes';

          return NextResponse.json(
            {
              error: "Autorisations Gmail manquantes",
              code: "MISSING_SCOPE",
              scope: "gmail.readonly",
              reauthUrl: "/api/auth/google?reauth=true",
              message: errorMessage,
              details: "Le scope 'gmail.readonly' est nécessaire pour lire les emails. Veuillez réautoriser l'application.",
            },
            { status: 403 }
          );
        }
      }

      // Autre erreur Gmail (404, timeout, etc.)
      console.error("❌ [unsubscribe/check] Erreur Gmail non gérée");
      return NextResponse.json(
        {
          error: "Erreur lors de la vérification du désabonnement",
          code: "GMAIL_ERROR",
          details: gmailError.message,
          // NE PAS retourner 401/403, c'est une vraie erreur serveur/réseau
        },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error("❌ [unsubscribe/check] Erreur globale:");
    console.error(`  - Message: ${error.message}`);
    console.error(`  - Stack: ${error.stack}`);
    return NextResponse.json(
      {
        error: "Erreur interne du serveur",
        code: "INTERNAL_ERROR",
        details: error.message,
      },
      { status: 500 }
    );
  }
}
