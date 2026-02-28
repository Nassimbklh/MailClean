"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import SenderAvatar from "@/components/SenderAvatar";
import PublicNavbar from "@/components/PublicNavbar";

export default function HomePage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  useEffect(() => {
    // Vérifier si l'utilisateur est déjà connecté
    fetch("/api/auth/me")
      .then((res) => res.json())
      .then((data) => {
        if (data.isLoggedIn) {
          router.push("/dashboard-new");
        }
      })
      .catch(() => {
        // Ignorer les erreurs silencieusement
      });

    // Vérifier les erreurs dans l'URL
    const params = new URLSearchParams(window.location.search);
    const errorParam = params.get("error");
    const errorDetails = params.get("details");

    if (errorParam) {
      let errorMessage = "";
      switch (errorParam) {
        case "access_denied":
          errorMessage = "Vous avez refusé l'accès à votre compte Gmail. CleanMail a besoin de ces permissions pour fonctionner.";
          break;
        case "auth_failed":
          errorMessage = errorDetails
            ? `Erreur lors de l'authentification: ${decodeURIComponent(errorDetails)}`
            : "Erreur lors de l'authentification avec Google. Veuillez réessayer.";
          break;
        case "no_code":
          errorMessage = "Aucun code d'autorisation reçu de Google. Veuillez réessayer.";
          break;
        default:
          errorMessage = `Une erreur s'est produite: ${errorParam}`;
      }
      setError(errorMessage);
      console.error("❌ [page] Erreur OAuth:", errorMessage);
    }
  }, [router]);

  const handleLogin = (e?: React.MouseEvent) => {
    // Empêcher tout comportement par défaut
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }

    // Empêcher les double-clics
    if (isLoggingIn) return;

    // Activer l'état de chargement
    setIsLoggingIn(true);

    // Redirection immédiate vers l'API OAuth Google
    window.location.href = "/api/auth/google";
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      {/* Header */}
      <PublicNavbar
        showLogin={true}
        onLoginClick={handleLogin}
        isLoggingIn={isLoggingIn}
      />

      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-16">
        <div className="text-center max-w-3xl mx-auto">
          <h2 className="text-5xl md:text-6xl font-bold text-gray-900 dark:text-white mb-6">
            Reprenez le contrôle de votre
            <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent"> boîte Gmail</span>
          </h2>
          <p className="text-xl text-gray-600 dark:text-gray-300 mb-8">
            Nettoyez votre boîte mail en quelques clics. Groupez vos emails par expéditeur, désabonnez-vous facilement et supprimez en masse.
          </p>

          {error && (
            <div className="bg-red-100 dark:bg-red-900/30 border border-red-400 dark:border-red-700 text-red-700 dark:text-red-400 px-4 py-3 rounded-lg mb-6 max-w-md mx-auto">
              {error}
            </div>
          )}

          <button
            onClick={handleLogin}
            disabled={isLoggingIn}
            className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:from-blue-400 disabled:to-indigo-400 disabled:cursor-not-allowed text-white font-semibold py-4 px-10 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 inline-flex items-center text-lg"
          >
            {isLoggingIn ? (
              <>
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white mr-3"></div>
                <span>Connexion en cours...</span>
              </>
            ) : (
              <>
                <svg className="w-6 h-6 mr-3" viewBox="0 0 24 24">
                  <path
                    fill="currentColor"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="currentColor"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
                <span>Commencer gratuitement avec Google</span>
              </>
            )}
          </button>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-4">
            🔒 Sécurisé et confidentiel - Aucune donnée stockée
          </p>
        </div>
      </section>

      {/* Preview Dashboard Mockup */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-20">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl overflow-hidden border border-gray-200 dark:border-gray-700">
          {/* Mockup Content */}
          <div className="p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                Expéditeurs (5)
              </h2>
              {/* Animated Refresh Button */}
              <button className="flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors">
                <svg
                  className="w-5 h-5 animate-spin"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                  />
                </svg>
                <span className="hidden sm:inline">Actualisation...</span>
              </button>
            </div>

            {/* Search Bar Mockup */}
            <div className="mb-4">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg
                    className="h-5 w-5 text-gray-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                    />
                  </svg>
                </div>
                <input
                  type="text"
                  disabled
                  placeholder="Rechercher par nom, email ou domaine..."
                  className="block w-full pl-10 pr-3 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700/50 text-gray-500 dark:text-gray-400 placeholder-gray-400 dark:placeholder-gray-500 cursor-not-allowed"
                />
              </div>
            </div>

            {/* Mockup Rows */}
            <div className="space-y-3">
              {[
                { name: "Amazon", domain: "amazon.com", count: "245", color: "bg-orange-100 dark:bg-orange-900/20" },
                { name: "Uber", domain: "uber.com", count: "189", color: "bg-green-100 dark:bg-green-900/20" },
                { name: "Shein", domain: "shein.com", count: "167", color: "bg-pink-100 dark:bg-pink-900/20" },
                { name: "LinkedIn", domain: "linkedin.com", count: "143", color: "bg-blue-100 dark:bg-blue-900/20" },
                { name: "Facebook", domain: "facebook.com", count: "98", color: "bg-indigo-100 dark:bg-indigo-900/20" },
              ].map((item, idx) => (
                <div
                  key={idx}
                  className={`${item.color} rounded-lg p-4 flex items-center justify-between hover:scale-[1.02] transition-transform`}
                >
                  <div className="flex items-center space-x-4">
                    <SenderAvatar
                      senderName={item.name}
                      senderEmail={`newsletter@${item.domain}`}
                      size="md"
                    />
                    <div>
                      <div className="font-semibold text-gray-900 dark:text-white">{item.name}</div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">newsletter@{item.domain}</div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-4">
                    <div className="text-center">
                      <div className="text-3xl font-bold text-gray-900 dark:text-white">{item.count}</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 font-medium">emails</div>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-2">
                      <button className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-sm font-medium transition-colors whitespace-nowrap">
                        Se désabonner
                      </button>
                      <button className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg text-sm font-medium transition-colors whitespace-nowrap">
                        Supprimer
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="text-center mt-6 space-y-2">
          <p className="text-gray-500 dark:text-gray-400 text-sm">
            ⬆️ Aperçu de l'interface réelle - Vos expéditeurs apparaîtront après connexion
          </p>
          <p className="text-gray-400 dark:text-gray-500 text-xs">
            L'icône d'actualisation tourne en continu pendant l'analyse de vos emails
          </p>
        </div>
      </section>

      {/* Comment ça marche */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-gray-800 dark:to-gray-900 rounded-3xl">
        <h3 className="text-3xl md:text-4xl font-bold text-center text-gray-900 dark:text-white mb-12">
          Comment ça marche ?
        </h3>
        <div className="grid md:grid-cols-3 gap-8">
          {[
            {
              step: "1",
              title: "Connectez-vous",
              description: "Authentifiez-vous de façon sécurisée avec votre compte Google",
              icon: (
                <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                </svg>
              ),
            },
            {
              step: "2",
              title: "Analysez vos emails",
              description: "CleanMail scanne votre boîte Gmail et compte le nombre d'emails reçus par expéditeur automatiquement",
              icon: (
                <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              ),
            },
            {
              step: "3",
              title: "Nettoyez en 1 clic",
              description: "Désabonnez-vous ou supprimez en masse les emails indésirables",
              icon: (
                <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              ),
            },
          ].map((item, idx) => (
            <div key={idx} className="bg-white dark:bg-gray-800 rounded-xl p-8 shadow-lg hover:shadow-xl transition-shadow">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center text-white mb-4">
                {item.icon}
              </div>
              <div className="text-sm font-bold text-blue-600 dark:text-blue-400 mb-2">ÉTAPE {item.step}</div>
              <h4 className="text-xl font-bold text-gray-900 dark:text-white mb-3">{item.title}</h4>
              <p className="text-gray-600 dark:text-gray-400">{item.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Fonctionnalités détaillées */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <h3 className="text-3xl md:text-4xl font-bold text-center text-gray-900 dark:text-white mb-12">
          Fonctionnalités puissantes
        </h3>
        <div className="grid md:grid-cols-2 gap-8">
          {[
            {
              title: "Groupement intelligent",
              description: "Visualisez tous vos expéditeurs groupés avec le nombre exact d'emails reçus. Identifiez rapidement qui encombre votre boîte.",
              icon: "📊",
              gradient: "from-blue-500 to-cyan-500",
            },
            {
              title: "Recherche instantanée",
              description: "Trouvez rapidement un expéditeur spécifique en recherchant par nom, email ou domaine. Filtrage en temps réel.",
              icon: "🔍",
              gradient: "from-indigo-500 to-purple-500",
            },
            {
              title: "Désabonnement automatique",
              description: "Détectez automatiquement les liens de désabonnement dans les headers des emails et désabonnez-vous en un clic.",
              icon: "✉️",
              gradient: "from-purple-500 to-pink-500",
            },
            {
              title: "Suppression en masse",
              description: "Mettez à la corbeille tous les emails d'un expéditeur en un clic. Jusqu'à 500 emails traités simultanément.",
              icon: "🗑️",
              gradient: "from-red-500 to-orange-500",
            },
            {
              title: "Sécurité maximale",
              description: "Vos tokens sont chiffrés avec iron-session. Aucune donnée n'est stockée. Tout se passe côté serveur de façon sécurisée.",
              icon: "🔒",
              gradient: "from-green-500 to-emerald-500",
            },
          ].map((feature, idx) => (
            <div key={idx} className="bg-white dark:bg-gray-800 rounded-xl p-8 shadow-lg hover:shadow-xl transition-all hover:-translate-y-1">
              <div className={`w-16 h-16 bg-gradient-to-br ${feature.gradient} rounded-xl flex items-center justify-center text-3xl mb-4`}>
                {feature.icon}
              </div>
              <h4 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">{feature.title}</h4>
              <p className="text-gray-600 dark:text-gray-400">{feature.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA Final */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center">
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-3xl p-12 shadow-2xl">
          <h3 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Prêt à nettoyer votre boîte Gmail ?
          </h3>
          <p className="text-xl text-blue-100 mb-8">
            Rejoignez des milliers d'utilisateurs qui ont déjà repris le contrôle
          </p>
          <button
            onClick={handleLogin}
            disabled={isLoggingIn}
            className="bg-white text-blue-600 hover:bg-gray-100 disabled:bg-gray-300 disabled:text-blue-400 disabled:cursor-not-allowed font-bold py-4 px-10 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 inline-flex items-center text-lg"
          >
            {isLoggingIn ? (
              <>
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mr-3"></div>
                <span>Connexion...</span>
              </>
            ) : (
              <>
                <svg className="w-6 h-6 mr-3" viewBox="0 0 24 24">
                  <path
                    fill="currentColor"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="currentColor"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
                <span>Commencer maintenant</span>
              </>
            )}
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="flex items-center justify-center space-x-2 mb-4">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <span className="text-xl font-bold text-white">CleanMail</span>
          </div>
          <div className="flex justify-center space-x-6 mb-4">
            <Link href="/pricing" className="text-sm hover:text-white transition-colors">
              Tarifs
            </Link>
            <Link href="/privacy" className="text-sm hover:text-white transition-colors">
              Politique de confidentialité
            </Link>
            <Link href="/contact" className="text-sm hover:text-white transition-colors">
              Contact
            </Link>
          </div>
          <p className="text-sm">
            © 2024 CleanMail. Un outil simple pour gérer vos emails Gmail.
          </p>
          <p className="text-xs mt-2">
            🔒 Vos données sont sécurisées et jamais stockées
          </p>
        </div>
      </footer>
    </div>
  );
}
