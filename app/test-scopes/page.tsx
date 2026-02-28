"use client";

import { useEffect, useState } from "react";

interface ScopeInfo {
  authenticated: boolean;
  hasAccessToken?: boolean;
  valid?: boolean;
  email?: string;
  scopes?: {
    all: string[];
    hasGmailMetadata: boolean;
    hasGmailModify: boolean;
    hasEmail: boolean;
    hasProfile: boolean;
  };
  diagnosis?: {
    canReadEmails: boolean;
    canDeleteEmails: boolean;
    needsReauth: boolean;
  };
  error?: string;
}

export default function TestScopesPage() {
  const [scopeInfo, setScopeInfo] = useState<ScopeInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    checkScopes();
  }, []);

  const checkScopes = async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/auth/scopes");
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Erreur lors de la vérification");
        setScopeInfo(data);
      } else {
        setScopeInfo(data);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleReauth = async () => {
    try {
      // Revoke first
      await fetch("/api/auth/revoke", { method: "POST" });

      // Redirect to Google OAuth
      setTimeout(() => {
        window.location.href = "/api/auth/google";
      }, 1000);
    } catch (err) {
      console.error("Erreur reauth:", err);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Vérification des scopes...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-6">
            🔍 Diagnostic des Scopes Gmail
          </h1>

          {/* Status général */}
          <div className="mb-6">
            <h2 className="text-xl font-semibold mb-3">Status d'authentification</h2>
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <span className={`w-3 h-3 rounded-full ${scopeInfo?.authenticated ? 'bg-green-500' : 'bg-red-500'}`}></span>
                <span className="font-medium">
                  {scopeInfo?.authenticated ? "✅ Authentifié" : "❌ Non authentifié"}
                </span>
              </div>

              {scopeInfo?.email && (
                <div className="flex items-center space-x-2 pl-5">
                  <span className="text-gray-600">Email:</span>
                  <span className="font-mono text-sm">{scopeInfo.email}</span>
                </div>
              )}

              {scopeInfo?.hasAccessToken !== undefined && (
                <div className="flex items-center space-x-2">
                  <span className={`w-3 h-3 rounded-full ${scopeInfo.hasAccessToken ? 'bg-green-500' : 'bg-red-500'}`}></span>
                  <span className="font-medium">
                    {scopeInfo.hasAccessToken ? "✅ Token présent" : "❌ Token manquant"}
                  </span>
                </div>
              )}

              {scopeInfo?.valid !== undefined && (
                <div className="flex items-center space-x-2">
                  <span className={`w-3 h-3 rounded-full ${scopeInfo.valid ? 'bg-green-500' : 'bg-red-500'}`}></span>
                  <span className="font-medium">
                    {scopeInfo.valid ? "✅ Token valide" : "❌ Token invalide"}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Scopes accordés */}
          {scopeInfo?.scopes && (
            <div className="mb-6">
              <h2 className="text-xl font-semibold mb-3">Scopes Gmail accordés</h2>
              <div className="space-y-3">
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium">gmail.metadata (Lire headers)</span>
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                      scopeInfo.scopes.hasGmailMetadata
                        ? 'bg-green-100 text-green-800'
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {scopeInfo.scopes.hasGmailMetadata ? "✅ PRÉSENT" : "❌ MANQUANT"}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600">
                    Nécessaire pour scanner les emails et détecter les liens de désabonnement
                  </p>
                </div>

                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium">gmail.modify (Modifier emails)</span>
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                      scopeInfo.scopes.hasGmailModify
                        ? 'bg-green-100 text-green-800'
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {scopeInfo.scopes.hasGmailModify ? "✅ PRÉSENT" : "❌ MANQUANT"}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600">
                    Nécessaire pour supprimer et archiver des emails
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Diagnostic */}
          {scopeInfo?.diagnosis && (
            <div className="mb-6">
              <h2 className="text-xl font-semibold mb-3">Diagnostic</h2>
              <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4 space-y-2">
                <div className="flex items-center space-x-2">
                  <span className={scopeInfo.diagnosis.canReadEmails ? "text-green-600" : "text-red-600"}>
                    {scopeInfo.diagnosis.canReadEmails ? "✅" : "❌"}
                  </span>
                  <span>
                    {scopeInfo.diagnosis.canReadEmails
                      ? "Vous pouvez scanner vos emails"
                      : "Vous ne pouvez PAS scanner vos emails"}
                  </span>
                </div>

                <div className="flex items-center space-x-2">
                  <span className={scopeInfo.diagnosis.canDeleteEmails ? "text-green-600" : "text-red-600"}>
                    {scopeInfo.diagnosis.canDeleteEmails ? "✅" : "❌"}
                  </span>
                  <span>
                    {scopeInfo.diagnosis.canDeleteEmails
                      ? "Vous pouvez supprimer des emails"
                      : "Vous ne pouvez PAS supprimer des emails"}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="space-y-4">
            {scopeInfo?.diagnosis?.needsReauth && (
              <div className="bg-orange-50 border-2 border-orange-500 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-orange-900 mb-2">
                  ⚠️ Réautorisation nécessaire
                </h3>
                <p className="text-orange-800 mb-4">
                  Le scope <code className="bg-orange-100 px-2 py-1 rounded">gmail.modify</code> est manquant.
                  Vous devez réautoriser l'application pour pouvoir supprimer des emails.
                </p>
                <button
                  onClick={handleReauth}
                  className="w-full px-6 py-3 bg-orange-600 hover:bg-orange-700 text-white rounded-lg font-medium transition-colors"
                >
                  🔑 Réautoriser Gmail maintenant
                </button>
              </div>
            )}

            {scopeInfo?.authenticated && !scopeInfo?.diagnosis?.needsReauth && (
              <div className="bg-green-50 border-2 border-green-500 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-green-900 mb-2">
                  ✅ Tous les scopes sont présents !
                </h3>
                <p className="text-green-800 mb-4">
                  Votre application a toutes les permissions nécessaires.
                </p>
                <a
                  href="/dashboard-new"
                  className="inline-block px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors"
                >
                  Retour au Dashboard
                </a>
              </div>
            )}

            {!scopeInfo?.authenticated && (
              <div className="bg-red-50 border-2 border-red-500 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-red-900 mb-2">
                  ❌ Non authentifié
                </h3>
                <p className="text-red-800 mb-4">
                  Vous devez vous connecter avec Google pour continuer.
                </p>
                <a
                  href="/api/auth/google"
                  className="inline-block px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors"
                >
                  Se connecter avec Google
                </a>
              </div>
            )}

            <button
              onClick={checkScopes}
              className="w-full px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-lg font-medium transition-colors"
            >
              🔄 Revérifier les scopes
            </button>
          </div>

          {/* Tous les scopes (détails techniques) */}
          {scopeInfo?.scopes?.all && scopeInfo.scopes.all.length > 0 && (
            <div className="mt-6 pt-6 border-t border-gray-200">
              <details className="cursor-pointer">
                <summary className="font-semibold text-gray-700 hover:text-gray-900">
                  🔧 Détails techniques (tous les scopes)
                </summary>
                <div className="mt-3 bg-gray-50 rounded-lg p-4">
                  <code className="text-xs text-gray-800 block whitespace-pre-wrap font-mono">
                    {JSON.stringify(scopeInfo.scopes.all, null, 2)}
                  </code>
                </div>
              </details>
            </div>
          )}

          {/* Erreurs */}
          {error && (
            <div className="mt-6 bg-red-50 border border-red-200 rounded-lg p-4">
              <h3 className="font-semibold text-red-900 mb-2">Erreur</h3>
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
