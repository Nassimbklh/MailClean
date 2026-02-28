"use client";

import { useState } from "react";

export default function OAuthWarningBanner() {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  if (isDismissed) return null;

  return (
    <div className="bg-blue-50 dark:bg-blue-900/20 border-2 border-blue-200 dark:border-blue-800 rounded-lg p-6 mb-6 shadow-sm">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center space-x-2 mb-3">
            <svg
              className="w-6 h-6 text-blue-600 dark:text-blue-400 flex-shrink-0"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <h3 className="font-bold text-blue-900 dark:text-blue-100 text-lg">
              À propos de l&apos;avertissement de sécurité Google
            </h3>
          </div>

          <div className="text-blue-800 dark:text-blue-200 space-y-3">
            <p className="text-sm">
              <strong>MailClean est actuellement en cours de vérification par Google</strong> (processus de 4 à 8 semaines).
            </p>

            <p className="text-sm">
              Lors de la connexion, vous verrez un message d&apos;avertissement de Google indiquant{" "}
              <span className="font-semibold">&quot;Cette application n&apos;a pas été vérifiée&quot;</span>.
            </p>

            <div className="bg-blue-100 dark:bg-blue-900/40 rounded-lg p-4 border border-blue-200 dark:border-blue-700">
              <p className="text-sm font-semibold text-blue-900 dark:text-blue-100 mb-2">
                ✅ C&apos;est normal et temporaire
              </p>
              <p className="text-sm text-blue-800 dark:text-blue-200">
                Nous avons soumis notre demande de vérification à Google. En attendant l&apos;approbation, vous pouvez utiliser MailClean en toute sécurité.
              </p>
            </div>

            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline flex items-center space-x-1"
            >
              <span>{isExpanded ? "Masquer" : "Voir"} les étapes de connexion</span>
              <svg
                className={`w-4 h-4 transition-transform ${isExpanded ? "rotate-180" : ""}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {isExpanded && (
              <div className="mt-4 bg-white dark:bg-gray-800 rounded-lg p-4 border border-blue-200 dark:border-blue-700">
                <p className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
                  📋 Étapes pour se connecter :
                </p>
                <ol className="space-y-3 text-sm text-gray-700 dark:text-gray-300">
                  <li className="flex items-start space-x-3">
                    <span className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold">
                      1
                    </span>
                    <div>
                      <p className="font-medium">Cliquez sur &quot;Se connecter avec Google&quot;</p>
                    </div>
                  </li>
                  <li className="flex items-start space-x-3">
                    <span className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold">
                      2
                    </span>
                    <div>
                      <p className="font-medium">Sélectionnez votre compte Google</p>
                    </div>
                  </li>
                  <li className="flex items-start space-x-3">
                    <span className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold">
                      3
                    </span>
                    <div>
                      <p className="font-medium">Vous verrez un écran d&apos;avertissement Google</p>
                      <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                        Message : &quot;Cette application n&apos;a pas été vérifiée par Google&quot;
                      </p>
                    </div>
                  </li>
                  <li className="flex items-start space-x-3">
                    <span className="flex-shrink-0 w-6 h-6 bg-orange-600 text-white rounded-full flex items-center justify-center text-xs font-bold">
                      4
                    </span>
                    <div>
                      <p className="font-medium text-orange-900 dark:text-orange-200">
                        Cliquez sur <strong>&quot;Avancé&quot;</strong> (en bas à gauche)
                      </p>
                    </div>
                  </li>
                  <li className="flex items-start space-x-3">
                    <span className="flex-shrink-0 w-6 h-6 bg-orange-600 text-white rounded-full flex items-center justify-center text-xs font-bold">
                      5
                    </span>
                    <div>
                      <p className="font-medium text-orange-900 dark:text-orange-200">
                        Cliquez sur <strong>&quot;Accéder à MailClean (non sécurisé)&quot;</strong>
                      </p>
                    </div>
                  </li>
                  <li className="flex items-start space-x-3">
                    <span className="flex-shrink-0 w-6 h-6 bg-green-600 text-white rounded-full flex items-center justify-center text-xs font-bold">
                      6
                    </span>
                    <div>
                      <p className="font-medium text-green-900 dark:text-green-200">
                        Autorisez les permissions demandées
                      </p>
                      <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                        MailClean pourra lire et gérer vos emails Gmail
                      </p>
                    </div>
                  </li>
                  <li className="flex items-start space-x-3">
                    <span className="flex-shrink-0 w-6 h-6 bg-green-600 text-white rounded-full flex items-center justify-center text-xs">
                      ✓
                    </span>
                    <div>
                      <p className="font-medium text-green-900 dark:text-green-200">
                        C&apos;est terminé ! Vous êtes connecté 🎉
                      </p>
                    </div>
                  </li>
                </ol>

                {/* Screenshot placeholder */}
                <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700">
                  <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">
                    💡 Astuce : Capture d&apos;écran de l&apos;écran Google
                  </p>
                  <div className="bg-gray-200 dark:bg-gray-800 rounded h-32 flex items-center justify-center text-gray-500 dark:text-gray-400">
                    [Vous pouvez ajouter une capture d&apos;écran ici]
                  </div>
                </div>
              </div>
            )}

            <div className="flex items-start space-x-2 mt-4 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
              <svg
                className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                />
              </svg>
              <div className="text-sm text-green-800 dark:text-green-200">
                <p className="font-semibold mb-1">🔒 Vos données sont sécurisées</p>
                <ul className="space-y-1 text-xs">
                  <li>✓ Nous ne stockons PAS le contenu de vos emails</li>
                  <li>✓ Vos données ne sont JAMAIS vendues à des tiers</li>
                  <li>✓ Connexion sécurisée avec HTTPS et OAuth 2.0</li>
                  <li>✓ Vous pouvez révoquer l&apos;accès à tout moment</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Bouton de fermeture */}
        <button
          onClick={() => setIsDismissed(true)}
          className="flex-shrink-0 ml-4 text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-200"
          aria-label="Masquer ce message"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
}
