'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

type DashboardTab = 'senders' | 'activity' | 'subscription';

interface ScanStatus {
  status: 'IDLE' | 'SCANNING' | 'INCOMPLETE' | 'COMPLETE';
  scannedCount: number;
  senderCount: number;
  updatedAt: string | null;
  nextPageToken: string | null;
}

interface DashboardContextValue {
  // Navigation
  currentTab: DashboardTab;
  setCurrentTab: (tab: DashboardTab) => void;

  // Scan status
  scanStatus: ScanStatus | null;
  setScanStatus: (status: ScanStatus) => void;

  // Refresh
  lastRefresh: number;
  triggerRefresh: () => void;
  autoRefreshEnabled: boolean;
}

const DashboardContext = createContext<DashboardContextValue | null>(null);

export function DashboardProvider({ children }: { children: ReactNode }) {
  const [currentTab, setCurrentTab] = useState<DashboardTab>('senders');
  const [scanStatus, setScanStatus] = useState<ScanStatus | null>(null);
  const [lastRefresh, setLastRefresh] = useState(Date.now());
  const [autoRefreshEnabled] = useState(true);

  // Auto-refresh toutes les 10 minutes
  useEffect(() => {
    if (!autoRefreshEnabled) return;

    const interval = setInterval(() => {
      console.log('🔄 [DashboardContext] Auto-refresh (10 min)');
      setLastRefresh(Date.now());
    }, 10 * 60 * 1000);

    return () => clearInterval(interval);
  }, [autoRefreshEnabled]);

  const triggerRefresh = () => {
    console.log('🔄 [DashboardContext] Manual refresh triggered');
    setLastRefresh(Date.now());
  };

  return (
    <DashboardContext.Provider
      value={{
        currentTab,
        setCurrentTab,
        scanStatus,
        setScanStatus,
        lastRefresh,
        triggerRefresh,
        autoRefreshEnabled,
      }}
    >
      {children}
    </DashboardContext.Provider>
  );
}

export const useDashboard = () => {
  const ctx = useContext(DashboardContext);
  if (!ctx) throw new Error('useDashboard must be used within DashboardProvider');
  return ctx;
};
