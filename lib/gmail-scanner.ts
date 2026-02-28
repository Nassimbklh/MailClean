import { google } from "googleapis";
import { EmailSender } from "@/types";
import { parseListUnsubscribe } from "./unsubscribe-parser";
import { gmailRateLimiter } from "./gmail-rate-limiter";

// Créer un client Gmail authentifié
export function getGmailClient(accessToken: string) {
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/google/callback`
  );
  oauth2Client.setCredentials({ access_token: accessToken });
  return google.gmail({ version: "v1", auth: oauth2Client });
}

// Erreur custom pour quota exceeded
export class QuotaExceededError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "QuotaExceededError";
  }
}

// Rate limiter simple pour respecter les quotas Gmail
// Gmail autorise 250 requêtes/seconde (15000/minute)
// On limite à 200 req/sec pour avoir de la marge
class RateLimiter {
  private queue: (() => void)[] = [];
  private requestsInLastSecond: number = 0;
  private maxRequestsPerSecond: number = 200; // Marge de sécurité
  private intervalId?: NodeJS.Timeout;

  constructor() {
    // Reset le compteur chaque seconde
    this.intervalId = setInterval(() => {
      this.requestsInLastSecond = 0;
      this.processQueue();
    }, 1000);
  }

  async waitForSlot(): Promise<void> {
    if (this.requestsInLastSecond < this.maxRequestsPerSecond) {
      this.requestsInLastSecond++;
      return Promise.resolve();
    }

    // Si limite atteinte, attendre dans la queue
    return new Promise((resolve) => {
      this.queue.push(resolve);
    });
  }

  private processQueue() {
    while (this.queue.length > 0 && this.requestsInLastSecond < this.maxRequestsPerSecond) {
      const resolve = this.queue.shift();
      if (resolve) {
        this.requestsInLastSecond++;
        resolve();
      }
    }
  }

  destroy() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }
  }
}

// Instance globale du rate limiter
const rateLimiter = new RateLimiter();

// Helper pour retry avec exponential backoff en cas de rate limit
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error: any) {
      const isRateLimitError =
        error?.status === 429 ||
        error?.code === 429 ||
        (error?.status === 403 && error?.message?.includes('Quota exceeded'));

      if (!isRateLimitError || attempt === maxRetries) {
        throw error;
      }

      // Attendre avec exponential backoff : 1s, 2s, 4s, 8s...
      const delay = baseDelay * Math.pow(2, attempt);
      console.log(`⏳ [Rate Limit] Tentative ${attempt + 1}/${maxRetries}. Attente de ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  throw new Error('Max retries exceeded');
}

// Interface pour le résultat du scan
export interface ScanProgress {
  totalScanned: number;
  senders: Map<string, EmailSender>;
  nextPageToken?: string;
  isComplete: boolean;
}

/**
 * Scanner progressif ultra-optimisé pour éviter quota exceeded
 *
 * OPTIMISATIONS:
 * - Limite stricte: 100 messages.get max par scan
 * - Rate limiter: max 3 requêtes en parallèle + 200ms pause
 * - Fields minimal pour réduire la bande passante
 * - Détection quotaExceeded → throw QuotaExceededError
 *
 * @param accessToken - Token d'accès Gmail
 * @param limit - Nombre maximum de messages à scanner (0 = illimité)
 * @param pageToken - Token de pagination pour continuer un scan
 * @param existingSenders - Map existante pour continuer un scan
 * @returns Progression du scan avec expéditeurs groupés
 */
export async function scanSendersProgressively(
  accessToken: string,
  limit: number = 2000,
  pageToken?: string,
  existingSenders?: Map<string, EmailSender>
): Promise<ScanProgress> {
  const gmail = getGmailClient(accessToken);
  const senderMap = existingSenders || new Map<string, EmailSender>();
  let totalScanned = 0;
  let currentPageToken = pageToken;
  let isComplete = false;

  // LIMITE STRICTE: max 100 messages.get par scan pour éviter quota exceeded
  const MAX_MESSAGES_PER_SCAN = 100;

  try {
    console.log(`🔍 [Scanner] Début scan (limit: ${limit}, pageToken: ${pageToken ? 'oui' : 'non'})`);

    // Récupérer une page de messages avec fields minimal
    const response = await gmailRateLimiter.execute(() =>
      gmail.users.messages.list({
        userId: "me",
        maxResults: Math.min(limit || 500, 500),
        pageToken: currentPageToken,
        // Fields minimal pour réduire la bande passante
        fields: "messages(id),nextPageToken",
      })
    );

    const messages = response.data.messages || [];
    const nextPageToken = response.data.nextPageToken;

    console.log(`📬 [Scanner] ${messages.length} messages trouvés`);

    if (messages.length === 0) {
      return {
        totalScanned: 0,
        senders: senderMap,
        isComplete: true,
      };
    }

    // LIMITER à 100 messages.get max
    const messagesToProcess = messages.slice(0, MAX_MESSAGES_PER_SCAN);
    console.log(`⚙️ [Scanner] Traitement de ${messagesToProcess.length} messages (limite: ${MAX_MESSAGES_PER_SCAN})`);

    // Traiter les messages UN PAR UN (pas de Promise.all pour éviter burst)
    for (const message of messagesToProcess) {
      try {
        // Utiliser le rate limiter (max 3 concurrent + 200ms pause)
        const msg = await gmailRateLimiter.execute(() =>
          gmail.users.messages.get({
            userId: "me",
            id: message.id!,
            format: "metadata",
            metadataHeaders: ["From", "Date", "List-Unsubscribe"],
            // Fields minimal
            fields: "payload/headers",
          })
        );

        const headers = msg.data.payload?.headers || [];
        const fromHeader = headers.find((h) => h.name?.toLowerCase() === "from");
        const dateHeader = headers.find((h) => h.name?.toLowerCase() === "date");
        const unsubscribeHeader = headers.find((h) => h.name?.toLowerCase() === "list-unsubscribe");

        if (fromHeader?.value) {
          const fromValue = fromHeader.value;

          // Extraire email et nom du format "Name <email@domain.com>"
          const emailMatch = fromValue.match(/<(.+?)>/);
          const email = emailMatch ? emailMatch[1] : fromValue;
          const name = emailMatch
            ? fromValue.substring(0, fromValue.indexOf("<")).trim().replace(/^["']|["']$/g, "")
            : email.split("@")[0];

          const domain = email.split("@")[1] || "";

          // Parser les informations de désabonnement
          const unsubInfo = parseListUnsubscribe(unsubscribeHeader?.value);

          if (senderMap.has(email)) {
            const existing = senderMap.get(email)!;
            existing.count += 1;

            // Mettre à jour avec la date la plus récente
            if (dateHeader?.value) {
              const currentDate = new Date(dateHeader.value);
              const existingDate = existing.lastDate ? new Date(existing.lastDate) : new Date(0);
              if (currentDate > existingDate) {
                existing.lastDate = dateHeader.value;
                // Mettre à jour les infos de désabonnement avec le mail le plus récent
                if (unsubInfo.hasUnsubscribe) {
                  existing.unsubAvailable = unsubInfo.hasUnsubscribe;
                  existing.unsubUrl = unsubInfo.unsubscribeUrl;
                  existing.unsubMailto = unsubInfo.unsubscribeMailto;
                }
              }
            }
          } else {
            senderMap.set(email, {
              email,
              name,
              count: 1,
              domain,
              lastDate: dateHeader?.value,
              unsubAvailable: unsubInfo.hasUnsubscribe,
              unsubUrl: unsubInfo.unsubscribeUrl,
              unsubMailto: unsubInfo.unsubscribeMailto,
            });
          }
        }

        totalScanned++;
      } catch (error: any) {
        // Détecter quota exceeded
        if (
          error?.code === 403 &&
          (error?.errors?.[0]?.reason === "quotaExceeded" ||
           error?.message?.toLowerCase().includes("quota exceeded"))
        ) {
          console.error(`🚫 [Scanner] QUOTA EXCEEDED détecté`);
          throw new QuotaExceededError("Gmail API quota exceeded");
        }

        console.error(`❌ [Scanner] Erreur pour message ${message.id}:`, error);
        // Continuer même si un message échoue
      }
    }

    console.log(`✅ [Scanner] ${totalScanned} messages scannés, ${senderMap.size} expéditeurs trouvés`);

    // Logger les stats du rate limiter
    const stats = gmailRateLimiter.getStats();
    console.log(`📊 [Scanner] Rate limiter stats:`, stats);

    // Vérifier si le scan est complet
    isComplete = !nextPageToken || (limit > 0 && totalScanned >= limit);

    return {
      totalScanned,
      senders: senderMap,
      nextPageToken: nextPageToken,
      isComplete,
    };
  } catch (error: any) {
    // Propager l'erreur quotaExceeded
    if (error instanceof QuotaExceededError) {
      throw error;
    }

    console.error("❌ [Scanner] Erreur lors du scan:", error);
    throw error;
  }
}

/**
 * Scanner complet - récupère TOUS les expéditeurs sans limite
 *
 * ⚠️ ATTENTION : Cette fonction peut prendre du temps pour les boîtes mail volumineuses
 * Il est recommandé d'utiliser scanSendersProgressively pour un scan incrémental
 */
export async function scanAllSenders(accessToken: string): Promise<EmailSender[]> {
  const senderMap = new Map<string, EmailSender>();
  let pageToken: string | undefined = undefined;
  let totalScanned = 0;
  let pageCount = 0;

  console.log("🔍 Début du scan complet de tous les expéditeurs...");

  do {
    const result = await scanSendersProgressively(
      accessToken,
      500, // Scanner par pages de 500
      pageToken,
      senderMap
    );

    totalScanned += result.totalScanned;
    pageToken = result.nextPageToken;
    pageCount++;

    console.log(`📊 Page ${pageCount} : ${result.totalScanned} emails scannés (Total: ${totalScanned})`);

    // Petite pause entre les requêtes pour éviter le rate limiting
    if (pageToken) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  } while (pageToken);

  console.log(`✅ Scan terminé : ${totalScanned} emails analysés, ${senderMap.size} expéditeurs uniques trouvés`);

  // Convertir en tableau et trier par nombre d'emails (décroissant)
  return Array.from(senderMap.values()).sort((a, b) => b.count - a.count);
}

/**
 * Récupérer les détails d'un message spécifique
 */
export async function getMessage(accessToken: string, messageId: string, format: string = "metadata") {
  const gmail = getGmailClient(accessToken);

  try {
    await rateLimiter.waitForSlot();

    const message = await retryWithBackoff(() =>
      gmail.users.messages.get({
        userId: "me",
        id: messageId,
        format: format as any,
      })
    );

    return message.data;
  } catch (error) {
    console.error(`Erreur lors de la récupération du message ${messageId}:`, error);
    throw error;
  }
}

/**
 * Récupérer une liste paginée de messages
 */
export async function getMessages(
  accessToken: string,
  maxResults: number = 50,
  pageToken?: string,
  query?: string
) {
  const gmail = getGmailClient(accessToken);

  try {
    await rateLimiter.waitForSlot();

    const response = await retryWithBackoff(() =>
      gmail.users.messages.list({
        userId: "me",
        maxResults,
        pageToken,
        q: query,
      })
    );

    return {
      messages: response.data.messages || [],
      nextPageToken: response.data.nextPageToken,
      resultSizeEstimate: response.data.resultSizeEstimate || 0,
    };
  } catch (error) {
    console.error("Erreur lors de la récupération des messages:", error);
    throw error;
  }
}

/**
 * Actions en masse sur les emails
 */
export async function batchModifyMessages(
  accessToken: string,
  messageIds: string[],
  addLabels?: string[],
  removeLabels?: string[]
) {
  const gmail = getGmailClient(accessToken);

  try {
    await rateLimiter.waitForSlot();

    await retryWithBackoff(() =>
      gmail.users.messages.batchModify({
        userId: "me",
        requestBody: {
          ids: messageIds,
          addLabelIds: addLabels,
          removeLabelIds: removeLabels,
        },
      })
    );

    return { success: true, count: messageIds.length };
  } catch (error) {
    console.error("Erreur lors de la modification des messages:", error);
    throw error;
  }
}

/**
 * Mettre en corbeille tous les emails d'un expéditeur
 */
export async function trashEmailsFromSender(
  accessToken: string,
  senderEmail: string
): Promise<number> {
  const gmail = getGmailClient(accessToken);

  try {
    // Rechercher tous les messages de cet expéditeur
    let allMessageIds: string[] = [];
    let pageToken: string | undefined = undefined;

    // Récupérer tous les IDs en gérant la pagination
    do {
      await rateLimiter.waitForSlot();

      const searchResponse = await retryWithBackoff(() =>
        gmail.users.messages.list({
          userId: "me",
          q: `from:${senderEmail}`,
          maxResults: 500,
          pageToken,
        })
      );

      const messages = searchResponse.data.messages || [];
      allMessageIds = allMessageIds.concat(messages.map((m) => m.id!));
      pageToken = searchResponse.data.nextPageToken;
    } while (pageToken);

    if (allMessageIds.length === 0) {
      return 0;
    }

    // Mettre en corbeille par batch de 1000 (limite Gmail API)
    const batchSize = 1000;
    for (let i = 0; i < allMessageIds.length; i += batchSize) {
      const batch = allMessageIds.slice(i, i + batchSize);

      await rateLimiter.waitForSlot();

      await retryWithBackoff(() =>
        gmail.users.messages.batchModify({
          userId: "me",
          requestBody: {
            ids: batch,
            addLabelIds: ["TRASH"],
            removeLabelIds: ["INBOX"],
          },
        })
      );
    }

    return allMessageIds.length;
  } catch (error) {
    console.error("Erreur lors de la suppression des emails:", error);
    throw error;
  }
}

/**
 * Archiver tous les emails d'un expéditeur
 */
export async function archiveEmailsFromSender(
  accessToken: string,
  senderEmail: string
): Promise<number> {
  const gmail = getGmailClient(accessToken);

  try {
    // Rechercher tous les messages de cet expéditeur
    let allMessageIds: string[] = [];
    let pageToken: string | undefined = undefined;

    do {
      await rateLimiter.waitForSlot();

      const searchResponse = await retryWithBackoff(() =>
        gmail.users.messages.list({
          userId: "me",
          q: `from:${senderEmail}`,
          maxResults: 500,
          pageToken,
        })
      );

      const messages = searchResponse.data.messages || [];
      allMessageIds = allMessageIds.concat(messages.map((m) => m.id!));
      pageToken = searchResponse.data.nextPageToken;
    } while (pageToken);

    if (allMessageIds.length === 0) {
      return 0;
    }

    // Archiver par batch de 1000
    const batchSize = 1000;
    for (let i = 0; i < allMessageIds.length; i += batchSize) {
      const batch = allMessageIds.slice(i, i + batchSize);

      await rateLimiter.waitForSlot();

      await retryWithBackoff(() =>
        gmail.users.messages.batchModify({
          userId: "me",
          requestBody: {
            ids: batch,
            removeLabelIds: ["INBOX"],
          },
        })
      );
    }

    return allMessageIds.length;
  } catch (error) {
    console.error("Erreur lors de l'archivage des emails:", error);
    throw error;
  }
}
