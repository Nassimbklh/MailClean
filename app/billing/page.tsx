"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface Subscription {
  id: string;
  planId: string;
  billing: string;
  status: string;
  createdAt: string;
  canceledAt: string | null;
}

interface UserData {
  email: string;
  name: string | null;
  plan: string;
}

export default function BillingPage() {
  const router = useRouter();
  const [user, setUser] = useState<UserData | null>(null);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  useEffect(() => {
    fetchUserAndSubscription();
  }, []);

  const fetchUserAndSubscription = async () => {
    try {
      setLoading(true);

      // Récupérer les infos utilisateur
      const userResponse = await fetch("/api/auth/me");
      if (userResponse.status === 401) {
        router.push("/");
        return;
      }

      if (!userResponse.ok) {
        throw new Error("Erreur lors de la récupération des données utilisateur");
      }

      const userData = await userResponse.json();
      setUser(userData.user);

      // TODO: Créer une API pour récupérer l'abonnement
      // Pour l'instant, on simule avec les données utilisateur
    } catch (error) {
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : "Erreur lors du chargement"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCancelSubscription = async () => {
    if (!confirm("Êtes-vous sûr de vouloir annuler votre abonnement ? Vous pourrez continuer à utiliser le service jusqu'à la fin de votre période de facturation.")) {
      return;
    }

    try {
      setActionLoading(true);
      setMessage(null);

      const response = await fetch("/api/subscription/cancel", {
        method: "POST",
      });

      const data = await response.json();

      if (response.ok) {
        setMessage({
          type: 'success',
          text: data.message || "Abonnement annulé avec succès"
        });
        fetchUserAndSubscription();
      } else {
        throw new Error(data.error || "Erreur lors de l'annulation");
      }
    } catch (error) {
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : "Erreur lors de l'annulation"
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleReactivateSubscription = async () => {
    try {
      setActionLoading(true);
      setMessage(null);

      const response = await fetch("/api/subscription/reactivate", {
        method: "POST",
      });

      const data = await response.json();

      if (response.ok) {
        setMessage({
          type: 'success',
          text: data.message || "Abonnement réactivé avec succès"
        });
        fetchUserAndSubscription();
      } else {
        throw new Error(data.error || "Erreur lors de la réactivation");
      }
    } catch (error) {
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : "Erreur lors de la réactivation"
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleOpenPortal = async () => {
    try {
      setActionLoading(true);
      setMessage(null);

      const response = await fetch("/api/subscription/portal", {
        method: "POST",
      });

      const data = await response.json();

      if (response.ok && data.url) {
        window.location.href = data.url;
      } else {
        throw new Error(data.error || "Erreur lors de l'ouverture du portail");
      }
    } catch (error) {
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : "Erreur lors de l'ouverture du portail"
      });
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const isPro = user?.plan === 'pro' || user?.plan === 'family';

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <Link href="/dashboard-new" className="flex items-center space-x-2">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">CleanMail</h1>
            </Link>

            <Link
              href="/dashboard-new"
              className="px-4 py-2 text-sm bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-medium transition-colors"
            >
              Retour au tableau de bord
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Facturation et abonnement
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            Gérez votre abonnement et vos méthodes de paiement
          </p>
        </div>

        {/* Message */}
        {message && (
          <div className={`mb-6 p-4 rounded-lg border ${
            message.type === 'success'
              ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-800 dark:text-green-300'
              : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-800 dark:text-red-300'
          }`}>
            <div className="flex items-center">
              {message.type === 'success' ? (
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              )}
              <span>{message.text}</span>
            </div>
          </div>
        )}

        {/* Current Plan Card */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700 mb-6">
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Votre abonnement actuel
            </h3>
          </div>

          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Plan actuel</p>
                <div className="flex items-center gap-2">
                  <p className="text-2xl font-bold text-gray-900 dark:text-white capitalize">
                    {user?.plan === 'free' ? 'Gratuit' : user?.plan === 'pro' ? 'Pro' : 'Famille'}
                  </p>
                  {isPro && (
                    <span className="px-2 py-1 text-xs font-semibold bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-full">
                      Premium
                    </span>
                  )}
                </div>
              </div>

              {isPro && (
                <button
                  onClick={handleOpenPortal}
                  disabled={actionLoading}
                  className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
                >
                  Gérer mon abonnement
                </button>
              )}
            </div>

            {user?.plan === 'free' && (
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-4">
                <p className="text-sm text-blue-800 dark:text-blue-300 mb-3">
                  Vous utilisez actuellement le plan gratuit. Passez à Premium pour débloquer toutes les fonctionnalités !
                </p>
                <Link
                  href="/tarifs"
                  className="inline-block px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
                >
                  Voir les plans
                </Link>
              </div>
            )}

            {isPro && (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                  <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Statut</p>
                    <p className="text-lg font-semibold text-green-600 dark:text-green-400">Actif</p>
                  </div>

                  <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Emails utilisateur</p>
                    <p className="text-lg font-semibold text-gray-900 dark:text-white">{user?.email}</p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={handleCancelSubscription}
                    disabled={actionLoading}
                    className="px-4 py-2 text-sm bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
                  >
                    Annuler l'abonnement
                  </button>

                  <button
                    onClick={handleOpenPortal}
                    disabled={actionLoading}
                    className="px-4 py-2 text-sm bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
                  >
                    Gérer les méthodes de paiement
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Features Comparison */}
        {user?.plan === 'free' && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Pourquoi passer à Premium ?
              </h3>
            </div>

            <div className="p-6">
              <ul className="space-y-3">
                {[
                  "Suppression illimitée d'emails",
                  "Désabonnement automatique en masse",
                  "Statistiques avancées",
                  "Support prioritaire",
                  "Pas de publicités",
                ].map((feature, index) => (
                  <li key={index} className="flex items-center text-gray-700 dark:text-gray-300">
                    <svg className="w-5 h-5 text-green-500 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    {feature}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
