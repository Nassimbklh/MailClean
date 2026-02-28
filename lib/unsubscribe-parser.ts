/**
 * Parser pour le header List-Unsubscribe
 * Format: <https://example.com/unsub>, <mailto:unsub@example.com>
 */

export interface ParsedUnsubscribe {
  hasUnsubscribe: boolean;
  unsubscribeUrl?: string;
  unsubscribeMailto?: string;
}

export function parseListUnsubscribe(headerValue: string | undefined): ParsedUnsubscribe {
  if (!headerValue) {
    return { hasUnsubscribe: false };
  }

  let unsubscribeUrl: string | undefined;
  let unsubscribeMailto: string | undefined;

  // Extraire les URL et mailto du format: <url1>, <url2>
  const matches = headerValue.match(/<([^>]+)>/g);

  if (matches) {
    for (const match of matches) {
      const value = match.slice(1, -1).trim(); // Enlever les < >

      if (value.startsWith("http://") || value.startsWith("https://")) {
        unsubscribeUrl = value;
      } else if (value.startsWith("mailto:")) {
        unsubscribeMailto = value;
      }
    }
  }

  return {
    hasUnsubscribe: !!(unsubscribeUrl || unsubscribeMailto),
    unsubscribeUrl,
    unsubscribeMailto,
  };
}
