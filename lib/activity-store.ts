/**
 * Store en mémoire pour gérer l'historique des activités
 * et le cache du scan progressif
 *
 * ⚠️ NOTE : En production, cela devrait être stocké dans une base de données
 * Pour l'instant, on utilise un store en mémoire simple
 */

export interface Activity {
  id: string;
  type: "trash" | "archive" | "unread" | "read" | "unsubscribe";
  target: string; // email de l'expéditeur ou ID du message
  count: number;
  date: Date;
  messageIds?: string[]; // Pour pouvoir undo
  previousLabels?: string[]; // Pour pouvoir undo
  canUndo: boolean;
}

export interface ScanCache {
  userEmail: string;
  totalScanned: number;
  senderCount: number;
  lastUpdate: Date;
  nextPageToken?: string;
  isComplete: boolean;
}

// Store global (en mémoire)
const activityStore = new Map<string, Activity[]>(); // key = userEmail
const scanCacheStore = new Map<string, ScanCache>(); // key = userEmail

/**
 * Ajouter une activité pour un utilisateur
 */
export function addActivity(userEmail: string, activity: Omit<Activity, "id" | "date">): Activity {
  const newActivity: Activity = {
    ...activity,
    id: `${Date.now()}-${Math.random().toString(36).substring(7)}`,
    date: new Date(),
  };

  const activities = activityStore.get(userEmail) || [];
  activities.unshift(newActivity); // Ajouter au début

  // Garder seulement les 50 dernières activités
  if (activities.length > 50) {
    activities.splice(50);
  }

  activityStore.set(userEmail, activities);

  return newActivity;
}

/**
 * Récupérer les activités récentes d'un utilisateur
 */
export function getActivities(userEmail: string, limit: number = 10): Activity[] {
  const activities = activityStore.get(userEmail) || [];
  return activities.slice(0, limit);
}

/**
 * Récupérer une activité spécifique
 */
export function getActivity(userEmail: string, activityId: string): Activity | null {
  const activities = activityStore.get(userEmail) || [];
  return activities.find((a) => a.id === activityId) || null;
}

/**
 * Supprimer une activité (après undo par exemple)
 */
export function removeActivity(userEmail: string, activityId: string): boolean {
  const activities = activityStore.get(userEmail) || [];
  const index = activities.findIndex((a) => a.id === activityId);

  if (index !== -1) {
    activities.splice(index, 1);
    activityStore.set(userEmail, activities);
    return true;
  }

  return false;
}

/**
 * Mettre à jour le cache du scan
 */
export function updateScanCache(userEmail: string, cache: Partial<ScanCache>): void {
  const existing = scanCacheStore.get(userEmail);

  const updated: ScanCache = {
    userEmail,
    totalScanned: cache.totalScanned ?? existing?.totalScanned ?? 0,
    senderCount: cache.senderCount ?? existing?.senderCount ?? 0,
    lastUpdate: new Date(),
    nextPageToken: cache.nextPageToken,
    isComplete: cache.isComplete ?? existing?.isComplete ?? false,
  };

  scanCacheStore.set(userEmail, updated);
}

/**
 * Récupérer le cache du scan
 */
export function getScanCache(userEmail: string): ScanCache | null {
  return scanCacheStore.get(userEmail) || null;
}

/**
 * Réinitialiser le cache du scan (pour rescanner)
 */
export function resetScanCache(userEmail: string): void {
  scanCacheStore.delete(userEmail);
}

/**
 * Nettoyer les données d'un utilisateur
 */
export function clearUserData(userEmail: string): void {
  activityStore.delete(userEmail);
  scanCacheStore.delete(userEmail);
}
