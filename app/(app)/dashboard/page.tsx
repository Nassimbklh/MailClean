"use client";

import { useEffect, useState } from "react";
import { Toast, useToast } from "@/components/Toast";
import SendersTab from "@/components/dashboard/SendersTab";
import ActivityTab from "@/components/dashboard/ActivityTab";

type Tab = "senders" | "activity";

export default function DashboardPage() {
  const [activeTab, setActiveTab] = useState<Tab>("senders");
  const { toasts, removeToast, success, error } = useToast();
  const [credits] = useState({ unsubscribes: 3, deletes: 700 });
  const [userPlan, setUserPlan] = useState<string>("free");

  useEffect(() => {
    // Récupérer le plan utilisateur
    fetch("/api/auth/me")
      .then((res) => res.json())
      .then((data) => {
        if (data.isLoggedIn) {
          setUserPlan(data.user.plan || "free");
        }
      })
      .catch(console.error);
  }, []);

  return (
    <>
      {/* Toast notifications */}
      <Toast toasts={toasts} onRemove={removeToast} />

      {/* Credits (Free plan only) */}
      {userPlan === "free" && (
        <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center space-x-6 text-sm">
              <div className="flex items-center space-x-2">
                <span className="text-gray-600 dark:text-gray-400">Désabonnements restants :</span>
                <span className="font-bold text-gray-900 dark:text-white">{credits.unsubscribes} / 3</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-gray-600 dark:text-gray-400">Suppressions restantes :</span>
                <span className="font-bold text-gray-900 dark:text-white">{credits.deletes} / 700</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tabs Navigation */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex space-x-8">
            <button
              onClick={() => setActiveTab("senders")}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === "senders"
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300"
              }`}
            >
              Expéditeurs
            </button>
            <button
              onClick={() => setActiveTab("activity")}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === "activity"
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300"
              }`}
            >
              Activité
            </button>
          </nav>
        </div>
      </div>

      {/* Tab Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === "senders" && <SendersTab onSuccess={success} onError={error} />}
        {activeTab === "activity" && <ActivityTab onSuccess={success} onError={error} />}
      </main>
    </>
  );
}
