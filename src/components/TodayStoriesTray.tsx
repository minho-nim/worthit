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
  ChevronRight,
  SlidersHorizontal,
} from 'lucide-react';
import { WorthItem, UsageRecord, ItemStats } from '../types';
import { getTodayDateString, formatKRW } from '../utils/calculator';

interface TodayStoriesTrayProps {
  items: WorthItem[];
  itemStats: ItemStats[];
  records: UsageRecord[];
  consecutiveStreak: number;
  onQuickAddOne: (item: WorthItem, e: React.MouseEvent) => void;
  onBatchQuickAdd: (itemIds: string[]) => void;
  onSelectItem: (item: WorthItem) => void;
  onOpenAddItem: () => void;
}

export const TodayStoriesTray: React.FC<TodayStoriesTrayProps> = ({
  items,
  itemStats,
  records,
  consecutiveStreak,
  onQuickAddOne,
  onBatchQuickAdd,
  onSelectItem,
  onOpenAddItem,
}) => {
  const [isChecklistOpen, setIsChecklistOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const todayStr = getTodayDateString();

  // Active usage-based items
  const activeUsageItems = items.filter(
    (it) => it.usageMethod === 'usage' && it.status === 'active'
  );

  if (activeUsageItems.length === 0) return null;

  // Logged today IDs
  const loggedTodayItemIds = new Set(
    records.filter((r) => r.usedAt === todayStr).map((r) => r.itemId)
  );

  const completedTodayCount = activeUsageItems.filter((it) =>
    loggedTodayItemIds.has(it.id)
  ).length;

  // Emoji map for visual social-style recognition
  const getEmoji = (name: string, category: string) => {
    const lower = name.toLowerCase();
    if (lower.includes('스마트폰') || lower.includes('폰') || lower.includes('아이폰') || lower.includes('갤럭시')) return '📱';
    if (lower.includes('헤드폰') || lower.includes('이어폰') || lower.includes('에어팟') || lower.includes('버즈')) return '🎧';
    if (lower.includes('헬스') || lower.includes('피트니스') || lower.includes('운동')) return '🏋️';
    if (lower.includes('커피') || lower.includes('텀블러') || lower.includes('머신')) return '☕';
    if (lower.includes('넷플릭스') || lower.includes('ott') || lower.includes('유튜브') || lower.includes('디즈니') || lower.includes('구독')) return '📺';
    if (lower.includes('노트북') || lower.includes('맥북') || lower.includes('패드') || lower.includes('컴퓨터')) return '💻';
    if (lower.includes('신발') || lower.includes('운동화') || lower.includes('러닝')) return '👟';
    if (lower.includes('책') || lower.includes('도서') || lower.includes('강의')) return '📚';
    if (category === 'subscription') return '🔄';
    if (category === 'membership') return '💳';
    return '✨';
  };

  const handleToggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleSelectAllUnlogged = () => {
    const unlogged = activeUsageItems
      .filter((it) => !loggedTodayItemIds.has(it.id))
      .map((it) => it.id);
    setSelectedIds(unlogged);
  };

  const handleBatchSubmit = () => {
    if (selectedIds.length === 0) return;
    onBatchQuickAdd(selectedIds);
    setSelectedIds([]);
    setIsChecklistOpen(false);
  };

  return (
    <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs p-4 sm:p-5 space-y-3">
      {/* Instagram Story Tray Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-900 tracking-tight flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>오늘의 본전 스토리</span>
          </span>
          <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200/60">
            {completedTodayCount} / {activeUsageItems.length} 완료
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          {consecutiveStreak > 0 && (
            <span className="text-[11px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200/60 flex items-center gap-1">
              <Flame className="w-3 h-3 fill-amber-500 text-amber-500" />
              <span>{consecutiveStreak}일</span>
            </span>
          )}

          <button
            type="button"
            onClick={() => setIsChecklistOpen(!isChecklistOpen)}
            className={`px-2.5 py-1 rounded-xl text-xs font-semibold transition-all flex items-center gap-1 ${
              isChecklistOpen
                ? 'bg-slate-900 text-white'
                : 'bg-slate-100 text-slate-600 hover:text-slate-900'
            }`}
          >
            <CheckSquare className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">체크리스트</span>
          </button>
        </div>
      </div>

      {/* INSTAGRAM-STYLE CIRCULAR STORIES TRAY */}
      <div className="flex items-center gap-3.5 overflow-x-auto pb-1 pt-1 scrollbar-none select-none">
        {/* Story 0: Plus Add Story */}
        <div
          onClick={onOpenAddItem}
          className="flex flex-col items-center gap-1 shrink-0 cursor-pointer group"
        >
          <div className="w-14 h-14 rounded-full border-2 border-dashed border-slate-300 group-hover:border-emerald-500 flex items-center justify-center bg-slate-50 group-hover:bg-emerald-50 transition-all text-slate-400 group-hover:text-emerald-600">
            <Plus className="w-5 h-5 stroke-[2.5]" />
          </div>
          <span className="text-[11px] font-medium text-slate-500 group-hover:text-slate-800 truncate w-14 text-center">
            새 소비
          </span>
        </div>

        {/* Stories for each item */}
        {activeUsageItems.map((item) => {
          const isLogged = loggedTodayItemIds.has(item.id);
          const emoji = getEmoji(item.name, item.category);

          return (
            <div
              key={item.id}
              onClick={(e) => {
                onQuickAddOne(item, e);
              }}
              className="flex flex-col items-center gap-1 shrink-0 cursor-pointer group relative active:scale-95 transition-transform"
              title={isLogged ? '오늘 완료! 클릭 시 1회 추가 기록' : '탭하여 오늘 1회 기록'}
            >
              {/* Circular Avatar with Instagram-style Ring */}
              <div
                className={`w-14 h-14 rounded-full p-0.5 transition-all flex items-center justify-center ${
                  isLogged
                    ? 'bg-emerald-500 ring-2 ring-emerald-500/20'
                    : 'bg-gradient-to-tr from-emerald-500 via-teal-400 to-amber-400 ring-2 ring-slate-100 hover:ring-emerald-300'
                }`}
              >
                <div className="w-full h-full rounded-full bg-white flex items-center justify-center text-xl shadow-inner relative">
                  <span>{emoji}</span>

                  {/* Checkmark badge */}
                  {isLogged && (
                    <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[10px] font-bold border-2 border-white shadow-xs">
                      <Check className="w-2.5 h-2.5 stroke-[3]" />
                    </div>
                  )}
                </div>
              </div>

              {/* Item Name */}
              <span
                className={`text-[11px] truncate w-14 text-center leading-tight ${
                  isLogged ? 'font-bold text-emerald-800' : 'font-medium text-slate-700'
                }`}
              >
                {item.name}
              </span>
            </div>
          );
        })}
      </div>

      {/* POPUP / ACCORDION CHECKLIST (When user taps "체크리스트") */}
      {isChecklistOpen && (
        <div className="pt-3 border-t border-slate-100 space-y-3 animate-in fade-in duration-200">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>오늘 사용한 물건을 체크하세요 ({selectedIds.length}개 선택)</span>
            <button
              type="button"
              onClick={handleSelectAllUnlogged}
              className="text-emerald-700 hover:underline font-bold"
            >
              미기록 전체 선택
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-56 overflow-y-auto pr-0.5 scrollbar-thin">
            {activeUsageItems.map((item) => {
              const isChecked = selectedIds.includes(item.id);
              const isLogged = loggedTodayItemIds.has(item.id);
              const emoji = getEmoji(item.name, item.category);

              return (
                <div
                  key={item.id}
                  onClick={() => handleToggleSelect(item.id)}
                  className={`flex items-center justify-between p-2.5 rounded-2xl border transition-all cursor-pointer select-none ${
                    isChecked
                      ? 'bg-emerald-50 border-emerald-500 shadow-2xs'
                      : isLogged
                      ? 'bg-slate-50/70 border-slate-200'
                      : 'bg-white hover:bg-slate-50 border-slate-200'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0 pr-2">
                    <span className="text-lg">{emoji}</span>
                    <span className="text-xs font-bold text-slate-900 truncate">
                      {item.name}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {isLogged && (
                      <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                        오늘 완료
                      </span>
                    )}
                    <div
                      className={`w-5 h-5 rounded-md flex items-center justify-center border transition-all ${
                        isChecked
                          ? 'bg-emerald-600 border-emerald-600 text-white'
                          : 'border-slate-300 bg-white'
                      }`}
                    >
                      {isChecked && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <button
            type="button"
            onClick={handleBatchSubmit}
            disabled={selectedIds.length === 0}
            className={`w-full py-2.5 px-4 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-1.5 shadow-sm ${
              selectedIds.length > 0
                ? 'bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer'
                : 'bg-slate-100 text-slate-400 cursor-not-allowed'
            }`}
          >
            <Check className="w-3.5 h-3.5 stroke-[3]" />
            <span>선택한 {selectedIds.length}개 한 번에 오늘 완료!</span>
          </button>
        </div>
      )}
    </div>
  );
};
