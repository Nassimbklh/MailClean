// Types pour l'application CleanMail

export interface User {
  email: string;
  name?: string;
  picture?: string;
  accessToken: string;
  refreshToken?: string;
}

export interface SessionData {
  user?: User;
  isLoggedIn: boolean;
}

export interface EmailSender {
  email: string;
  name?: string;
  count: number;
  emailsCount?: number; // Nombre d'emails restants
  lastDate?: string;
  domain?: string;
  unsubAvailable?: boolean;
  unsubUrl?: string;
  unsubMailto?: string;
  unsubscribed?: boolean;
  unsubscribedAt?: string;
  cleanedCount?: number;
}

export interface UnsubscribeInfo {
  hasUnsubscribe: boolean;
  unsubscribeUrl?: string;
  unsubscribeMailto?: string;
  message?: string;
  detectionLevel?: "header" | "body_link" | "body_mailto" | "none";
  gmailMessageId?: string; // Pour construire un lien Gmail
}

export interface GmailMessage {
  id: string;
  threadId: string;
  snippet: string;
  internalDate?: string;
  payload?: {
    headers: Array<{
      name: string;
      value: string;
    }>;
  };
}
