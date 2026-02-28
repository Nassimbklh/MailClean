"use client";

import { useEffect, useState, useRef } from "react";
import { Trash2 } from "lucide-react";

interface Activity {
  id: string;
  actionType: "trash" | "archive" | "unread" | "read" | "unsubscribe";
  senderKey: string;
  senderName: string | null;
  count: number;
  timestamp: string;
  undoable: boolean;
  undone: boolean;
}

interface ActivityTabProps {
  onSuccess: (message: string) => void;
  onError: (message: string) => void;
}

export default function ActivityTab({ onSuccess, onError }: ActivityTabProps) {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [undoingId, setUndoingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [clearingAll, setClearingAll] = useState(false);
  const [showConfirmClearAll, setShowConfirmClearAll] = useState(false);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  // Ref pour l'auto-refresh
  const autoRefreshIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Charger les activités au montage
    fetchActivities(currentPage);

    // Auto-refresh toutes les 10 minutes
    autoRefreshIntervalRef.current = setInterval(() => {
      console.log("🔄 Auto-refresh Activité : Actualisation des données en arrière-plan...");
      fetchActivities(currentPage);
    }, 10 * 60 * 1000); // 10 minutes

    // Cleanup : nettoyer l'interval au démontage
    return () => {
      if (autoRefreshIntervalRef.current) {
        clearInterval(autoRefreshIntervalRef.current);
      }
    };
  }, [currentPage]);

  const fetchActivities = async (page: number = 1) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/activity?page=${page}&limit=10`);
      const data = await res.json();

      if (data.success) {
        setActivities(data.activities);
        setCurrentPage(data.pagination.page);
        setTotalPages(data.pagination.totalPages);
        setTotal(data.pagination.total);
      }
    } catch (err) {
      console.error("Erreur lors de la récupération des activités:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleUndo = async (activityId: string) => {
    setUndoingId(activityId);

    try {
      const res = await fetch("/api/undo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ activityId }),
      });

      const data = await res.json();

      if (!data.success) {
        throw new Error(data.error || "Erreur lors de l'annulation");
      }

      onSuccess("Action annulée avec succès");

      // Retirer l'activité de la liste
      setActivities((prev) => prev.filter((a) => a.id !== activityId));
    } catch (err: any) {
      onError(err.message || "Erreur lors de l'annulation");
    } finally {
      setUndoingId(null);
    }
  };

  const handleDeleteActivity = async (activityId: string) => {
    if (!confirm("Voulez-vous vraiment supprimer cette activité de l'historique ?")) {
      return;
    }

    setDeletingId(activityId);

    try {
      const res = await fetch(`/api/activity/${activityId}`, {
        method: "DELETE",
      });

      const data = await res.json();

      if (!data.success) {
        throw new Error(data.error || "Erreur lors de la suppression");
      }

      onSuccess("Activité supprimée de l'historique");

      // Retirer l'activité de la liste
      setActivities((prev) => prev.filter((a) => a.id !== activityId));
      setTotal((prev) => prev - 1);
    } catch (err: any) {
      onError(err.message || "Erreur lors de la suppression");
    } finally {
      setDeletingId(null);
    }
  };

  const handleClearAll = async () => {
    setClearingAll(true);

    try {
      const res = await fetch("/api/activity", {
        method: "DELETE",
      });

      const data = await res.json();

      if (!data.success) {
        throw new Error(data.error || "Erreur lors de la suppression");
      }

      onSuccess(`${data.deletedCount} activité(s) supprimée(s) de l'historique`);

      // Vider la liste
      setActivities([]);
      setTotal(0);
      setCurrentPage(1);
      setTotalPages(1);
      setShowConfirmClearAll(false);
    } catch (err: any) {
      onError(err.message || "Erreur lors de la suppression");
    } finally {
      setClearingAll(false);
    }
  };

  const getActionIcon = (type: string) => {
    switch (type) {
      case "trash":
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        );
      case "archive":
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
          </svg>
        );
      case "unsubscribe":
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
        );
      default:
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
    }
  };

  const getActionColor = (type: string) => {
    switch (type) {
      case "trash":
        return "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400";
      case "archive":
        return "bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400";
      case "unsubscribe":
        return "bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400";
      default:
        return "bg-gray-100 text-gray-600 dark:bg-gray-900/30 dark:text-gray-400";
    }
  };

  const getActionLabel = (type: string) => {
    switch (type) {
      case "trash":
        return "Suppression";
      case "archive":
        return "Archivage";
      case "unsubscribe":
        return "Désabonnement";
      case "mark_read":
      case "read":
        return "Marqué lu";
      case "unread":
        return "Marqué non lu";
      default:
        return type;
    }
  };

  const handlePageChange = (newPage: number) => {
    if (newPage < 1 || newPage > totalPages) return;
    setCurrentPage(newPage);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "À l'instant";
    if (diffMins < 60) return `Il y a ${diffMins} min`;
    if (diffHours < 24) return `Il y a ${diffHours}h`;
    if (diffDays < 7) return `Il y a ${diffDays}j`;

    return date.toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
  };

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-12 text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600 dark:text-gray-400">Chargement de l'historique...</p>
      </div>
    );
  }

  if (activities.length === 0 && !loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-12 text-center">
        <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Aucune activité</h3>
        <p className="text-gray-600 dark:text-gray-400">Vos actions apparaîtront ici</p>
      </div>
    );
  }

  return (
    <div>
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-6">
        <div className="flex items-center justify-between mb-2">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Historique des actions</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {total > 0 ? `${total} activité${total > 1 ? "s" : ""} enregistrée${total > 1 ? "s" : ""}` : "Aucune activité"}
            </p>
          </div>
          {total > 0 && (
            <button
              onClick={() => setShowConfirmClearAll(true)}
              disabled={clearingAll}
              className="px-4 py-2 bg-red-100 hover:bg-red-200 dark:bg-red-900/30 dark:hover:bg-red-900/50 text-red-700 dark:text-red-400 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              <Trash2 className="w-4 h-4" />
              Tout effacer
            </button>
          )}
        </div>
      </div>

      {/* Confirmation modal pour Clear All */}
      {showConfirmClearAll && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 max-w-md mx-4">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
              Confirmer la suppression
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Voulez-vous vraiment supprimer toutes les activités de l'historique ? Cette action est irréversible.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowConfirmClearAll(false)}
                disabled={clearingAll}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-900 dark:text-white rounded-lg text-sm font-medium transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={handleClearAll}
                disabled={clearingAll}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {clearingAll ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Suppression...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    Tout supprimer
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {activities.map((activity) => (
          <div
            key={activity.id}
            className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 flex items-center justify-between hover:shadow-md transition-shadow"
          >
            <div className="flex items-center space-x-4 flex-1">
              {/* Icon */}
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${getActionColor(activity.actionType)}`}>
                {getActionIcon(activity.actionType)}
              </div>

              {/* Details */}
              <div className="flex-1">
                <div className="flex items-center space-x-2 mb-1">
                  <span className="font-semibold text-gray-900 dark:text-white">{getActionLabel(activity.actionType)}</span>
                  <span className="text-sm text-gray-500 dark:text-gray-400">•</span>
                  <span className="text-sm text-gray-500 dark:text-gray-400">{formatDate(activity.timestamp)}</span>
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  <span className="font-medium">{activity.count}</span> email(s) de{" "}
                  <span className="font-medium">{activity.senderName || activity.senderKey}</span>
                </div>
                {!activity.undoable && (
                  <div className="text-xs text-gray-500 dark:text-gray-500 mt-1">⚠️ Action irréversible</div>
                )}
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex items-center gap-2">
              {/* Undo button */}
              {activity.undoable && !activity.undone && (
                <button
                  onClick={() => handleUndo(activity.id)}
                  disabled={undoingId === activity.id}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-900 dark:text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50 flex items-center space-x-2"
                >
                  {undoingId === activity.id ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-900 dark:border-white"></div>
                      <span>Annulation...</span>
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                      </svg>
                      <span>Annuler</span>
                    </>
                  )}
                </button>
              )}

              {/* Delete button */}
              <button
                onClick={() => handleDeleteActivity(activity.id)}
                disabled={deletingId === activity.id}
                className="p-2 bg-red-100 hover:bg-red-200 dark:bg-red-900/30 dark:hover:bg-red-900/50 text-red-700 dark:text-red-400 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                title="Supprimer de l'historique"
              >
                {deletingId === activity.id ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-700 dark:border-red-400"></div>
                ) : (
                  <Trash2 className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-6 flex items-center justify-center gap-2">
          <button
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1}
            className="px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Précédent
          </button>
          <span className="text-sm text-gray-600 dark:text-gray-400">
            Page {currentPage} sur {totalPages}
          </span>
          <button
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            className="px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Suivant
          </button>
        </div>
      )}

      {/* Refresh button */}
      <div className="mt-6 text-center">
        <button
          onClick={() => fetchActivities(currentPage)}
          className="px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 font-medium transition-colors flex items-center space-x-2 mx-auto"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          <span>Actualiser</span>
        </button>
      </div>
    </div>
  );
}
