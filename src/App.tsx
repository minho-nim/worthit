import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { WorthItem, UsageRecord, BillingPeriod, BillingCycle, AppSettings, ToastMessage, ItemStats } from './types';
import {
  loadItems,
  saveItems,
  loadRecords,
  saveRecords,
  loadBillingPeriods,
  saveBillingPeriods,
  loadSettings,
  saveSettings,
  getSampleDemoData,
  restoreBackupData,
} from './utils/storage';
import {
  calculateItemStats,
  calculateCostReductionDelta,
  calculateConsecutiveDaysStreak,
  getTodayDateString,
  formatKRW,
} from './utils/calculator';
import { calculateAchievements } from './utils/achievements';
import { Header } from './components/Header';
import { BottomNav } from './components/BottomNav';
import { ToastContainer } from './components/Toast';
import { OnboardingModal } from './components/OnboardingModal';
import { ItemFormModal } from './components/ItemFormModal';
import { QuickLogModal } from './components/QuickLogModal';
import { ItemDetailModal } from './components/ItemDetailModal';
import { SettingsModal } from './components/SettingsModal';
import { ReceiptModal } from './components/ReceiptModal';
import { HomeView } from './views/HomeView';
import { ItemsView } from './views/ItemsView';
import { AnalyticsView } from './views/AnalyticsView';
import { AchievementsView } from './views/AchievementsView';

function getBillingPeriodEnd(purchaseDate: string, cycle: BillingCycle): string {
  const [year, month, day] = purchaseDate.split('-').map(Number);
  const targetMonthIndex = month - 1 + (cycle === 'yearly' ? 12 : 1);
  const targetYear = year + Math.floor(targetMonthIndex / 12);
  const targetMonth = targetMonthIndex % 12;
  const lastDay = new Date(targetYear, targetMonth + 1, 0).getDate();
  return `${targetYear}-${String(targetMonth + 1).padStart(2, '0')}-${String(Math.min(day, lastDay)).padStart(2, '0')}`;
}
export default function App() {
  // State
  const [items, setItems] = useState<WorthItem[]>([]);
  const [records, setRecords] = useState<UsageRecord[]>([]);
  const [billingPeriods, setBillingPeriods] = useState<BillingPeriod[]>([]);
  const [settings, setSettings] = useState<AppSettings>({
    hasCompletedOnboarding: false,
    version: '1.0.0',
  });

  const [activeTab, setActiveTab] = useState<string>('home');
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  // Modals
  const [isOnboardingOpen, setIsOnboardingOpen] = useState(false);
  const [isAddItemOpen, setIsAddItemOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<WorthItem | null>(null);
  const [selectedItem, setSelectedItem] = useState<WorthItem | null>(null);
  const [quickLogItem, setQuickLogItem] = useState<WorthItem | null>(null);
  const [editingRecord, setEditingRecord] = useState<UsageRecord | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [receiptStats, setReceiptStats] = useState<ItemStats | null>(null);

  // Load Initial Data from localStorage safely
  useEffect(() => {
    const loadedItems = loadItems();
    const loadedRecords = loadRecords();
    const loadedBilling = loadBillingPeriods();
    const loadedSettings = loadSettings();

    setItems(loadedItems);
    setRecords(loadedRecords);
    setBillingPeriods(loadedBilling);
    setSettings(loadedSettings);

    // Show onboarding if no items and onboarding not yet completed
    if (loadedItems.length === 0 && !loadedSettings.hasCompletedOnboarding) {
      setIsOnboardingOpen(true);
    }
  }, []);

  // Toast Helper
  const addToast = useCallback(
    (title: string, description?: string, type: 'success' | 'info' | 'warning' = 'success') => {
      const id = Date.now().toString() + Math.random().toString(36).substring(2, 5);
      setToasts((prev) => [...prev, { id, title, description, type }]);
    },
    []
  );

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // Calculate Item Stats
  const itemStatsList = useMemo(() => {
    return items.map((item) => calculateItemStats(item, records, billingPeriods));
  }, [items, records, billingPeriods]);

  // Selected Item Stats for Detail view
  const selectedItemStats = useMemo(() => {
    if (!selectedItem) return null;
    const found = items.find((i) => i.id === selectedItem.id);
    if (!found) return null;
    return calculateItemStats(found, records, billingPeriods);
  }, [selectedItem, items, records, billingPeriods]);

  // Calculate Achievements
  const achievements = useMemo(() => {
    return calculateAchievements(items, records, billingPeriods);
  }, [items, records, billingPeriods]);

  // Calculate Consecutive Streak
  const consecutiveStreak = useMemo(() => {
    return calculateConsecutiveDaysStreak(records);
  }, [records]);

  // Track achievements unlock notifications
  const [unlockedAchievementsIds, setUnlockedAchievementsIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    const newlyUnlocked = achievements.filter(
      (a) => a.isUnlocked && !unlockedAchievementsIds.has(a.id)
    );

    if (newlyUnlocked.length > 0 && unlockedAchievementsIds.size > 0) {
      newlyUnlocked.forEach((a) => {
        addToast(`🏆 새로운 업적 달성!`, `"${a.title}" 업적을 획득했습니다!`, 'success');
      });
    }

    setUnlockedAchievementsIds(new Set(achievements.filter((a) => a.isUnlocked).map((a) => a.id)));
  }, [achievements, addToast]);

  // Complete Onboarding
  const handleCompleteOnboarding = () => {
    const updated: AppSettings = { ...settings, hasCompletedOnboarding: true };
    setSettings(updated);
    saveSettings(updated);
    setIsOnboardingOpen(false);
  };

  // Add / Edit Item
  const handleSaveItem = (
    itemData: Omit<WorthItem, 'id' | 'createdAt' | 'updatedAt'>,
    initialQuantity: number,
    existingId?: string
  ) => {
    const nowIso = new Date().toISOString();

    if (existingId) {
      // Edit existing item
      const updated = items.map((it) => {
        if (it.id === existingId) {
          return {
            ...it,
            ...itemData,
            updatedAt: nowIso,
          };
        }
        return it;
      });
      setItems(updated);
      saveItems(updated);

      if (selectedItem?.id === existingId) {
        const found = updated.find((it) => it.id === existingId);
        if (found) setSelectedItem(found);
      }

      addToast('소비 정보가 수정되었습니다.', itemData.name, 'success');
      setEditingItem(null);
    } else {
      // Create new item with UUID
      const newItemId = 'item-' + Date.now().toString(36) + Math.random().toString(36).substring(2, 7);
      const newItem: WorthItem = {
        ...itemData,
        id: newItemId,
        createdAt: nowIso,
        updatedAt: nowIso,
      };

      const newItemsList = [newItem, ...items];
      setItems(newItemsList);
      saveItems(newItemsList);

      // Handle initial usage record
      let newRecordsList = [...records];
      if (initialQuantity > 0 && newItem.usageMethod === 'usage') {
        const initialRecord: UsageRecord = {
          id: 'rec-' + Date.now().toString(36) + Math.random().toString(36).substring(2, 7),
          itemId: newItemId,
          usedAt: newItem.purchaseDate,
          quantity: initialQuantity,
          note: '초기 누적 사용량',
          createdAt: nowIso,
        };
        newRecordsList = [initialRecord, ...records];
        setRecords(newRecordsList);
        saveRecords(newRecordsList);
      }

      // Handle subscription initial billing period
      if (newItem.category === 'subscription') {

      const initialPeriod: BillingPeriod = {
          id: 'bp-' + Date.now().toString(36) + Math.random().toString(36).substring(2, 7),
          itemId: newItemId,
          periodStart: newItem.purchaseDate,
          periodEnd: getBillingPeriodEnd(newItem.purchaseDate, newItem.billingCycle === 'yearly' ? 'yearly' : 'monthly'),
          amount: newItem.purchasePrice,
          status: 'paid',
        };
        const newBillingList = [initialPeriod, ...billingPeriods];
        setBillingPeriods(newBillingList);
        saveBillingPeriods(newBillingList);
      }

      addToast('새 소비가 등록되었습니다!', `${newItem.name} 가치 추적을 시작합니다.`, 'success');
      // Automatically open detail for the newly added item
      setSelectedItem(newItem);
    }
  };

  // Quick +1 Usage Action
  const handleQuickAddOne = (item: WorthItem, e: React.MouseEvent) => {
    e.stopPropagation();
    if (item.usageMethod === 'days') return;

    const currentStats = calculateItemStats(item, records, billingPeriods);
    const wasGoalAchieved = currentStats.isGoalAchieved;
    const deltaInfo = calculateCostReductionDelta(item, currentStats.totalUsage, 1, currentStats.totalSpent);

    const nowIso = new Date().toISOString();
    const newRecord: UsageRecord = {
      id: 'rec-' + Date.now().toString(36) + Math.random().toString(36).substring(2, 7),
      itemId: item.id,
      usedAt: getTodayDateString(),
      quantity: 1,
      createdAt: nowIso,
    };

    const updatedRecords = [newRecord, ...records];
    setRecords(updatedRecords);
    saveRecords(updatedRecords);

    // Calculate updated stats
    const updatedStats = calculateItemStats(item, updatedRecords, billingPeriods);

    if (!wasGoalAchieved && updatedStats.isGoalAchieved) {
      addToast(
        '축하해요! 🎉',
        `"${item.name}"의 목표 사용단가(${item.targetUnitCost.toLocaleString()}원)에 도달했어요!`,
        'success'
      );
    } else if (deltaInfo && deltaInfo.delta > 0) {
      addToast(
        '사용 기록이 추가됐어요!',
        `1${item.usageUnit}당 비용이 ${formatKRW(deltaInfo.delta)} 줄었어요.`,
        'success'
      );
    } else {
      addToast('사용 기록이 추가됐어요!', `+1${item.usageUnit} 사용`, 'success');
    }
  };

  // Batch Quick Add Action (Check-check multi-log)
  const handleBatchQuickAdd = (itemIds: string[]) => {
    if (itemIds.length === 0) return;
    const nowIso = new Date().toISOString();
    const today = getTodayDateString();

    const newRecordsList: UsageRecord[] = itemIds.map((id) => ({
      id: 'rec-' + Date.now().toString(36) + Math.random().toString(36).substring(2, 7),
      itemId: id,
      usedAt: today,
      quantity: 1,
      createdAt: nowIso,
    }));

    const updatedRecords = [...newRecordsList, ...records];
    setRecords(updatedRecords);
    saveRecords(updatedRecords);

    // Check newly achieved items
    const newlyAchievedNames: string[] = [];
    itemIds.forEach((id) => {
      const item = items.find((i) => i.id === id);
      if (!item) return;
      const before = calculateItemStats(item, records, billingPeriods);
      const after = calculateItemStats(item, updatedRecords, billingPeriods);
      if (!before.isGoalAchieved && after.isGoalAchieved) {
        newlyAchievedNames.push(item.name);
      }
    });

    if (newlyAchievedNames.length > 0) {
      addToast(
        '목표 달성 축하! 🎉',
        `"${newlyAchievedNames.join(', ')}" 목표 사용단가에 도달했어요!`,
        'success'
      );
    } else {
      addToast(
        '오늘 사용 일괄 체크 완료! ✓',
        `${itemIds.length}개 소비 항목의 사용단가가 각각 낮아졌어요.`,
        'success'
      );
    }
  };

  // Custom Record Save
  const handleSaveCustomRecord = (
    itemId: string,
    quantity: number,
    usedAt: string,
    note?: string
  ) => {
    const parentItem = items.find((i) => i.id === itemId);
    if (!parentItem) return;

    const currentStats = calculateItemStats(parentItem, records, billingPeriods);
    const wasGoalAchieved = currentStats.isGoalAchieved;
    const deltaInfo = calculateCostReductionDelta(parentItem, currentStats.totalUsage, quantity, currentStats.totalSpent);

    const nowIso = new Date().toISOString();
    const newRecord: UsageRecord = {
      id: 'rec-' + Date.now().toString(36) + Math.random().toString(36).substring(2, 7),
      itemId,
      usedAt,
      quantity,
      note,
      createdAt: nowIso,
    };

    const updatedRecords = [newRecord, ...records];
    setRecords(updatedRecords);
    saveRecords(updatedRecords);

    const updatedStats = calculateItemStats(parentItem, updatedRecords, billingPeriods);

    if (!wasGoalAchieved && updatedStats.isGoalAchieved) {
      addToast(
        '축하해요! 🎉',
        `"${parentItem.name}"의 목표 사용단가에 도달했어요!`,
        'success'
      );
    } else if (deltaInfo && deltaInfo.delta > 0) {
      addToast(
        '사용 기록이 추가됐어요!',
        `1${parentItem.usageUnit}당 비용이 ${formatKRW(deltaInfo.delta)} 줄었어요.`,
        'success'
      );
    } else {
      addToast('사용 기록이 추가됐어요.', `+${quantity}${parentItem.usageUnit}`, 'success');
    }
  };

  // Update Existing Record
  const handleUpdateRecord = (
    recordId: string,
    quantity: number,
    usedAt: string,
    note?: string
  ) => {
    const updated = records.map((r) => {
      if (r.id === recordId) {
        return {
          ...r,
          quantity,
          usedAt,
          note,
        };
      }
      return r;
    });

    setRecords(updated);
    saveRecords(updated);
    addToast('사용 기록이 수정되었습니다.', undefined, 'info');
    setEditingRecord(null);
  };

  // Delete Record
  const handleDeleteRecord = (recordId: string) => {
    const updated = records.filter((r) => r.id !== recordId);
    setRecords(updated);
    saveRecords(updated);
    addToast('사용 기록이 삭제되었습니다.', undefined, 'info');
  };

  // Delete Item & Cascade
  const handleDeleteItem = (itemId: string) => {
    const updatedItems = items.filter((i) => i.id !== itemId);
    const updatedRecords = records.filter((r) => r.itemId !== itemId);
    const updatedPeriods = billingPeriods.filter((b) => b.itemId !== itemId);

    setItems(updatedItems);
    saveItems(updatedItems);

    setRecords(updatedRecords);
    saveRecords(updatedRecords);

    setBillingPeriods(updatedPeriods);
    saveBillingPeriods(updatedPeriods);

    if (selectedItem?.id === itemId) {
      setSelectedItem(null);
    }

    addToast('소비 항목이 삭제되었습니다.', '관련 기록도 함께 정리되었습니다.', 'info');
  };

  // Change Item Status
  const handleChangeStatus = (itemId: string, newStatus: WorthItem['status']) => {
    const updated = items.map((it) => {
      if (it.id === itemId) {
        return { ...it, status: newStatus, updatedAt: new Date().toISOString() };
      }
      return it;
    });
    setItems(updated);
    saveItems(updated);
    if (selectedItem?.id === itemId) {
      const found = updated.find((it) => it.id === itemId);
      if (found) setSelectedItem(found);
    }
    addToast('상태가 변경되었습니다.', undefined, 'info');
  };

  // Add Billing Period for Subscription
  const handleAddBillingPeriod = (
    itemId: string,
    periodData: Omit<BillingPeriod, 'id' | 'itemId'>
  ) => {
    const newPeriod: BillingPeriod = {
      ...periodData,
      id: 'bp-' + Date.now().toString(36) + Math.random().toString(36).substring(2, 7),
      itemId,
    };
    const updated = [...billingPeriods, newPeriod];
    setBillingPeriods(updated);
    saveBillingPeriods(updated);
    addToast('구독 결제기간이 추가되었습니다.', undefined, 'success');
  };

  // Delete Billing Period
  const handleDeleteBillingPeriod = (periodId: string) => {
    const updated = billingPeriods.filter((b) => b.id !== periodId);
    setBillingPeriods(updated);
    saveBillingPeriods(updated);
    addToast('결제기간이 삭제되었습니다.', undefined, 'info');
  };

  // Sync data after backup restore / reset / demo load
  const handleDataReload = () => {
    setItems(loadItems());
    setRecords(loadRecords());
    setBillingPeriods(loadBillingPeriods());
    setSettings(loadSettings());
    setSelectedItem(null);
  };

  // 1-Click Load Demo Data from Home Empty State
  const handleLoadDemoFromEmpty = () => {
    const demo = getSampleDemoData();
    restoreBackupData({
      version: '1.0.0',
      exportedAt: new Date().toISOString(),
      items: demo.items,
      usageRecords: demo.records,
      billingPeriods: demo.billingPeriods,
      settings: { hasCompletedOnboarding: true, version: '1.0.0' },
    });
    handleDataReload();
    addToast('체험용 예시 데이터가 등록되었습니다.', '스마트폰, 헬스장, 헤드폰, OTT 데이터가 적용되었습니다.');
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans pb-20 md:pb-8">
      {/* Toast Notification Container */}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />

      {/* Main Top Header */}
      <Header
        onOpenAddItem={() => {
          setEditingItem(null);
          setIsAddItemOpen(true);
        }}
        onOpenSettings={() => setIsSettingsOpen(true)}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-4xl w-full mx-auto px-4 py-6">
        {activeTab === 'home' && (
          <HomeView
            items={items}
            itemStats={itemStatsList}
            records={records}
            consecutiveStreak={consecutiveStreak}
            onOpenAddItem={() => {
              setEditingItem(null);
              setIsAddItemOpen(true);
            }}
            onSelectItem={(item) => setSelectedItem(item)}
            onQuickAddOne={handleQuickAddOne}
            onBatchQuickAdd={handleBatchQuickAdd}
            onOpenLogModal={(item) => setQuickLogItem(item)}
            onNavigateToItems={() => setActiveTab('items')}
            onNavigateToAnalytics={() => setActiveTab('analytics')}
            onLoadDemoData={items.length === 0 ? handleLoadDemoFromEmpty : undefined}
            onOpenReceipt={(st) => setReceiptStats(st)}
          />
        )}

        {activeTab === 'items' && (
          <ItemsView
            items={items}
            itemStats={itemStatsList}
            onOpenAddItem={() => {
              setEditingItem(null);
              setIsAddItemOpen(true);
            }}
            onSelectItem={(item) => setSelectedItem(item)}
            onQuickAddOne={handleQuickAddOne}
            onOpenLogModal={(item) => setQuickLogItem(item)}
            onOpenReceipt={(st) => setReceiptStats(st)}
          />
        )}

        {activeTab === 'analytics' && (
          <AnalyticsView
            items={items}
            itemStats={itemStatsList}
            records={records}
            onSelectItem={(item) => setSelectedItem(item)}
          />
        )}

        {activeTab === 'achievements' && (
          <AchievementsView
            achievements={achievements}
            consecutiveStreak={consecutiveStreak}
          />
        )}
      </main>

      {/* Mobile Fixed Bottom Navigation */}
      <BottomNav
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenAddItem={() => {
          setEditingItem(null);
          setIsAddItemOpen(true);
        }}
        unlockedCount={achievements.filter((a) => a.isUnlocked).length}
      />

      {/* Modals */}
      {/* 1. Onboarding Modal */}
      <OnboardingModal
        isOpen={isOnboardingOpen}
        onClose={handleCompleteOnboarding}
        onStartAdd={() => {
          handleCompleteOnboarding();
          setIsAddItemOpen(true);
        }}
      />

      {/* 2. Item Form Wizard Modal (Create & Edit) */}
      <ItemFormModal
        isOpen={isAddItemOpen}
        onClose={() => {
          setIsAddItemOpen(false);
          setEditingItem(null);
        }}
        onSave={handleSaveItem}
        editingItem={editingItem}
        existingRecords={records}
      />

      {/* 3. Item Detail Modal */}
      {selectedItemStats && (
        <ItemDetailModal
          stats={selectedItemStats}
          records={records}
          billingPeriods={billingPeriods}
          isOpen={!!selectedItem}
          onClose={() => setSelectedItem(null)}
          onEditItem={() => {
            setEditingItem(selectedItemStats.item);
            setIsAddItemOpen(true);
          }}
          onDeleteItem={handleDeleteItem}
          onAddQuickRecord={(qty) => {
            handleSaveCustomRecord(
              selectedItemStats.item.id,
              qty,
              getTodayDateString(),
              undefined
            );
          }}
          onOpenLogModal={(recordToEdit) => {
            if (recordToEdit) {
              setEditingRecord(recordToEdit);
              setQuickLogItem(selectedItemStats.item);
            } else {
              setEditingRecord(null);
              setQuickLogItem(selectedItemStats.item);
            }
          }}
          onDeleteRecord={handleDeleteRecord}
          onAddBillingPeriod={(p) => handleAddBillingPeriod(selectedItemStats.item.id, p)}
          onDeleteBillingPeriod={handleDeleteBillingPeriod}
          onChangeStatus={(st) => handleChangeStatus(selectedItemStats.item.id, st)}
          onOpenReceipt={() => setReceiptStats(selectedItemStats)}
        />
      )}

      {/* 4. Quick Log Modal */}
      <QuickLogModal
        isOpen={!!quickLogItem}
        item={quickLogItem}
        onClose={() => {
          setQuickLogItem(null);
          setEditingRecord(null);
        }}
        onSaveRecord={(itemId, qty, usedAt, note) => {
          handleSaveCustomRecord(itemId, qty, usedAt, note);
        }}
        editingRecord={editingRecord}
        onUpdateRecord={handleUpdateRecord}
      />

      {/* 5. Settings / Backup Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        onDataChanged={handleDataReload}
        showToast={addToast}
      />

      {/* 6. Official Value Receipt Modal */}
      <ReceiptModal
        stats={receiptStats}
        isOpen={!!receiptStats}
        onClose={() => setReceiptStats(null)}
        onCopySuccess={() =>
          addToast(
            '영수증 내용이 복사되었습니다!',
            'SNS나 메모장에 가치 소비를 기록해 보세요.',
            'success'
          )
        }
      />
    </div>
  );
}
