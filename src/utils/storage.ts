import { WorthItem, UsageRecord, BillingPeriod, AppSettings } from '../types';

const STORAGE_KEYS = {
  ITEMS: 'worthit:v1:items',
  RECORDS: 'worthit:v1:usageRecords',
  BILLING_PERIODS: 'worthit:v1:billingPeriods',
  SETTINGS: 'worthit:v1:settings',
};

const DEFAULT_SETTINGS: AppSettings = {
  hasCompletedOnboarding: false,
  version: '1.0.0',
};

function getLocalDateString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Demo lives in a separate document and never reads or writes personal storage.
export const isDemoMode = new URLSearchParams(window.location.search).get('mode') === 'demo';
export const demoPageUrl = `${import.meta.env.BASE_URL}?mode=demo`;
export const personalPageUrl = `${import.meta.env.BASE_URL}?start=1`;

const demoMemory = new Map<string, string>();
if (isDemoMode) {
  const demo = getSampleDemoData();
  demoMemory.set(STORAGE_KEYS.ITEMS, JSON.stringify(demo.items));
  demoMemory.set(STORAGE_KEYS.RECORDS, JSON.stringify(demo.records));
  demoMemory.set(STORAGE_KEYS.BILLING_PERIODS, JSON.stringify(demo.billingPeriods));
  demoMemory.set(STORAGE_KEYS.SETTINGS, JSON.stringify({ ...DEFAULT_SETTINGS, hasCompletedOnboarding: true }));
}
const appStorage = {
  getItem: (key: string) => isDemoMode ? demoMemory.get(key) ?? null : localStorage.getItem(key),
  setItem: (key: string, value: string) => {
    if (isDemoMode) demoMemory.set(key, value);
    else localStorage.setItem(key, value);
  },
  removeItem: (key: string) => {
    if (isDemoMode) demoMemory.delete(key);
    else localStorage.removeItem(key);
  },
};

export function loadItems(): WorthItem[] {
  try {
    const raw = appStorage.getItem(STORAGE_KEYS.ITEMS);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.error('Failed to load items from localStorage:', err);
    return [];
  }
}

export function saveItems(items: WorthItem[]): void {
  try {
    appStorage.setItem(STORAGE_KEYS.ITEMS, JSON.stringify(items));
  } catch (err) {
    console.error('Failed to save items to localStorage:', err);
  }
}

export function loadRecords(): UsageRecord[] {
  try {
    const raw = appStorage.getItem(STORAGE_KEYS.RECORDS);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.error('Failed to load usage records from localStorage:', err);
    return [];
  }
}

export function saveRecords(records: UsageRecord[]): void {
  try {
    appStorage.setItem(STORAGE_KEYS.RECORDS, JSON.stringify(records));
  } catch (err) {
    console.error('Failed to save usage records to localStorage:', err);
  }
}

export function loadBillingPeriods(): BillingPeriod[] {
  try {
    const raw = appStorage.getItem(STORAGE_KEYS.BILLING_PERIODS);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.error('Failed to load billing periods from localStorage:', err);
    return [];
  }
}

export function saveBillingPeriods(periods: BillingPeriod[]): void {
  try {
    appStorage.setItem(STORAGE_KEYS.BILLING_PERIODS, JSON.stringify(periods));
  } catch (err) {
    console.error('Failed to save billing periods to localStorage:', err);
  }
}

export function loadSettings(): AppSettings {
  try {
    const raw = appStorage.getItem(STORAGE_KEYS.SETTINGS);
    if (!raw) return DEFAULT_SETTINGS;
    const parsed = JSON.parse(raw);
    return { ...DEFAULT_SETTINGS, ...parsed };
  } catch (err) {
    console.error('Failed to load settings:', err);
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(settings: AppSettings): void {
  try {
    appStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
  } catch (err) {
    console.error('Failed to save settings:', err);
  }
}

export interface BackupData {
  version: string;
  exportedAt: string;
  items: WorthItem[];
  usageRecords: UsageRecord[];
  billingPeriods: BillingPeriod[];
  settings: AppSettings;
}

export function exportBackupData(): string {
  const data: BackupData = {
    version: '1.0.0',
    exportedAt: new Date().toISOString(),
    items: loadItems(),
    usageRecords: loadRecords(),
    billingPeriods: loadBillingPeriods(),
    settings: loadSettings(),
  };
  return JSON.stringify(data, null, 2);
}

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);
const isText = (value: unknown): value is string => typeof value === 'string' && value.trim().length > 0;
const isAmount = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value) && value >= 0;
const isDate = (value: unknown): value is string => {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(value + 'T00:00:00Z');
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
};

function isBackupItem(value: unknown): value is WorthItem {
  return isObject(value) && isText(value.id) && isText(value.name)
    && ['item', 'subscription', 'membership', 'other'].includes(String(value.category))
    && isAmount(value.purchasePrice) && isDate(value.purchaseDate)
    && ['days', 'usage'].includes(String(value.usageMethod))
    && ['회', '시간', '개', '일'].includes(String(value.usageUnit))
    && isAmount(value.targetUnitCost) && (value.purchasePrice === 0 || value.targetUnitCost > 0)
    && ['active', 'completed', 'archived'].includes(String(value.status))
    && isText(value.createdAt) && isText(value.updatedAt)
    && (value.billingCycle === undefined || ['monthly', 'yearly'].includes(String(value.billingCycle)))
    && (value.expirationDate === undefined || isDate(value.expirationDate));
}

function isBackupRecord(value: unknown): value is UsageRecord {
  return isObject(value) && isText(value.id) && isText(value.itemId)
    && isDate(value.usedAt) && isAmount(value.quantity) && value.quantity > 0
    && isText(value.createdAt) && (value.note === undefined || typeof value.note === 'string');
}

function isBackupPeriod(value: unknown): value is BillingPeriod {
  return isObject(value) && isText(value.id) && isText(value.itemId)
    && isDate(value.periodStart) && isDate(value.periodEnd) && value.periodStart <= value.periodEnd
    && isAmount(value.amount) && ['paid', 'pending'].includes(String(value.status));
}

const hasUniqueIds = (entries: { id: string }[]) => new Set(entries.map(entry => entry.id)).size === entries.length;

export function validateAndParseBackup(jsonString: string): {
  success: boolean;
  data?: BackupData;
  error?: string;
  summary?: { itemsCount: number; recordsCount: number; periodsCount: number };
} {
  try {
    const parsed = JSON.parse(jsonString);
    if (!parsed || typeof parsed !== 'object') {
      return { success: false, error: '유효한 JSON 파일 형식이 아닙니다.' };
    }
    if (!Array.isArray(parsed.items) || !Array.isArray(parsed.usageRecords)) {
      return { success: false, error: 'WorthIt 데이터 백업 형식이 올바르지 않습니다.' };
    }
    const periods = parsed.billingPeriods ?? [];
    if (!parsed.items.every(isBackupItem) || !parsed.usageRecords.every(isBackupRecord)
      || !Array.isArray(periods) || !periods.every(isBackupPeriod)) {
      return { success: false, error: '백업 항목의 금액·날짜·사용량 또는 필수 정보가 올바르지 않습니다.' };
    }
    const itemIds = new Set(parsed.items.map((item: WorthItem) => item.id));
    if (!hasUniqueIds(parsed.items) || !hasUniqueIds(parsed.usageRecords) || !hasUniqueIds(periods)
      || parsed.usageRecords.some((record: UsageRecord) => !itemIds.has(record.itemId))
      || periods.some((period: BillingPeriod) => !itemIds.has(period.itemId))) {
      return { success: false, error: '백업에 중복 ID 또는 존재하지 않는 소비의 기록이 포함되어 있습니다.' };
    }
    if (parsed.settings !== undefined && (!isObject(parsed.settings)
      || typeof parsed.settings.hasCompletedOnboarding !== 'boolean' || !isText(parsed.settings.version))) {
      return { success: false, error: '백업의 앱 설정 형식이 올바르지 않습니다.' };
    }
    return {
      success: true,
      data: {
        version: parsed.version || '1.0.0',
        exportedAt: parsed.exportedAt || new Date().toISOString(),
        items: parsed.items,
        usageRecords: parsed.usageRecords,
        billingPeriods: periods,
        settings: parsed.settings || DEFAULT_SETTINGS,
      },
      summary: {
        itemsCount: parsed.items.length,
        recordsCount: parsed.usageRecords.length,
        periodsCount: Array.isArray(parsed.billingPeriods) ? parsed.billingPeriods.length : 0,
      },
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { success: false, error: 'JSON 파일을 파싱하는 데 실패했습니다: ' + message };
  }
}

export function restoreBackupData(data: BackupData): void {
  saveItems(data.items);
  saveRecords(data.usageRecords);
  saveBillingPeriods(data.billingPeriods || []);
  saveSettings({
    ...data.settings,
    lastBackupDate: new Date().toISOString(),
  });
}

export function clearAllData(): void {
  appStorage.removeItem(STORAGE_KEYS.ITEMS);
  appStorage.removeItem(STORAGE_KEYS.RECORDS);
  appStorage.removeItem(STORAGE_KEYS.BILLING_PERIODS);
  appStorage.removeItem(STORAGE_KEYS.SETTINGS);
}

export function getSampleDemoData(): {
  items: WorthItem[];
  records: UsageRecord[];
  billingPeriods: BillingPeriod[];
} {
  const now = new Date();
  const dateDaysAgo = (days: number) => {
    const date = new Date(now);
    date.setDate(date.getDate() - days);
    return getLocalDateString(date);
  };
  const createdAt = now.toISOString();

  const items: WorthItem[] = [
    {
      id: 'sample-item-phone', name: '스마트폰 (플래그십)', category: 'item', purchasePrice: 1200000,
      purchaseDate: dateDaysAgo(599), usageMethod: 'days', usageUnit: '일', targetUnitCost: 1000,
      status: 'active', createdAt, updatedAt: createdAt,
    },
    {
      id: 'sample-item-gym', name: '헬스장 6개월 회원권', category: 'membership', purchasePrice: 300000,
      purchaseDate: dateDaysAgo(60), usageMethod: 'usage', usageUnit: '회', targetUnitCost: 10000,
      status: 'active', expirationDate: getLocalDateString(new Date(now.getFullYear(), now.getMonth() + 4, 1)),
      createdAt, updatedAt: createdAt,
    },
    {
      id: 'sample-item-headphone', name: '노이즈 캔슬링 헤드폰', category: 'item', purchasePrice: 350000,
      purchaseDate: dateDaysAgo(180), usageMethod: 'usage', usageUnit: '회', targetUnitCost: 2000,
      status: 'active', createdAt, updatedAt: createdAt,
    },
    {
      id: 'sample-item-ott', name: 'OTT 프리미엄 구독', category: 'subscription', purchasePrice: 17000,
      purchaseDate: dateDaysAgo(90), usageMethod: 'usage', usageUnit: '시간', targetUnitCost: 500,
      billingCycle: 'monthly', status: 'active', createdAt, updatedAt: createdAt,
    },
  ];

  const gymNotes = ['상체 루틴', '유산소 40분', '하체 스쿼트', '등 & 이두', '스트레칭 및 러닝', '전신 서킷'];
  const records: UsageRecord[] = [
    ...[25, 20, 14, 8, 3, 1].map((daysAgo, index) => ({
      id: `rec-gym-${index + 1}`, itemId: 'sample-item-gym', usedAt: dateDaysAgo(daysAgo), quantity: 1,
      note: gymNotes[index], createdAt,
    })),
    {
      id: 'rec-hp-base', itemId: 'sample-item-headphone', usedAt: dateDaysAgo(30), quantity: 135,
      note: '초기 누적 사용량 (출퇴근 & 업무 음악 감상)', createdAt,
    },
    ...[4, 3, 2, 1, 0].map((daysAgo, index) => ({
      id: `rec-hp-${index + 1}`, itemId: 'sample-item-headphone', usedAt: dateDaysAgo(daysAgo), quantity: 1,
      note: ['카페 집중 작업', '출근길 팟캐스트', '온라인 화상 미팅', '야간 독서 및 로파이 음악', '퇴근길 감상'][index], createdAt,
    })),
    { id: 'rec-ott-1', itemId: 'sample-item-ott', usedAt: dateDaysAgo(2), quantity: 3, note: '주말 영화 관람', createdAt },
    { id: 'rec-ott-2', itemId: 'sample-item-ott', usedAt: dateDaysAgo(1), quantity: 2.5, note: '드라마 정주행', createdAt },
  ];

  const billingPeriods: BillingPeriod[] = [
    {
      id: 'bp-ott-1', itemId: 'sample-item-ott', periodStart: dateDaysAgo(60), periodEnd: dateDaysAgo(31),
      amount: 17000, status: 'paid',
    },
    {
      id: 'bp-ott-2', itemId: 'sample-item-ott', periodStart: dateDaysAgo(30), periodEnd: dateDaysAgo(-1),
      amount: 17000, status: 'paid',
    },
  ];

  return { items, records, billingPeriods };
}
