/**
 * @file src/components/providers/FooterProvider.tsx
 * @description 하단바(Footer)의 상태(로딩, 갱신시각)를 전역적으로 관리하는 Context
 */

"use client";

import React, { createContext, useContext, useState, ReactNode } from "react";

interface FooterState {
  loading: boolean;
  lastUpdated: string | number | Date | null;
  statusText: string | null;
}

interface FooterContextType extends FooterState {
  setFooterStatus: (status: Partial<FooterState>) => void;
}

const FooterContext = createContext<FooterContextType | undefined>(undefined);

export function FooterProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<FooterState>({
    loading: false,
    lastUpdated: null,
    statusText: null,
  });

  const setFooterStatus = (patch: Partial<FooterState>) => {
    setState((prev) => ({ ...prev, ...patch }));
  };

  return (
    <FooterContext.Provider value={{ ...state, setFooterStatus }}>
      {children}
    </FooterContext.Provider>
  );
}

export function useFooter() {
  const context = useContext(FooterContext);
  if (!context) throw new Error("useFooter must be used within a FooterProvider");
  return context;
}

/**
 * 페이지에서 간편하게 상태를 동기화하기 위한 훅
 */
export function useSyncFooterStatus(status: Partial<FooterState>) {
  const { setFooterStatus } = useFooter();
  
  React.useEffect(() => {
    setFooterStatus(status);
  }, [status.loading, status.lastUpdated, status.statusText]);
}
