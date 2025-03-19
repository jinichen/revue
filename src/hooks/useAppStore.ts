/**
 * App store for global state management using Zustand
 */

import { create } from 'zustand';
import { Organization, TimePeriod } from '@/types';

// 主题模式类型
export type ThemeMode = 'light' | 'dark' | 'system';

interface AppState {
  // Selected organization
  selectedOrgId: string | null;
  setSelectedOrgId: (id: string | null) => void;
  
  // Selected time period (year, month, day)
  selectedTimePeriod: TimePeriod;
  setSelectedTimePeriod: (period: TimePeriod) => void;
  
  // Date range
  startDate: string;
  endDate: string;
  setDateRange: (startDate: string, endDate: string) => void;
  
  // Organizations list
  organizations: Organization[];
  setOrganizations: (orgs: Organization[]) => void;
  
  // UI state
  sidebarOpen: boolean;
  toggleSidebar: () => void;
  
  // Theme
  darkMode: boolean;
  toggleDarkMode: () => void;
  
  // Theme mode (light, dark, system)
  themeMode: ThemeMode;
  setThemeMode: (mode: ThemeMode) => void;
}

const useAppStore = create<AppState>((set) => ({
  // Initial state
  selectedOrgId: null,
  selectedTimePeriod: 'month',
  startDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
  endDate: new Date().toISOString().split('T')[0],
  organizations: [],
  sidebarOpen: true,
  darkMode: false,
  themeMode: 'light',
  
  // Actions
  setSelectedOrgId: (id) => set({ selectedOrgId: id }),
  setSelectedTimePeriod: (period) => set({ selectedTimePeriod: period }),
  setDateRange: (startDate, endDate) => set({ startDate, endDate }),
  setOrganizations: (orgs) => set({ organizations: orgs }),
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  toggleDarkMode: () => set((state) => ({ darkMode: !state.darkMode })),
  setThemeMode: (mode) => set({ themeMode: mode, darkMode: mode === 'dark' || (mode === 'system' && window?.matchMedia('(prefers-color-scheme: dark)')?.matches) }),
}));

export default useAppStore; 