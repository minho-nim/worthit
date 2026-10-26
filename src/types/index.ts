export type ItemCategory = 'item' | 'subscription' | 'membership' | 'other';

export type UsageMethod = 'days' | 'usage';

export type UsageUnit = '회' | '시간' | '개' | '일';

export type ItemStatus = 'active' | 'completed' | 'archived';

export type BillingCycle = 'monthly' | 'yearly';

export interface WorthItem {
  id: string;
  name: string;
  category: ItemCategory;
  purchasePrice: number; // Integer, KRW >= 0
  purchaseDate: string; // YYYY-MM-DD
  usageMethod: UsageMethod;
  usageUnit: UsageUnit;
  targetUnitCost: number; // > 0
  billingCycle?: BillingCycle;
  expirationDate?: string; // YYYY-MM-DD
  status: ItemStatus;
  createdAt: string;
  updatedAt: string;
}

export interface UsageRecord {
  id: string;
  itemId: string;
  usedAt: string; // YYYY-MM-DD
  quantity: number; // >= 0
  note?: string;
  createdAt: string;
}

export interface BillingPeriod {
  id: string;
  itemId: string;
  periodStart: string; // YYYY-MM-DD
  periodEnd: string; // YYYY-MM-DD
  amount: number; // KRW
  status: 'paid' | 'pending';
}

export interface AppSettings {
  hasCompletedOnboarding: boolean;
  version: string;
  lastBackupDate?: string;
}

export interface ItemStats {
  item: WorthItem;
  totalUsage: number;
  currentUnitCost: number | null; // null if 0 usage for usage-based
  requiredUsage: number;
  remainingUsage: number;
  progress: number; // 0 ~ 100
  isGoalAchieved: boolean;
  daysOwned: number;
  lastUsedAt?: string;
  unitCostFormatted: string;
  targetCostFormatted: string;
  statusMessage: string;
  tier: 'tier1' | 'tier2' | 'tier3' | 'tier4' | 'achieved';
  totalSpent: number;
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  iconName: string;
  isUnlocked: boolean;
  unlockedAt?: string;
  progressText: string;
  progressPercent: number;
}

export interface ToastMessage {
  id: string;
  title: string;
  description?: string;
  type?: 'success' | 'info' | 'warning';
}

export interface OverallWorthScore {
  averageProgress: number; // 0 ~ 100
  weightedProgress: number; // 0 ~ 100 weighted by purchasePrice
  grade: string;
  gradeBadge: string;
  emoji: string;
  comment: string;
  totalSpent: number;
  totalRecoveredValue: number;
  achievedCount: number;
  totalCount: number;
}

export interface CategoryWorthStats {
  category: ItemCategory;
  label: string;
  emoji: string;
  color: string;
  itemCount: number;
  totalSpend: number;
  averageProgress: number;
  achievedCount: number;
  statusBadge: string;
}
