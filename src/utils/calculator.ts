import {
  WorthItem,
  UsageRecord,
  ItemStats,
  BillingPeriod,
  OverallWorthScore,
  CategoryWorthStats,
  ItemCategory,
} from '../types';

/**
 * Calculates local day difference safely without timezone skew.
 * e.g., today is 2026-10-25 and purchase is 2026-10-25 -> 1 day owned (inclusive)
 */
export function getDaysOwned(purchaseDateStr: string, referenceDateStr?: string): number {
  if (!purchaseDateStr) return 1;

  const todayStr = referenceDateStr || getTodayDateString();
  const [pYear, pMonth, pDay] = purchaseDateStr.split('-').map(Number);
  const [tYear, tMonth, tDay] = todayStr.split('-').map(Number);

  const purchaseUtc = Date.UTC(pYear, pMonth - 1, pDay);
  const todayUtc = Date.UTC(tYear, tMonth - 1, tDay);

  const diffMs = todayUtc - purchaseUtc;
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  return Math.max(1, diffDays + 1);
}

/**
 * Returns today's date formatted as YYYY-MM-DD in local time
 */
export function getTodayDateString(date: Date = new Date()): string {
  const now = date;
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Formats KRW currency with commas
 */
export function formatKRW(amount: number | null | undefined): string {
  if (amount === null || amount === undefined || isNaN(amount)) {
    return '0원';
  }
  return `${Math.round(amount).toLocaleString('ko-KR')}원`;
}

/**
 * Formats date into standard Korean readable format: YYYY. MM. DD
 */
export function formatDate(dateStr: string): string {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    return `${parts[0]}. ${parts[1]}. ${parts[2]}`;
  }
  return dateStr;
}

/**
 * Calculates required usage/days based on price, target unit cost, and unit type
 */
export function calculateRequiredUsage(
  purchasePrice: number,
  targetUnitCost: number,
  unit: string
): number {
  if (purchasePrice <= 0) return 0;
  if (targetUnitCost <= 0) return 1;

  const raw = purchasePrice / targetUnitCost;
  if (unit === '시간') {
    // 0.5 hour step ceiling
    return Math.ceil(raw * 2) / 2;
  }
  return Math.ceil(raw);
}

/**
 * Pure calculation engine for an individual WorthItem and its records
 */
export function calculateItemStats(
  item: WorthItem,
  records: UsageRecord[],
  billingPeriods: BillingPeriod[] = []
): ItemStats {
  const isDays = item.usageMethod === 'days';
  const daysOwned = getDaysOwned(item.purchaseDate);

  // Filter records for this item
  const itemRecords = records.filter((r) => r.itemId === item.id);
  const totalUsage = itemRecords.reduce((acc, r) => acc + (r.quantity || 0), 0);

  // Subscriptions can have multiple billing periods
  const itemBillingPeriods = billingPeriods.filter((b) => b.itemId === item.id);
  const totalSubscriptionSpent = itemBillingPeriods
    .filter((b) => b.status === 'paid')
    .reduce((acc, b) => acc + b.amount, 0);

  const totalSpent =
    item.category === 'subscription' && itemBillingPeriods.length > 0
      ? totalSubscriptionSpent
      : item.purchasePrice;

  const basePrice = totalSpent;

  // Required count
  const requiredUsage = calculateRequiredUsage(
    basePrice,
    item.targetUnitCost,
    isDays ? '일' : item.usageUnit
  );

  let currentUnitCost: number | null = null;
  let remainingUsage = 0;
  let progress = 0;
  let isGoalAchieved = false;

  if (basePrice === 0) {
    // Free item
    currentUnitCost = 0;
    progress = 100;
    isGoalAchieved = true;
    remainingUsage = 0;
  } else if (isDays) {
    currentUnitCost = basePrice / daysOwned;
    if (requiredUsage > 0) {
      progress = Math.min(100, Math.max(0, (daysOwned / requiredUsage) * 100));
      remainingUsage = Math.max(0, requiredUsage - daysOwned);
    } else {
      progress = 100;
      remainingUsage = 0;
    }
    isGoalAchieved = currentUnitCost <= item.targetUnitCost || daysOwned >= requiredUsage;
  } else {
    // Usage-based
    if (totalUsage === 0) {
      currentUnitCost = null;
      remainingUsage = requiredUsage;
      progress = 0;
      isGoalAchieved = false;
    } else {
      currentUnitCost = basePrice / totalUsage;
      if (requiredUsage > 0) {
        progress = Math.min(100, Math.max(0, (totalUsage / requiredUsage) * 100));
        remainingUsage = Math.max(0, requiredUsage - totalUsage);
      } else {
        progress = 100;
        remainingUsage = 0;
      }
      isGoalAchieved = currentUnitCost <= item.targetUnitCost || totalUsage >= requiredUsage;
    }
  }

  // Find last used date
  let lastUsedAt: string | undefined;
  if (itemRecords.length > 0) {
    const sorted = [...itemRecords].sort((a, b) => b.usedAt.localeCompare(a.usedAt));
    lastUsedAt = sorted[0].usedAt;
  }

  // Status message & tier
  let tier: ItemStats['tier'] = 'tier1';
  let statusMessage = '조금씩 본전을 향해 가고 있어요.';

  if (isGoalAchieved || progress >= 100) {
    tier = 'achieved';
    statusMessage = '목표 사용단가를 달성했어요! 🎉';
  } else if (progress >= 75) {
    tier = 'tier4';
    statusMessage = '목표까지 얼마 남지 않았어요!';
  } else if (progress >= 50) {
    tier = 'tier3';
    statusMessage = '벌써 절반을 넘었어요!';
  } else if (progress >= 25) {
    tier = 'tier2';
    statusMessage = '꾸준히 잘 활용하고 있어요!';
  } else {
    tier = 'tier1';
    statusMessage = '조금씩 본전을 향해 가고 있어요.';
  }

  const unitSuffix = isDays ? '/일' : `/${item.usageUnit}`;
  const unitCostFormatted =
    currentUnitCost !== null
      ? `${formatKRW(currentUnitCost)}${unitSuffix}`
      : '아직 사용 기록이 없어요';

  const targetCostFormatted = `${formatKRW(item.targetUnitCost)}${unitSuffix}`;

  return {
    item,
    totalUsage,
    currentUnitCost,
    requiredUsage,
    remainingUsage,
    progress: Math.round(progress * 10) / 10,
    isGoalAchieved,
    daysOwned,
    lastUsedAt,
    unitCostFormatted,
    targetCostFormatted,
    statusMessage,
    tier,
    totalSpent,
  };
}

/**
 * Calculates unit cost reduction when adding a new usage count
 */
export function calculateCostReductionDelta(
  item: WorthItem,
  currentUsage: number,
  additionalQuantity: number
): { previousCost: number; newCost: number; delta: number } | null {
  if (item.usageMethod === 'days' || additionalQuantity <= 0) return null;
  if (item.purchasePrice <= 0) return null;

  const currentTotal = currentUsage;
  const newTotal = currentTotal + additionalQuantity;

  if (currentTotal === 0) {
    const newCost = item.purchasePrice / newTotal;
    return {
      previousCost: item.purchasePrice,
      newCost,
      delta: item.purchasePrice - newCost,
    };
  }

  const previousCost = item.purchasePrice / currentTotal;
  const newCost = item.purchasePrice / newTotal;
  const delta = Math.max(0, previousCost - newCost);

  return {
    previousCost,
    newCost,
    delta,
  };
}

/**
 * Calculates consecutive logging streak in days from usage records
 */
export function calculateConsecutiveDaysStreak(records: UsageRecord[]): number {
  if (!records || records.length === 0) return 0;

  // Extract unique sorted dates (descending)
  const uniqueDates = Array.from(new Set(records.map((r) => r.usedAt))).sort((a, b) =>
    b.localeCompare(a)
  );

  if (uniqueDates.length === 0) return 0;

  const today = getTodayDateString();
  const yesterdayDate = new Date();
  yesterdayDate.setDate(yesterdayDate.getDate() - 1);
  const yesterday = getTodayDateString(yesterdayDate);

  // Check if latest record is today or yesterday
  const latestDate = uniqueDates[0];
  if (latestDate !== today && latestDate !== yesterday) {
    return 0; // Streak broken
  }

  let streak = 1;
  for (let i = 0; i < uniqueDates.length - 1; i++) {
    const curr = new Date(uniqueDates[i]);
    const next = new Date(uniqueDates[i + 1]);
    const diffDays = Math.round((curr.getTime() - next.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === 1) {
      streak++;
    } else {
      break;
    }
  }

  return streak;
}

/**
 * Returns intuitive everyday life price equivalence with wide ranges (100원 ~ 1,000,000원+)
 */
export function getRealLifeEquivalence(cost: number): { emoji: string; label: string; text: string } {
  if (cost <= 0) {
    return { emoji: '✨', label: '완전 무료', text: '0원으로 매일 누리는 갓성비' };
  }
  if (cost <= 100) {
    return { emoji: '🍬', label: '막대사탕 한 알 (100원)', text: '숨만 쉬어도 본전 뽑는 경지!' };
  }
  if (cost <= 500) {
    return { emoji: '🍦', label: '막대 아이스크림 1개 (500원)', text: '할인점 아이스크림 하나 가격!' };
  }
  if (cost <= 1000) {
    return { emoji: '🐟', label: '붕어빵 1마리 (1,000원)', text: '천원의 행복, 거의 본전 완료!' };
  }
  if (cost <= 2000) {
    return { emoji: '🚌', label: '시내버스 요금 (2,000원 이하)', text: '대중교통 1번 타는 비용' };
  }
  if (cost <= 3500) {
    return { emoji: '🍙', label: '삼각김밥 & 생수', text: '가벼운 편의점 요기 수준' };
  }
  if (cost <= 5000) {
    return { emoji: '☕', label: '아메리카노 1잔 (5,000원 이하)', text: '카페 커피 한 잔 가격' };
  }
  if (cost <= 6000) {
    return { emoji: '🥐', label: '커피와 작은 간식 (6,000원대)', text: '커피에 간단한 빵이나 과자를 곁들이는 가격' };
  }
  if (cost <= 7000) {
    return { emoji: '🍰', label: '커피와 디저트 (7,000원대)', text: '카페 음료와 작은 디저트 한 번' };
  }
  if (cost <= 8000) {
    return { emoji: '🥟', label: '분식 한 끼 (8,000원대)', text: '간단한 분식으로 한 끼 해결하는 가격' };
  }
  if (cost <= 9000) {
    return { emoji: '🍜', label: '국수나 간단한 백반 (9,000원대)', text: '가볍게 먹는 한 끼 식사 가격' };
  }
  if (cost <= 10000) {
    return { emoji: '🍚', label: '만원짜리 한 끼', text: '식당에서 기본 식사 한 번' };
  }
  if (cost <= 12000) {
    return { emoji: '🍱', label: '든든한 밥 한 끼 (1만원대)', text: '따뜻한 점심 식사 가격' };
  }
  if (cost <= 18000) {
    return { emoji: '🎬', label: '주말 영화 티켓 (1.5만원대)', text: '영화 한 편 관람료 수준' };
  }
  if (cost <= 30000) {
    return { emoji: '🍗', label: '치킨 한 마리 세트 (3만원)', text: '야식 치맥 한 번의 가치' };
  }
  if (cost <= 60000) {
    return { emoji: '🥩', label: '패밀리 레스토랑 외식 (5만원대)', text: '근사한 주말 외식 1회 수준' };
  }
  if (cost <= 90000) {
    return { emoji: '🍽️', label: '호텔 뷔페나 고급 외식 (6~9만원대)', text: '조금 특별한 외식 한 번의 가격' };
  }
  if (cost <= 120000) {
    return { emoji: '🍣', label: '스시 오마카세 / 콘서트 (9~12만원대)', text: '특별한 날 즐기는 가치' };
  }
  if (cost <= 300000) {
    return { emoji: '✈️', label: '제주도 왕복 항공권 (20~30만원)', text: '주말 제주 힐링 여행 수준' };
  }
  if (cost <= 500000) {
    return { emoji: '🎮', label: '차세대 콘솔 게임기 (40~50만원)', text: '닌텐도 / 플스 콘솔 1대 값' };
  }
  if (cost <= 800000) {
    return { emoji: '🏨', label: '5성급 럭셔리 호캉스 (70~80만원)', text: '특급 호텔 스위트룸 숙박' };
  }
  if (cost <= 1000000) {
    return { emoji: '📱', label: '프리미엄 스마트폰 (80~100만원)', text: '가성비 좋은 스마트폰 한 대 가격' };
  }
  if (cost <= 1200000) {
    return { emoji: '📱', label: '최신 플래그십 스마트폰 (100~120만원)', text: '최신 아이폰/갤럭시 한 대 가격' };
  }
  if (cost <= 1800000) {
    return { emoji: '💻', label: '프리미엄 노트북/맥북 (150만원대)', text: '고성능 업무용 노트북 1대 수준' };
  }
  if (cost <= 2500000) {
    return { emoji: '✈️', label: '유럽/미주 왕복 항공권 (200만원대)', text: '해외 장거리 비행기표 수준' };
  }
  if (cost <= 4000000) {
    return { emoji: '👜', label: '하이엔드 명품백/명품시계 (300만원대)', text: '명품 브랜드 가방 1개 수준' };
  }
  if (cost <= 7000000) {
    return { emoji: '🏖️', label: '유럽 2주 낭만 여행 (500~700만원)', text: '꿈꾸던 해외 장기 여행 경비' };
  }
  if (cost <= 10000000) {
    return { emoji: '🛋️', label: '최고급 안마의자/명품가구 (1,000만원 이하)', text: '삶의 질을 바꾸는 럭셔리 가전' };
  }
  return { emoji: '🚗', label: '자동차/대형 자산 투자 (1,000만원 초과)', text: '인생의 초대형 투자, 아낌없이 뽕을 뽑을 차례!' };
}

/**
 * Calculates simulated unit costs for next N uses
 */
export function simulateNextUses(
  item: WorthItem,
  currentUsage: number,
  additionalSteps: number[] = [1, 3, 5, 10]
): { additional: number; totalCount: number; cost: number; reduction: number }[] {
  if (item.usageMethod === 'days' || item.purchasePrice <= 0) return [];

  const currentCost = currentUsage > 0 ? item.purchasePrice / currentUsage : item.purchasePrice;

  return additionalSteps.map((add) => {
    const totalCount = currentUsage + add;
    const cost = Math.round(item.purchasePrice / totalCount);
    const reduction = Math.max(0, Math.round(currentCost - cost));
    return {
      additional: add,
      totalCount,
      cost,
      reduction,
    };
  });
}

/**
 * Calculates overall worth break-even score across all registered items
 */
export function calculateOverallWorthScore(itemStats: ItemStats[]): OverallWorthScore {
  if (!itemStats || itemStats.length === 0) {
    return {
      averageProgress: 0,
      weightedProgress: 0,
      grade: '시작 전',
      gradeBadge: '소비 등록 필요',
      emoji: '🌱',
      comment: '첫 소비를 등록하고 본전 찾기 여정을 시작해 보세요!',
      totalSpent: 0,
      totalRecoveredValue: 0,
      achievedCount: 0,
      totalCount: 0,
    };
  }

  const totalCount = itemStats.length;
  const achievedCount = itemStats.filter((s) => s.isGoalAchieved).length;

  let totalSpent = 0;
  let totalRecoveredValue = 0;
  let sumProgress = 0;

  itemStats.forEach((s) => {
    const spend = s.item.purchasePrice || 0;
    totalSpent += spend;
    const clampedProg = Math.min(100, Math.max(0, s.progress));
    sumProgress += clampedProg;
    totalRecoveredValue += Math.round(spend * (clampedProg / 100));
  });

  const averageProgress = Math.round(sumProgress / totalCount);
  const weightedProgress = totalSpent > 0 ? Math.round((totalRecoveredValue / totalSpent) * 100) : averageProgress;

  let grade = '초기 단계';
  let gradeBadge = '시작';
  let emoji = '🌱';
  let comment = '자주 사용하면서 본전을 차근차근 채워보세요.';

  if (averageProgress >= 100) {
    grade = '목표 달성 완료';
    gradeBadge = '100% 회수';
    emoji = '✓';
    comment = '등록한 소비들의 목표 단가에 모두 도달했어요.';
  } else if (averageProgress >= 75) {
    grade = '본전 도달 임박';
    gradeBadge = '75% 이상';
    emoji = '🎯';
    comment = '구매한 금액의 가치를 대부분 회수하며 알뜰하게 쓰고 있어요.';
  } else if (averageProgress >= 50) {
    grade = '절반 이상 회수';
    gradeBadge = '50% 이상';
    emoji = '📈';
    comment = '꾸준한 사용으로 구매 금액의 절반 이상을 뽑아냈어요.';
  } else if (averageProgress >= 25) {
    grade = '가치 회수 진행 중';
    gradeBadge = '25% 이상';
    emoji = '🌱';
    comment = '쓸 때마다 회당 단가가 점차 낮아지고 있어요.';
  }

  return {
    averageProgress,
    weightedProgress,
    grade,
    gradeBadge,
    emoji,
    comment,
    totalSpent,
    totalRecoveredValue,
    achievedCount,
    totalCount,
  };
}

/**
 * Calculates category-level average progress and break-even stats
 */
export function calculateCategoryWorthStats(itemStats: ItemStats[]): CategoryWorthStats[] {
  const categoryMeta: Record<ItemCategory, { label: string; emoji: string; color: string }> = {
    item: { label: '물건', emoji: '📦', color: 'emerald' },
    subscription: { label: '구독', emoji: '🔄', color: 'blue' },
    membership: { label: '회원권', emoji: '💳', color: 'amber' },
    other: { label: '기타', emoji: '✨', color: 'purple' },
  };

  const groups: Record<ItemCategory, ItemStats[]> = {
    item: [],
    subscription: [],
    membership: [],
    other: [],
  };

  itemStats.forEach((s) => {
    const cat = s.item.category in groups ? s.item.category : 'other';
    groups[cat].push(s);
  });

  const categories: ItemCategory[] = ['item', 'subscription', 'membership', 'other'];

  return categories
    .map((cat) => {
      const statsList = groups[cat];
      const meta = categoryMeta[cat];
      const itemCount = statsList.length;

      if (itemCount === 0) {
        return {
          category: cat,
          label: meta.label,
          emoji: meta.emoji,
          color: meta.color,
          itemCount: 0,
          totalSpend: 0,
          averageProgress: 0,
          achievedCount: 0,
          statusBadge: '미등록',
        };
      }

      const totalSpend = statsList.reduce((sum, s) => sum + s.item.purchasePrice, 0);
      const sumProg = statsList.reduce((sum, s) => sum + Math.min(100, Math.max(0, s.progress)), 0);
      const averageProgress = Math.round(sumProg / itemCount);
      const achievedCount = statsList.filter((s) => s.isGoalAchieved).length;

      let statusBadge = '시작 단계';
      if (averageProgress >= 100) statusBadge = '본전 달성';
      else if (averageProgress >= 80) statusBadge = '목표 임박';
      else if (averageProgress >= 50) statusBadge = '절반 돌파';
      else if (averageProgress >= 25) statusBadge = '활용 중';
      else statusBadge = '시작 단계';

      return {
        category: cat,
        label: meta.label,
        emoji: meta.emoji,
        color: meta.color,
        itemCount,
        totalSpend,
        averageProgress,
        achievedCount,
        statusBadge,
      };
    })
    .filter((c) => c.itemCount > 0);
}
