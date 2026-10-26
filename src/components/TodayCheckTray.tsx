import React, { useState } from 'react';
import {
  Check,
  Plus,
  Flame,
  Sparkles,
  Package,
  RefreshCw,
  CreditCard,
  CheckSquare,
  ListFilter,
  CheckCircle2,
  SlidersHorizontal,
} from 'lucide-react';
import { WorthItem, UsageRecord, ItemStats } from '../types';
import { getTodayDateString, formatKRW } from '../utils/calculator';

interface TodayCheckTrayProps {
  items: WorthItem[];
  itemStats: ItemStats[];
  records: UsageRecord[];
  consecutiveStreak: number;
  onQuickAddOne: (item: WorthItem, e: React.MouseEvent) => void;
  onBatchQuickAdd: (itemIds: string[]) => void;
  onSelectItem: (item: WorthItem) => void;
}

export const TodayCheckTray: React.FC<TodayCheckTrayProps> = ({
  items,
  itemStats,
  records,
  consecutiveStreak,
  onQuickAddOne,
  onBatchQuickAdd,
  onSelectItem,
}) => {
  const [viewMode, setViewMode] = useState<'checklist' | 'carousel'>('checklist');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const todayStr = getTodayDateString();

  // Active usage-based items that can be logged daily
  const activeUsageItems = items.filter(
    (it) => it.usageMethod === 'usage' && it.status === 'active'
  );

  if (activeUsageItems.length === 0) return null;

  // Check which items have at least 1 record today
  const loggedTodayItemIds = new Set(
    records.filter((r) => r.usedAt === todayStr).map((r) => r.itemId)
  );

  const completedTodayCount = activeUsageItems.filter((it) =>
    loggedTodayItemIds.has(it.id)
  ).length;

  const categoryIcons: Record<string, React.ElementType> = {
    item: Package,
    subscription: RefreshCw,
    membership: CreditCard,
    other: Sparkles,
  };

  // Toggle single item checkbox selection in checklist mode
  const handleToggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  // Select all items that haven't been logged today yet
  const handleSelectUnlogged = () => {
    const unlogged = activeUsageItems
      .filter((it) => !loggedTodayItemIds.has(it.id))
      .map((it) => it.id);
    setSelectedIds(unlogged);
  };

  const handleSelectAll = () => {
    if (selectedIds.length === activeUsageItems.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(activeUsageItems.map((it) => it.id));
    }
  };

  // Execute batch log
  const handleBatchSubmit = () => {
    if (selectedIds.length === 0) return;
    onBatchQuickAdd(selectedIds);
    setSelectedIds([]);
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-4 sm:p-5 space-y-4">
      {/* Top Banner Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center shrink-0">
            <Flame className="w-5 h-5 fill-amber-500 text-amber-500" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-slate-900">오늘의 본전 루틴</h2>
              <span className="text-[11px] font-bold text-amber-800 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200/60">
                {consecutiveStreak > 0 ? `🔥 ${consecutiveStreak}일 연속` : '첫 기록 도전'}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              오늘 사용한 물건들을 한 번에 체크체크해서 기록하세요!
            </p>
          </div>
        </div>

        {/* View mode toggle + Today count */}
        <div className="flex items-center justify-between sm:justify-end gap-2.5">
          <div className="text-left sm:text-right">
            <span className="text-xs font-bold text-slate-900">
              {completedTodayCount} / {activeUsageItems.length}개
            </span>
            <p className="text-[10px] text-slate-400">오늘 기록 완료</p>
          </div>

          <div className="inline-flex rounded-xl bg-slate-100 p-0.5 border border-slate-200/60">
            <button
              type="button"
              onClick={() => setViewMode('checklist')}
              className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1 ${
                viewMode === 'checklist'
                  ? 'bg-white text-emerald-800 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <CheckSquare className="w-3.5 h-3.5" />
              <span>한 번에 체크</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('carousel')}
              className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1 ${
                viewMode === 'carousel'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <ListFilter className="w-3.5 h-3.5" />
              <span>카드 보기</span>
            </button>
          </div>
        </div>
      </div>

      {/* 1. CHECKLIST BATCH MODE (User's primary request) */}
      {viewMode === 'checklist' ? (
        <div className="space-y-3 pt-1">
          {/* Quick selection bar */}
          <div className="flex items-center justify-between text-xs text-slate-500 pb-1 border-b border-slate-100">
            <span className="font-medium">
              오늘 사용한 물건을 터치하여 체크하세요 ({selectedIds.length}개 선택됨)
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleSelectUnlogged}
                className="text-emerald-700 hover:underline font-semibold"
              >
                미기록 항목만 선택
              </button>
              <span>·</span>
              <button
                type="button"
                onClick={handleSelectAll}
                className="text-slate-600 hover:text-slate-900 font-semibold"
              >
                {selectedIds.length === activeUsageItems.length ? '선택 해제' : '전체 선택'}
              </button>
            </div>
          </div>

          {/* Checklist Items Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-72 overflow-y-auto pr-0.5 scrollbar-thin">
            {activeUsageItems.map((item) => {
              const isChecked = selectedIds.includes(item.id);
              const isLoggedToday = loggedTodayItemIds.has(item.id);
              const stat = itemStats.find((s) => s.item.id === item.id);
              const Icon = categoryIcons[item.category] || Sparkles;

              return (
                <div
                  key={item.id}
                  onClick={() => handleToggleSelect(item.id)}
                  className={`flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer select-none ${
                    isChecked
                      ? 'bg-emerald-50/70 border-emerald-500/80 shadow-2xs ring-1 ring-emerald-500/20'
                      : isLoggedToday
                      ? 'bg-slate-50/70 border-slate-200/80 hover:bg-slate-50'
                      : 'bg-white hover:bg-slate-50 border-slate-200'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0 pr-2">
                    {/* Big Checkbox */}
                    <div
                      className={`w-5 h-5 rounded-md flex items-center justify-center border transition-all shrink-0 ${
                        isChecked
                          ? 'bg-emerald-600 border-emerald-600 text-white'
                          : isLoggedToday
                          ? 'bg-emerald-100 border-emerald-300 text-emerald-800'
                          : 'border-slate-300 bg-white'
                      }`}
                    >
                      {isChecked ? (
                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                      ) : isLoggedToday ? (
                        <Check className="w-3 h-3 stroke-[2.5]" />
                      ) : null}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <Icon className="w-3 h-3 text-slate-400 shrink-0" />
                        <h4 className="text-xs font-bold text-slate-900 truncate">
                          {item.name}
                        </h4>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        {stat?.currentUnitCost !== null && stat?.currentUnitCost !== undefined
                          ? `현재 ${formatKRW(stat.currentUnitCost)}/${item.usageUnit}`
                          : '기록 대기 중'}
                      </p>
                    </div>
                  </div>

                  {/* Status indicator */}
                  <div className="text-right shrink-0">
                    {isLoggedToday ? (
                      <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100/70 px-2 py-0.5 rounded-full">
                        오늘 완료
                      </span>
                    ) : (
                      <span className="text-[10px] text-slate-400 font-medium">
                        미기록
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Big Batch Action Button */}
          <button
            type="button"
            onClick={handleBatchSubmit}
            disabled={selectedIds.length === 0}
            className={`w-full py-3 px-4 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 shadow-sm ${
              selectedIds.length > 0
                ? 'bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white shadow-emerald-600/25 cursor-pointer'
                : 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200/60'
            }`}
          >
            <CheckCircle2 className="w-4 h-4 stroke-[2.5]" />
            <span>
              {selectedIds.length > 0
                ? `선택한 ${selectedIds.length}개 오늘 사용 한 번에 기록 완료! ✓`
                : '오늘 사용한 소비를 위에서 체크해 주세요'}
            </span>
          </button>
        </div>
      ) : (
        /* 2. CAROUSEL CARD MODE */
        <div className="flex items-center gap-2.5 overflow-x-auto pb-1.5 pt-0.5 scrollbar-thin">
          {activeUsageItems.map((item) => {
            const isLogged = loggedTodayItemIds.has(item.id);
            const stat = itemStats.find((s) => s.item.id === item.id);
            const Icon = categoryIcons[item.category] || Sparkles;

            return (
              <div
                key={item.id}
                onClick={() => onSelectItem(item)}
                className={`group shrink-0 w-44 sm:w-48 p-3 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${
                  isLogged
                    ? 'bg-emerald-50/50 border-emerald-200 shadow-2xs'
                    : 'bg-slate-50 hover:bg-slate-100/70 border-slate-200/80 hover:border-slate-300'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-1 mb-1.5">
                    <span className="text-[11px] text-slate-400 flex items-center gap-1">
                      <Icon className="w-3 h-3 text-slate-500" />
                      <span className="truncate max-w-[80px]">{item.usageUnit}당</span>
                    </span>
                    <span className="text-[11px] font-bold text-slate-700">
                      {stat?.currentUnitCost !== null && stat?.currentUnitCost !== undefined
                        ? formatKRW(stat.currentUnitCost)
                        : '기록 대기'}
                    </span>
                  </div>
                  <h3 className="text-xs font-bold text-slate-900 truncate group-hover:text-emerald-700 transition-colors">
                    {item.name}
                  </h3>
                </div>

                {/* Action Button */}
                <div className="mt-3 pt-2 border-t border-slate-200/60">
                  {isLogged ? (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onQuickAddOne(item, e);
                      }}
                      className="w-full flex items-center justify-center gap-1 py-1.5 px-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-all shadow-2xs"
                      title="추가로 1회 더 사용 기록하기"
                    >
                      <Check className="w-3 h-3 stroke-[3]" />
                      <span>오늘 완료 (+1 더)</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onQuickAddOne(item, e);
                      }}
                      className="w-full flex items-center justify-center gap-1 py-1.5 px-2 bg-white hover:bg-emerald-600 text-slate-700 hover:text-white border border-slate-200 hover:border-emerald-600 rounded-lg text-xs font-semibold transition-all shadow-2xs"
                    >
                      <Plus className="w-3 h-3 stroke-[2.5]" />
                      <span>오늘 사용</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
