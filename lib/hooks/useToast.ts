'use client';

import { toast } from 'react-hot-toast';

// Cache des toasts déjà affichés (id -> timestamp)
const toastCache = new Map<string, number>();
const DEDUPE_DURATION = 3000; // 3 secondes

/**
 * Génère un ID unique pour un toast basé sur son message et type
 */
function getToastId(message: string, type: 'success' | 'error' | 'info'): string {
  return `${type}:${message.toLowerCase().trim()}`;
}

/**
 * Vérifie si un toast doit être affiché (pas déjà affiché récemment)
 */
function shouldShowToast(message: string, type: 'success' | 'error' | 'info'): boolean {
  const id = getToastId(message, type);
  const now = Date.now();
  const lastShown = toastCache.get(id);

  if (lastShown && (now - lastShown) < DEDUPE_DURATION) {
    console.log(`🔇 [useToast] Toast dédupliqué: "${message}"`);
    return false;
  }

  toastCache.set(id, now);

  // Nettoyer les vieux toasts du cache
  for (const [key, timestamp] of toastCache.entries()) {
    if (now - timestamp > DEDUPE_DURATION) {
      toastCache.delete(key);
    }
  }

  return true;
}

/**
 * Hook custom pour les toasts avec déduplication automatique
 */
export function useToast() {
  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    if (!shouldShowToast(message, type)) {
      return; // Toast déjà affiché récemment
    }

    switch (type) {
      case 'success':
        toast.success(message);
        break;
      case 'error':
        toast.error(message);
        break;
      case 'info':
      default:
        toast(message);
        break;
    }
  };

  return {
    success: (message: string) => showToast(message, 'success'),
    error: (message: string) => showToast(message, 'error'),
    info: (message: string) => showToast(message, 'info'),
  };
}
