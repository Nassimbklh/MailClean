"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";

export default function PaymentSuccessPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [sessionData, setSessionData] = useState<any>(null);

  useEffect(() => {
    const sessionId = searchParams.get("session_id");

    if (!sessionId) {
      // Pas de session_id, rediriger vers pricing
      router.push("/pricing");
      return;
    }

    // Récupérer les détails de la session
    fetchSessionDetails(sessionId);

    // Rediriger vers le dashboard après 5 secondes
    const timeout = setTimeout(() => {
      router.push("/dashboard-new");
    }, 5000);

    return () => clearTimeout(timeout);
  }, [searchParams, router]);

  const fetchSessionDetails = async (sessionId: string) => {
    try {
      const res = await fetch(`/api/stripe/session?session_id=${sessionId}`);
      const data = await res.json();

      if (data.success) {
        setSessionData(data.session);
      }
    } catch (error) {
      console.error("Erreur lors de la récupération de la session:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center p-4">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-12 max-w-md w-full text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mx-auto mb-6"></div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            Vérification du paiement...
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            Veuillez patienter
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-12 max-w-lg w-full">
        {/* Icône de succès */}
        <div className="w-20 h-20 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
          <svg
            className="w-10 h-10 text-green-600 dark:text-green-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={3}
              d="M5 13l4 4L19 7"
            />
          </svg>
        </div>

        {/* Titre */}
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white text-center mb-4">
          Paiement réussi !
        </h1>

        <p className="text-gray-600 dark:text-gray-400 text-center mb-8">
          Merci pour votre abonnement à MailClean. Votre paiement a été
          confirmé.
        </p>

        {/* Détails du paiement */}
        {sessionData && (
          <div className="bg-gray-50 dark:bg-gray-900/50 rounded-xl p-6 mb-8 space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600 dark:text-gray-400">
                Email de facturation
              </span>
              <span className="text-sm font-medium text-gray-900 dark:text-white">
                {sessionData.customer_email || sessionData.customer_details?.email}
              </span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600 dark:text-gray-400">
                Montant
              </span>
              <span className="text-sm font-bold text-gray-900 dark:text-white">
                {sessionData.amount_total
                  ? `${(sessionData.amount_total / 100).toFixed(2)} ${sessionData.currency?.toUpperCase()}`
                  : "N/A"}
              </span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600 dark:text-gray-400">
                Plan
              </span>
              <span className="text-sm font-medium text-gray-900 dark:text-white">
                {sessionData.metadata?.planId === "solo"
                  ? "Solo"
                  : sessionData.metadata?.planId === "family"
                  ? "Famille"
                  : "Pro"}{" "}
                -{" "}
                {sessionData.metadata?.billing === "monthly"
                  ? "Mensuel"
                  : "Annuel"}
              </span>
            </div>

            {sessionData.metadata?.accountCount && (
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  Nombre de comptes
                </span>
                <span className="text-sm font-medium text-gray-900 dark:text-white">
                  {sessionData.metadata.accountCount} comptes
                </span>
              </div>
            )}

            {sessionData.customer_details?.address && (
              <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                <span className="text-sm text-gray-600 dark:text-gray-400 block mb-2">
                  Adresse de facturation
                </span>
                <div className="text-sm text-gray-900 dark:text-white">
                  <p>{sessionData.customer_details.address.line1}</p>
                  {sessionData.customer_details.address.line2 && (
                    <p>{sessionData.customer_details.address.line2}</p>
                  )}
                  <p>
                    {sessionData.customer_details.address.postal_code}{" "}
                    {sessionData.customer_details.address.city}
                  </p>
                  <p>{sessionData.customer_details.address.country}</p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Message de redirection */}
        <div className="text-center">
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            Vous allez être redirigé vers le dashboard dans quelques
            secondes...
          </p>

          <button
            onClick={() => router.push("/dashboard-new")}
            className="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl"
          >
            Accéder au dashboard maintenant
          </button>
        </div>
      </div>
    </div>
  );
}
