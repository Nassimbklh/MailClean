"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface User {
  id: string;
  email: string;
  name: string | null;
  plan: string;
  createdAt: string;
}

type EmailType = 'welcome' | 'marketing' | 'premium';

export default function TestEmailsPage() {
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());
  const [emailType, setEmailType] = useState<EmailType>('welcome');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/admin/users");

      if (response.status === 401 || response.status === 403) {
        router.push("/");
        return;
      }

      if (!response.ok) {
        throw new Error("Erreur lors du chargement des utilisateurs");
      }

      const data = await response.json();
      setUsers(data.users || []);
    } catch (error) {
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : "Erreur lors du chargement"
      });
    } finally {
      setLoading(false);
    }
  };

  const toggleUser = (userId: string) => {
    const newSelected = new Set(selectedUsers);
    if (newSelected.has(userId)) {
      newSelected.delete(userId);
    } else {
      newSelected.add(userId);
    }
    setSelectedUsers(newSelected);
  };

  const selectAll = () => {
    const filtered = filteredUsers();
    setSelectedUsers(new Set(filtered.map(u => u.id)));
  };

  const deselectAll = () => {
    setSelectedUsers(new Set());
  };

  const handleSendEmails = async () => {
    if (selectedUsers.size === 0) {
      setMessage({ type: 'error', text: "Sélectionnez au moins un utilisateur" });
      return;
    }

    try {
      setSending(true);
      setMessage(null);

      const response = await fetch("/api/admin/send-test-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userIds: Array.from(selectedUsers),
          emailType,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setMessage({
          type: 'success',
          text: data.message || "Emails envoyés avec succès"
        });
        setSelectedUsers(new Set());
      } else {
        throw new Error(data.error || "Erreur lors de l'envoi");
      }
    } catch (error) {
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : "Erreur lors de l'envoi"
      });
    } finally {
      setSending(false);
    }
  };

  const filteredUsers = () => {
    if (!searchTerm) return users;
    const term = searchTerm.toLowerCase();
    return users.filter(u =>
      u.email.toLowerCase().includes(term) ||
      u.name?.toLowerCase().includes(term)
    );
  };

  const emailTypeLabels = {
    welcome: "Email de bienvenue",
    marketing: "Email de relance marketing",
    premium: "Email promotion Premium + code -10%"
  };

  const emailTypeDescriptions = {
    welcome: "Email envoyé lors de la première inscription",
    marketing: "Email de relance après 2 jours d'inactivité",
    premium: "Email promo avec code -10% unique (mensuel uniquement, 7 jours)"
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const filtered = filteredUsers();

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              📧 Test d'emails
            </h1>
            <Link
              href="/admin"
              className="px-4 py-2 text-sm bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-medium transition-colors"
            >
              Retour Admin
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Message */}
        {message && (
          <div className={`mb-6 p-4 rounded-lg border ${
            message.type === 'success'
              ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-800 dark:text-green-300'
              : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-800 dark:text-red-300'
          }`}>
            {message.text}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Configuration Email */}
          <div className="lg:col-span-1">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700 p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Type d'email
              </h2>

              <div className="space-y-3">
                {(['welcome', 'marketing', 'premium'] as EmailType[]).map((type) => (
                  <label
                    key={type}
                    className={`flex items-start p-4 border-2 rounded-lg cursor-pointer transition-colors ${
                      emailType === type
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                        : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name="emailType"
                      value={type}
                      checked={emailType === type}
                      onChange={(e) => setEmailType(e.target.value as EmailType)}
                      className="mt-1 mr-3"
                    />
                    <div className="flex-1">
                      <div className="font-medium text-gray-900 dark:text-white">
                        {emailTypeLabels[type]}
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        {emailTypeDescriptions[type]}
                      </div>
                    </div>
                  </label>
                ))}
              </div>

              <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
                <div className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                  <strong>{selectedUsers.size}</strong> utilisateur(s) sélectionné(s)
                </div>
                <button
                  onClick={handleSendEmails}
                  disabled={sending || selectedUsers.size === 0}
                  className={`w-full px-4 py-3 rounded-lg font-medium transition-colors ${
                    sending || selectedUsers.size === 0
                      ? 'bg-gray-300 dark:bg-gray-700 text-gray-500 cursor-not-allowed'
                      : 'bg-blue-600 hover:bg-blue-700 text-white'
                  }`}
                >
                  {sending ? (
                    <span className="flex items-center justify-center">
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Envoi en cours...
                    </span>
                  ) : (
                    `Envoyer ${selectedUsers.size} email(s)`
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Liste des utilisateurs */}
          <div className="lg:col-span-2">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700">
              <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Sélectionner les destinataires
                  </h2>
                  <div className="flex gap-2">
                    <button
                      onClick={selectAll}
                      className="px-3 py-1 text-sm bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded hover:bg-blue-200 dark:hover:bg-blue-900/50"
                    >
                      Tout sélectionner
                    </button>
                    <button
                      onClick={deselectAll}
                      className="px-3 py-1 text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-200 dark:hover:bg-gray-600"
                    >
                      Tout désélectionner
                    </button>
                  </div>
                </div>

                <input
                  type="text"
                  placeholder="Rechercher par email ou nom..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>

              <div className="max-h-96 overflow-y-auto">
                {filtered.length === 0 ? (
                  <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                    Aucun utilisateur trouvé
                  </div>
                ) : (
                  <div className="divide-y divide-gray-200 dark:divide-gray-700">
                    {filtered.map((user) => (
                      <label
                        key={user.id}
                        className="flex items-center p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={selectedUsers.has(user.id)}
                          onChange={() => toggleUser(user.id)}
                          className="mr-4 h-4 w-4 text-blue-600 rounded"
                        />
                        <div className="flex-1">
                          <div className="font-medium text-gray-900 dark:text-white">
                            {user.name || 'Sans nom'}
                          </div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">
                            {user.email}
                          </div>
                        </div>
                        <div className="text-right">
                          <span className={`inline-block px-2 py-1 text-xs font-semibold rounded ${
                            user.plan === 'free'
                              ? 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300'
                              : 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white'
                          }`}>
                            {user.plan === 'free' ? 'Gratuit' : user.plan.toUpperCase()}
                          </span>
                        </div>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
