/**
 * Utilitaires pour détecter les liens de désabonnement dans les emails
 * Système en 4 niveaux
 */

// Mots-clés pour détecter les liens de désabonnement
const UNSUB_KEYWORDS = [
  "unsubscribe",
  "unsub",
  "opt-out",
  "opt out",
  "optout",
  "preferences",
  "désinscrire",
  "se désinscrire",
  "se desinscrire",
  "désabonner",
  "desabonner",
  "remove",
  "manage subscription",
  "email preferences",
  "notification settings",
  "stop receiving",
];

/**
 * Niveau 2: Parser le HTML et trouver des liens de désabonnement
 */
export function findUnsubscribeLinkInHTML(htmlContent: string): string | null {
  try {
    // Regex pour trouver tous les liens <a href="...">...</a>
    const linkRegex = /<a[^>]*href=["']([^"']+)["'][^>]*>(.*?)<\/a>/gi;
    const matches = htmlContent.matchAll(linkRegex);

    for (const match of matches) {
      const href = match[1];
      const linkText = match[2];

      // Nettoyer le texte du lien (supprimer les tags HTML internes)
      const cleanText = linkText.replace(/<[^>]+>/g, "").toLowerCase();

      // Vérifier si le href ou le texte du lien contient un mot-clé
      const hrefLower = href.toLowerCase();
      const hasUnsubKeyword = UNSUB_KEYWORDS.some(
        (keyword) =>
          cleanText.includes(keyword) || hrefLower.includes(keyword)
      );

      if (hasUnsubKeyword && (href.startsWith("http") || href.startsWith("https"))) {
        console.log(`✅ [findUnsubscribeLinkInHTML] Lien trouvé: ${href}`);
        return href;
      }
    }

    // Fallback: chercher directement les URLs contenant des mots-clés
    const urlRegex = /https?:\/\/[^\s<>"]+/g;
    const urls = htmlContent.match(urlRegex) || [];

    for (const url of urls) {
      const urlLower = url.toLowerCase();
      const hasKeyword = UNSUB_KEYWORDS.some((kw) => urlLower.includes(kw));
      if (hasKeyword) {
        console.log(`✅ [findUnsubscribeLinkInHTML] URL trouvée: ${url}`);
        return url;
      }
    }

    return null;
  } catch (error) {
    console.error("❌ [findUnsubscribeLinkInHTML] Erreur:", error);
    return null;
  }
}

/**
 * Niveau 3: Trouver un mailto de désabonnement dans le HTML
 */
export function findUnsubscribeMailtoInHTML(htmlContent: string): string | null {
  try {
    // Regex pour les mailto: dans les href
    const mailtoRegex = /<a[^>]*href=["'](mailto:[^"']+)["'][^>]*>(.*?)<\/a>/gi;
    const matches = htmlContent.matchAll(mailtoRegex);

    for (const match of matches) {
      const mailto = match[1];
      const linkText = match[2];

      // Nettoyer le texte du lien
      const cleanText = linkText.replace(/<[^>]+>/g, "").toLowerCase();

      // Vérifier si le texte contient un mot-clé de désabonnement
      const hasUnsubKeyword = UNSUB_KEYWORDS.some((keyword) =>
        cleanText.includes(keyword)
      );

      if (hasUnsubKeyword) {
        console.log(`✅ [findUnsubscribeMailtoInHTML] Mailto trouvé: ${mailto}`);
        return mailto;
      }
    }

    // Fallback: chercher directement les mailto: contenant des mots-clés
    const mailtoDirectRegex = /mailto:[^\s<>"]+/g;
    const mailtos = htmlContent.match(mailtoDirectRegex) || [];

    for (const mailto of mailtos) {
      const mailtoLower = mailto.toLowerCase();
      const hasKeyword = UNSUB_KEYWORDS.some((kw) => mailtoLower.includes(kw));
      if (hasKeyword) {
        console.log(`✅ [findUnsubscribeMailtoInHTML] Mailto trouvé: ${mailto}`);
        return mailto;
      }
    }

    return null;
  } catch (error) {
    console.error("❌ [findUnsubscribeMailtoInHTML] Erreur:", error);
    return null;
  }
}

/**
 * Extraire le contenu HTML d'un message Gmail
 */
export function extractHTMLFromGmailPayload(payload: any): string | null {
  try {
    // Cas 1: payload.body.data (message simple)
    if (payload.body?.data) {
      const decoded = Buffer.from(payload.body.data, "base64").toString("utf-8");
      return decoded;
    }

    // Cas 2: payload.parts (message multipart)
    if (payload.parts && Array.isArray(payload.parts)) {
      for (const part of payload.parts) {
        // Chercher la partie text/html
        if (part.mimeType === "text/html" && part.body?.data) {
          const decoded = Buffer.from(part.body.data, "base64").toString("utf-8");
          return decoded;
        }

        // Récursion pour les parties imbriquées
        if (part.parts) {
          const nestedHTML = extractHTMLFromGmailPayload(part);
          if (nestedHTML) return nestedHTML;
        }
      }
    }

    return null;
  } catch (error) {
    console.error("❌ [extractHTMLFromGmailPayload] Erreur:", error);
    return null;
  }
}

export interface UnsubscribeDetectionResult {
  level: "header" | "body_link" | "body_mailto" | "none";
  hasUnsubscribe: boolean;
  unsubscribeUrl?: string;
  unsubscribeMailto?: string;
  message?: string;
  gmailMessageId?: string; // Pour construire un lien Gmail
}
