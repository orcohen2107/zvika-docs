import { Document } from '@/types';

export interface ComparisonSummary {
  matched_count: number;
  total_user_entries: number;
  created_at: string;
}

interface DashboardCache {
  documents: Document[];
  total: number;
  comparisons: ComparisonSummary[];
}

// Lives in module memory: survives client-side navigation (dashboard -> compare -> back),
// but is wiped on a full page refresh, which is when we want a fresh fetch.
let cache: DashboardCache | null = null;

export const getDashboardCache = (): DashboardCache | null => cache;

export const setDashboardCache = (value: DashboardCache): void => {
  cache = value;
};

export const clearDashboardCache = (): void => {
  cache = null;
};
