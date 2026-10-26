import React, { useMemo } from 'react';
import {
  PieChart,
  TrendingUp,
  Award,
  Layers,
  Calendar,
  AlertCircle,
  CheckCircle2,
  Package,
  RefreshCw,
  CreditCard,
  Sparkles,
} from 'lucide-react';
import { WorthItem, UsageRecord, ItemStats } from '../types';
import {
  formatKRW,
  getTodayDateString,
  formatDate,
  calculateOverallWorthScore,
  calculateCategoryWorthStats,
} from '../utils/calculator';

interface AnalyticsViewProps {
  items: WorthItem[];
  itemStats: ItemStats[];
  records: UsageRecord[];
  onSelectItem: (item: WorthItem) => void;
}

export const AnalyticsView: React.FC<AnalyticsViewProps> = ({
  items,
  itemStats,
  records,
  onSelectItem,
}) => {
  // If no items, show friendly guidance
  if (items.length === 0) {
    return (
      <div className="py-16 text-center rounded-2xl border border-dashed border-slate-200 bg-white p-6">
        <PieChart className="w-10 h-10 text-slate-300 mx-auto mb-2" />
        <h3 className="text-base font-bold text-slate-800">분석할 소비 데이터가 없습니다</h3>
        <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">
          소비를 등록하고 사용을 기록하면 카테고리별 지출, 달성률 랭킹, 주간 활동 추이를 확인할 수 있습니다.
        </p>
      </div>
    );
  }

  // 1. Total Registered Purchase Price (non-duplicated)
  const totalPurchasePrice = useMemo(() => {
    return items.reduce((sum, item) => sum + (item.purchasePrice || 0), 0);
  }, [items]);

  // 2. Category spending breakdown
  const categorySpending = useMemo(() => {
    const cats: Record<string, { label: string; amount: number; count: number; color: string }> = {
      item: { label: '물건', amount: 0, count: 0, color: 'bg-emerald-500' },
      subscription: { label: '구독', amount: 0, count: 0, color: 'bg-blue-500' },
      membership: { label: '회원권', amount: 0, count: 0, color: 'bg-amber-500' },
      other: { label: '기타', amount: 0, count: 0, color: 'bg-purple-500' },
    };

    items.forEach((it) => {
      if (cats[it.category]) {
        cats[it.category].amount += it.purchasePrice;
        cats[it.category].count += 1;
      }
    });

    return Object.entries(cats).map(([key, val]) => ({
      key,
      ...val,
      percentage: totalPurchasePrice > 0 ? Math.round((val.amount / totalPurchasePrice) * 100) : 0,
    }));
  }, [items, totalPurchasePrice]);

  // 3. Goal Progress Distribution
  const progressBuckets = useMemo(() => {
    const buckets = [
      { label: '0~24%', desc: '시작 단계', count: 0, color: 'bg-slate-300' },
      { label: '25~49%', desc: '사용 중', count: 0, color: 'bg-amber-400' },
      { label: '50~74%', desc: '절반 돌파', count: 0, color: 'bg-teal-400' },
      { label: '75~99%', desc: '거의 달성', count: 0, color: 'bg-emerald-400' },
      { label: '100%', desc: '목표 달성', count: 0, color: 'bg-emerald-600' },
    ];

    itemStats.forEach((s) => {
      if (s.isGoalAchieved || s.progress >= 100) buckets[4].count += 1;
      else if (s.progress >= 75) buckets[3].count += 1;
      else if (s.progress >= 50) buckets[2].count += 1;
      else if (s.progress >= 25) buckets[1].count += 1;
      else buckets[0].count += 1;
    });

    return buckets;
  }, [itemStats]);

  // 4. TOP 5 Goal Completion Ranking (comparing standardized achievement rate %)
  const topRankings = useMemo(() => {
    return [...itemStats].sort((a, b) => b.progress - a.progress).slice(0, 5);
  }, [itemStats]);

  // 5. Closest to Goal
  const closestToGoal = useMemo(() => {
    return [...itemStats]
      .filter((s) => !s.isGoalAchieved)
      .sort((a, b) => b.progress - a.progress)
      .slice(0, 3);
  }, [itemStats]);

  // 6. Inactive Items
  const inactiveItems = useMemo(() => {
    const now = new Date().getTime();
    return [...itemStats]
      .filter((s) => s.item.usageMethod === 'usage' && s.item.status === 'active')
      .sort((a, b) => {
        const aTime = a.lastUsedAt ? new Date(a.lastUsedAt).getTime() : 0;
        const bTime = b.lastUsedAt ? new Date(b.lastUsedAt).getTime() : 0;
        return aTime - bTime;
      })
      .slice(0, 3);
  }, [itemStats]);

  // 7. Last 7 Days Activity chart data
  const last7DaysChart = useMemo(() => {
    const days: { dateStr: string; label: string; count: number }[] = [];
    const now = new Date();

    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const dateStr = getTodayDateString(d);
      const dayName = ['일', '월', '화', '수', '목', '금', '토'][d.getDay()];
      const label = `${d.getMonth() + 1}/${d.getDate()} (${dayName})`;

      const count = records.filter((r) => r.usedAt === dateStr).length;
      days.push({ dateStr, label, count });
    }

    const maxCount = Math.max(1, ...days.map((d) => d.count));
    return { days, maxCount };
  }, [records]);

  // 8. Last 30 Days Activity Summary
  const last30DaysCount = useMemo(() => {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const cutoffDate = getTodayDateString(thirtyDaysAgo);
    return records.filter((r) => r.usedAt >= cutoffDate).length;
  }, [records]);

  // Overall & Category Worth Break-Even Calculations
  const overallScore = useMemo(() => calculateOverallWorthScore(itemStats), [itemStats]);
  const categoryWorth = useMemo(() => calculateCategoryWorthStats(itemStats), [itemStats]);

  const bestCategory = useMemo(() => {
    if (categoryWorth.length === 0) return null;
    return [...categoryWorth].sort((a, b) => b.averageProgress - a.averageProgress)[0];
  }, [categoryWorth]);

  const needsAttentionCategory = useMemo(() => {
    if (categoryWorth.length < 2) return null;
    const sorted = [...categoryWorth].sort((a, b) => a.averageProgress - b.averageProgress);
    return sorted[0].averageProgress < 50 ? sorted[0] : null;
  }, [categoryWorth]);

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* View Title */}
      <div>
        <h2 className="text-xl font-bold text-slate-900">소비 가치 분석</h2>
        <p className="text-xs text-slate-500 mt-0.5">
          등록한 소비의 종합 평균 본전 지수와 카테고리별 활용도를 한눈에 파악해요.
        </p>
      </div>

      {/* 1. Overall Worth Break-Even Hero Card ("내 소비 종합 본전 분석") */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-xs space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-500 tracking-tight">
                내 소비 종합 본전 현황
              </span>
              <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-lg">
                {overallScore.grade}
              </span>
            </div>
            <h3 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 font-mono tabular-nums">
              목표 대비 사용 진행률 <span className="text-emerald-600">{overallScore.averageProgress}%</span>
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed max-w-md">
              {overallScore.comment}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2.5 sm:w-auto w-full shrink-0">
            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 text-center">
              <span className="text-[11px] text-slate-500 block font-medium">항목별 평균 진행률</span>
              <strong className="text-xl font-extrabold text-slate-900 mt-0.5 block font-mono tabular-nums">
                {overallScore.averageProgress}%
              </strong>
              <span className="text-[10px] text-slate-400">항목별 달성률 평균</span>
            </div>
            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 text-center">
              <span className="text-[11px] text-slate-500 block font-medium">금액 가중 진행률</span>
              <strong className="text-xl font-extrabold text-emerald-600 mt-0.5 block font-mono tabular-nums">
                {overallScore.weightedProgress}%
              </strong>
              <span className="text-[10px] text-slate-400">지출이 큰 항목에 더 큰 비중</span>
            </div>
          </div>
        </div>

        {/* Recovered Value Meter */}
        <div className="space-y-2 pt-2 border-t border-slate-100">
          <div className="flex justify-between items-baseline text-xs">
            <span className="text-slate-600 font-medium">목표 달성 항목</span>
            <span className="text-slate-900 font-semibold font-mono tabular-nums">
              {overallScore.achievedCount}개 <span className="text-slate-400 font-normal">/ {overallScore.totalCount}개</span>
            </span>
          </div>
          <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-emerald-500 rounded-full transition-all duration-700"
              style={{ width: `${Math.min(100, overallScore.averageProgress)}%` }}
            />
          </div>
        </div>
      </div>

      {/* 2. Top 3 High Level KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-sm">
          <span className="text-xs text-slate-500 font-medium">총 등록 구매 금액</span>
          <p className="text-xl font-bold text-slate-900 mt-1">
            {formatKRW(totalPurchasePrice)}
          </p>
          <span className="text-[11px] text-slate-400 mt-0.5 block">
            총 {items.length}개 소비 항목
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-sm">
          <span className="text-xs text-slate-500 font-medium">본전 달성 완료</span>
          <p className="text-xl font-bold text-emerald-600 mt-1">
            {itemStats.filter((s) => s.isGoalAchieved).length}개
          </p>
          <span className="text-[11px] text-slate-400 mt-0.5 block">
            전체의{' '}
            {items.length > 0
              ? Math.round(
                  (itemStats.filter((s) => s.isGoalAchieved).length / items.length) * 100
                )
              : 0}
            % 본전 도달
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-sm">
          <span className="text-xs text-slate-500 font-medium">최근 30일 기록 이벤트</span>
          <p className="text-xl font-bold text-slate-900 mt-1">{last30DaysCount}회</p>
          <span className="text-[11px] text-slate-400 mt-0.5 block">
            누적 총 {records.length}회 기록됨
          </span>
        </div>
      </div>

      {/* 3. Category Average Break-Even Section ("카테고리별 평균 본전 & 활용도") */}
      {categoryWorth.length > 0 && (
        <section className="p-5 sm:p-6 rounded-3xl bg-white border border-slate-200/90 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            <div>
              <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
                <span>카테고리별 평균 본전 & 활용도</span>
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-semibold">
                  분야별 분석
                </span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                어떤 분야의 소비를 가장 알차게 쓰고 있는지 한눈에 비교해 보세요.
              </p>
            </div>

            {bestCategory && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200/70 text-xs font-semibold text-emerald-800 shrink-0">
                <span>🥇 최고 활용 분야:</span>
                <strong className="text-emerald-900">{bestCategory.label} ({bestCategory.averageProgress}%)</strong>
              </div>
            )}
          </div>

          {/* Category Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-1">
            {categoryWorth.map((cat) => (
              <div
                key={cat.category}
                className="p-4 rounded-2xl bg-slate-50/70 border border-slate-200/80 hover:border-slate-300 transition-colors space-y-3"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{cat.emoji}</span>
                    <div>
                      <h4 className="font-bold text-sm text-slate-900">{cat.label}</h4>
                      <span className="text-[11px] text-slate-500">
                        {cat.itemCount}개 항목 · {formatKRW(cat.totalSpend)}
                      </span>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-lg font-extrabold text-slate-900">
                      {cat.averageProgress}%
                    </span>
                    <span className="block text-[10px] font-semibold text-emerald-700 bg-emerald-100/70 px-2 py-0.5 rounded-full mt-0.5">
                      {cat.statusBadge}
                    </span>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="space-y-1">
                  <div className="w-full h-2 rounded-full bg-slate-200 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        cat.averageProgress >= 75
                          ? 'bg-emerald-500'
                          : cat.averageProgress >= 40
                          ? 'bg-teal-500'
                          : 'bg-amber-500'
                      }`}
                      style={{ width: `${Math.min(100, Math.max(4, cat.averageProgress))}%` }}
                    />
                  </div>
                  <div className="flex justify-between items-center text-[10px] text-slate-400">
                    <span>달성 완료 {cat.achievedCount}개</span>
                    <span>평균 본전 달성률</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Helpful Coaching Insight */}
          {needsAttentionCategory && (
            <div className="p-3.5 rounded-2xl bg-amber-50/80 border border-amber-200/70 text-xs text-amber-900 flex items-start gap-2">
              <span className="text-base shrink-0">💡</span>
              <p>
                <strong>{needsAttentionCategory.label}</strong> 카테고리의 평균 달성률이{' '}
                <strong>{needsAttentionCategory.averageProgress}%</strong>로 상대적으로 낮아요.
                사용 기록을 쌓으면 설정한 목표 단가에 얼마나 가까워졌는지 확인할 수 있어요.
              </p>
            </div>
          )}
        </section>
      )}

      {/* Category Spending Breakdown */}
      <section className="p-5 rounded-2xl bg-white border border-slate-200/90 shadow-sm space-y-4">
        <h3 className="font-bold text-sm text-slate-900">카테고리별 구매 금액</h3>

        {/* Multi-segment stacked bar */}
        <div className="w-full h-3 rounded-full bg-slate-100 flex overflow-hidden">
          {categorySpending.map((cat) => (
            <div
              key={cat.key}
              className={`${cat.color} transition-all duration-300`}
              style={{ width: `${cat.percentage}%` }}
              title={`${cat.label}: ${cat.percentage}%`}
            />
          ))}
        </div>

        {/* Legend Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
          {categorySpending.map((cat) => (
            <div key={cat.key} className="p-3 rounded-xl bg-slate-50/70 border border-slate-100">
              <div className="flex items-center gap-1.5 text-xs text-slate-600">
                <span className={`w-2 h-2 rounded-full ${cat.color}`} />
                <span className="font-medium">{cat.label}</span>
              </div>
              <p className="font-bold text-sm text-slate-900 mt-1">{formatKRW(cat.amount)}</p>
              <div className="flex items-center justify-between text-[11px] text-slate-400 mt-0.5">
                <span>{cat.count}개 항목</span>
                <span>{cat.percentage}%</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Recent 7 Days Activity Chart (Interactive Clean SVG) */}
      <section className="p-5 rounded-2xl bg-white border border-slate-200/90 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-sm text-slate-900">최근 7일 사용 기록 추이</h3>
          <span className="text-xs text-slate-400">
            총 {last7DaysChart.days.reduce((s, d) => s + d.count, 0)}회 기록
          </span>
        </div>

        <div className="flex items-end justify-between gap-2 h-36 pt-4 pb-2">
          {last7DaysChart.days.map((day) => {
            const heightPercent =
              day.count > 0 ? Math.max(16, (day.count / last7DaysChart.maxCount) * 100) : 6;
            return (
              <div key={day.dateStr} className="flex-1 flex flex-col items-center gap-2 group">
                <span className="text-[11px] font-bold text-slate-600 opacity-0 group-hover:opacity-100 transition-opacity">
                  {day.count}회
                </span>
                <div className="w-full max-w-[36px] bg-slate-100 rounded-lg flex items-end h-24 overflow-hidden p-0.5">
                  <div
                    className={`w-full rounded-md transition-all duration-300 ${
                      day.count > 0
                        ? 'bg-emerald-500 group-hover:bg-emerald-600 shadow-sm'
                        : 'bg-slate-200'
                    }`}
                    style={{ height: `${heightPercent}%` }}
                  />
                </div>
                <span className="text-[11px] text-slate-500 whitespace-nowrap">
                  {day.label.split(' ')[0]}
                </span>
              </div>
            );
          })}
        </div>
      </section>

      {/* Goal Completion Rate Distribution */}
      <section className="p-5 rounded-2xl bg-white border border-slate-200/90 shadow-sm space-y-4">
        <h3 className="font-bold text-sm text-slate-900">목표 달성률 구간별 분포</h3>
        <div className="space-y-3">
          {progressBuckets.map((b) => {
            const pct = items.length > 0 ? Math.round((b.count / items.length) * 100) : 0;
            return (
              <div key={b.label} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-800">
                    {b.label} ({b.desc})
                  </span>
                  <span className="text-slate-500">
                    {b.count}개 ({pct}%)
                  </span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                  <div
                    className={`${b.color} h-2 rounded-full transition-all duration-300`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Rankings Section: TOP 5 + Closest to Goal */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Top 5 Goal Progress */}
        <section className="p-5 rounded-2xl bg-white border border-slate-200/90 shadow-sm space-y-3">
          <div className="flex items-center gap-2">
            <Award className="w-4 h-4 text-emerald-600" />
            <h3 className="font-bold text-sm text-slate-900">목표 달성률 TOP 5</h3>
          </div>

          <div className="space-y-2">
            {topRankings.map((st, idx) => (
              <div
                key={st.item.id}
                onClick={() => onSelectItem(st.item)}
                className="p-3 rounded-xl bg-slate-50 hover:bg-slate-100/80 cursor-pointer transition-colors flex items-center justify-between text-xs"
              >
                <div className="flex items-center gap-2.5 min-w-0 pr-2">
                  <span
                    className={`w-5 h-5 rounded-full flex items-center justify-center font-bold text-[11px] shrink-0 ${
                      idx === 0
                        ? 'bg-amber-100 text-amber-800'
                        : idx === 1
                        ? 'bg-slate-200 text-slate-700'
                        : idx === 2
                        ? 'bg-amber-50 text-amber-900'
                        : 'bg-slate-100 text-slate-500'
                    }`}
                  >
                    {idx + 1}
                  </span>
                  <div className="truncate">
                    <p className="font-bold text-slate-800 truncate">{st.item.name}</p>
                    <p className="text-slate-400 text-[11px]">
                      {formatKRW(st.item.purchasePrice)}
                    </p>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <span className="font-bold text-emerald-600 text-sm">{st.progress}%</span>
                  <p className="text-[10px] text-slate-400">
                    {st.isGoalAchieved ? '달성' : '진행중'}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Closest & Inactive summary */}
        <section className="p-5 rounded-2xl bg-white border border-slate-200/90 shadow-sm space-y-3">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-blue-600" />
            <h3 className="font-bold text-sm text-slate-900">목표 달성까지 가장 가까운 소비</h3>
          </div>

          {closestToGoal.length === 0 ? (
            <p className="text-xs text-slate-400 py-6 text-center">
              모든 소비가 이미 목표를 달성했거나 추가 소비가 필요합니다!
            </p>
          ) : (
            <div className="space-y-2">
              {closestToGoal.map((st) => (
                <div
                  key={st.item.id}
                  onClick={() => onSelectItem(st.item)}
                  className="p-3 rounded-xl bg-slate-50 hover:bg-slate-100/80 cursor-pointer transition-colors flex items-center justify-between text-xs"
                >
                  <div className="min-w-0 pr-2">
                    <p className="font-bold text-slate-800 truncate">{st.item.name}</p>
                    <p className="text-slate-500 text-[11px] mt-0.5">
                      남은 {st.remainingUsage}
                      {st.item.usageMethod === 'days' ? '일' : st.item.usageUnit} 사용 시 본전!
                    </p>
                  </div>
                  <span className="font-bold text-slate-700">{st.progress}%</span>
                </div>
              ))}
            </div>
          )}

          {/* Inactive reminder */}
          {inactiveItems.length > 0 && (
            <div className="pt-2 border-t border-slate-100">
              <span className="text-xs font-bold text-amber-700 flex items-center gap-1 mb-1.5">
                <AlertCircle className="w-3.5 h-3.5" />
                <span>잠자고 있는 소비 깨우기</span>
              </span>
              <p className="text-xs text-slate-500">
                <strong>{inactiveItems[0].item.name}</strong> 등 최근 기록이 뜸한 소비가 있어요.
                한 번 더 사용하고 본전 달성률을 끌어올려 보세요!
              </p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
};
