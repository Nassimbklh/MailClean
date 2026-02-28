"use client";

import { useEffect, useState, useRef } from "react";
import SenderAvatar from "@/components/SenderAvatar";
import SenderStatusBadge from "@/components/dashboard/SenderStatusBadge";
import { StatsHeader } from "@/components/dashboard/StatsHeader";
import { EmailSender } from "@/types";

interface SendersTabProps {
  onSuccess: (message: string) => void;
  onError: (message: string) => void;
}

interface UnsubscribeInfo {
  hasUnsubscribe: boolean;
  unsubscribeUrl?: string;
  unsubscribeMailto?: string;
}

type FilterType = 'all' | 'remaining';

export default function SendersTab({ onSuccess, onError }: SendersTabProps) {
  const [senders, setSenders] = useState<EmailSender[]>([]);
  const [filteredSenders, setFilteredSenders] = useState<EmailSender[]>([]);
  const [loading, setLoading] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<FilterType>('all');
  const [scanProgress, setScanProgress] = useState({ total: 0, senderCount: 0 });
  const [nextPageToken, setNextPageToken] = useState<string | undefined>();
  const [isComplete, setIsComplete] = useState(false);

  // États pour la gestion de la pause rate limit
  const [isPaused, setIsPaused] = useState(false);
  const [remainingSeconds, setRemainingSeconds] = useState<number>(0);

  // Cache des infos de désabonnement
  const [unsubscribeCache, setUnsubscribeCache] = useState<Record<string, UnsubscribeInfo>>({});
  const [checkingUnsubscribe, setCheckingUnsubscribe] = useState<Record<string, boolean>>({});

  // État pour détecter un problème de scope 403
  const [hasScopeIssue, setHasScopeIssue] = useState(false);

  // État pour afficher le diagnostic des scopes
  const [scopesDiagnosis, setScopesDiagnosis] = useState<any>(null);
  const [showScopesDiagnosis, setShowScopesDiagnosis] = useState(false);

  // Modal states
  const [selectedSender, setSelectedSender] = useState<EmailSender | null>(null);
  const [actionType, setActionType] = useState<"trash" | "unsubscribe" | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Auto-refresh interval
  const autoRefreshIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Charger le statut du scan au montage
  useEffect(() => {
    // Annuler toute requête en cours
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Créer un nouveau AbortController
    abortControllerRef.current = new AbortController();

    fetchScanStatus();

    // Auto-refresh toutes les 10 minutes
    autoRefreshIntervalRef.current = setInterval(() => {
      console.log("🔄 Auto-refresh : Actualisation des données en arrière-plan...");
      fetchScanStatus();
    }, 10 * 60 * 1000); // 10 minutes

    // Cleanup
    return () => {
      if (autoRefreshIntervalRef.current) {
        clearInterval(autoRefreshIntervalRef.current);
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  // Timer pour le compte à rebours de la pause
  useEffect(() => {
    if (isPaused && remainingSeconds > 0) {
      const timer = setInterval(() => {
        setRemainingSeconds((prev) => {
          const newValue = Math.max(0, prev - 1);
          // Si le timer atteint 0, on peut automatiquement reprendre le scan
          if (newValue === 0) {
            // Optionnel: reprendre automatiquement
            // resumeScan();
          }
          return newValue;
        });
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [isPaused, remainingSeconds]);

  // Filtrer les expéditeurs (recherche + type de filtre)
  useEffect(() => {
    let filtered = senders;

    // Appliquer le filtre de type (All/Remaining)
    if (filterType === 'remaining') {
      // Remaining = NOT processed (still has emails to clean)
      filtered = filtered.filter(sender =>
        !sender.unsubscribed &&
        (sender.cleanedCount === 0 || sender.cleanedCount === undefined) &&
        (sender.emailsCount !== undefined ? sender.emailsCount > 0 : sender.count > 0)
      );
    }

    // Appliquer la recherche textuelle
    if (searchQuery.trim() !== "") {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((sender) => {
        const name = (sender.name || "").toLowerCase();
        const email = sender.email.toLowerCase();
        const domain = (sender.domain || "").toLowerCase();
        return name.includes(query) || email.includes(query) || domain.includes(query);
      });
    }

    setFilteredSenders(filtered);
  }, [searchQuery, filterType, senders]);

  const fetchScanStatus = async () => {
    try {
      const res = await fetch("/api/scan/status", {
        signal: abortControllerRef.current?.signal
      });
      const data = await res.json();

      if (data.exists && data.senderCount > 0) {
        setScanProgress({ total: data.totalScanned, senderCount: data.senderCount });
        setIsComplete(data.isComplete);

        // Gérer l'état de pause
        if (data.isPaused) {
          setIsPaused(true);
          setRemainingSeconds(data.remainingSeconds || 0);
        } else {
          setIsPaused(false);
          setRemainingSeconds(0);
        }

        // Si un scan existe déjà, charger les données
        await startScan(false);
      }
    } catch (err: any) {
      // Ignorer les erreurs d'annulation
      if (err.name === 'AbortError') return;
      console.error("Erreur lors de la récupération du statut:", err);
    }
  };

  // Vérifier les scopes disponibles
  const checkScopes = async () => {
    try {
      const res = await fetch("/api/auth/scopes");
      const data = await res.json();
      setScopesDiagnosis(data);
      setShowScopesDiagnosis(true);

      // Si gmail.modify est manquant, activer le flag
      if (data.diagnosis?.needsReauth) {
        setHasScopeIssue(true);
      }
    } catch (err) {
      console.error("Erreur lors de la vérification des scopes:", err);
    }
  };

  // Réautoriser Gmail proprement (révoque puis reconnecte)
  const handleReauth = async () => {
    try {
      // 1. Révoquer l'accès actuel
      const revokeRes = await fetch("/api/auth/revoke", { method: "POST" });
      const revokeData = await revokeRes.json();

      if (revokeData.success) {
        onSuccess("Accès révoqué. Redirection vers Google...");

        // 2. Rediriger vers Google OAuth après 1 seconde
        setTimeout(() => {
          window.location.href = "/api/auth/google";
        }, 1000);
      } else {
        throw new Error(revokeData.error || "Échec de la révocation");
      }
    } catch (err: any) {
      console.error("Erreur lors de la réautorisation:", err);
      onError(err.message || "Erreur lors de la réautorisation");

      // Fallback: rediriger quand même
      setTimeout(() => {
        window.location.href = "/api/auth/google";
      }, 2000);
    }
  };

  const startScan = async (reset: boolean = false) => {
    setLoading(true);
    setScanning(true);

    try {
      const res = await fetch("/api/scan/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ limit: 2000, reset }),
        signal: abortControllerRef.current?.signal
      });

      const data = await res.json();

      // Gérer les erreurs d'authentification
      if (res.status === 401) {
        const errorMsg = data.code === "NOT_AUTHENTICATED"
          ? "Vous n'êtes pas connecté. Veuillez vous reconnecter."
          : data.code === "TOKEN_MISSING_OR_EXPIRED" || data.code === "TOKEN_EXPIRED"
          ? "Votre session Google a expiré. Veuillez vous reconnecter à votre compte Google."
          : data.error || "Erreur d'authentification";

        onError(errorMsg);

        // Rediriger vers la page de login après 2 secondes
        setTimeout(() => {
          window.location.href = "/api/auth/google";
        }, 2000);
        return;
      }

      // Gérer les erreurs de permissions
      if (res.status === 403) {
        const errorMsg = data.code === "INSUFFICIENT_SCOPE"
          ? "Autorisations Gmail manquantes. Vous allez être redirigé pour réautoriser l'accès à votre compte Google."
          : data.error || "Permissions insuffisantes";

        onError(errorMsg);

        // Rediriger vers la page de reconnexion après 2 secondes
        setTimeout(() => {
          window.location.href = "/api/auth/google";
        }, 2000);
        return;
      }

      // Gérer la pause automatique (quota exceeded)
      if (res.status === 429 && data.code === "QUOTA_EXCEEDED") {
        setIsPaused(true);
        setRemainingSeconds(data.remainingSeconds || 60);
        setScanProgress({ total: data.totalScanned || scanProgress.total, senderCount: data.senderCount || scanProgress.senderCount });

        onError(data.message || "Le scan a été automatiquement mis en pause pour respecter les limites Gmail. Il reprendra automatiquement dans 1 minute.");
        return;
      }

      // Gérer les autres erreurs
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Erreur lors du scan");
      }

      setSenders(data.senders);
      setScanProgress({ total: data.totalScanned, senderCount: data.senderCount });
      setNextPageToken(data.nextPageToken);
      setIsComplete(data.isComplete);

      if (!data.isComplete) {
        onSuccess(`Premier scan terminé : ${data.totalScanned} emails analysés. Continuez le scan pour obtenir tous vos expéditeurs.`);
      } else {
        onSuccess(`Scan complet terminé : ${data.totalScanned} emails analysés, ${data.senderCount} expéditeurs trouvés !`);
      }
    } catch (err: any) {
      // Ignorer les erreurs d'annulation
      if (err.name === 'AbortError') {
        return;
      }
      onError(err.message || "Erreur lors du scan");
    } finally {
      setLoading(false);
      setScanning(false);
    }
  };

  const resumeScan = async () => {
    try {
      const res = await fetch("/api/scan/resume", {
        method: "POST",
      });

      const data = await res.json();

      if (res.status === 429 && data.code === "TOO_EARLY") {
        onError(`Veuillez attendre encore ${data.remainingSeconds} secondes avant de reprendre le scan.`);
        return;
      }

      if (!res.ok || !data.success) {
        throw new Error(data.error || "Erreur lors de la reprise du scan");
      }

      // Réinitialiser l'état de pause
      setIsPaused(false);
      setRemainingSeconds(0);

      onSuccess(data.message || "Le scan a été repris avec succès.");

      // Continuer le scan
      await continueScan();
    } catch (err: any) {
      onError(err.message || "Erreur lors de la reprise du scan");
    }
  };

  const continueScan = async () => {
    if (!nextPageToken) return;

    setScanning(true);

    try {
      const res = await fetch("/api/scan/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ limit: 2000, pageToken: nextPageToken }),
      });

      const data = await res.json();

      // Gérer les erreurs d'authentification
      if (res.status === 401) {
        const errorMsg = data.code === "NOT_AUTHENTICATED"
          ? "Vous n'êtes pas connecté. Veuillez vous reconnecter."
          : data.code === "TOKEN_MISSING_OR_EXPIRED" || data.code === "TOKEN_EXPIRED"
          ? "Votre session Google a expiré. Veuillez vous reconnecter à votre compte Google."
          : data.error || "Erreur d'authentification";

        onError(errorMsg);

        // Rediriger vers la page de login après 2 secondes
        setTimeout(() => {
          window.location.href = "/api/auth/google";
        }, 2000);
        return;
      }

      // Gérer les erreurs de permissions
      if (res.status === 403) {
        const errorMsg = data.code === "INSUFFICIENT_SCOPE"
          ? "Autorisations Gmail manquantes. Vous allez être redirigé pour réautoriser l'accès à votre compte Google."
          : data.error || "Permissions insuffisantes";

        onError(errorMsg);

        // Rediriger vers la page de reconnexion après 2 secondes
        setTimeout(() => {
          window.location.href = "/api/auth/google";
        }, 2000);
        return;
      }

      // Gérer la pause automatique (quota exceeded)
      if (res.status === 429 && data.code === "QUOTA_EXCEEDED") {
        setIsPaused(true);
        setRemainingSeconds(data.remainingSeconds || 60);
        setScanProgress({ total: data.totalScanned || scanProgress.total, senderCount: data.senderCount || scanProgress.senderCount });

        onError(data.message || "Le scan a été automatiquement mis en pause pour respecter les limites Gmail. Il reprendra automatiquement dans 1 minute.");
        return;
      }

      // Gérer les autres erreurs
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Erreur lors du scan");
      }

      // Fusionner les nouveaux expéditeurs avec les existants
      const existingMap = new Map(senders.map((s) => [s.email, s]));
      data.senders.forEach((sender: EmailSender) => {
        if (existingMap.has(sender.email)) {
          const existing = existingMap.get(sender.email)!;
          existing.count += sender.count;
        } else {
          existingMap.set(sender.email, sender);
        }
      });

      const mergedSenders = Array.from(existingMap.values()).sort((a, b) => b.count - a.count);

      setSenders(mergedSenders);
      setScanProgress({ total: data.totalScanned, senderCount: mergedSenders.length });
      setNextPageToken(data.nextPageToken);
      setIsComplete(data.isComplete);

      if (data.isComplete) {
        onSuccess(`Scan complet terminé : ${data.totalScanned} emails supplémentaires analysés !`);
      }
    } catch (err: any) {
      onError(err.message || "Erreur lors du scan");
    } finally {
      setScanning(false);
    }
  };

  // Vérifier si le désabonnement est possible pour un expéditeur
  const checkUnsubscribe = async (senderEmail: string) => {
    // Si déjà en cache, ne pas revérifier
    if (unsubscribeCache[senderEmail]) {
      return unsubscribeCache[senderEmail];
    }

    setCheckingUnsubscribe((prev) => ({ ...prev, [senderEmail]: true }));

    try {
      const res = await fetch("/api/unsubscribe/check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ senderEmail }),
      });

      const data = await res.json();

      // Gérer les erreurs d'authentification (401)
      if (res.status === 401) {
        console.warn(`⚠️ [checkUnsubscribe] 401 pour ${senderEmail}:`, data.code);
        // NE PAS afficher d'erreur globale ni rediriger
        // Juste marquer comme non disponible
        setCheckingUnsubscribe((prev) => ({ ...prev, [senderEmail]: false }));
        return { hasUnsubscribe: false };
      }

      // Gérer les erreurs de permissions (403)
      if (res.status === 403) {
        console.warn(`⚠️ [checkUnsubscribe] 403 pour ${senderEmail}:`, data.code);
        // Afficher un message une seule fois + activer le bouton de réauth
        if (data.code === "INSUFFICIENT_SCOPE") {
          setHasScopeIssue(true);
          onError("Certaines fonctionnalités nécessitent plus de permissions. Cliquez sur 'Réautoriser Gmail' en haut de la page.");
        }
        // NE PAS forcer de redirection automatique
        setCheckingUnsubscribe((prev) => ({ ...prev, [senderEmail]: false }));
        return { hasUnsubscribe: false };
      }

      // Gérer les erreurs serveur (500)
      if (res.status === 500) {
        console.error(`❌ [checkUnsubscribe] 500 pour ${senderEmail}:`, data);
        // NE JAMAIS déconnecter ni rediriger sur 500
        // Juste logger et continuer
        setCheckingUnsubscribe((prev) => ({ ...prev, [senderEmail]: false }));
        return { hasUnsubscribe: false };
      }

      // Succès
      if (data.success) {
        const unsubInfo: UnsubscribeInfo = {
          hasUnsubscribe: data.hasUnsubscribe,
          unsubscribeUrl: data.unsubscribeUrl,
          unsubscribeMailto: data.unsubscribeMailto,
        };

        setUnsubscribeCache((prev) => ({ ...prev, [senderEmail]: unsubInfo }));
        return unsubInfo;
      }
    } catch (err) {
      // Erreur réseau ou parsing JSON
      console.error(`❌ [checkUnsubscribe] Erreur pour ${senderEmail}:`, err);
      // NE PAS déconnecter ni afficher d'erreur
    } finally {
      setCheckingUnsubscribe((prev) => ({ ...prev, [senderEmail]: false }));
    }

    return { hasUnsubscribe: false };
  };

  // DÉSACTIVÉ: Ne plus charger automatiquement les infos de désabonnement
  // Cela causait des appels API en boucle et des 403
  // À la place, on check seulement quand l'utilisateur clique sur "Se désabonner"
  /*
  useEffect(() => {
    const timer = setTimeout(() => {
      const sendersToCheck = filteredSenders
        .filter((sender) => !unsubscribeCache[sender.email] && !checkingUnsubscribe[sender.email])
        .slice(0, 10);

      sendersToCheck.forEach((sender) => {
        checkUnsubscribe(sender.email);
      });
    }, 300);

    return () => clearTimeout(timer);
  }, [filteredSenders]);
  */

  const handleBulkAction = async (sender: EmailSender, type: "trash" | "unsubscribe") => {
    if (type === "unsubscribe") {
      // Vérifier d'abord si le désabonnement est possible
      const unsubInfo = await checkUnsubscribe(sender.email);
      if (!unsubInfo.hasUnsubscribe) {
        onError("Aucun lien de désabonnement trouvé pour cet expéditeur");
        return;
      }
    }

    setSelectedSender(sender);
    setActionType(type);
  };

  const confirmBulkAction = async () => {
    if (!selectedSender || !actionType) return;

    setActionLoading(true);

    try {
      if (actionType === "trash") {
        const res = await fetch("/api/bulk/trash", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ senderEmail: selectedSender.email }),
        });

        const data = await res.json();

        // Gérer les erreurs d'authentification (401)
        if (res.status === 401) {
          const errorMsg = data.code === "NOT_AUTHENTICATED"
            ? "Vous n'êtes pas connecté. Veuillez vous reconnecter."
            : data.code === "TOKEN_MISSING_OR_EXPIRED" || data.code === "TOKEN_EXPIRED"
            ? "Votre session Google a expiré. Veuillez vous reconnecter à votre compte Google."
            : data.error || "Erreur d'authentification";

          onError(errorMsg);

          // Rediriger vers la page de login après 2 secondes
          setTimeout(() => {
            window.location.href = "/api/auth/google";
          }, 2000);
          return;
        }

        // Gérer les erreurs de permissions (403)
        if (res.status === 403) {
          let errorMsg = data.error || "Permissions insuffisantes";

          if (data.code === "INSUFFICIENT_SCOPE") {
            const missingScope = data.missing || "gmail.modify";
            errorMsg = `❌ Autorisation Gmail manquante (${missingScope})\n\n` +
                       `Pour supprimer des emails, vous devez autoriser CleanMail à modifier votre boîte Gmail.\n\n` +
                       `👉 Cliquez sur le bouton orange "Réautoriser Gmail" en haut de la page.`;
          }

          setHasScopeIssue(true);
          onError(errorMsg);
          // NE PAS forcer de redirection automatique
          return;
        }

        // Gérer les autres erreurs
        if (!res.ok || !data.success) {
          throw new Error(data.error || "Erreur lors de la suppression");
        }

        onSuccess(data.message);

        // Mettre à jour le sender avec le nouveau statut (ne pas le retirer)
        setSenders((prev) => prev.map((s) =>
          s.email === selectedSender.email
            ? {
                ...s,
                emailsCount: 0, // Tous les emails supprimés
                cleanedCount: s.count, // Marquer comme nettoyé
              }
            : s
        ));
      } else if (actionType === "unsubscribe") {
        const unsubInfo = unsubscribeCache[selectedSender.email];

        if (!unsubInfo || !unsubInfo.hasUnsubscribe) {
          throw new Error("Informations de désabonnement non disponibles");
        }

        // Enregistrer l'activité
        await fetch("/api/unsubscribe/execute", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            senderEmail: selectedSender.email,
            unsubscribeUrl: unsubInfo.unsubscribeUrl || unsubInfo.unsubscribeMailto,
            method: unsubInfo.unsubscribeUrl ? "url" : "mailto",
          }),
        });

        // Ouvrir le lien de désabonnement dans une nouvelle fenêtre
        if (unsubInfo.unsubscribeUrl) {
          window.open(unsubInfo.unsubscribeUrl, "_blank");
          onSuccess("Lien de désabonnement ouvert dans une nouvelle fenêtre");
        } else if (unsubInfo.unsubscribeMailto) {
          window.location.href = unsubInfo.unsubscribeMailto;
          onSuccess("Client email ouvert pour désabonnement");
        }

        // Marquer comme désabonné (ne pas retirer de la liste)
        setSenders((prev) => prev.map((s) =>
          s.email === selectedSender.email
            ? {
                ...s,
                unsubscribed: true,
                unsubscribedAt: new Date().toISOString(),
              }
            : s
        ));
      }

      // Fermer la modal
      setSelectedSender(null);
      setActionType(null);
    } catch (err: any) {
      onError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div>
      {/* Stats globales */}
      <StatsHeader />

      {/* Diagnostic des scopes */}
      {showScopesDiagnosis && scopesDiagnosis && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-500 rounded-lg p-4 mb-6">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-100 mb-2">
                🔍 Diagnostic des Autorisations Gmail
              </h3>

              {scopesDiagnosis.authenticated ? (
                <>
                  <p className="text-sm text-blue-800 dark:text-blue-200 mb-3">
                    <strong>Email:</strong> {scopesDiagnosis.email}
                  </p>

                  {scopesDiagnosis.scopes && (
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center space-x-2">
                        <span className={scopesDiagnosis.scopes.hasGmailMetadata ? "text-green-600" : "text-red-600"}>
                          {scopesDiagnosis.scopes.hasGmailMetadata ? "✅" : "❌"}
                        </span>
                        <span>
                          <strong>gmail.metadata/readonly</strong> (Lire les headers)
                        </span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className={scopesDiagnosis.scopes.hasGmailModify ? "text-green-600" : "text-red-600"}>
                          {scopesDiagnosis.scopes.hasGmailModify ? "✅" : "❌"}
                        </span>
                        <span>
                          <strong>gmail.modify</strong> (Supprimer/modifier les emails)
                        </span>
                      </div>
                    </div>
                  )}

                  {scopesDiagnosis.diagnosis && (
                    <div className="mt-3 p-3 bg-white dark:bg-gray-800 rounded">
                      <p className="text-sm font-semibold">Résultat:</p>
                      <p className="text-sm">
                        {scopesDiagnosis.diagnosis.canDeleteEmails
                          ? "✅ Vous pouvez supprimer des emails"
                          : "❌ Vous ne pouvez PAS supprimer des emails - Réautorisation nécessaire"}
                      </p>
                    </div>
                  )}
                </>
              ) : (
                <p className="text-sm text-red-600 dark:text-red-400">
                  ❌ Non authentifié ou token invalide
                </p>
              )}
            </div>

            <button
              onClick={() => setShowScopesDiagnosis(false)}
              className="flex-shrink-0 text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-200"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Alert banner si scope manquant */}
      {hasScopeIssue && (
        <div className="bg-orange-50 dark:bg-orange-900/20 border-2 border-orange-500 rounded-lg p-4 mb-6 flex items-start space-x-4">
          <div className="flex-shrink-0">
            <svg className="w-6 h-6 text-orange-600 dark:text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-orange-900 dark:text-orange-100 mb-1">
              ⚠️ Autorisations Gmail manquantes
            </h3>
            <p className="text-sm text-orange-800 dark:text-orange-200 mb-3">
              Pour supprimer des emails, CleanMail a besoin du scope <strong>gmail.modify</strong>.
              Vous devez réautoriser l'application pour continuer.
            </p>
            <button
              onClick={handleReauth}
              className="px-6 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg font-medium transition-colors flex items-center space-x-2 shadow-lg"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
              </svg>
              <span>Réautoriser Gmail maintenant</span>
            </button>
            <button
              onClick={checkScopes}
              className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg text-sm font-medium transition-colors"
              title="Vérifier les scopes Gmail"
            >
              🔍 Diagnostiquer
            </button>
          </div>
          <button
            onClick={() => setHasScopeIssue(false)}
            className="flex-shrink-0 text-orange-600 dark:text-orange-400 hover:text-orange-800 dark:hover:text-orange-200"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {/* Alert banner si scan en pause (rate limit) */}
      {isPaused && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border-2 border-blue-500 rounded-lg p-4 mb-6 flex items-start space-x-4">
          <div className="flex-shrink-0">
            <svg className="w-6 h-6 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-100 mb-1">
              ⏸️ Scan en pause
            </h3>
            <p className="text-sm text-blue-800 dark:text-blue-200 mb-3">
              Le scan a été automatiquement mis en pause pour respecter les limites Gmail.
              {remainingSeconds > 0 ? (
                <>
                  <br />
                  <span className="font-mono font-semibold">
                    Reprise automatique dans {remainingSeconds} seconde{remainingSeconds > 1 ? 's' : ''}
                  </span>
                </>
              ) : (
                <> Vous pouvez reprendre le scan maintenant.</>
              )}
            </p>
            {remainingSeconds === 0 && (
              <button
                onClick={resumeScan}
                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors flex items-center space-x-2 shadow-lg"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>Reprendre le scan maintenant</span>
              </button>
            )}
          </div>
          <button
            onClick={() => setIsPaused(false)}
            className="flex-shrink-0 text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-200"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {/* En-tête avec scan progress */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Expéditeurs groupés</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              {isComplete
                ? `Scan complet : ${scanProgress.total} emails analysés`
                : scanning
                ? `Scan en cours... ${scanProgress.total} emails analysés`
                : scanProgress.total > 0
                ? `${scanProgress.total} emails analysés (scan incomplet)`
                : "Lancez un scan pour analyser vos emails"}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
              🔄 Actualisation automatique toutes les 10 minutes
            </p>
          </div>

          <div className="flex items-center space-x-3">
            {/* Bouton "Réautoriser Gmail" si problème de scope - avec animation pulse */}
            {hasScopeIssue && (
              <button
                onClick={handleReauth}
                className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg font-medium transition-colors flex items-center space-x-2 animate-pulse shadow-lg"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1721 9z" />
                </svg>
                <span>⚠️ Réautoriser Gmail</span>
              </button>
            )}

            {/* Afficher UN SEUL bouton selon le statut */}
            {scanning ? (
              /* Scan en cours */
              <button
                disabled
                className="px-4 py-2 bg-blue-400 text-white rounded-lg font-medium flex items-center space-x-2 cursor-not-allowed"
              >
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                <span>Scan en cours...</span>
              </button>
            ) : !isComplete && nextPageToken ? (
              /* Scan incomplet - Continuer */
              <button
                onClick={continueScan}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors flex items-center space-x-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                <span>Continuer le scan</span>
              </button>
            ) : (
              /* Scan complet ou premier scan - Rescanner */
              <button
                onClick={() => startScan(true)}
                disabled={loading}
                className="px-4 py-2 bg-gray-600 hover:bg-gray-700 disabled:bg-gray-400 text-white rounded-lg font-medium transition-colors flex items-center space-x-2"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>Chargement...</span>
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    <span>{scanProgress.total > 0 ? "Rescanner" : "Démarrer le scan"}</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>

        {/* Progress bar */}
        {scanning && (
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
            <div className="h-full bg-blue-600 animate-pulse" style={{ width: "70%" }}></div>
          </div>
        )}
      </div>

      {/* Barre de recherche et filtres */}
      {senders.length > 0 && (
        <div className="mb-6 space-y-4">
          {/* Barre de recherche */}
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Rechercher par nom, email ou domaine..."
              className="block w-full pl-10 pr-3 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>

          {/* Filtres */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Afficher :</span>
              <div className="inline-flex rounded-lg shadow-sm" role="group">
                <button
                  type="button"
                  onClick={() => setFilterType('all')}
                  className={`px-4 py-2 text-sm font-medium rounded-l-lg border ${
                    filterType === 'all'
                      ? 'bg-blue-600 text-white border-blue-600 z-10'
                      : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600'
                  }`}
                >
                  Tous
                </button>
                <button
                  type="button"
                  onClick={() => setFilterType('remaining')}
                  className={`px-4 py-2 text-sm font-medium rounded-r-lg border ${
                    filterType === 'remaining'
                      ? 'bg-blue-600 text-white border-blue-600 z-10'
                      : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600'
                  }`}
                >
                  Restants
                </button>
              </div>
            </div>

            {(searchQuery || filterType !== 'all') && (
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {filteredSenders.length} résultat(s) sur {senders.length}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Liste des expéditeurs */}
      {filteredSenders.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-12 text-center">
          <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            {searchQuery ? "Aucun résultat" : "Aucun expéditeur"}
          </h3>
          <p className="text-gray-600 dark:text-gray-400">
            {searchQuery ? "Essayez une autre recherche" : "Lancez un scan pour analyser vos emails"}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredSenders.map((sender) => {
            const unsubInfo = unsubscribeCache[sender.email];
            const isCheckingUnsub = checkingUnsubscribe[sender.email];
            const canUnsubscribe = unsubInfo?.hasUnsubscribe || false;

            // Déterminer l'état du sender
            const isUnsubscribed = sender.unsubscribed || false;
            const isFullyTrashed = (sender.cleanedCount || 0) > 0 && sender.emailsCount === 0;
            const isProcessed = isUnsubscribed || isFullyTrashed;

            return (
              <div
                key={sender.email}
                className={`bg-white dark:bg-gray-800 rounded-lg shadow p-4 flex items-center justify-between hover:shadow-md transition-shadow ${
                  isProcessed ? 'opacity-70' : ''
                }`}
              >
                <div className="flex items-center space-x-4 flex-1">
                  <SenderAvatar senderName={sender.name} senderEmail={sender.email} size="md" />
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-gray-900 dark:text-white truncate">{sender.name || sender.email}</div>
                    <div className="text-sm text-gray-600 dark:text-gray-400 truncate">{sender.email}</div>
                    {sender.lastDate && (
                      <div className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                        Dernier : {new Date(sender.lastDate).toLocaleDateString("fr-FR")}
                      </div>
                    )}
                    {/* Badges de statut */}
                    <div className="mt-2">
                      <SenderStatusBadge
                        unsubscribed={isUnsubscribed}
                        unsubscribedAt={sender.unsubscribedAt}
                        cleanedCount={sender.cleanedCount || 0}
                        emailsCount={sender.emailsCount !== undefined ? sender.emailsCount : sender.count}
                      />
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-4">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-gray-900 dark:text-white">
                      {sender.emailsCount !== undefined ? sender.emailsCount : sender.count}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                      email{(sender.emailsCount !== undefined ? sender.emailsCount : sender.count) > 1 ? 's' : ''} restant{(sender.emailsCount !== undefined ? sender.emailsCount : sender.count) > 1 ? 's' : ''}
                    </div>
                  </div>

                  <div className="flex flex-col gap-2">
                    {/* Bouton Se désabonner - Désactivé si déjà désabonné */}
                    {isUnsubscribed ? (
                      <div className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400 rounded-lg text-sm font-medium whitespace-nowrap text-center">
                        Déjà désabonné
                      </div>
                    ) : isCheckingUnsub ? (
                      <button
                        disabled
                        className="px-4 py-2 bg-gray-300 dark:bg-gray-600 text-gray-600 dark:text-gray-400 rounded-lg text-sm font-medium cursor-not-allowed whitespace-nowrap flex items-center space-x-2"
                      >
                        <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-gray-600 dark:border-gray-400"></div>
                        <span>Vérification...</span>
                      </button>
                    ) : (
                      <button
                        onClick={() => handleBulkAction(sender, "unsubscribe")}
                        disabled={hasScopeIssue}
                        className={`px-4 py-2 ${hasScopeIssue ? 'bg-gray-400 cursor-not-allowed' : 'bg-purple-500 hover:bg-purple-600'} text-white rounded-lg text-sm font-medium transition-colors whitespace-nowrap`}
                      >
                        Se désabonner
                      </button>
                    )}

                    {/* Bouton Supprimer - Désactivé si déjà supprimé */}
                    {isFullyTrashed ? (
                      <div className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400 rounded-lg text-sm font-medium whitespace-nowrap text-center">
                        Déjà supprimé
                      </div>
                    ) : (
                      <button
                        onClick={() => handleBulkAction(sender, "trash")}
                        disabled={hasScopeIssue}
                        className={`px-4 py-2 ${hasScopeIssue ? 'bg-gray-400 cursor-not-allowed' : 'bg-red-500 hover:bg-red-600'} text-white rounded-lg text-sm font-medium transition-colors whitespace-nowrap`}
                      >
                        Supprimer
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal de confirmation */}
      {selectedSender && actionType && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
              {actionType === "trash" ? "Supprimer les emails ?" : "Se désabonner ?"}
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              {actionType === "trash" ? (
                <>
                  Vous êtes sur le point de mettre à la corbeille <strong>{selectedSender.count} email(s)</strong> de{" "}
                  <strong>{selectedSender.name || selectedSender.email}</strong>.
                </>
              ) : (
                <>
                  Vous allez être redirigé vers la page de désabonnement de <strong>{selectedSender.name || selectedSender.email}</strong>.
                  <br />
                  <br />
                  <span className="text-sm text-orange-600 dark:text-orange-400">⚠️ Cette action est irréversible</span>
                </>
              )}
            </p>
            <div className="flex space-x-3">
              <button
                onClick={() => {
                  setSelectedSender(null);
                  setActionType(null);
                }}
                disabled={actionLoading}
                className="flex-1 px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg font-medium hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors disabled:opacity-50"
              >
                Annuler
              </button>
              <button
                onClick={confirmBulkAction}
                disabled={actionLoading}
                className={`flex-1 px-4 py-2 text-white rounded-lg font-medium transition-colors disabled:opacity-50 flex items-center justify-center ${
                  actionType === "trash" ? "bg-red-600 hover:bg-red-700" : "bg-purple-600 hover:bg-purple-700"
                }`}
              >
                {actionLoading ? (
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                ) : (
                  "Confirmer"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
