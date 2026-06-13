import React, { createContext, useContext, useEffect, useState } from 'react';

import { API_URL } from '../config';

interface FeatureContextType {
  features: Record<string, any>;
  isEmergencyLocked: boolean;
  lockdownWhitelist: string[];
  refreshFeatures: () => Promise<void>;
  loading: boolean;
}

const FeatureContext = createContext<FeatureContextType>({
  features: {},
  isEmergencyLocked: false,
  lockdownWhitelist: [],
  refreshFeatures: async () => {},
  loading: true,
});

export const useFeatures = () => useContext(FeatureContext);

export const FeatureProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [features, setFeatures] = useState<Record<string, any>>({});
  const [isEmergencyLocked, setIsEmergencyLocked] = useState(false);
  const [lockdownWhitelist, setLockdownWhitelist] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const refreshFeatures = async () => {
    try {
      const res = await fetch(`${API_URL}/api/features`);
      if (res.ok) {
        const data = await res.json();
        const { system_emergency_lockout, lockdown_whitelist, ...rest } = data;
        setFeatures(rest);
        setIsEmergencyLocked(system_emergency_lockout === true || system_emergency_lockout === 'true');
        setLockdownWhitelist(Array.isArray(lockdown_whitelist) ? lockdown_whitelist : []);
      }
    } catch (e) {
      console.warn('[FeatureContext] Failed to fetch features', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshFeatures();
    // Poll every 30 seconds
    const interval = setInterval(refreshFeatures, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <FeatureContext.Provider value={{ features, isEmergencyLocked, lockdownWhitelist, refreshFeatures, loading }}>
      {children}
    </FeatureContext.Provider>
  );
};
