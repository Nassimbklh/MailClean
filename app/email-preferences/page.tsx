"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface EmailPreferences {
  marketingOptIn: boolean;
  marketingOptInAt: string | null;
  marketingUnsubscribedAt: string | null;
  marketingNudgeSentAt: string | null;
}

export default function EmailPreferencesPage() {
  const router = useRouter();
  const [preferences, setPreferences] = useState<EmailPreferences | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  useEffect(() => {
    fetchPreferences();
  }, []);

  const fetchPreferences = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/email-preferences");

      if (response.status === 401) {
        router.push("/");
        return;
      }

      if (!response.ok) {
        throw new Error("Erreur lors du chargement des préférences");
      }

      const data = await response.json();
      setPreferences(data);
    } catch (error) {
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : "Erreur lors du chargement"
      });
    } finally {
      setLoading(false);
    }
  };

  const updatePreference = async (marketingOptIn: boolean) => {
    try {
      setSaving(true);
      setMessage(null);

      const response = await fetch("/api/email-preferences", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ marketingOptIn }),
      });

      const data = await response.json();

      if (response.ok) {
        setPreferences(prev => prev ? { ...prev, marketingOptIn } : null);
        setMessage({
          type: 'success',
          text: data.message || "Préférences mises à jour avec succès"
        });
      } else {
        throw new Error(data.error || "Erreur lors de la mise à jour");
      }
    } catch (error) {
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : "Erreur lors de la mise à jour"
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

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
            Préférences email
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            Gérez vos préférences de communication par email
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

        {/* Preferences Card */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700">
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Emails marketing
            </h3>
          </div>

          <div className="p-6">
            <div className="flex items-start justify-between mb-6">
              <div className="flex-1 mr-4">
                <h4 className="font-medium text-gray-900 dark:text-white mb-1">
                  Recevoir les emails promotionnels
                </h4>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Recevez des conseils, des offres spéciales et des nouveautés sur CleanMail
                </p>

                {preferences?.marketingUnsubscribedAt && (
                  <p className="text-xs text-gray-500 dark:text-gray-500 mt-2">
                    Désabonné le {new Date(preferences.marketingUnsubscribedAt).toLocaleDateString('fr-FR')}
                  </p>
                )}

                {preferences?.marketingOptIn && preferences?.marketingOptInAt && (
                  <p className="text-xs text-gray-500 dark:text-gray-500 mt-2">
                    Abonné le {new Date(preferences.marketingOptInAt).toLocaleDateString('fr-FR')}
                  </p>
                )}
              </div>

              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  checked={preferences?.marketingOptIn || false}
                  onChange={(e) => updatePreference(e.target.checked)}
                  disabled={saving}
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
              </label>
            </div>

            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <div className="flex items-start">
                <svg className="w-5 h-5 text-blue-600 dark:text-blue-400 mr-2 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div className="text-sm text-blue-800 dark:text-blue-300">
                  <p className="font-medium mb-1">À savoir :</p>
                  <ul className="list-disc list-inside space-y-1">
                    <li>Vous recevrez toujours les emails importants (confirmations, sécurité)</li>
                    <li>Vous pouvez vous désabonner à tout moment</li>
                    <li>Nous respectons votre vie privée et ne partageons jamais vos données</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Additional Info */}
        <div className="mt-8 text-center">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Des questions sur vos données ?{' '}
            <Link href="/privacy" className="text-blue-600 hover:text-blue-700 dark:text-blue-400">
              Consultez notre politique de confidentialité
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}
