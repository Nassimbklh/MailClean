"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";

interface DashboardStats {
  totalEmailsScanned: number;
  totalSenders: number;
  scanStatus: "COMPLETE" | "INCOMPLETE" | "SCANNING";
  lastScanAt: string | null;
}

export function StatsHeader() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  async function fetchStats() {
    try {
      const res = await fetch("/api/dashboard/stats");
      if (!res.ok) throw new Error("Failed to fetch stats");
      const data = await res.json();
      setStats(data);
    } catch (error) {
      console.error("Error fetching dashboard stats:", error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 mb-6">
        <div className="flex items-center justify-center gap-2 text-gray-500">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span className="text-sm">Chargement des statistiques...</span>
        </div>
      </div>
    );
  }

  if (!stats) {
    return null;
  }

  const statusColors = {
    COMPLETE: "text-green-600 dark:text-green-400",
    INCOMPLETE: "text-orange-600 dark:text-orange-400",
    SCANNING: "text-blue-600 dark:text-blue-400",
  };

  const statusLabels = {
    COMPLETE: "COMPLET",
    INCOMPLETE: "INCOMPLET",
    SCANNING: "EN COURS",
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "Jamais";
    const date = new Date(dateString);
    const day = date.getDate().toString().padStart(2, "0");
    const month = (date.getMonth() + 1).toString().padStart(2, "0");
    const hours = date.getHours().toString().padStart(2, "0");
    const minutes = date.getMinutes().toString().padStart(2, "0");
    return `${day}/${month} ${hours}:${minutes}`;
  };

  return (
    <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-gray-800 dark:to-gray-700 border border-blue-200 dark:border-gray-600 rounded-lg p-4 mb-6">
      <div className="flex flex-wrap items-center gap-2 text-sm md:text-base">
        <div className="flex items-center gap-1.5">
          <span className="font-semibold text-gray-900 dark:text-white">
            {stats.totalEmailsScanned.toLocaleString("fr-FR")}
          </span>
          <span className="text-gray-600 dark:text-gray-300">
            emails analysés
          </span>
        </div>

        <span className="text-gray-400 dark:text-gray-500">•</span>

        <div className="flex items-center gap-1.5">
          <span className="font-semibold text-gray-900 dark:text-white">
            {stats.totalSenders.toLocaleString("fr-FR")}
          </span>
          <span className="text-gray-600 dark:text-gray-300">expéditeurs</span>
        </div>

        <span className="text-gray-400 dark:text-gray-500">•</span>

        <div className="flex items-center gap-1.5">
          <span className="text-gray-600 dark:text-gray-300">Statut:</span>
          <span
            className={`font-semibold ${statusColors[stats.scanStatus]}`}
          >
            {statusLabels[stats.scanStatus]}
          </span>
        </div>

        {stats.lastScanAt && (
          <>
            <span className="text-gray-400 dark:text-gray-500">•</span>
            <div className="flex items-center gap-1.5">
              <span className="text-gray-600 dark:text-gray-300">
                Dernière maj:
              </span>
              <span className="font-medium text-gray-900 dark:text-white">
                {formatDate(stats.lastScanAt)}
              </span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
