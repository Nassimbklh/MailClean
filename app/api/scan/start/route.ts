import { NextRequest, NextResponse } from "next/server";
import { getIronSession } from "iron-session";
import { sessionOptions } from "@/lib/session";
import { cookies } from "next/headers";
import { scanSendersProgressively, QuotaExceededError } from "@/lib/gmail-scanner";
import prisma from "@/lib/prisma";
import { getOrCreateUser } from "@/lib/user-helpers";
import { refreshAccessToken } from "@/lib/gmail";
import { GaxiosError } from "googleapis-common";
import { getScanLimit, hasReachedScanLimit } from "@/lib/plan-limits";

// Constante : minimum d'emails à scanner (pour FREE uniquement)
const SCAN_MIN = 5000;

/**
 * POST /api/scan/start
 *
 * Démarre ou continue le scan progressif des expéditeurs
 *
 * Body params:
 * - reset: boolean (optionnel) - Si true, réinitialise le scan et repart de zéro
 * - fullScan: boolean (optionnel) - Si true, scan complet (jusqu'à la fin), sinon min 5000
 */
export async function POST(request: NextRequest) {
  console.log("📧 [scan/start] Début de la requête");

  try {
    // 1. Vérifier la session
    const session = await getIronSession(await cookies(), sessionOptions);

    if (!session.user) {
      console.warn("⚠️ [scan/start] Session non trouvée ou utilisateur absent");
      return NextResponse.json(
        {
          error: "Non authentifié",
          code: "NOT_AUTHENTICATED",
          action: "LOGIN",
        },
        { status: 401 }
      );
    }

    if (!session.user.email) {
      console.error("❌ [scan/start] Email utilisateur absent de la session");
      return NextResponse.json(
        {
          error: "Session invalide",
          code: "INVALID_SESSION",
          action: "LOGIN",
        },
        { status: 401 }
      );
    }

    // 2. Vérifier le token Gmail
    let accessToken = session.user.accessToken;
    const refreshToken = session.user.refreshToken;

    // Logs détaillés pour debug
    console.log("🔍 [scan/start] État de l'authentification:");
    console.log(`  - Email: ${session.user.email}`);
    console.log(`  - Access token: ${accessToken ? "✅ présent" : "❌ absent"}`);
    console.log(`  - Refresh token: ${refreshToken ? "✅ présent" : "❌ absent"}`);

    if (!accessToken) {
      console.error("❌ [scan/start] Access token Gmail absent");

      if (!refreshToken) {
        console.error("❌ [scan/start] Refresh token également absent - reconnexion nécessaire");
        return NextResponse.json(
          {
            error: "Token d'accès manquant",
            code: "TOKEN_MISSING_OR_EXPIRED",
            action: "RECONNECT",
          },
          { status: 401 }
        );
      }

      // Tenter de refresh le token
      try {
        console.log("🔄 [scan/start] Tentative de refresh du token...");
        const newTokens = await refreshAccessToken(refreshToken);
        accessToken = newTokens.access_token!;

        // Mettre à jour la session avec le nouveau token
        session.user.accessToken = accessToken;
        if (newTokens.refresh_token) {
          session.user.refreshToken = newTokens.refresh_token;
        }
        await session.save();

        console.log("✅ [scan/start] Token refreshé avec succès");
      } catch (refreshError: any) {
        console.error("❌ [scan/start] Erreur lors du refresh du token:", refreshError);
        return NextResponse.json(
          {
            error: "Token expiré et impossible à rafraîchir",
            code: "TOKEN_REFRESH_FAILED",
            action: "RECONNECT",
          },
          { status: 401 }
        );
      }
    }

    console.log(`✅ [scan/start] Session valide pour ${session.user.email}`);

    // 3. Parser le body
    let body;
    try {
      body = await request.json();
    } catch (e) {
      console.error("❌ [scan/start] Erreur de parsing du body JSON:", e);
      return NextResponse.json(
        {
          error: "Corps de la requête invalide",
          code: "INVALID_BODY",
          details: "Le JSON fourni est mal formaté",
        },
        { status: 400 }
      );
    }

    const { reset = false, fullScan = false } = body;

    console.log(
      `⚙️ [scan/start] Paramètres: reset=${reset}, fullScan=${fullScan}`
    );

    // 4. Récupérer ou créer l'utilisateur en DB
    let user;
    try {
      user = await getOrCreateUser(
        session.user.email,
        undefined,
        session.user.name,
        session.user.picture
      );
      console.log(`✅ [scan/start] User récupéré/créé: ${user.id}`);
    } catch (e: any) {
      console.error("❌ [scan/start] Erreur lors de getOrCreateUser:", e);
      return NextResponse.json(
        {
          error: "Erreur de base de données",
          code: "DB_USER_ERROR",
          details: e.message,
        },
        { status: 500 }
      );
    }

    // 5. Récupérer ou créer l'état du scan
    let scanState;
    try {
      scanState = await prisma.scanState.findUnique({
        where: { userId: user.id },
      });

      if (reset || !scanState) {
        console.log(
          `🔄 [scan/start] ${reset ? "Reset demandé" : "Premier scan"}`
        );

        // Reset: supprimer les anciennes stats si demandé
        if (scanState && reset) {
          console.log("🗑️ [scan/start] Suppression des anciennes SenderStat");
          await prisma.senderStat.deleteMany({
            where: { userId: user.id },
          });
        }

        scanState = await prisma.scanState.upsert({
          where: { userId: user.id },
          create: {
            userId: user.id,
            nextPageToken: null,
            scannedCount: 0,
            senderCount: 0,
            status: "SCANNING",
          },
          update: {
            nextPageToken: null,
            scannedCount: 0,
            senderCount: 0,
            status: "SCANNING",
          },
        });
      } else {
        // Continuer le scan existant
        console.log(
          `▶️ [scan/start] Continuation du scan (${scanState.scannedCount} déjà scannés)`
        );
        scanState = await prisma.scanState.update({
          where: { userId: user.id },
          data: { status: "SCANNING" },
        });
      }
    } catch (e: any) {
      console.error("❌ [scan/start] Erreur lors de la gestion de ScanState:", e);
      return NextResponse.json(
        {
          error: "Erreur de base de données",
          code: "DB_SCANSTATE_ERROR",
          details: e.message,
        },
        { status: 500 }
      );
    }

    let currentScannedCount = scanState.scannedCount;
    let currentPageToken = scanState.nextPageToken;
    let isComplete = false;
    let pageCount = 0;

    // Récupérer la limite de scan basée sur le plan de l'utilisateur
    const scanLimit = getScanLimit(user.plan);

    // Vérifier si l'utilisateur a déjà atteint sa limite
    if (hasReachedScanLimit(currentScannedCount, user.plan) && !reset) {
      console.log(`🛑 [scan/start] Limite de scan atteinte (${currentScannedCount}/${scanLimit})`);

      const senders = await prisma.senderStat.findMany({
        where: { userId: user.id },
        orderBy: { count: "desc" },
      });

      return NextResponse.json({
        success: true,
        totalScanned: currentScannedCount,
        senderCount: senders.length,
        senders: senders.map((s) => ({
          email: s.email,
          name: s.name,
          domain: s.domain,
          count: s.count,
          emailsCount: s.emailsCount,
          lastDate: s.lastDate?.toISOString(),
          cleanedCount: s.cleanedCount,
          unsubscribed: s.unsubscribed,
          unsubscribedAt: s.unsubscribedAt?.toISOString(),
          unsubAvailable: s.unsubAvailable,
          unsubUrl: s.unsubUrl,
          unsubMailto: s.unsubMailto,
        })),
        nextPageToken: currentPageToken,
        isComplete: false,
        status: "LIMIT_REACHED",
        scanLimit,
        message: `Limite de scan atteinte. Passez à un plan payant pour analyser toute votre boîte. ${currentScannedCount}/${scanLimit} emails analysés.`,
      });
    }

    // 6. Boucle de scan
    try {
      // Pour les plans payants (scanLimit === -1), scanner sans limite
      // Pour le plan gratuit, s'arrêter à la limite
      const shouldContinue = () => {
        if (scanLimit === -1) {
          // Plan payant : continuer tant qu'il y a des pages
          return currentPageToken !== null || currentScannedCount === 0;
        } else {
          // Plan gratuit : continuer si limite non atteinte ET il y a des pages
          return currentScannedCount < scanLimit && (currentPageToken !== null || currentScannedCount === 0);
        }
      };

      while (shouldContinue()) {
        pageCount++;
        console.log(
          `📄 [scan/start] Page ${pageCount} - scannés: ${currentScannedCount}, token: ${
            currentPageToken ? "existe" : "null"
          }`
        );

        // Scanner une page d'emails (500 max par page pour Gmail API)
        let result;
        try {
          result = await scanSendersProgressively(
            accessToken,
            500,
            currentPageToken || undefined
          );
        } catch (e: any) {
          console.error("❌ [scan/start] Erreur Gmail API:");
          console.error(`  - Message: ${e.message}`);
          console.error(`  - Stack: ${e.stack}`);

          // PRIORITÉ 1: Détecter QuotaExceededError → PAUSE automatique
          if (e instanceof QuotaExceededError) {
            console.warn("🚫 [scan/start] QUOTA EXCEEDED - Mise en pause automatique du scan");

            // Calculer resumeAfter (reprise dans 1 minute)
            const resumeAfter = new Date(Date.now() + 60000);

            // Mettre le scan en PAUSED_RATE_LIMIT
            await prisma.scanState.update({
              where: { userId: user.id },
              data: {
                status: "PAUSED_RATE_LIMIT",
                resumeAfter,
                nextPageToken: currentPageToken,
                scannedCount: currentScannedCount,
              },
            });

            return NextResponse.json({
              success: false,
              error: "Limite Gmail API atteinte",
              code: "QUOTA_EXCEEDED",
              status: "PAUSED_RATE_LIMIT",
              resumeAfter: resumeAfter.toISOString(),
              message: "Le scan a été automatiquement mis en pause pour respecter les limites Gmail. Il reprendra automatiquement dans 1 minute.",
            }, { status: 429 });
          }

          // Extraire les détails de l'erreur Google API
          let errorStatus = 500;
          let errorCode = "GMAIL_API_ERROR";
          let errorMessage = e.message || "Erreur inconnue";
          let errorAction: string | undefined;

          // Si c'est une GaxiosError (erreur HTTP de Google)
          if (e.response?.status) {
            errorStatus = e.response.status;
            console.error(`  - Code HTTP Google: ${errorStatus}`);
            console.error(
              `  - Réponse Google: ${JSON.stringify(e.response.data)}`
            );

            if (errorStatus === 401) {
              // Token invalide ou expiré
              errorCode = "TOKEN_EXPIRED";
              errorMessage =
                "Votre token Google a expiré ou est invalide. Reconnectez-vous.";
              errorAction = "RECONNECT";

              // Si on a un refresh token, tenter de l'utiliser
              if (refreshToken) {
                try {
                  console.log("🔄 [scan/start] Token expiré, tentative de refresh...");
                  const newTokens = await refreshAccessToken(refreshToken);
                  accessToken = newTokens.access_token!;

                  // Mettre à jour la session
                  session.user.accessToken = accessToken;
                  if (newTokens.refresh_token) {
                    session.user.refreshToken = newTokens.refresh_token;
                  }
                  await session.save();

                  console.log("✅ [scan/start] Token refreshé, retry du scan...");

                  // Retry le scan avec le nouveau token
                  result = await scanSendersProgressively(
                    accessToken,
                    500,
                    currentPageToken || undefined
                  );

                  // Si on arrive ici, le retry a réussi, on continue normalement
                  console.log("✅ [scan/start] Retry réussi après refresh");
                } catch (retryError: any) {
                  console.error("❌ [scan/start] Retry échoué après refresh:", retryError);
                  return NextResponse.json(
                    {
                      error: "Token expiré et refresh échoué",
                      code: "TOKEN_REFRESH_FAILED",
                      action: "RECONNECT",
                    },
                    { status: 401 }
                  );
                }
              } else {
                // Pas de refresh token
                return NextResponse.json(
                  {
                    error: errorMessage,
                    code: errorCode,
                    action: errorAction,
                  },
                  { status: errorStatus }
                );
              }
            } else if (errorStatus === 403) {
              // Vérifier si c'est une erreur de quota ou de permissions
              const errorData = e.response?.data;
              const isQuotaError =
                e.message?.includes('Quota exceeded') ||
                e.message?.includes('rateLimitExceeded') ||
                errorData?.error?.errors?.[0]?.reason === 'quotaExceeded' ||
                errorData?.error?.errors?.[0]?.reason === 'rateLimitExceeded';

              if (isQuotaError) {
                // QUOTA EXCEEDED → Mise en pause automatique
                console.warn("🚫 [scan/start] QUOTA EXCEEDED (403) - Mise en pause automatique du scan");

                const resumeAfter = new Date(Date.now() + 60000);

                await prisma.scanState.update({
                  where: { userId: user.id },
                  data: {
                    status: "PAUSED_RATE_LIMIT",
                    resumeAfter,
                    nextPageToken: currentPageToken,
                    scannedCount: currentScannedCount,
                  },
                });

                return NextResponse.json({
                  success: false,
                  error: "Limite Gmail API atteinte",
                  code: "QUOTA_EXCEEDED",
                  status: "PAUSED_RATE_LIMIT",
                  resumeAfter: resumeAfter.toISOString(),
                  message: "Le scan a été automatiquement mis en pause pour respecter les limites Gmail. Il reprendra automatiquement dans 1 minute.",
                }, { status: 429 });
              } else {
                // Permissions insuffisantes
                errorCode = "INSUFFICIENT_SCOPE";
                errorMessage =
                  "Permissions Gmail insuffisantes. Reconnectez-vous pour autoriser l'accès complet.";
                errorAction = "RECONNECT";

                return NextResponse.json(
                  {
                    error: errorMessage,
                    code: errorCode,
                    action: errorAction,
                  },
                  { status: errorStatus }
                );
              }
            } else if (errorStatus === 429) {
              // Rate limit dépassé (erreur 429)
              errorCode = "RATE_LIMIT_EXCEEDED";
              errorMessage =
                "Trop de requêtes Gmail. L'application ralentit automatiquement. Veuillez réessayer dans quelques secondes.";
              errorAction = "RETRY_LATER";

              console.warn("⚠️ [scan/start] Rate limit 429 - Le rate limiter aurait dû éviter cela");

              return NextResponse.json(
                {
                  error: errorMessage,
                  code: errorCode,
                  action: errorAction,
                },
                { status: 429 }
              );
            } else {
              // Autre erreur HTTP
              console.error("❌ [scan/start] Erreur HTTP non gérée:", errorStatus);
            }
          } else {
            // Erreur non-HTTP (réseau, timeout, etc.)
            console.error("❌ [scan/start] Erreur non-HTTP:", e);
          }

          // Si on arrive ici et qu'on n'a pas de result, c'est une vraie erreur
          if (!result) {
            return NextResponse.json(
              {
                error: errorMessage,
                code: errorCode,
                action: errorAction,
              },
              { status: errorStatus }
            );
          }
        }

        // Sauvegarder ou mettre à jour les stats des expéditeurs
        for (const sender of result.senders.values()) {
          try {
            await prisma.senderStat.upsert({
              where: {
                userId_senderKey: {
                  userId: user.id,
                  senderKey: sender.email,
                },
              },
              create: {
                userId: user.id,
                senderKey: sender.email,
                name: sender.name,
                email: sender.email,
                domain: sender.domain,
                count: sender.count,
                emailsCount: sender.count, // Initialiser emailsCount avec count
                lastDate: sender.lastDate ? new Date(sender.lastDate) : null,
                unsubAvailable: sender.unsubAvailable || false,
                unsubUrl: sender.unsubUrl,
                unsubMailto: sender.unsubMailto,
              },
              update: {
                name: sender.name,
                domain: sender.domain,
                count: { increment: sender.count },
                emailsCount: { increment: sender.count }, // Incrémenter aussi emailsCount
                lastDate: sender.lastDate ? new Date(sender.lastDate) : undefined,
                // Mettre à jour les infos de désabonnement si disponibles
                ...(sender.unsubAvailable && {
                  unsubAvailable: sender.unsubAvailable,
                  unsubUrl: sender.unsubUrl,
                  unsubMailto: sender.unsubMailto,
                }),
              },
            });
          } catch (e: any) {
            console.error(
              `⚠️ [scan/start] Erreur lors de l'upsert de ${sender.email}:`,
              e
            );
            // Continue malgré l'erreur pour un seul expéditeur
          }
        }

        // Mettre à jour les compteurs
        currentScannedCount += result.totalScanned;
        currentPageToken = result.nextPageToken || null;
        isComplete = result.isComplete;

        // Calculer le nombre total d'expéditeurs
        const totalSenders = await prisma.senderStat.count({
          where: { userId: user.id },
        });

        // Mettre à jour l'état du scan en DB après chaque page
        await prisma.scanState.update({
          where: { userId: user.id },
          data: {
            nextPageToken: currentPageToken,
            scannedCount: currentScannedCount,
            senderCount: totalSenders,
            status: "SCANNING",
            updatedAt: new Date(),
          },
        });

        console.log(
          `✅ [scan/start] Page ${pageCount} terminée. Total: ${currentScannedCount}, Expéditeurs: ${totalSenders}`
        );

        // Si plus de nextPageToken, on a atteint la fin
        if (!currentPageToken) {
          isComplete = true;
          console.log("🏁 [scan/start] Fin de la boîte mail atteinte");
          break;
        }

        // Si on a atteint SCAN_MIN et fullScan=false, on s'arrête (uniquement pour plan gratuit)
        // Pour les plans payants, on continue jusqu'à la fin
        if (scanLimit !== -1 && currentScannedCount >= SCAN_MIN && !fullScan) {
          console.log(
            `✋ [scan/start] SCAN_MIN (${SCAN_MIN}) atteint pour plan gratuit, arrêt du scan`
          );
          break;
        }
      }
    } catch (e: any) {
      console.error("❌ [scan/start] Erreur pendant la boucle de scan:", e);

      // Marquer le scan comme incomplet
      try {
        await prisma.scanState.update({
          where: { userId: user.id },
          data: { status: "INCOMPLETE" },
        });
      } catch (updateError) {
        console.error(
          "❌ [scan/start] Erreur lors de la mise à jour du statut:",
          updateError
        );
      }

      return NextResponse.json(
        {
          error: "Erreur durant le scan",
          code: "SCAN_ERROR",
          details: e.message,
          stack: process.env.NODE_ENV === "development" ? e.stack : undefined,
        },
        { status: 500 }
      );
    }

    // 7. Finalisation
    try {
      // Calculer le nombre total d'expéditeurs final
      const totalSenders = await prisma.senderStat.count({
        where: { userId: user.id },
      });

      // Mettre à jour le statut final
      const finalStatus = isComplete ? "COMPLETE" : "INCOMPLETE";
      const previousStatus = scanState.status;

      await prisma.scanState.update({
        where: { userId: user.id },
        data: {
          status: finalStatus,
          lastScanAt: new Date(),
          updatedAt: new Date(),
          // Marquer hasShownFirstScanToast seulement si c'est la première fois que le scan est complet
          hasShownFirstScanToast:
            finalStatus === "COMPLETE" && previousStatus === "SCANNING"
              ? false // Reset pour montrer le toast
              : scanState.hasShownFirstScanToast,
        },
      });

      // Récupérer la liste des expéditeurs depuis la DB
      const senders = await prisma.senderStat.findMany({
        where: { userId: user.id },
        orderBy: { count: "desc" },
      });

      console.log(
        `🎉 [scan/start] Scan terminé. Status: ${finalStatus}, Total: ${currentScannedCount}, Expéditeurs: ${totalSenders}`
      );

      // Récupérer le scanState mis à jour pour le flag du toast
      const updatedScanState = await prisma.scanState.findUnique({
        where: { userId: user.id },
      });

      return NextResponse.json({
        success: true,
        totalScanned: currentScannedCount,
        senderCount: totalSenders,
        senders: senders.map((s) => ({
          email: s.email,
          name: s.name,
          domain: s.domain,
          count: s.count,
          emailsCount: s.emailsCount,
          lastDate: s.lastDate?.toISOString(),
          cleanedCount: s.cleanedCount,
          unsubscribed: s.unsubscribed,
          unsubscribedAt: s.unsubscribedAt?.toISOString(),
          unsubAvailable: s.unsubAvailable,
          unsubUrl: s.unsubUrl,
          unsubMailto: s.unsubMailto,
        })),
        nextPageToken: currentPageToken,
        isComplete,
        status: finalStatus,
        scanLimit,
        showFirstScanToast: !updatedScanState?.hasShownFirstScanToast && finalStatus === "COMPLETE",
      });
    } catch (e: any) {
      console.error("❌ [scan/start] Erreur lors de la finalisation:", e);
      return NextResponse.json(
        {
          error: "Erreur de finalisation",
          code: "FINALIZATION_ERROR",
          details: e.message,
        },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error("❌ [scan/start] Erreur globale non gérée:", error);
    console.error("Stack trace:", error.stack);

    return NextResponse.json(
      {
        error: "Erreur interne du serveur",
        code: "INTERNAL_ERROR",
        details: error.message,
        stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}
