"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface User {
  email: string;
  name?: string;
  picture?: string;
}

export default function TarifsPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isYearly, setIsYearly] = useState(false);
  const [processingPlan, setProcessingPlan] = useState<string | null>(null);
  const [proAccountCount, setProAccountCount] = useState(10); // Nombre de comptes pour le plan Pro

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const response = await fetch("/api/auth/me");
      if (!response.ok) {
        router.push("/");
        return;
      }

      const data = await response.json();
      if (!data.user) {
        router.push("/");
        return;
      }

      setUser(data.user);
    } catch (error) {
      console.error("Error checking auth:", error);
      router.push("/");
    } finally {
      setLoading(false);
    }
  };

  const handleUpgrade = async (planId: string, billing: string) => {
    try {
      setProcessingPlan(planId);

      const requestBody: any = {
        planId,
        billing,
      };

      // Pour le plan Pro, ajouter le nombre de comptes
      if (planId === "pro") {
        requestBody.accountCount = proAccountCount;
      }

      const response = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        throw new Error("Failed to create checkout session");
      }

      const data = await response.json();

      if (data.url) {
        window.location.href = data.url;
      }
    } catch (error) {
      console.error("Error creating checkout:", error);
      alert("Erreur lors de la création de la session de paiement");
    } finally {
      setProcessingPlan(null);
    }
  };

  // Calcul du prix Pro
  const proPricePerAccount = 2.79; // Prix par compte/mois
  const proPricePerAccountYearly = 2.09; // Prix par compte/mois facturé annuellement (-25%)
  const proTotalPrice = (proAccountCount * proPricePerAccount).toFixed(2);
  const proTotalPriceYearly = (proAccountCount * proPricePerAccountYearly * 12).toFixed(2);

  const plans = [
    {
      id: "solo",
      name: "Solo",
      description: "Pour un usage personnel avancé",
      price: "4,99",
      priceYearly: "44,91", // -25%
      badge: "Populaire",
      features: [
        "1 compte Gmail",
        "Nettoyage illimité",
        "Désabonnement en masse",
        "Filtres avancés",
        "Historique des actions",
      ],
      cta: "Passer à ce plan",
      highlighted: false,
    },
    {
      id: "family",
      name: "Famille",
      description: "Pour partager en famille ou équipe",
      price: "15,99",
      priceYearly: "143,91", // -25%
      badge: "Meilleur rapport qualité-prix",
      features: [
        "5 comptes Gmail",
        "Tout le plan Solo",
        "Partage famille / équipe",
        "Gestion multi-comptes",
      ],
      cta: "Passer à ce plan",
      highlighted: true,
    },
    {
      id: "pro",
      name: "Pro",
      description: "Pour les entreprises et équipes",
      price: proTotalPrice,
      priceYearly: proTotalPriceYearly,
      badge: "Idéal pour entreprises",
      features: [
        `${proAccountCount} comptes Gmail`,
        "Gestion centralisée des comptes",
        "Tableau de bord global",
        "Historique multi-utilisateurs",
        "Facturation groupée",
        "Support prioritaire",
        "Rôles Admin / Membre",
        "Statistiques d'équipe",
      ],
      cta: "Passer à ce plan",
      highlighted: false,
      isPro: true,
    },
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-blue-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800">
      {/* Header */}
      <header className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-b border-gray-200 dark:border-gray-700 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            {/* Logo */}
            <Link href="/dashboard-new" className="flex items-center space-x-2">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                CleanMail
              </h1>
            </Link>

            {/* User info & actions */}
            <div className="flex items-center space-x-4">
              <Link
                href="/dashboard-new"
                className="px-4 py-2 text-sm bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-medium transition-colors"
              >
                Retour au tableau de bord
              </Link>

              {/* User profile */}
              <div className="flex items-center space-x-3">
                <div className="text-right hidden sm:block">
                  <div className="text-sm font-medium text-gray-900 dark:text-white">{user?.name || "Utilisateur"}</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">{user?.email}</div>
                </div>
                <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-white font-bold text-lg">
                  {user?.name?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || "U"}
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-12">
        <div className="text-center max-w-4xl mx-auto">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 dark:text-white mb-6 leading-tight">
            Passez à Premium. Nettoyez sans limites.
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-300 mb-12">
            Choisissez un plan simple. Annulez à tout moment.
          </p>

          {/* Billing Toggle */}
          <div className="inline-flex items-center bg-white dark:bg-gray-800 rounded-full p-1 shadow-lg border border-gray-200 dark:border-gray-700">
            <button
              onClick={() => setIsYearly(false)}
              className={`px-6 py-3 rounded-full text-sm font-semibold transition-all duration-200 ${
                !isYearly
                  ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md"
                  : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
              }`}
            >
              Mensuel
            </button>
            <button
              onClick={() => setIsYearly(true)}
              className={`px-6 py-3 rounded-full text-sm font-semibold transition-all duration-200 ${
                isYearly
                  ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md"
                  : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
              }`}
            >
              Annuel (Économisez 25%)
            </button>
          </div>
        </div>
      </section>

      {/* Pricing Cards */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-20">
        <div className="grid md:grid-cols-3 gap-8">
          {plans.map((plan) => (
            <div
              key={plan.id}
              className={`relative bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 flex flex-col transition-all duration-300 ${
                plan.highlighted
                  ? "border-2 border-blue-600 transform md:scale-105 z-10 shadow-blue-500/20"
                  : plan.isPro
                  ? "border-2 border-purple-500 shadow-purple-500/10"
                  : "border border-gray-200 dark:border-gray-700"
              } ${plan.isPro ? "hover:shadow-2xl hover:shadow-purple-500/20" : ""}`}
            >
              {/* Badge - Position: top right */}
              {plan.badge && (
                <div className="absolute -top-4 right-4">
                  <span className={`text-white text-sm font-bold px-4 py-1.5 rounded-full shadow-lg ${
                    plan.isPro
                      ? "bg-gradient-to-r from-purple-600 to-pink-600"
                      : "bg-gradient-to-r from-blue-600 to-indigo-600"
                  }`}>
                    {plan.badge}
                  </span>
                </div>
              )}

              {/* Plan Header */}
              <div className="mb-6">
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                  {plan.name}
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {plan.description}
                </p>
              </div>

              {/* Pro Slider */}
              {plan.isPro && (
                <div className="mb-6 p-4 bg-purple-50 dark:bg-purple-900/20 rounded-xl border border-purple-200 dark:border-purple-800">
                  <label className="block text-sm font-medium text-gray-900 dark:text-white mb-3">
                    Nombre de comptes : <span className="text-purple-600 dark:text-purple-400 font-bold">{proAccountCount}</span>
                  </label>
                  <input
                    type="range"
                    min="10"
                    max="100"
                    step="1"
                    value={proAccountCount}
                    onChange={(e) => setProAccountCount(parseInt(e.target.value))}
                    className="w-full h-2 bg-purple-200 dark:bg-purple-800 rounded-lg appearance-none cursor-pointer accent-purple-600"
                  />
                  <div className="flex justify-between text-xs text-gray-600 dark:text-gray-400 mt-2">
                    <span>10 comptes</span>
                    <span>100 comptes</span>
                  </div>
                </div>
              )}

              {/* Price */}
              <div className="mb-6">
                <div className="flex items-baseline">
                  {plan.isPro && !isYearly && (
                    <span className="text-lg text-gray-600 dark:text-gray-400 mr-2">
                      À partir de
                    </span>
                  )}
                  <span className="text-5xl font-bold text-gray-900 dark:text-white">
                    {isYearly ? plan.priceYearly : plan.price}
                  </span>
                  <span className="text-xl text-gray-600 dark:text-gray-400 ml-1">
                    €
                  </span>
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  {isYearly ? "/ an" : "/ mois"}
                </p>
                {plan.isPro && (
                  <p className="text-xs text-purple-600 dark:text-purple-400 font-medium mt-2">
                    {isYearly
                      ? `${proPricePerAccountYearly}€ par compte / mois`
                      : `${proPricePerAccount}€ par compte / mois`}
                  </p>
                )}
              </div>

              {/* Features */}
              <ul className="space-y-3 mb-8 flex-grow">
                {plan.features.map((feature, idx) => (
                  <li key={idx} className="flex items-start">
                    <svg
                      className={`w-5 h-5 mr-3 flex-shrink-0 mt-0.5 ${
                        plan.isPro ? "text-purple-500" : "text-green-500"
                      }`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                    <span className="text-sm text-gray-700 dark:text-gray-300">
                      {feature}
                    </span>
                  </li>
                ))}
              </ul>

              {/* CTA Button */}
              <button
                onClick={() => handleUpgrade(plan.id, isYearly ? "yearly" : "monthly")}
                disabled={processingPlan === plan.id}
                className={`w-full py-3 px-6 rounded-lg font-semibold transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center ${
                  plan.highlighted
                    ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-700 hover:to-indigo-700 shadow-lg hover:shadow-xl"
                    : plan.isPro
                    ? "bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:from-purple-700 hover:to-pink-700 shadow-lg hover:shadow-2xl"
                    : "bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white hover:bg-gray-200 dark:hover:bg-gray-600"
                }`}
              >
                {processingPlan === plan.id ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2"></div>
                    <span>Chargement...</span>
                  </>
                ) : (
                  <span>{plan.cta}</span>
                )}
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* Trust Banner */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pb-20">
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-gray-800 dark:to-gray-700 rounded-2xl p-8 border border-blue-100 dark:border-gray-600">
          <div className="grid md:grid-cols-2 gap-6">
            <div className="flex items-start space-x-3">
              <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div>
                <p className="text-gray-900 dark:text-white font-medium">
                  Annulez ou changez de plan à tout moment.
                </p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              </div>
              <div>
                <p className="text-gray-900 dark:text-white font-medium">
                  Achetez 5 comptes et partagez-les avec vos proches.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-20">
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white text-center mb-12">
          Questions fréquentes
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              Puis-je changer de plan ?
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              Oui, vous pouvez upgrader ou downgrader à tout moment. Le changement sera effectif
              immédiatement.
            </p>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              Comment annuler mon abonnement ?
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              Vous pouvez annuler à tout moment depuis votre compte. Vous conserverez l'accès
              jusqu'à la fin de votre période payée.
            </p>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              Quels moyens de paiement acceptez-vous ?
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              Nous acceptons toutes les cartes bancaires via Stripe (Visa, Mastercard, American
              Express).
            </p>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              Mes données sont-elles sécurisées ?
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              Absolument. Nous n'accédons jamais au contenu de vos emails et toutes les données
              sont chiffrées.
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <span className="text-lg font-bold text-gray-900 dark:text-white">CleanMail</span>
            </div>

            <div className="flex flex-wrap justify-center items-center gap-x-6 gap-y-2 text-sm text-gray-600 dark:text-gray-400">
              <Link href="/privacy" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                Politique de confidentialité
              </Link>
              <span className="text-gray-300 dark:text-gray-600">•</span>
              <Link href="/privacy" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                Conditions d'utilisation
              </Link>
              <span className="text-gray-300 dark:text-gray-600">•</span>
              <Link href="/contact" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                Contact
              </Link>
            </div>
          </div>

          <div className="mt-8 text-center text-sm text-gray-500 dark:text-gray-400">
            © 2024 CleanMail. Tous droits réservés.
          </div>
        </div>
      </footer>
    </div>
  );
}
