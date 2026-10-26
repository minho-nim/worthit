import React from 'react';
import { Check, Plus, Flame } from 'lucide-react';
import { WorthItem, UsageRecord } from '../types';
import { getTodayDateString } from '../utils/calculator';

interface TodayStoriesTrayProps {
  items: WorthItem[];
  records: UsageRecord[];
  consecutiveStreak: number;
  onToggleToday: (item: WorthItem, e: React.MouseEvent) => void;
  onOpenAddItem: () => void;
}

export const TodayStoriesTray: React.FC<TodayStoriesTrayProps> = ({
  items,
  records,
  consecutiveStreak,
  onToggleToday,
  onOpenAddItem,
}) => {
  const todayStr = getTodayDateString();

  // Active usage-based items
  const activeUsageItems = items.filter(
    (it) => it.usageMethod === 'usage' && it.status === 'active'
  );

  if (activeUsageItems.length === 0) return null;

  // Logged today IDs
  const loggedTodayItemIds = new Set(
    records.filter((r) => r.usedAt === todayStr && r.quantity > 0 && r.source === 'daily-check').map((r) => r.itemId)
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

  return (
    <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs p-4 sm:p-5 space-y-3">
      {/* Instagram Story Tray Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-900 tracking-tight flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>오늘 사용 체크</span>
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


        </div>
      </div>

      {/* INSTAGRAM-STYLE CIRCULAR STORIES TRAY */}
      <div className="flex items-center gap-3.5 overflow-x-auto pb-1 pt-1 scrollbar-none select-none">
        {/* Story 0: Plus Add Story */}
        <button
          type="button"
          onClick={onOpenAddItem}
          className="flex flex-col items-center gap-1 shrink-0 cursor-pointer group"
        >
          <div className="w-14 h-14 rounded-full border-2 border-dashed border-slate-300 group-hover:border-emerald-500 flex items-center justify-center bg-slate-50 group-hover:bg-emerald-50 transition-all text-slate-400 group-hover:text-emerald-600">
            <Plus className="w-5 h-5 stroke-[2.5]" />
          </div>
          <span className="text-[11px] font-medium text-slate-500 group-hover:text-slate-800 truncate w-14 text-center">
            새 소비
          </span>
        </button>

        {/* Stories for each item */}
        {activeUsageItems.map((item) => {
          const isLogged = loggedTodayItemIds.has(item.id);
          const emoji = getEmoji(item.name, item.category);

          return (
            <button
              type="button"
              aria-pressed={isLogged}
              aria-label={`${item.name} ${isLogged ? '오늘 사용 체크 취소' : '오늘 사용 1회 기록'}`}
              key={item.id}
              onClick={(e) => {
                onToggleToday(item, e);
              }}
              className="flex flex-col items-center gap-1 shrink-0 cursor-pointer disabled:cursor-default group relative enabled:active:scale-95 transition-transform rounded-xl focus-visible:outline-2 focus-visible:outline-emerald-600"
              title={`${item.name} · ${isLogged ? '다시 누르면 오늘 사용 체크 취소' : '탭하여 오늘 1회 기록'}`}
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
              <span className={`text-[10px] ${isLogged ? 'text-emerald-700' : 'text-slate-500'}`}>
                {isLogged ? '눌러서 취소' : '눌러서 기록'}
              </span>
            </button>
          );
        })}
      </div>

      <p className="text-[11px] text-slate-500 leading-relaxed">
        아이콘을 누르면 1회 기록되고, 다시 누르면 이 체크로 추가한 기록만 취소돼요. 추가 사용은 소비 카드의 +1로 기록해 주세요.
      </p>
    </div>
  );
};
