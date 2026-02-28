"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface TeamMember {
  id: string;
  userId: string;
  email: string;
  name: string | null;
  role: string;
  joinedAt: string;
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
  code: string;
  expiresAt: string;
  maxUses: number;
  inviteUrl: string;
}

export default function TeamPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [team, setTeam] = useState<Team | null>(null);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [seatsAvailable, setSeatsAvailable] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const [inviteCode, setInviteCode] = useState<InviteCode | null>(null);
  const [generatingCode, setGeneratingCode] = useState(false);
  const [removingMember, setRemovingMember] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    loadTeamData();
  }, []);

  const loadTeamData = async () => {
    try {
      const response = await fetch("/api/teams/members");
      const data = await response.json();

      if (response.ok) {
        setTeam(data.team);
        setMembers(data.members);
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
        body: JSON.stringify({ expiresInDays: 7 }),
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
        // Recharger les données
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

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error && !team) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-8 max-w-md w-full text-center">
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
            href="/dashboard-new"
            className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Retour au dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <Link
            href="/dashboard-new"
            className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 mb-2 inline-block"
          >
            ← Retour au dashboard
          </Link>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Gestion de l'équipe
          </h1>
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

          <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
            <p className="text-sm text-gray-600 dark:text-gray-400">Propriétaire</p>
            <p className="text-gray-900 dark:text-white font-medium">
              {team?.owner.name || team?.owner.email}
            </p>
          </div>
        </div>

        {/* Invite Section */}
        {seatsAvailable > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              Inviter des membres
            </h2>

            {!inviteCode ? (
              <button
                onClick={generateInviteCode}
                disabled={generatingCode}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-semibold transition-colors"
              >
                {generatingCode ? (
                  <span className="flex items-center">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                    Génération...
                  </span>
                ) : (
                  "Générer un code d'invitation"
                )}
              </button>
            ) : (
              <div className="space-y-4">
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                  <p className="text-sm text-blue-700 dark:text-blue-400 mb-2">
                    Code d'invitation (valide 7 jours, {inviteCode.maxUses} utilisations max)
                  </p>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 bg-white dark:bg-gray-800 px-4 py-3 rounded border border-blue-200 dark:border-blue-700 text-2xl font-mono tracking-widest text-blue-900 dark:text-blue-300">
                      {inviteCode.code}
                    </code>
                    <button
                      onClick={() => copyToClipboard(inviteCode.code)}
                      className="px-4 py-3 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                      title="Copier le code"
                    >
                      {copied ? "✓" : "📋"}
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
                      className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors"
                      title="Copier le lien"
                    >
                      {copied ? "✓" : "📋"}
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

        {/* Members List */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            Membres de l'équipe ({members.length + 1})
          </h2>

          <div className="space-y-3">
            {/* Owner */}
            <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg border-2 border-blue-200 dark:border-blue-800">
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

            {/* Members */}
            {members.map((member) => (
              <div
                key={member.id}
                className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg"
              >
                <div className="flex-1">
                  <p className="font-medium text-gray-900 dark:text-white">
                    {member.name || member.email}
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {member.email} • Rejoint le {formatDate(member.joinedAt)}
                  </p>
                </div>
                <button
                  onClick={() => removeMember(member.id)}
                  disabled={removingMember === member.id}
                  className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
                >
                  {removingMember === member.id ? "..." : "Retirer"}
                </button>
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
    </div>
  );
}
