"use client";

import * as React from "react";

type Period = "today" | "7d" | "30d" | "90d" | "1y" | "all";

interface DashboardContextType {
  period: Period;
  setPeriod: (period: Period) => void;
}

const DashboardContext = React.createContext<DashboardContextType | undefined>(
  undefined
);

export function DashboardProvider({ children }: { children: React.ReactNode }) {
  const [period, setPeriod] = React.useState<Period>("30d");

  return (
    <DashboardContext.Provider value={{ period, setPeriod }}>
      {children}
    </DashboardContext.Provider>
  );
}

export function useDashboard() {
  const context = React.useContext(DashboardContext);
  if (context === undefined) {
    throw new Error("useDashboard must be used within a DashboardProvider");
  }
  return context;
}
