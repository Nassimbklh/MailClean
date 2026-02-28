"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

interface TeamInfo {
  plan: string;
  seatsTotal: number;
  seatsUsed: number;
  seatsAvailable: number;
  ownerName: string;
}

export default function JoinPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const codeFromUrl = searchParams.get("code");

  const [code, setCode] = useState(codeFromUrl || "");
  const [loading, setLoading] = useState(false);
  const [validating, setValidating] = useState(false);
  const [teamInfo, setTeamInfo] = useState<TeamInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [user, setUser] = useState<any>(null);

  // Vérifier si l'utilisateur est connecté
  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => res.json())
      .then((data) => {
        if (data.isLoggedIn) {
          setUser(data.user);
        }
      })
      .catch(console.error);
  }, []);

  // Valider le code automatiquement si fourni dans l'URL
  useEffect(() => {
    if (codeFromUrl && codeFromUrl.length === 10) {
      validateCode(codeFromUrl);
    }
  }, [codeFromUrl]);

  const validateCode = async (codeToValidate: string) => {
    if (codeToValidate.length !== 10) {
      setError("Le code doit contenir 10 caractères");
      setTeamInfo(null);
      return;
    }

    setValidating(true);
    setError(null);
    setTeamInfo(null);

    try {
      const response = await fetch("/api/teams/invite/validate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ code: codeToValidate.toUpperCase() }),
      });

      const data = await response.json();

      if (data.valid) {
        setTeamInfo(data.team);
        setError(null);
      } else {
        setError(data.error || "Code d'invitation invalide");
        setTeamInfo(null);
      }
    } catch (err: any) {
      setError("Erreur lors de la validation du code");
      setTeamInfo(null);
    } finally {
      setValidating(false);
    }
  };

  const handleCodeChange = (value: string) => {
    const upperCode = value.toUpperCase().replace(/[^A-Z0-9]/g, "");
    setCode(upperCode);

    if (upperCode.length === 10) {
      validateCode(upperCode);
    } else {
      setTeamInfo(null);
      setError(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) {
      // Rediriger vers login avec code dans l'URL
      router.push(`/api/auth/google?redirect=/join?code=${code}`);
      return;
    }

    if (!teamInfo) {
      setError("Veuillez entrer un code valide");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/teams/invite/redeem", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ code: code.toUpperCase() }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setSuccess(true);
        // Rediriger vers le dashboard après 2 secondes
        setTimeout(() => {
          router.push("/dashboard-new");
        }, 2000);
      } else {
        setError(data.error || "Erreur lors de l'utilisation du code");
      }
    } catch (err: any) {
      setError("Erreur lors de l'utilisation du code");
    } finally {
      setLoading(false);
    }
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

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-8 max-w-md w-full text-center">
          <div className="mb-6">
            <div className="mx-auto w-16 h-16 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center">
              <svg className="w-8 h-8 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Bienvenue dans l'équipe !
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Vous avez rejoint l'équipe {teamInfo && getPlanLabel(teamInfo.plan)} avec succès.
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Redirection vers le dashboard...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-8 max-w-md w-full">
        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Rejoindre une équipe
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Entrez votre code d'invitation pour rejoindre une équipe
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="code" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Code d'invitation
            </label>
            <input
              type="text"
              id="code"
              value={code}
              onChange={(e) => handleCodeChange(e.target.value)}
              placeholder="XXXXXXXXXX"
              maxLength={10}
              className="w-full px-4 py-3 text-center text-2xl font-mono tracking-widest border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              disabled={loading || validating}
            />
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              Le code contient 10 caractères (lettres et chiffres)
            </p>
          </div>

          {validating && (
            <div className="flex items-center justify-center py-4">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          )}

          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
              <p className="text-red-800 dark:text-red-400 text-sm">{error}</p>
            </div>
          )}

          {teamInfo && (
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <h3 className="font-semibold text-blue-900 dark:text-blue-300 mb-3">
                Informations de l'équipe
              </h3>
              <dl className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <dt className="text-blue-700 dark:text-blue-400">Plan:</dt>
                  <dd>
                    <span className={`inline-flex px-2 py-1 rounded-full text-xs font-semibold ${getPlanColor(teamInfo.plan)}`}>
                      {getPlanLabel(teamInfo.plan)}
                    </span>
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-blue-700 dark:text-blue-400">Propriétaire:</dt>
                  <dd className="text-blue-900 dark:text-blue-300 font-medium">{teamInfo.ownerName}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-blue-700 dark:text-blue-400">Places disponibles:</dt>
                  <dd className="text-blue-900 dark:text-blue-300 font-medium">
                    {teamInfo.seatsAvailable} / {teamInfo.seatsTotal}
                  </dd>
                </div>
              </dl>
            </div>
          )}

          {!user && (
            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
              <p className="text-yellow-800 dark:text-yellow-400 text-sm">
                Vous devez vous connecter pour utiliser ce code d'invitation.
              </p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading || validating || !teamInfo || code.length !== 10}
            className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-semibold transition-colors"
          >
            {loading ? (
              <span className="flex items-center justify-center">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                Traitement...
              </span>
            ) : !user ? (
              "Se connecter et rejoindre"
            ) : (
              "Rejoindre l'équipe"
            )}
          </button>
        </form>

        <div className="mt-6 text-center">
          <Link
            href="/"
            className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
          >
            ← Retour à l'accueil
          </Link>
        </div>
      </div>
    </div>
  );
}
