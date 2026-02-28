import { google } from "googleapis";
import { EmailSender, GmailMessage, UnsubscribeInfo } from "@/types";

// Configuration OAuth2
export function getOAuth2Client() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/google/callback`
  );
}

// Scopes OAuth2 requis
export const REQUIRED_SCOPES = [
  "https://www.googleapis.com/auth/userinfo.email",
  "https://www.googleapis.com/auth/userinfo.profile",
  "openid",
  "https://www.googleapis.com/auth/gmail.readonly",
  "https://www.googleapis.com/auth/gmail.modify",
];

// Vérifier les scopes d'un token via l'API Google tokeninfo
export async function checkTokenScopes(accessToken: string): Promise<{
  valid: boolean;
  grantedScopes: string[];
  missingScopes: string[];
  hasModify: boolean;
  hasReadonly: boolean;
}> {
  try {
    const response = await fetch(
      `https://www.googleapis.com/oauth2/v1/tokeninfo?access_token=${accessToken}`
    );

    if (!response.ok) {
      console.error("❌ [checkTokenScopes] Tokeninfo failed:", response.status);
      return {
        valid: false,
        grantedScopes: [],
        missingScopes: REQUIRED_SCOPES,
        hasModify: false,
        hasReadonly: false,
      };
    }

    const data = await response.json();
    const grantedScopes = data.scope ? data.scope.split(' ') : [];

    const missingScopes = REQUIRED_SCOPES.filter(
      (required) => !grantedScopes.includes(required)
    );

    const hasModify = grantedScopes.includes('https://www.googleapis.com/auth/gmail.modify');
    const hasReadonly = grantedScopes.includes('https://www.googleapis.com/auth/gmail.readonly');

    console.log(`✅ [checkTokenScopes] Granted: ${grantedScopes.length} scopes`);
    console.log(`  - hasModify: ${hasModify}`);
    console.log(`  - hasReadonly: ${hasReadonly}`);
    console.log(`  - missing: ${missingScopes.length}`);

    return {
      valid: missingScopes.length === 0,
      grantedScopes,
      missingScopes,
      hasModify,
      hasReadonly,
    };
  } catch (error: any) {
    console.error("❌ [checkTokenScopes] Error:", error.message);
    return {
      valid: false,
      grantedScopes: [],
      missingScopes: REQUIRED_SCOPES,
      hasModify: false,
      hasReadonly: false,
    };
  }
}

// Vérifier si les scopes requis sont présents
export function hasRequiredScopes(grantedScopes: string[]): boolean {
  return REQUIRED_SCOPES.every((scope) => grantedScopes.includes(scope));
}

// Générer l'URL de connexion Google
export function getAuthUrl(forceConsent = false) {
  const oauth2Client = getOAuth2Client();

  return oauth2Client.generateAuthUrl({
    access_type: "offline", // Pour obtenir un refresh_token
    scope: REQUIRED_SCOPES,
    prompt: forceConsent ? "consent" : "select_account", // ✅ KEY FIX: éviter loop
    include_granted_scopes: true, // Inclure les scopes déjà accordés
    response_type: "code",
  });
}

// Échanger le code d'autorisation contre des tokens
export async function getTokensFromCode(code: string) {
  const oauth2Client = getOAuth2Client();
  const { tokens } = await oauth2Client.getToken(code);
  return tokens;
}

// Rafraîchir un access token expiré
export async function refreshAccessToken(refreshToken: string) {
  const oauth2Client = getOAuth2Client();
  oauth2Client.setCredentials({ refresh_token: refreshToken });

  try {
    const { credentials } = await oauth2Client.refreshAccessToken();
    return credentials;
  } catch (error: any) {
    console.error("❌ Erreur lors du refresh du token:", error);
    throw new Error("REFRESH_TOKEN_FAILED");
  }
}

// Créer un client Gmail authentifié
export function getGmailClient(accessToken: string) {
  const oauth2Client = getOAuth2Client();
  oauth2Client.setCredentials({ access_token: accessToken });
  return google.gmail({ version: "v1", auth: oauth2Client });
}

// Récupérer et grouper les emails par expéditeur
export async function getSenderGroups(accessToken: string): Promise<EmailSender[]> {
  const gmail = getGmailClient(accessToken);

  try {
    // Récupérer les messages (limité à 1000 pour performance)
    const response = await gmail.users.messages.list({
      userId: "me",
      maxResults: 1000,
    });

    const messages = response.data.messages || [];

    if (messages.length === 0) {
      return [];
    }

    // Map pour grouper par expéditeur
    const senderMap = new Map<string, EmailSender>();

    // Traiter les messages par batch pour éviter trop de requêtes
    const batchSize = 50;
    for (let i = 0; i < Math.min(messages.length, 1000); i += batchSize) {
      const batch = messages.slice(i, i + batchSize);

      await Promise.all(
        batch.map(async (message) => {
          try {
            const msg = await gmail.users.messages.get({
              userId: "me",
              id: message.id!,
              format: "metadata",
              metadataHeaders: ["From", "Date"],
            });

            const headers = msg.data.payload?.headers || [];
            const fromHeader = headers.find((h) => h.name?.toLowerCase() === "from");
            const dateHeader = headers.find((h) => h.name?.toLowerCase() === "date");

            if (fromHeader?.value) {
              const fromValue = fromHeader.value;

              // Extraire email et nom du format "Name <email@domain.com>"
              const emailMatch = fromValue.match(/<(.+?)>/);
              const email = emailMatch ? emailMatch[1] : fromValue;
              const name = emailMatch
                ? fromValue.substring(0, fromValue.indexOf("<")).trim().replace(/^["']|["']$/g, "")
                : email.split("@")[0];

              const domain = email.split("@")[1] || "";

              if (senderMap.has(email)) {
                const existing = senderMap.get(email)!;
                existing.count += 1;

                // Mettre à jour avec la date la plus récente
                if (dateHeader?.value) {
                  const currentDate = new Date(dateHeader.value);
                  const existingDate = existing.lastDate ? new Date(existing.lastDate) : new Date(0);
                  if (currentDate > existingDate) {
                    existing.lastDate = dateHeader.value;
                  }
                }
              } else {
                senderMap.set(email, {
                  email,
                  name,
                  count: 1,
                  domain,
                  lastDate: dateHeader?.value ?? undefined,
                });
              }
            }
          } catch (error) {
            console.error(`Erreur pour le message ${message.id}:`, error);
          }
        })
      );
    }

    // Convertir en tableau et trier par nombre d'emails (décroissant)
    return Array.from(senderMap.values()).sort((a, b) => b.count - a.count);
  } catch (error) {
    console.error("Erreur lors de la récupération des emails:", error);
    throw error;
  }
}

// Vérifier si un expéditeur a un lien de désabonnement (4 niveaux)
export async function getUnsubscribeInfo(
  accessToken: string,
  senderEmail: string
): Promise<UnsubscribeInfo> {
  const gmail = getGmailClient(accessToken);

  try {
    console.log(`🔍 [getUnsubscribeInfo] Recherche pour: ${senderEmail}`);

    // Chercher un email récent de cet expéditeur
    const searchResponse = await gmail.users.messages.list({
      userId: "me",
      q: `from:${senderEmail}`,
      maxResults: 1,
    });

    const messages = searchResponse.data.messages || [];

    if (messages.length === 0) {
      console.log(`❌ [getUnsubscribeInfo] Aucun email trouvé`);
      return {
        hasUnsubscribe: false,
        message: "Aucun email trouvé de cet expéditeur",
        detectionLevel: "none",
      };
    }

    const messageId = messages[0].id!;
    console.log(`✅ [getUnsubscribeInfo] Email trouvé: ${messageId}`);

    // NIVEAU 1: Vérifier les headers List-Unsubscribe
    const metadataMessage = await gmail.users.messages.get({
      userId: "me",
      id: messageId,
      format: "metadata",
      metadataHeaders: ["List-Unsubscribe", "List-Unsubscribe-Post"],
    });

    const headers = metadataMessage.data.payload?.headers || [];
    const unsubHeader = headers.find((h) => h.name?.toLowerCase() === "list-unsubscribe");

    if (unsubHeader?.value) {
      console.log(`✅ [getUnsubscribeInfo] NIVEAU 1 - Header trouvé: ${unsubHeader.value}`);
      const unsubValue = unsubHeader.value;

      // Chercher un lien HTTP
      const urlMatch = unsubValue.match(/<(https?:\/\/[^>]+)>/);
      const unsubscribeUrl = urlMatch ? urlMatch[1] : undefined;

      // Chercher un mailto
      const mailtoMatch = unsubValue.match(/<(mailto:[^>]+)>/);
      const unsubscribeMailto = mailtoMatch ? mailtoMatch[1] : undefined;

      return {
        hasUnsubscribe: true,
        unsubscribeUrl,
        unsubscribeMailto,
        detectionLevel: "header",
        gmailMessageId: messageId,
      };
    }

    console.log(`⚠️ [getUnsubscribeInfo] NIVEAU 1 - Pas de header, passage au NIVEAU 2`);

    // NIVEAU 2 & 3: Analyser le body HTML
    const fullMessage = await gmail.users.messages.get({
      userId: "me",
      id: messageId,
      format: "full",
    });

    const { extractHTMLFromGmailPayload, findUnsubscribeLinkInHTML, findUnsubscribeMailtoInHTML } =
      await import("./unsubscribe-detection");

    const htmlContent = extractHTMLFromGmailPayload(fullMessage.data.payload);

    if (!htmlContent) {
      console.log(`❌ [getUnsubscribeInfo] Pas de contenu HTML trouvé`);
      return {
        hasUnsubscribe: false,
        message: "Aucun lien de désabonnement détecté",
        detectionLevel: "none",
        gmailMessageId: messageId,
      };
    }

    console.log(`✅ [getUnsubscribeInfo] HTML extrait, recherche de liens...`);

    // NIVEAU 2: Chercher un lien HTTP
    const bodyLink = findUnsubscribeLinkInHTML(htmlContent);
    if (bodyLink) {
      console.log(`✅ [getUnsubscribeInfo] NIVEAU 2 - Lien trouvé dans le body: ${bodyLink}`);
      return {
        hasUnsubscribe: true,
        unsubscribeUrl: bodyLink,
        detectionLevel: "body_link",
        gmailMessageId: messageId,
      };
    }

    console.log(`⚠️ [getUnsubscribeInfo] NIVEAU 2 - Pas de lien HTTP, passage au NIVEAU 3`);

    // NIVEAU 3: Chercher un mailto
    const bodyMailto = findUnsubscribeMailtoInHTML(htmlContent);
    if (bodyMailto) {
      console.log(`✅ [getUnsubscribeInfo] NIVEAU 3 - Mailto trouvé: ${bodyMailto}`);
      return {
        hasUnsubscribe: true,
        unsubscribeMailto: bodyMailto,
        detectionLevel: "body_mailto",
        gmailMessageId: messageId,
      };
    }

    // NIVEAU 4: Rien trouvé
    console.log(`❌ [getUnsubscribeInfo] NIVEAU 4 - Aucun lien de désabonnement détecté`);
    return {
      hasUnsubscribe: false,
      message: "Aucun lien de désabonnement détecté",
      detectionLevel: "none",
      gmailMessageId: messageId,
    };
  } catch (error) {
    console.error("❌ [getUnsubscribeInfo] Erreur:", error);
    throw error;
  }
}

// Supprimer (mettre en corbeille) tous les emails d'un expéditeur
export async function trashEmailsFromSender(
  accessToken: string,
  senderEmail: string
): Promise<number> {
  const gmail = getGmailClient(accessToken);

  try {
    // Rechercher tous les messages de cet expéditeur
    const searchResponse = await gmail.users.messages.list({
      userId: "me",
      q: `from:${senderEmail}`,
      maxResults: 500, // Limite de sécurité
    });

    const messages = searchResponse.data.messages || [];

    if (messages.length === 0) {
      return 0;
    }

    // Mettre en corbeille par batch
    const messageIds = messages.map((m) => m.id!);

    // Gmail API permet de modifier jusqu'à 1000 messages à la fois
    await gmail.users.messages.batchModify({
      userId: "me",
      requestBody: {
        ids: messageIds,
        addLabelIds: ["TRASH"],
        removeLabelIds: ["INBOX"],
      },
    });

    return messageIds.length;
  } catch (error) {
    console.error("Erreur lors de la suppression des emails:", error);
    throw error;
  }
}
