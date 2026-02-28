import { NextRequest, NextResponse } from "next/server";
import { getIronSession } from "iron-session";
import { sessionOptions } from "@/lib/session";
import { cookies } from "next/headers";
import { trashEmailsFromSender } from "@/lib/gmail-scanner";
import { refreshAccessToken, checkTokenScopes } from "@/lib/gmail";
import prisma from "@/lib/prisma";

/**
 * POST /api/bulk/trash
 *
 * Mettre en corbeille tous les emails d'un expéditeur
 * - Met à jour emailsCount à 0 (garde la ligne visible)
 * - Crée un log d'activité avec possibilité d'undo
 *
 * Body params:
 * - senderEmail: string - Email de l'expéditeur
 */
export async function POST(request: NextRequest) {
  console.log("🗑️ [bulk/trash] Début de la requête");

  try {
    // 1. Vérifier la session
    const session = await getIronSession(await cookies(), sessionOptions);

    if (!session.user) {
      console.warn("⚠️ [bulk/trash] Session non trouvée");
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

    console.log(`🗑️ [bulk/trash] Suppression pour: ${senderEmail}`);

    if (!senderEmail) {
      console.error("❌ [bulk/trash] Email manquant");
      return NextResponse.json(
        { error: "Email de l'expéditeur manquant" },
        { status: 400 }
      );
    }

    // 3. Récupérer l'utilisateur depuis la DB
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return NextResponse.json(
        { error: "Utilisateur introuvable" },
        { status: 404 }
      );
    }

    // 4. Récupérer les informations du sender
    const senderStat = await prisma.senderStat.findUnique({
      where: {
        userId_senderKey: {
          userId: user.id,
          senderKey: senderEmail,
        },
      },
    });

    if (!senderStat) {
      return NextResponse.json(
        { error: "Expéditeur introuvable" },
        { status: 404 }
      );
    }

    // 5. Vérifier le token
    let accessToken = session.user.accessToken;
    const refreshToken = session.user.refreshToken;

    if (!accessToken) {
      console.error("❌ [bulk/trash] Access token absent");
      return NextResponse.json(
        {
          error: "Token d'accès manquant",
          code: "TOKEN_MISSING_OR_EXPIRED",
          action: "RECONNECT",
        },
        { status: 401 }
      );
    }

    console.log(`✅ [bulk/trash] Token présent, vérification des scopes...`);

    // 5.5. Vérifier que le token a le scope gmail.modify AVANT d'appeler Gmail
    const scopeCheck = await checkTokenScopes(accessToken);

    if (!scopeCheck.hasModify) {
      console.error("❌ [bulk/trash] Scope gmail.modify manquant");
      console.error(`  - Scopes accordés: ${scopeCheck.grantedScopes.join(', ')}`);
      console.error(`  - Scopes manquants: ${scopeCheck.missingScopes.join(', ')}`);

      return NextResponse.json(
        {
          error: "Autorisations Gmail manquantes",
          code: "MISSING_SCOPE",
          scope: "gmail.modify",
          missing: scopeCheck.missingScopes,
          reauthUrl: "/api/auth/google?reauth=true",
          message: "Le scope 'gmail.modify' est nécessaire pour supprimer des emails. Veuillez réautoriser l'application.",
        },
        { status: 403 }
      );
    }

    console.log(`✅ [bulk/trash] Scopes OK, appel Gmail API...`);

    // 6. Mettre en corbeille tous les emails
    let successCount: number;

    try {
      const result = await trashEmailsFromSender(accessToken, senderEmail);

      successCount = typeof result === "number" ? result : result.successCount || 0;

      console.log(`✅ [bulk/trash] Suppression réussie: ${successCount} emails`);
    } catch (gmailError: any) {
      console.error("❌ [bulk/trash] Erreur Gmail API:");
      console.error(`  - Message: ${gmailError.message}`);
      console.error(`  - Code: ${gmailError.code}`);

      // Déterminer le type d'erreur
      if (gmailError.response?.status) {
        const statusCode = gmailError.response.status;
        console.error(`  - HTTP Status: ${statusCode}`);

        if (statusCode === 401) {
          // Token expiré, tenter un refresh
          console.log("🔄 [bulk/trash] Token expiré, tentative de refresh...");

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

              console.log("✅ [bulk/trash] Token refreshé, retry...");

              // Retry avec le nouveau token
              const result = await trashEmailsFromSender(accessToken, senderEmail);
              successCount = typeof result === "number" ? result : result.successCount || 0;
            } catch (refreshError: any) {
              console.error("❌ [bulk/trash] Refresh échoué:", refreshError);
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
          console.error("❌ [bulk/trash] Permissions insuffisantes (403)");
          console.error("  - Response data:", JSON.stringify(gmailError.response.data, null, 2));

          const errorData = gmailError.response.data;
          const errorMessage = errorData?.error?.message || 'Permissions insuffisantes';

          return NextResponse.json(
            {
              error: "Autorisations Gmail manquantes",
              code: "MISSING_SCOPE",
              scope: "gmail.modify",
              reauthUrl: "/api/auth/google?reauth=true",
              message: errorMessage,
              details: "Le scope 'gmail.modify' est nécessaire pour supprimer des emails. Veuillez réautoriser l'application.",
            },
            { status: 403 }
          );
        } else if (statusCode === 429) {
          return NextResponse.json(
            {
              error: "Trop de requêtes",
              code: "RATE_LIMIT",
              details: "Limite de requêtes Gmail atteinte. Réessayez dans quelques minutes.",
            },
            { status: 429 }
          );
        }
      }

      // Autre erreur Gmail
      return NextResponse.json(
        {
          error: "Erreur lors de la suppression",
          code: "GMAIL_ERROR",
          details: gmailError.message,
        },
        { status: 500 }
      );
    }

    // 7. Mettre à jour la base de données (mais garder la ligne visible!)
    await prisma.senderStat.update({
      where: {
        userId_senderKey: {
          userId: user.id,
          senderKey: senderEmail,
        },
      },
      data: {
        emailsCount: 0, // Tous les emails ont été supprimés
        cleanedCount: { increment: successCount },
      },
    });

    // 8. Créer un log d'activité avec possibilité d'undo
    await prisma.activityLog.create({
      data: {
        userId: user.id,
        actionType: "trash",
        senderKey: senderEmail,
        senderName: senderStat.name,
        count: successCount,
        undoable: true,
        undoPayload: JSON.stringify({
          senderEmail,
          count: successCount,
          timestamp: new Date().toISOString(),
        }),
      },
    });

    // 9. Limiter les logs à 30 (supprimer les plus anciens)
    const allLogs = await prisma.activityLog.findMany({
      where: { userId: user.id },
      orderBy: { timestamp: "desc" },
    });

    if (allLogs.length > 30) {
      const toDelete = allLogs.slice(30);
      await prisma.activityLog.deleteMany({
        where: {
          id: { in: toDelete.map((log) => log.id) },
        },
      });
    }

    console.log(`✅ [bulk/trash] Mise à jour DB terminée: emailsCount=0, log créé`);

    return NextResponse.json({
      success: true,
      count: successCount,
      message: `${successCount} email(s) mis à la corbeille`,
    });
  } catch (error: any) {
    console.error("❌ [bulk/trash] Erreur globale:");
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
