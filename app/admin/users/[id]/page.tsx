"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";

interface UserDetails {
  id: string;
  email: string;
  name: string | null;
  googleId: string | null;
  picture: string | null;
  plan: string;
  role: string;
  isActive: boolean;
  lastLogin: string | null;
  createdAt: string;
  updatedAt: string;
  subscription: any;
  userMetrics: any;
  scanState: any;
  activityLogs: any[];
  _count: {
    senderStats: number;
    activityLogs: number;
  };
}

export default function UserDetailPage() {
  const router = useRouter();
  const params = useParams();
  const userId = params.id as string;

  const [user, setUser] = useState<UserDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    if (userId) {
      fetchUserDetails();
    }
  }, [userId]);

  const fetchUserDetails = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/admin/users/${userId}`);

      if (response.status === 403) {
        router.push("/");
        return;
      }

      if (response.status === 404) {
        setError("Utilisateur non trouvé");
        return;
      }

      if (!response.ok) {
        throw new Error("Failed to fetch user details");
      }

      const data = await response.json();
      setUser(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const toggleUserStatus = async () => {
    if (!user) return;

    const action = user.isActive ? "suspendre" : "réactiver";

    if (!confirm(`Êtes-vous sûr de vouloir ${action} cet utilisateur ?`)) {
      return;
    }

    try {
      setActionLoading(true);
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ isActive: !user.isActive }),
      });

      if (!response.ok) {
        throw new Error("Failed to update user");
      }

      const updatedUser = await response.json();
      console.log("✅ Statut mis à jour:", updatedUser.isActive ? "Actif" : "Suspendu");

      // Mettre à jour le state immédiatement
      setUser(updatedUser);

      // Recharger les données pour être sûr
      await fetchUserDetails();

      alert(`Utilisateur ${action === "suspendre" ? "suspendu" : "réactivé"} avec succès !`);
    } catch (err) {
      console.error("Erreur changement de statut:", err);
      alert("Erreur lors de la mise à jour de l'utilisateur");
    } finally {
      setActionLoading(false);
    }
  };

  const changePlan = async (newPlan: string) => {
    if (!user) return;

    if (!confirm(`Changer le plan de ${user.email} vers ${newPlan} ?`)) {
      return;
    }

    try {
      setActionLoading(true);
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ plan: newPlan }),
      });

      if (!response.ok) {
        throw new Error("Failed to update plan");
      }

      const updatedUser = await response.json();
      console.log("✅ Plan mis à jour:", updatedUser.plan);

      // Mettre à jour le state immédiatement
      setUser(updatedUser);

      // Recharger les données pour être sûr
      await fetchUserDetails();

      alert(`Plan changé avec succès vers ${newPlan} !`);
    } catch (err) {
      console.error("Erreur changement de plan:", err);
      alert("Erreur lors du changement de plan");
    } finally {
      setActionLoading(false);
    }
  };

  const deleteUser = async () => {
    if (!user) return;

    if (!confirm(`ATTENTION : Vous êtes sur le point de supprimer définitivement ${user.email}.\n\nToutes ses données seront supprimées de manière irréversible.\n\nTaper "SUPPRIMER" pour confirmer.`)) {
      return;
    }

    try {
      setActionLoading(true);
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete user");
      }

      router.push("/admin/users");
    } catch (err) {
      alert("Erreur lors de la suppression de l'utilisateur");
      setActionLoading(false);
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "Jamais";
    const date = new Date(dateString);
    return date.toLocaleString("fr-FR", {
      day: "numeric",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatShortDate = (dateString: string | null) => {
    if (!dateString) return "Jamais";
    const date = new Date(dateString);
    return date.toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error || !user) {
    return (
      <div>
        <Link
          href="/admin/users"
          className="inline-flex items-center text-blue-600 dark:text-blue-400 hover:text-blue-800 mb-6"
        >
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Retour aux utilisateurs
        </Link>

        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6">
          <h3 className="text-red-800 dark:text-red-400 font-semibold mb-2">
            Erreur
          </h3>
          <p className="text-red-700 dark:text-red-300">{error || "Utilisateur non trouvé"}</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <Link
          href="/admin/users"
          className="inline-flex items-center text-blue-600 dark:text-blue-400 hover:text-blue-800 mb-4"
        >
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Retour aux utilisateurs
        </Link>

        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            {user.picture && (
              <img
                src={user.picture}
                alt={user.name || user.email}
                className="w-16 h-16 rounded-full"
              />
            )}
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-1">
                {user.name || user.email}
              </h1>
              <p className="text-gray-600 dark:text-gray-400">{user.email}</p>
            </div>
          </div>

          <div className="flex gap-2">
            <span
              className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full ${
                user.isActive
                  ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300"
                  : "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300"
              }`}
            >
              {user.isActive ? "Actif" : "Suspendu"}
            </span>
            <span
              className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full ${
                user.plan === "free"
                  ? "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300"
                  : "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300"
              }`}
            >
              {user.plan}
            </span>
          </div>
        </div>
      </div>

      {/* Actions rapides */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700 p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Actions
        </h2>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={toggleUserStatus}
            disabled={actionLoading}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              user.isActive
                ? "bg-orange-600 text-white hover:bg-orange-700"
                : "bg-green-600 text-white hover:bg-green-700"
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            {user.isActive ? "Suspendre" : "Réactiver"}
          </button>

          <button
            onClick={() => changePlan("free")}
            disabled={actionLoading || user.plan === "free"}
            className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            → Free
          </button>

          <button
            onClick={() => changePlan("solo")}
            disabled={actionLoading || user.plan === "solo"}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            → Solo
          </button>

          <button
            onClick={() => changePlan("family")}
            disabled={actionLoading || user.plan === "family"}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            → Family
          </button>

          <button
            onClick={() => changePlan("pro")}
            disabled={actionLoading || user.plan === "pro"}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            → Pro
          </button>

          <button
            onClick={deleteUser}
            disabled={actionLoading}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed ml-auto"
          >
            Supprimer le compte
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Informations générales */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Informations générales
          </h2>
          <dl className="space-y-3">
            <div>
              <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
                ID Utilisateur
              </dt>
              <dd className="mt-1 text-sm text-gray-900 dark:text-white font-mono">
                {user.id}
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
                Google ID
              </dt>
              <dd className="mt-1 text-sm text-gray-900 dark:text-white font-mono">
                {user.googleId || "-"}
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
                Rôle
              </dt>
              <dd className="mt-1 text-sm text-gray-900 dark:text-white">
                {user.role}
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
                Date de création
              </dt>
              <dd className="mt-1 text-sm text-gray-900 dark:text-white">
                {formatDate(user.createdAt)}
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
                Dernière connexion
              </dt>
              <dd className="mt-1 text-sm text-gray-900 dark:text-white">
                {formatDate(user.lastLogin)}
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
                Dernière mise à jour
              </dt>
              <dd className="mt-1 text-sm text-gray-900 dark:text-white">
                {formatDate(user.updatedAt)}
              </dd>
            </div>
          </dl>
        </div>

        {/* Statistiques */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Statistiques
          </h2>
          <dl className="space-y-3">
            <div>
              <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
                Expéditeurs trouvés
              </dt>
              <dd className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">
                {user._count.senderStats}
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
                Emails supprimés
              </dt>
              <dd className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">
                {user.userMetrics?.totalDeleted || 0}
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
                Désabonnements
              </dt>
              <dd className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">
                {user.userMetrics?.totalUnsubscribes || 0}
              </dd>
            </div>
            {user.scanState && (
              <div>
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  Emails scannés
                </dt>
                <dd className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">
                  {user.scanState.scannedCount}
                </dd>
              </div>
            )}
          </dl>
        </div>
      </div>

      {/* Historique des actions */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Historique des actions ({user.activityLogs.length})
          </h2>
        </div>

        {user.activityLogs.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-900">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Action
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Expéditeur
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Nombre
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {user.activityLogs.map((log: any) => (
                  <tr key={log.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">
                      {formatShortDate(log.timestamp)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          log.actionType === "trash"
                            ? "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300"
                            : log.actionType === "archive"
                            ? "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300"
                            : "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300"
                        }`}
                      >
                        {log.actionType}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">
                      <div className="max-w-xs truncate">
                        {log.senderName || log.senderKey}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">
                      {log.count}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
            Aucune action enregistrée
          </div>
        )}
      </div>
    </div>
  );
}
