"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import AccountTabs from "@/components/AccountTabs";

interface Subscription {
  id: string;
  planId: string;
  billing: string;
  status: string;
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
  canceledAt: string | null;
  stripeCustomerId?: string;
}

interface UserStats {
  deletedCount: number;
  unsubscribedCount: number;
  archivedCount: number;
  totalEmailsScanned: number;
  totalSenders: number;
  totalRemaining: number;
  lastScanAt: string | null;
  scanStatus: string | null;
}

interface UsageData {
  monthly: {
    deletes: {
      used: number;
      limit: number;
      unlimited: boolean;
      remaining: number;
    };
    unsubscribes: {
      used: number;
      limit: number;
      unlimited: boolean;
      remaining: number;
    };
  };
  scan: {
    used: number;
    limit: number;
    unlimited: boolean;
    status: string;
    percentage: number;
  };
  plan: string;
  renewalDate: string | null;
}

interface InviteCode {
  code: string;
  expiresAt: string;
  maxUses: number;
  inviteUrl: string;
}

export default function BillingPage() {
  const router = useRouter();
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [usage, setUsage] = useState<UsageData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [currentPlan, setCurrentPlan] = useState<string>("free");
  const [userEmail, setUserEmail] = useState<string>("");

  const [inviteCode, setInviteCode] = useState<InviteCode | null>(null);
  const [generatingCode, setGeneratingCode] = useState(false);
  const [copied, setCopied] = useState(false);
  const [loadingPortal, setLoadingPortal] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      // Charger les infos utilisateur
      const meResponse = await fetch("/api/auth/me");
      const meData = await meResponse.json();

      if (meResponse.ok && meData.isLoggedIn) {
        setCurrentPlan(meData.user.plan || "free");
        setUserEmail(meData.user.email);
      }

      // Charger la subscription
      const subResponse = await fetch("/api/user/subscription");
      if (subResponse.ok) {
        const subData = await subResponse.json();
        setSubscription(subData);
      }

      // Charger les statistiques globales (lifetime)
      const statsResponse = await fetch("/api/user/stats");
      if (statsResponse.ok) {
        const statsData = await statsResponse.json();
        setStats(statsData);
      }

      // Charger l'utilisation mensuelle (quotas)
      const usageResponse = await fetch("/api/user/usage");
      if (usageResponse.ok) {
        const usageData = await usageResponse.json();
        setUsage(usageData);
      }
    } catch (err: any) {
      console.error("Erreur chargement:", err);
    }
  };

  const generateInviteCode = async () => {
    if (!["family", "pro"].includes(currentPlan)) {
      setError("Seuls les plans Famille et Pro peuvent générer des codes d'invitation");
      return;
    }

    setGeneratingCode(true);
    setError(null);

    try {
      const response = await fetch("/api/teams/invite/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ expiresInDays: 30 }),
      });

      const data = await response.json();

      if (response.ok) {
        setInviteCode(data);
      } else {
        setError(data.error || "Erreur lors de la génération du code");
      }
    } catch (err: any) {
      setError("Erreur lors de la génération du code");
    } finally {
      setGeneratingCode(false);
    }
  };

  const openCustomerPortal = async () => {
    setLoadingPortal(true);
    setError(null);

    try {
      const response = await fetch("/api/stripe/portal", { method: "POST" });
      const data = await response.json();

      if (response.ok) {
        window.location.href = data.url;
      } else {
        setError(data.error || "Erreur lors de l'accès au portail");
      }
    } catch (err: any) {
      setError("Erreur lors de l'accès au portail");
    } finally {
      setLoadingPortal(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getPlanLabel = (plan: string) => {
    const labels: Record<string, string> = {
      free: "Gratuit",
      solo: "Solo",
      family: "Famille",
      pro: "Professionnel",
    };
    return labels[plan] || plan;
  };

  const getPlanColor = (plan: string) => {
    const colors: Record<string, string> = {
      free: "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300",
      solo: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
      family: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
      pro: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300",
    };
    return colors[plan] || "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300";
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      active: "Actif",
      trialing: "Période d'essai",
      manual: "Manuel",
      canceled: "Annulé",
      past_due: "Paiement en retard",
      unpaid: "Non payé",
    };
    return labels[status] || status;
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      active: "text-green-600 dark:text-green-400",
      trialing: "text-blue-600 dark:text-blue-400",
      manual: "text-purple-600 dark:text-purple-400",
      canceled: "text-red-600 dark:text-red-400",
      past_due: "text-orange-600 dark:text-orange-400",
      unpaid: "text-red-600 dark:text-red-400",
    };
    return colors[status] || "text-gray-600 dark:text-gray-400";
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("fr-FR", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  return (
    <>
      {/* Tabs Navigation */}
      <AccountTabs userPlan={currentPlan} />

      {/* Page content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <div className="mb-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
            <p className="text-red-800 dark:text-red-400 text-sm">{error}</p>
          </div>
        )}

        {/* Plan actuel */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            Plan actuel
          </h2>

          <div className="flex items-center justify-between mb-4">
            <div>
              <span className={`inline-flex px-3 py-1 rounded-full text-sm font-semibold ${getPlanColor(currentPlan)}`}>
                {getPlanLabel(currentPlan)}
              </span>
              {subscription && (
                <span className="ml-2 text-sm text-gray-600 dark:text-gray-400">
                  {subscription.billing === "monthly" ? "Mensuel" : "Annuel"}
                </span>
              )}
            </div>
            {subscription && (
              <div className={`text-sm font-medium ${getStatusColor(subscription.status)}`}>
                {getStatusLabel(subscription.status)}
              </div>
            )}
          </div>

          {subscription && subscription.currentPeriodEnd && (
            <div className="mb-4">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {subscription.cancelAtPeriodEnd ? (
                  <>
                    Votre abonnement se termine le{" "}
                    <span className="font-medium text-gray-900 dark:text-white">
                      {formatDate(subscription.currentPeriodEnd)}
                    </span>
                  </>
                ) : (
                  <>
                    Prochain renouvellement le{" "}
                    <span className="font-medium text-gray-900 dark:text-white">
                      {formatDate(subscription.currentPeriodEnd)}
                    </span>
                  </>
                )}
              </p>
            </div>
          )}

          <div className="flex flex-wrap gap-3">
            <Link
              href="/tarifs"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
            >
              Changer de plan
            </Link>

            {subscription && subscription.stripeCustomerId && (
              <button
                onClick={openCustomerPortal}
                disabled={loadingPortal}
                className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors text-sm font-medium disabled:opacity-50"
              >
                {loadingPortal ? "Chargement..." : "Gérer l'abonnement"}
              </button>
            )}
          </div>
        </div>

        {/* Section Parrainage / Invitation */}
        {["family", "pro"].includes(currentPlan) && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              Inviter des membres
            </h2>

            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Partagez votre abonnement {getPlanLabel(currentPlan)} avec vos proches ou collègues
            </p>

            {!inviteCode ? (
              <button
                onClick={generateInviteCode}
                disabled={generatingCode}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-semibold transition-colors"
              >
                {generatingCode ? "Génération..." : "Générer un code d'invitation"}
              </button>
            ) : (
              <div className="space-y-4">
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                  <p className="text-sm text-blue-700 dark:text-blue-400 mb-2">
                    Code d'invitation (valide 30 jours)
                  </p>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 bg-white dark:bg-gray-800 px-4 py-3 rounded border border-blue-200 dark:border-blue-700 text-xl font-mono tracking-widest text-blue-900 dark:text-blue-300">
                      {inviteCode.code}
                    </code>
                    <button
                      onClick={() => copyToClipboard(inviteCode.code)}
                      className="px-4 py-3 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors whitespace-nowrap"
                    >
                      {copied ? "✓ Copié" : "Copier"}
                    </button>
                  </div>
                </div>

                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                    Lien d'invitation
                  </p>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={inviteCode.inviteUrl}
                      readOnly
                      className="flex-1 bg-white dark:bg-gray-800 px-3 py-2 rounded border border-gray-300 dark:border-gray-600 text-sm text-gray-900 dark:text-white"
                    />
                    <button
                      onClick={() => copyToClipboard(inviteCode.inviteUrl)}
                      className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors whitespace-nowrap"
                    >
                      {copied ? "✓" : "Copier"}
                    </button>
                  </div>
                </div>

                <button
                  onClick={() => setInviteCode(null)}
                  className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
                >
                  Générer un nouveau code
                </button>
              </div>
            )}
          </div>
        )}

        {/* Utilisation du Plan (mensuelle) */}
        {usage && (
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-gray-800 dark:to-gray-750 rounded-xl shadow-md border border-blue-100 dark:border-gray-700 p-6 mb-6">
            <div className="flex items-center gap-2 mb-3">
              <svg className="w-6 h-6 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                Utilisation du Plan
              </h2>
              <span className="text-sm text-gray-500 dark:text-gray-400">(mensuelle)</span>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
              Consommation de vos quotas mensuels - se réinitialise chaque mois
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              {/* Suppressions */}
              <div className="bg-white dark:bg-gray-800 rounded-lg p-5 border border-gray-200 dark:border-gray-700 shadow-sm">
                <div className="flex items-center gap-2 mb-2">
                  <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Suppressions
                  </p>
                </div>
                <div className="flex items-baseline gap-2">
                  <p className="text-3xl font-bold text-gray-900 dark:text-white">
                    {usage.monthly.deletes.used.toLocaleString("fr-FR")}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    / {usage.monthly.deletes.unlimited ? "∞" : usage.monthly.deletes.limit.toLocaleString("fr-FR")}
                  </p>
                </div>
                {!usage.monthly.deletes.unlimited && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    {usage.monthly.deletes.remaining} restant{usage.monthly.deletes.remaining > 1 ? "s" : ""}
                  </p>
                )}
              </div>

              {/* Désabonnements */}
              <div className="bg-white dark:bg-gray-800 rounded-lg p-5 border border-gray-200 dark:border-gray-700 shadow-sm">
                <div className="flex items-center gap-2 mb-2">
                  <svg className="w-5 h-5 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Désabonnements
                  </p>
                </div>
                <div className="flex items-baseline gap-2">
                  <p className="text-3xl font-bold text-gray-900 dark:text-white">
                    {usage.monthly.unsubscribes.used.toLocaleString("fr-FR")}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    / {usage.monthly.unsubscribes.unlimited ? "∞" : usage.monthly.unsubscribes.limit.toLocaleString("fr-FR")}
                  </p>
                </div>
                {!usage.monthly.unsubscribes.unlimited && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    {usage.monthly.unsubscribes.remaining} restant{usage.monthly.unsubscribes.remaining > 1 ? "s" : ""}
                  </p>
                )}
              </div>

              {/* Emails analysés */}
              <div className="bg-white dark:bg-gray-800 rounded-lg p-5 border border-gray-200 dark:border-gray-700 shadow-sm">
                <div className="flex items-center gap-2 mb-2">
                  <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Emails analysés
                  </p>
                </div>
                <div className="flex items-baseline gap-2">
                  <p className="text-3xl font-bold text-gray-900 dark:text-white">
                    {usage.scan.used.toLocaleString("fr-FR")}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    / {usage.scan.unlimited ? "∞" : usage.scan.limit.toLocaleString("fr-FR")}
                  </p>
                </div>
                {!usage.scan.unlimited && (
                  <>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5 mt-2">
                      <div
                        className="bg-blue-600 h-1.5 rounded-full"
                        style={{ width: `${Math.min(100, usage.scan.percentage)}%` }}
                      ></div>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      {usage.scan.percentage}% utilisé
                    </p>
                  </>
                )}
              </div>
            </div>

            {/* Date de renouvellement */}
            {usage.renewalDate && (
              <div className="mt-4 pt-4 border-t border-blue-200 dark:border-gray-700">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Prochain renouvellement :{" "}
                  <span className="font-semibold text-gray-900 dark:text-white">
                    {formatDate(usage.renewalDate)}
                  </span>
                </p>
              </div>
            )}
          </div>
        )}

        {/* Statistiques Globales (lifetime) */}
        {stats && (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center gap-2 mb-3">
              <svg className="w-6 h-6 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                Statistiques Globales
              </h2>
              <span className="text-sm text-gray-500 dark:text-gray-400">(depuis inscription)</span>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
              Vos statistiques cumulées depuis votre inscription
            </p>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
              {/* Total supprimés */}
              <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-4 text-center border border-red-100 dark:border-red-900/30">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <svg className="w-4 h-4 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  <p className="text-xs font-medium text-gray-700 dark:text-gray-300">Total supprimés</p>
                </div>
                <p className="text-2xl font-bold text-red-600 dark:text-red-400">
                  {stats.deletedCount.toLocaleString("fr-FR")}
                </p>
              </div>

              {/* Total désabonnés */}
              <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-4 text-center border border-purple-100 dark:border-purple-900/30">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <svg className="w-4 h-4 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  <p className="text-xs font-medium text-gray-700 dark:text-gray-300">Total désabonnés</p>
                </div>
                <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                  {stats.unsubscribedCount.toLocaleString("fr-FR")}
                </p>
              </div>

              {/* Total archivés */}
              <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-4 text-center border border-yellow-100 dark:border-yellow-900/30">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <svg className="w-4 h-4 text-yellow-600 dark:text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                  </svg>
                  <p className="text-xs font-medium text-gray-700 dark:text-gray-300">Total archivés</p>
                </div>
                <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
                  {stats.archivedCount.toLocaleString("fr-FR")}
                </p>
              </div>

              {/* Total emails analysés */}
              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 text-center border border-blue-100 dark:border-blue-900/30">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <svg className="w-4 h-4 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  <p className="text-xs font-medium text-gray-700 dark:text-gray-300">Total emails analysés</p>
                </div>
                <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                  {stats.totalEmailsScanned.toLocaleString("fr-FR")}
                </p>
              </div>

              {/* Total expéditeurs */}
              <div className="bg-indigo-50 dark:bg-indigo-900/20 rounded-lg p-4 text-center border border-indigo-100 dark:border-indigo-900/30">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <svg className="w-4 h-4 text-indigo-600 dark:text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                  <p className="text-xs font-medium text-gray-700 dark:text-gray-300">Expéditeurs détectés</p>
                </div>
                <p className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">
                  {stats.totalSenders.toLocaleString("fr-FR")}
                </p>
              </div>

              {/* Dernière analyse */}
              {stats.lastScanAt && (
                <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4 text-center border border-green-100 dark:border-green-900/30">
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <svg className="w-4 h-4 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <p className="text-xs font-medium text-gray-700 dark:text-gray-300">Dernière analyse</p>
                  </div>
                  <p className="text-sm font-semibold text-green-600 dark:text-green-400">
                    {formatDate(stats.lastScanAt)}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
