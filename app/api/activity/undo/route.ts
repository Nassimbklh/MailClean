import { NextRequest, NextResponse } from "next/server";
import { getIronSession } from "iron-session";
import { sessionOptions } from "@/lib/session";
import { cookies } from "next/headers";
import { refreshAccessToken } from "@/lib/gmail";
import { getGmailClient } from "@/lib/gmail-scanner";
import prisma from "@/lib/prisma";

/**
 * POST /api/activity/undo
 *
 * Annuler une action (trash, archive, mark_read)
 * - Récupère les emails via Gmail API
 * - Restaure leur état précédent
 * - Marque l'activité comme undone = true
 *
 * Body params:
 * - activityId: string - ID de l'activité à annuler
 */
export async function POST(request: NextRequest) {
  console.log("↩️ [activity/undo] Début de la requête");

  try {
    // 1. Vérifier la session
    const session = await getIronSession(await cookies(), sessionOptions);

    if (!session.user) {
      console.warn("⚠️ [activity/undo] Session non trouvée");
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
    const { activityId } = body;

    console.log(`↩️ [activity/undo] Annulation pour activityId: ${activityId}`);

    if (!activityId) {
      console.error("❌ [activity/undo] Activity ID manquant");
      return NextResponse.json(
        { error: "ID d'activité manquant" },
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

    // 4. Récupérer l'activité
    const activity = await prisma.activityLog.findUnique({
      where: { id: activityId },
    });

    if (!activity) {
      return NextResponse.json(
        { error: "Activité introuvable" },
        { status: 404 }
      );
    }

    // 5. Vérifier que l'activité appartient à l'utilisateur
    if (activity.userId !== user.id) {
      return NextResponse.json(
        { error: "Activité non autorisée" },
        { status: 403 }
      );
    }

    // 6. Vérifier que l'activité est annulable
    if (!activity.undoable) {
      return NextResponse.json(
        {
          error: "Cette action ne peut pas être annulée",
          code: "NOT_UNDOABLE",
          details: "Les désabonnements ne peuvent pas être annulés depuis l'application.",
        },
        { status: 400 }
      );
    }

    // 7. Vérifier que l'activité n'a pas déjà été annulée
    if (activity.undone) {
      return NextResponse.json(
        {
          error: "Cette action a déjà été annulée",
          code: "ALREADY_UNDONE",
        },
        { status: 400 }
      );
    }

    // 8. Parser le payload
    const payload = JSON.parse(activity.undoPayload || "{}");
    const senderEmail = payload.senderEmail;

    if (!senderEmail) {
      return NextResponse.json(
        { error: "Données d'annulation invalides" },
        { status: 400 }
      );
    }

    // 9. Vérifier le token
    let accessToken = session.user.accessToken;
    const refreshToken = session.user.refreshToken;

    if (!accessToken) {
      console.error("❌ [activity/undo] Access token absent");
      return NextResponse.json(
        {
          error: "Token d'accès manquant",
          code: "TOKEN_MISSING_OR_EXPIRED",
          action: "RECONNECT",
        },
        { status: 401 }
      );
    }

    console.log(`✅ [activity/undo] Token présent, appel Gmail API...`);

    // 10. Effectuer l'opération d'annulation selon le type d'action
    let successCount: number = 0;

    try {
      const gmail = getGmailClient(accessToken);

      // Rechercher tous les messages de cet expéditeur
      let allMessageIds: string[] = [];
      let pageToken: string | undefined = undefined;

      // Construire la requête selon le type d'action
      let query = `from:${senderEmail}`;

      if (activity.actionType === "trash") {
        // Pour annuler trash, chercher dans la corbeille
        query += " in:trash";
      } else if (activity.actionType === "archive") {
        // Pour annuler archive, chercher hors INBOX
        query += " -in:inbox";
      }

      // Récupérer tous les IDs en gérant la pagination
      do {
        const searchResponse = await gmail.users.messages.list({
          userId: "me",
          q: query,
          maxResults: 500,
          pageToken,
        });

        const messages = searchResponse.data.messages || [];
        allMessageIds = allMessageIds.concat(messages.map((m) => m.id!));
        pageToken = searchResponse.data.nextPageToken;
      } while (pageToken);

      if (allMessageIds.length === 0) {
        console.warn(`⚠️ [activity/undo] Aucun message à restaurer pour ${senderEmail}`);
      } else {
        // Appliquer l'annulation par batch de 1000
        const batchSize = 1000;
        for (let i = 0; i < allMessageIds.length; i += batchSize) {
          const batch = allMessageIds.slice(i, i + batchSize);

          if (activity.actionType === "trash") {
            // Restaurer de la corbeille vers INBOX
            await gmail.users.messages.batchModify({
              userId: "me",
              requestBody: {
                ids: batch,
                removeLabelIds: ["TRASH"],
                addLabelIds: ["INBOX"],
              },
            });
          } else if (activity.actionType === "archive") {
            // Restaurer dans INBOX
            await gmail.users.messages.batchModify({
              userId: "me",
              requestBody: {
                ids: batch,
                addLabelIds: ["INBOX"],
              },
            });
          }
        }

        successCount = allMessageIds.length;
        console.log(`✅ [activity/undo] ${successCount} emails restaurés`);
      }
    } catch (gmailError: any) {
      console.error("❌ [activity/undo] Erreur Gmail API:");
      console.error(`  - Message: ${gmailError.message}`);
      console.error(`  - Code: ${gmailError.code}`);

      // Déterminer le type d'erreur
      if (gmailError.response?.status) {
        const statusCode = gmailError.response.status;
        console.error(`  - HTTP Status: ${statusCode}`);

        if (statusCode === 401) {
          // Token expiré, tenter un refresh
          console.log("🔄 [activity/undo] Token expiré, tentative de refresh...");

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

              console.log("✅ [activity/undo] Token refreshé, retry...");

              // Retry avec le nouveau token
              const gmail = getGmailClient(accessToken);

              // Re-rechercher les messages
              let allMessageIds: string[] = [];
              let pageToken: string | undefined = undefined;

              let query = `from:${senderEmail}`;
              if (activity.actionType === "trash") {
                query += " in:trash";
              } else if (activity.actionType === "archive") {
                query += " -in:inbox";
              }

              do {
                const searchResponse = await gmail.users.messages.list({
                  userId: "me",
                  q: query,
                  maxResults: 500,
                  pageToken,
                });

                const messages = searchResponse.data.messages || [];
                allMessageIds = allMessageIds.concat(messages.map((m) => m.id!));
                pageToken = searchResponse.data.nextPageToken;
              } while (pageToken);

              if (allMessageIds.length > 0) {
                const batchSize = 1000;
                for (let i = 0; i < allMessageIds.length; i += batchSize) {
                  const batch = allMessageIds.slice(i, i + batchSize);

                  if (activity.actionType === "trash") {
                    await gmail.users.messages.batchModify({
                      userId: "me",
                      requestBody: {
                        ids: batch,
                        removeLabelIds: ["TRASH"],
                        addLabelIds: ["INBOX"],
                      },
                    });
                  } else if (activity.actionType === "archive") {
                    await gmail.users.messages.batchModify({
                      userId: "me",
                      requestBody: {
                        ids: batch,
                        addLabelIds: ["INBOX"],
                      },
                    });
                  }
                }

                successCount = allMessageIds.length;
              }
            } catch (refreshError: any) {
              console.error("❌ [activity/undo] Refresh échoué:", refreshError);
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
          console.error("❌ [activity/undo] Permissions insuffisantes (403)");
          return NextResponse.json(
            {
              error: "Autorisation Gmail manquante",
              code: "INSUFFICIENT_SCOPE",
              missing: "gmail.modify",
              action: "RECONNECT",
              details: "Le scope 'gmail.modify' est nécessaire pour restaurer des emails.",
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
          error: "Erreur lors de l'annulation",
          code: "GMAIL_ERROR",
          details: gmailError.message,
        },
        { status: 500 }
      );
    }

    // 11. Mettre à jour la base de données
    // Restaurer emailsCount (s'il y a des emails restaurés)
    if (successCount > 0) {
      const senderStat = await prisma.senderStat.findUnique({
        where: {
          userId_senderKey: {
            userId: user.id,
            senderKey: senderEmail,
          },
        },
      });

      if (senderStat) {
        await prisma.senderStat.update({
          where: {
            userId_senderKey: {
              userId: user.id,
              senderKey: senderEmail,
            },
          },
          data: {
            emailsCount: { increment: successCount }, // Restaurer les emails
            cleanedCount: { decrement: Math.min(successCount, senderStat.cleanedCount) }, // Décrémenter cleanedCount
          },
        });
      }
    }

    // 12. Marquer l'activité comme annulée
    await prisma.activityLog.update({
      where: { id: activityId },
      data: { undone: true },
    });

    console.log(`✅ [activity/undo] Annulation terminée: ${successCount} emails restaurés`);

    return NextResponse.json({
      success: true,
      count: successCount,
      message: `${successCount} email(s) restauré(s)`,
    });
  } catch (error: any) {
    console.error("❌ [activity/undo] Erreur globale:");
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
