/**
 * Configuration des limites par plan
 */

export const PLAN_LIMITS = {
  free: {
    scanLimit: 5000,
    monthlyDeleteLimit: 700,
    monthlyUnsubscribeLimit: 3,
    label: "Gratuit",
  },
  solo: {
    scanLimit: -1, // -1 = illimité
    monthlyDeleteLimit: -1, // -1 = illimité
    monthlyUnsubscribeLimit: -1,
    label: "Solo",
  },
  family: {
    scanLimit: -1, // -1 = illimité
    monthlyDeleteLimit: -1,
    monthlyUnsubscribeLimit: -1,
    label: "Family",
  },
  pro: {
    scanLimit: -1, // -1 = illimité
    monthlyDeleteLimit: -1,
    monthlyUnsubscribeLimit: -1,
    label: "Pro",
  },
} as const;

export type PlanType = keyof typeof PLAN_LIMITS;

/**
 * Récupère la limite de scan pour un plan donné
 */
export function getScanLimit(plan: string): number {
  const planType = (plan || "free") as PlanType;
  return PLAN_LIMITS[planType]?.scanLimit || PLAN_LIMITS.free.scanLimit;
}

/**
 * Vérifie si l'utilisateur a atteint sa limite de scan
 */
export function hasReachedScanLimit(scannedCount: number, plan: string): boolean {
  const limit = getScanLimit(plan);
  // Si la limite est -1 (illimité), jamais atteint
  if (limit === -1) return false;
  return scannedCount >= limit;
}

/**
 * Calcule le pourcentage de scan effectué
 */
export function getScanPercentage(scannedCount: number, plan: string): number {
  const limit = getScanLimit(plan);
  // Si la limite est -1 (illimité), retourner 0
  if (limit === -1) return 0;
  return Math.min(100, Math.round((scannedCount / limit) * 100));
}

/**
 * Récupère la limite mensuelle de suppressions pour un plan donné
 * Retourne -1 si illimité
 */
export function getMonthlyDeleteLimit(plan: string): number {
  const planType = (plan || "free") as PlanType;
  return PLAN_LIMITS[planType]?.monthlyDeleteLimit || PLAN_LIMITS.free.monthlyDeleteLimit;
}

/**
 * Récupère la limite mensuelle de désabonnements pour un plan donné
 * Retourne -1 si illimité
 */
export function getMonthlyUnsubscribeLimit(plan: string): number {
  const planType = (plan || "free") as PlanType;
  return PLAN_LIMITS[planType]?.monthlyUnsubscribeLimit || PLAN_LIMITS.free.monthlyUnsubscribeLimit;
}

/**
 * Vérifie si une limite est illimitée
 */
export function isUnlimited(limit: number): boolean {
  return limit === -1;
}
