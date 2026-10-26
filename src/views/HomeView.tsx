import React, { useState } from 'react';
import {
  Layers,
  CheckCircle2,
  Calendar,
  TrendingUp,
  Plus,
  Sparkles,
  ArrowRight,
  Clock,
  AlertCircle,
  Award,
  Flame,
  Sun,
  Moon,
  Coffee,
  Filter,
  ChevronRight,
} from 'lucide-react';
import { WorthItem, UsageRecord, ItemStats } from '../types';
import { ItemCard } from '../components/ItemCard';
import { TodayStoriesTray } from '../components/TodayStoriesTray';
import {
  formatKRW,
  formatDate,
  calculateOverallWorthScore,
  calculateCategoryWorthStats,
} from '../utils/calculator';

interface HomeViewProps {
  items: WorthItem[];
  itemStats: ItemStats[];
  records: UsageRecord[];
  consecutiveStreak: number;
  onOpenAddItem: () => void;
  onSelectItem: (item: WorthItem) => void;
  onQuickAddOne: (item: WorthItem, e: React.MouseEvent) => void;
  onBatchQuickAdd: (itemIds: string[]) => void;
  onOpenLogModal: (item: WorthItem) => void;
  onNavigateToItems: () => void;
  onNavigateToAnalytics?: () => void;
  onLoadDemoData?: () => void;
  onOpenReceipt?: (stats: ItemStats) => void;
}

export const HomeView: React.FC<HomeViewProps> = ({
  items,
  itemStats,
  records,
  consecutiveStreak,
  onOpenAddItem,
  onSelectItem,
  onQuickAddOne,
  onBatchQuickAdd,
  onOpenLogModal,
  onNavigateToItems,
  onNavigateToAnalytics,
  onLoadDemoData,
  onOpenReceipt,
}) => {
  // Feed Filter Tab (Instagram/Pinterest style in-feed pills)
  const [feedFilter, setFeedFilter] = useState<'all' | 'close' | 'inactive'>('all');

  // Empty state if no items registered
  if (items.length === 0) {
    return (
      <div className="py-12 px-4 max-w-lg mx-auto text-center space-y-6 animate-in fade-in duration-300">
        <div className="w-16 h-16 rounded-3xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto shadow-xs">
          <Sparkles className="w-8 h-8" />
        </div>

        <div className="space-y-2">
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            내 소비, 얼마나 잘 쓰고 있을까?
          </h2>
          <p className="text-sm text-slate-600 leading-relaxed max-w-sm mx-auto">
            구매한 물건이나 구독 서비스를 등록하고 실제 사용단가와 본전 달성률을 확인해 보세요.
          </p>
        </div>

        <div className="p-5 rounded-3xl bg-white border border-slate-200/90 shadow-xs text-left space-y-3.5">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            WorthIt 3단계 본전 찾기
          </p>
          <div className="flex items-center gap-3">
            <span className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold flex items-center justify-center shrink-0">
              1
            </span>
            <p className="text-xs text-slate-700">
              <strong>구매한 소비 등록:</strong> 가격과 목표 단가를 설정해요.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold flex items-center justify-center shrink-0">
              2
            </span>
            <p className="text-xs text-slate-700">
              <strong>사용한 만큼 기록:</strong> 쓸 때마다 +1회 눌러서 기록해요.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold flex items-center justify-center shrink-0">
              3
            </span>
            <p className="text-xs text-slate-700">
              <strong>낮아지는 단가 확인:</strong> 목표 도달 시 본전 달성 업적 획득!
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-2.5 pt-2">
          <button
            onClick={onOpenAddItem}
            className="w-full py-3.5 px-6 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold text-sm rounded-2xl transition-colors shadow-md shadow-emerald-600/25 flex items-center justify-center gap-2"
          >
            <Plus className="w-5 h-5 stroke-[2.5]" />
            <span>첫 소비 등록하기</span>
          </button>

          {onLoadDemoData && (
            <button
              onClick={onLoadDemoData}
              className="w-full py-2.5 px-4 text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors"
            >
              체험용 샘플 데이터로 둘러보기
            </button>
          )}
        </div>
      </div>
    );
  }

  // Greeting by hour
  const currentHour = new Date().getHours();
  const greeting =
    currentHour < 12
      ? { text: '상쾌한 아침이에요!', desc: '오늘도 하루를 활기차게 시작해 봐요.', icon: Sun }
      : currentHour < 18
      ? { text: '활기찬 오후예요!', desc: '오늘 산 물건들을 잘 활용하고 계신가요?', icon: Coffee }
      : { text: '포근한 저녁이에요!', desc: '오늘 하루 쓴 물건들의 가치를 체크해 보세요.', icon: Moon };

  const GreetingIcon = greeting.icon;

  // Summary counts
  const totalItemsCount = items.length;
  const completedGoalsCount = itemStats.filter((s) => s.isGoalAchieved).length;

  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 86400000);
  const thisWeekRecordsCount = records.filter(
    (r) => new Date(r.usedAt) >= weekAgo
  ).length;

  // Overall Worth Break-Even Calculations
  const overallScore = calculateOverallWorthScore(itemStats);
  const categoryWorth = calculateCategoryWorthStats(itemStats);

  // Highlights filters
  const closeToGoalStats = itemStats
    .filter((s) => !s.isGoalAchieved && s.progress >= 40)
    .sort((a, b) => b.progress - a.progress);

  const inactiveStats = itemStats
    .filter((s) => s.item.usageMethod === 'usage' && s.item.status === 'active')
    .filter((s) => {
      if (!s.lastUsedAt) return true;
      const lastDate = new Date(s.lastUsedAt);
      const diff = (now.getTime() - lastDate.getTime()) / 86400000;
      return diff >= 7;
    });

  // Filtered Cards to display in the main feed
  const displayedStats =
    feedFilter === 'close'
      ? closeToGoalStats
      : feedFilter === 'inactive'
      ? inactiveStats
      : itemStats;

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* 1. Daily Motivation Header */}
      <div className="flex items-center justify-between pb-0.5">
        <div>
          <div className="flex items-center gap-2">
            <GreetingIcon className="w-4 h-4 text-emerald-600" />
            <h1 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">
              {greeting.text}
            </h1>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">{greeting.desc}</p>
        </div>

        {consecutiveStreak > 0 && (
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 border border-amber-200/80 rounded-2xl text-amber-800 text-xs font-bold shrink-0">
            <Flame className="w-4 h-4 fill-amber-500 text-amber-500" />
            <span>{consecutiveStreak}일 연속</span>
          </div>
        )}
      </div>

      {/* 2. Instagram Stories-style Circular Quick Tray */}
      <TodayStoriesTray
        items={items}
        itemStats={itemStats}
        records={records}
        consecutiveStreak={consecutiveStreak}
        onQuickAddOne={onQuickAddOne}
        onBatchQuickAdd={onBatchQuickAdd}
        onSelectItem={onSelectItem}
        onOpenAddItem={onOpenAddItem}
      />

      {/* 3. Daily Worth Summary Card (Clean, Human & Grounded) */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/90 shadow-xs space-y-4">
        {/* Top bar: title and subtle analytics link */}
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-500 tracking-tight">
            목표 대비 사용 진행률
          </span>
          {onNavigateToAnalytics && (
            <button
              type="button"
              onClick={onNavigateToAnalytics}
              className="text-xs font-medium text-slate-500 hover:text-slate-900 transition-colors flex items-center gap-0.5 active:scale-95"
            >
              <span>상세 분석</span>
              <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
            </button>
          )}
        </div>

        {/* Value Headline */}
        <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-2">
          <div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900 font-mono tabular-nums">
                {overallScore.averageProgress}%
              </span>
              <span className="text-sm font-semibold text-emerald-600">
                {overallScore.grade}
              </span>
            </div>
            <p className="text-xs text-slate-600 mt-1 font-medium">
              직접 설정한 사용 횟수·기간을 기준으로 계산해요.
            </p>
          </div>

          <div className="text-left sm:text-right text-xs text-slate-500 font-medium pt-1 sm:pt-0">
            <span>총 {totalItemsCount}개 중 {completedGoalsCount}개 달성</span>
            <span className="mx-1.5 text-slate-300" aria-hidden="true">·</span>
            <span className="font-mono tabular-nums">이번 주 {thisWeekRecordsCount}회 사용</span>
          </div>
        </div>

        {/* Minimal Progress Bar */}
        <div className="space-y-1.5">
          <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-emerald-500 rounded-full transition-all duration-700"
              style={{ width: `${Math.min(100, Math.max(3, overallScore.averageProgress))}%` }}
            />
          </div>
          <div className="flex items-center justify-between text-[11px] text-slate-400">
            <span>{overallScore.comment}</span>
            {categoryWorth.length > 1 && (
              <div className="hidden sm:flex items-center gap-2">
                {categoryWorth.map((cat, idx) => (
                  <span key={cat.category} className="flex items-center gap-1">
                    {idx > 0 && <span className="text-slate-300" aria-hidden="true">·</span>}
                    <span>{cat.emoji}</span>
                    <span>{cat.label}</span>
                    <strong className="text-slate-700 font-mono tabular-nums">{cat.averageProgress}%</strong>
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* If mobile and multiple categories exist */}
        {categoryWorth.length > 1 && (
          <div className="sm:hidden pt-2 border-t border-slate-100 flex items-center gap-3 text-[11px] text-slate-500 overflow-x-auto scrollbar-none">
            <span className="text-slate-400 shrink-0 font-medium">분야별:</span>
            {categoryWorth.map((cat, idx) => (
              <span key={cat.category} className="whitespace-nowrap flex items-center gap-1 shrink-0">
                {idx > 0 && <span className="text-slate-300 mr-2" aria-hidden="true">·</span>}
                <span>{cat.emoji}</span>
                <span>{cat.label}</span>
                <strong className="text-slate-800 font-mono tabular-nums">{cat.averageProgress}%</strong>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* 5. Main Pinterest-style Consumption Feed */}
      <section className="space-y-3.5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-slate-900">오늘의 소비 현황</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              쓸 때마다 +1회 탭해서 회당 단가를 줄여보세요.
            </p>
          </div>

          {/* Social In-Feed Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none">
            <button
              type="button"
              onClick={() => setFeedFilter('all')}
              className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all whitespace-nowrap ${
                feedFilter === 'all'
                  ? 'bg-slate-900 text-white shadow-2xs'
                  : 'bg-white border border-slate-200/80 text-slate-600 hover:text-slate-900'
              }`}
            >
              전체 소비 ({items.length})
            </button>
            <button
              type="button"
              onClick={() => setFeedFilter('close')}
              className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all whitespace-nowrap flex items-center gap-1 ${
                feedFilter === 'close'
                  ? 'bg-emerald-600 text-white shadow-2xs'
                  : 'bg-white border border-slate-200/80 text-slate-600 hover:text-slate-900'
              }`}
            >
              <span>🎯 목표 임박</span>
              <span>({closeToGoalStats.length})</span>
            </button>
            <button
              type="button"
              onClick={() => setFeedFilter('inactive')}
              className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all whitespace-nowrap flex items-center gap-1 ${
                feedFilter === 'inactive'
                  ? 'bg-amber-600 text-white shadow-2xs'
                  : 'bg-white border border-slate-200/80 text-slate-600 hover:text-slate-900'
              }`}
            >
              <span>💤 잠자는 소비</span>
              <span>({inactiveStats.length})</span>
            </button>
          </div>
        </div>

        {/* Card Grid */}
        {displayedStats.length === 0 ? (
          <div className="py-12 text-center rounded-3xl border border-dashed border-slate-200 bg-white p-6">
            <Sparkles className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <p className="text-sm font-bold text-slate-700">해당하는 소비 항목이 없습니다</p>
            <p className="text-xs text-slate-400 mt-1">
              상단 필터에서 '전체 소비'를 선택해 보세요.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {displayedStats.map((stats) => (
              <ItemCard
                key={stats.item.id}
                stats={stats}
                onClick={() => onSelectItem(stats.item)}
                onQuickAddOne={(e) => onQuickAddOne(stats.item, e)}
                onOpenLogModal={(e) => {
                  e.stopPropagation();
                  onOpenLogModal(stats.item);
                }}
                onOpenReceipt={
                  onOpenReceipt
                    ? (e) => {
                        e.stopPropagation();
                        onOpenReceipt(stats);
                      }
                    : undefined
                }
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
};
