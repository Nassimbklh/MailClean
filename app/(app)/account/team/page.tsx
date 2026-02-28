"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import AccountTabs from "@/components/AccountTabs";

interface TeamMember {
  id: string;
  userId: string;
  email: string;
  name: string | null;
  role: string;
  joinedAt: string;
  stats: {
    deletedCount: number;
    unsubscribedCount: number;
    archivedCount: number;
    totalEmailsScanned: number;
    lastScanAt: string | null;
  } | null;
}

interface Team {
  id: string;
  plan: string;
  seatsTotal: number;
  seatsUsed: number;
  owner: {
    id: string;
    email: string;
    name: string | null;
  };
}

interface InviteCode {
  id: string;
  code: string;
  maxUses: number;
  usedCount: number;
  expiresAt: string;
  createdAt: string;
}

export default function TeamManagementPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [team, setTeam] = useState<Team | null>(null);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [inviteCodes, setInviteCodes] = useState<InviteCode[]>([]);
  const [seatsAvailable, setSeatsAvailable] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [userPlan, setUserPlan] = useState<string>("free");

  const [generatingCode, setGeneratingCode] = useState(false);
  const [removingMember, setRemovingMember] = useState<string | null>(null);
  const [revokingCode, setRevokingCode] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [expandedStats, setExpandedStats] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadUserPlan();
    loadTeamData();
  }, []);

  const loadUserPlan = async () => {
    try {
      const response = await fetch("/api/auth/me");
      const data = await response.json();
      if (data.isLoggedIn) {
        setUserPlan(data.user.plan || "free");
      }
    } catch (err) {
      console.error("Erreur chargement plan:", err);
    }
  };

  const loadTeamData = async () => {
    try {
      const response = await fetch("/api/teams/members");
      const data = await response.json();

      if (response.ok) {
        setTeam(data.team);
        setMembers(data.members);
        setInviteCodes(data.inviteCodes || []);
        setSeatsAvailable(data.seatsAvailable);
      } else {
        setError(data.error || "Erreur lors du chargement de l'équipe");
      }
    } catch (err: any) {
      setError("Erreur lors du chargement de l'équipe");
    } finally {
      setLoading(false);
    }
  };

  const generateInviteCode = async () => {
    setGeneratingCode(true);
    setError(null);

    try {
      const response = await fetch("/api/teams/invite/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ expiresInDays: 30 }),
      });

      const data = await response.json();

      if (response.ok) {
        // Recharger les données pour afficher le nouveau code
        await loadTeamData();
      } else {
        setError(data.error || "Erreur lors de la génération du code");
      }
    } catch (err: any) {
      setError("Erreur lors de la génération du code");
    } finally {
      setGeneratingCode(false);
    }
  };

  const revokeInviteCode = async (codeId: string) => {
    if (!confirm("Êtes-vous sûr de vouloir révoquer ce code d'invitation ?")) {
      return;
    }

    setRevokingCode(codeId);
    setError(null);

    try {
      const response = await fetch(`/api/teams/invite/${codeId}`, {
        method: "DELETE",
      });

      const data = await response.json();

      if (response.ok) {
        await loadTeamData();
      } else {
        setError(data.error || "Erreur lors de la révocation du code");
      }
    } catch (err: any) {
      setError("Erreur lors de la révocation du code");
    } finally {
      setRevokingCode(null);
    }
  };

  const removeMember = async (memberId: string) => {
    if (!confirm("Êtes-vous sûr de vouloir retirer ce membre ? Il sera rétrogradé au plan gratuit.")) {
      return;
    }

    setRemovingMember(memberId);
    setError(null);

    try {
      const response = await fetch(`/api/teams/members/${memberId}`, {
        method: "DELETE",
      });

      const data = await response.json();

      if (response.ok) {
        await loadTeamData();
      } else {
        setError(data.error || "Erreur lors de la suppression du membre");
      }
    } catch (err: any) {
      setError("Erreur lors de la suppression du membre");
    } finally {
      setRemovingMember(null);
    }
  };

  const exportToCSV = () => {
    const headers = ["Email", "Nom", "Rôle", "Date d'adhésion", "Emails scannés", "Supprimés", "Désabonnés", "Archivés", "Dernière activité"];
    const rows = members.map((member) => [
      member.email,
      member.name || "",
      member.role === "member" ? "Membre" : "Propriétaire",
      new Date(member.joinedAt).toLocaleDateString("fr-FR"),
      member.stats?.totalEmailsScanned || 0,
      member.stats?.deletedCount || 0,
      member.stats?.unsubscribedCount || 0,
      member.stats?.archivedCount || 0,
      member.stats?.lastScanAt ? new Date(member.stats.lastScanAt).toLocaleDateString("fr-FR") : "Jamais",
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(",")),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `team-members-${new Date().toISOString().split("T")[0]}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const toggleStats = (memberId: string) => {
    const newExpanded = new Set(expandedStats);
    if (newExpanded.has(memberId)) {
      newExpanded.delete(memberId);
    } else {
      newExpanded.add(memberId);
    }
    setExpandedStats(newExpanded);
  };

  const getPlanLabel = (plan: string) => {
    const labels: Record<string, string> = {
      family: "Famille",
      pro: "Professionnel",
    };
    return labels[plan] || plan;
  };

  const getPlanColor = (plan: string) => {
    const colors: Record<string, string> = {
      family: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
      pro: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300",
    };
    return colors[plan] || "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300";
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("fr-FR", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const isCodeExpired = (expiresAt: string) => {
    return new Date(expiresAt) < new Date();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error && !team) {
    return (
      <>
        <AccountTabs userPlan={userPlan} />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-8 max-w-md mx-auto text-center">
            <div className="mb-4 text-red-600 dark:text-red-400">
              <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              Équipe introuvable
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              {error}
            </p>
            <Link
              href="/dashboard"
              className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Retour au dashboard
            </Link>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      {/* Tabs Navigation */}
      <AccountTabs userPlan={userPlan} />

      {/* Page content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-6 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Gestion de l'équipe
            </h1>
          </div>
          {members.length > 0 && (
            <button
              onClick={exportToCSV}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors text-sm font-medium"
            >
              Exporter CSV
            </button>
          )}
        </div>

        {error && (
          <div className="mb-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
            <p className="text-red-800 dark:text-red-400 text-sm">{error}</p>
          </div>
        )}

        {/* Team Info Card */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Informations de l'équipe
            </h2>
            <span className={`inline-flex px-3 py-1 rounded-full text-sm font-semibold ${getPlanColor(team?.plan || "")}`}>
              {getPlanLabel(team?.plan || "")}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Places totales</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{team?.seatsTotal}</p>
            </div>
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Places utilisées</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{team?.seatsUsed}</p>
            </div>
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Places disponibles</p>
              <p className="text-2xl font-bold text-green-600 dark:text-green-400">{seatsAvailable}</p>
            </div>
          </div>
        </div>

        {/* Invite Codes Section */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Codes d'invitation
            </h2>
            <button
              onClick={generateInviteCode}
              disabled={generatingCode || seatsAvailable === 0}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-colors text-sm"
            >
              {generatingCode ? "Génération..." : "Nouveau code"}
            </button>
          </div>

          {inviteCodes.length > 0 ? (
            <div className="space-y-3">
              {inviteCodes.map((code) => (
                <div
                  key={code.id}
                  className={`p-4 rounded-lg border ${
                    isCodeExpired(code.expiresAt)
                      ? "bg-gray-50 dark:bg-gray-700/50 border-gray-300 dark:border-gray-600"
                      : "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <code className="text-lg font-mono font-bold text-gray-900 dark:text-white">
                          {code.code}
                        </code>
                        <button
                          onClick={() => copyToClipboard(code.code)}
                          className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 text-sm"
                        >
                          {copied ? "✓ Copié" : "Copier"}
                        </button>
                        <button
                          onClick={() => copyToClipboard(`${process.env.NEXT_PUBLIC_APP_URL}/join?code=${code.code}`)}
                          className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 text-sm"
                        >
                          Copier le lien
                        </button>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                        <span>Utilisations: {code.usedCount}/{code.maxUses}</span>
                        <span>•</span>
                        <span>
                          {isCodeExpired(code.expiresAt) ? (
                            <span className="text-red-600 dark:text-red-400">Expiré le {formatDate(code.expiresAt)}</span>
                          ) : (
                            <span>Expire le {formatDate(code.expiresAt)}</span>
                          )}
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={() => revokeInviteCode(code.id)}
                      disabled={revokingCode === code.id}
                      className="px-3 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50 transition-colors"
                    >
                      {revokingCode === code.id ? "..." : "Révoquer"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-gray-500 dark:text-gray-400 py-4">
              Aucun code d'invitation actif
            </p>
          )}
        </div>

        {/* Members List */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            Membres de l'équipe ({members.length + 1})
          </h2>

          <div className="space-y-3">
            {/* Owner */}
            <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg border-2 border-blue-200 dark:border-blue-800">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-gray-900 dark:text-white">
                      {team?.owner.name || team?.owner.email}
                    </p>
                    <span className="px-2 py-1 bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300 text-xs rounded-full font-semibold">
                      Propriétaire
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">{team?.owner.email}</p>
                </div>
              </div>
            </div>

            {/* Members */}
            {members.map((member) => (
              <div
                key={member.id}
                className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex-1">
                    <p className="font-medium text-gray-900 dark:text-white">
                      {member.name || member.email}
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {member.email} • Rejoint le {formatDate(member.joinedAt)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => toggleStats(member.id)}
                      className="px-3 py-1 text-sm bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors"
                    >
                      {expandedStats.has(member.id) ? "Masquer stats" : "Voir stats"}
                    </button>
                    <button
                      onClick={() => removeMember(member.id)}
                      disabled={removingMember === member.id}
                      className="px-3 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50 transition-colors"
                    >
                      {removingMember === member.id ? "..." : "Retirer"}
                    </button>
                  </div>
                </div>

                {/* Stats expandable */}
                {expandedStats.has(member.id) && member.stats && (
                  <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-600">
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                      <div className="text-center">
                        <p className="text-lg font-bold text-gray-900 dark:text-white">
                          {member.stats.totalEmailsScanned}
                        </p>
                        <p className="text-xs text-gray-600 dark:text-gray-400">Scannés</p>
                      </div>
                      <div className="text-center">
                        <p className="text-lg font-bold text-red-600 dark:text-red-400">
                          {member.stats.deletedCount}
                        </p>
                        <p className="text-xs text-gray-600 dark:text-gray-400">Supprimés</p>
                      </div>
                      <div className="text-center">
                        <p className="text-lg font-bold text-blue-600 dark:text-blue-400">
                          {member.stats.unsubscribedCount}
                        </p>
                        <p className="text-xs text-gray-600 dark:text-gray-400">Désabonnés</p>
                      </div>
                      <div className="text-center">
                        <p className="text-lg font-bold text-yellow-600 dark:text-yellow-400">
                          {member.stats.archivedCount}
                        </p>
                        <p className="text-xs text-gray-600 dark:text-gray-400">Archivés</p>
                      </div>
                      <div className="text-center col-span-2 md:col-span-1">
                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                          {member.stats.lastScanAt ? formatDate(member.stats.lastScanAt) : "Jamais"}
                        </p>
                        <p className="text-xs text-gray-600 dark:text-gray-400">Dernière activité</p>
                      </div>
                    </div>
                  </div>
                )}

                {expandedStats.has(member.id) && !member.stats && (
                  <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-600">
                    <p className="text-center text-gray-500 dark:text-gray-400 text-sm">
                      Aucune statistique disponible
                    </p>
                  </div>
                )}
              </div>
            ))}

            {members.length === 0 && (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                Aucun membre invité pour le moment
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
