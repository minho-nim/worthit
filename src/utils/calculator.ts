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
 * Returns an everyday price comparison based on 2026 Korean prices.
 * Small amounts use tighter bands so changes in low unit costs are easier to notice.
 */
export function getRealLifeEquivalence(cost: number): { emoji: string; label: string; text: string } {
  if (cost <= 0) {
    return { emoji: '✨', label: '완전 무료', text: '0원으로 매일 누리는 갓성비' };
  }
  if (cost <= 500) {
    return { emoji: '🍬', label: '사탕이나 껌 하나 (500원 안팎)', text: '가벼운 간식 하나 정도의 금액' };
  }
  if (cost <= 1000) {
    return { emoji: '💧', label: '편의점 생수나 작은 간식 (1,000원 안팎)', text: '편의점에서 생수나 저렴한 간식 하나' };
  }
  if (cost <= 1500) {
    return { emoji: '🚌', label: '서울 시내버스 기본요금 (1,500원)', text: '서울 간·지선버스 교통카드 1회 요금' };
  }
  if (cost <= 2000) {
    return { emoji: '🍜', label: '편의점 컵라면 하나 (2,000원 안팎)', text: '간단히 허기를 달래는 편의점 간식' };
  }
  if (cost <= 2500) {
    return { emoji: '🍙', label: '삼각김밥 한 개와 작은 음료', text: '편의점에서 간단히 챙기는 요기' };
  }
  if (cost <= 3000) {
    return { emoji: '🍙', label: '삼각김밥과 생수', text: '가벼운 편의점 한 끼에 가까운 금액' };
  }
  if (cost <= 3500) {
    return { emoji: '🥪', label: '편의점 간편식 한 끼', text: '삼각김밥이나 샌드위치로 간단히 해결하는 가격' };
  }
  if (cost <= 4000) {
    return { emoji: '🍙', label: '김밥 한 줄 (4,000원 안팎)', text: '2026년 서울 평균에 가까운 기본 김밥 한 줄' };
  }
  if (cost <= 4500) {
    return { emoji: '☕', label: '저렴한 카페 아메리카노 한 잔', text: '가성비 커피 전문점 음료 한 잔' };
  }
  if (cost <= 5000) {
    return { emoji: '☕', label: '일반 프랜차이즈 아메리카노 한 잔', text: '카페에서 커피 한 잔을 사는 가격' };
  }
  if (cost <= 6000) {
    return { emoji: '🥐', label: '커피와 작은 빵 하나', text: '커피에 베이커리 간식을 곁들이는 가격' };
  }
  if (cost <= 7000) {
    return { emoji: '🥟', label: '분식 한 끼', text: '김밥이나 떡볶이 등으로 간단히 먹는 가격' };
  }
  if (cost <= 8000) {
    return { emoji: '🍜', label: '짜장면 한 그릇 (7,000원대)', text: '2026년 서울 평균 가격대의 짜장면 한 그릇' };
  }
  if (cost <= 9000) {
    return { emoji: '🍲', label: '김치찌개 백반 한 끼 (8,000원대)', text: '밥과 반찬을 곁들인 기본 백반 한 끼' };
  }
  if (cost <= 10000) {
    return { emoji: '🍜', label: '칼국수 한 그릇 (1만원 안팎)', text: '식당에서 따뜻한 면 요리 한 끼' };
  }
  if (cost <= 12000) {
    return { emoji: '🥗', label: '비빔밥 한 그릇 (1만 원대 초반)', text: '2026년 서울 평균에 가까운 비빔밥 한 그릇' };
  }
  if (cost <= 15000) {
    return { emoji: '🍜', label: '냉면 한 그릇 (1만 원대 초중반)', text: '2026년 서울 평균 가격대의 외식 냉면 한 그릇' };
  }
  if (cost <= 18000) {
    return { emoji: '🍱', label: '외식 한 끼와 음료', text: '식사에 음료까지 곁들이는 가격' };
  }
  if (cost <= 20000) {
    return { emoji: '🍲', label: '삼계탕 한 그릇 (1만 원대 후반)', text: '2026년 서울 평균 가격대의 삼계탕 한 그릇' };
  }
  if (cost <= 30000) {
    return { emoji: '🥩', label: '삼겹살 200g 외식 1인분 (2만원대)', text: '2026년 서울 평균 가격대의 삼겹살 1인분' };
  }
  if (cost <= 45000) {
    return { emoji: '🍗', label: '치킨 한 마리와 배달 주문', text: '치킨 한 마리에 배달·사이드 메뉴를 더한 가격' };
  }
  if (cost <= 60000) {
    return { emoji: '🥩', label: '삼겹살 2인 외식', text: '고기와 식사를 곁들인 두 사람 외식' };
  }
  if (cost <= 90000) {
    return { emoji: '🍽️', label: '두 사람의 조금 특별한 외식', text: '평소보다 여유 있게 즐기는 외식 한 번' };
  }
  if (cost <= 120000) {
    return { emoji: '🎟️', label: '공연 티켓이나 고급 코스 식사', text: '특별한 날 한 사람 또는 두 사람이 즐기는 경험' };
  }
  if (cost <= 300000) {
    return { emoji: '✈️', label: '국내 여행 교통과 숙박', text: '1~2명이 떠나는 짧은 국내 여행의 일부 비용' };
  }
  if (cost <= 500000) {
    return { emoji: '🎮', label: '게임 콘솔이나 국내 주말여행', text: '기기 하나 또는 두 사람의 짧은 여행 경비' };
  }
  if (cost <= 800000) {
    return { emoji: '🏨', label: '호텔 숙박을 포함한 국내 여행', text: '숙박과 교통, 식사를 묶은 여행 경비' };
  }
  if (cost <= 1000000) {
    return { emoji: '📱', label: '중상급 스마트폰 한 대 (80~100만원)', text: '기종과 구매 시점에 따라 달라지는 스마트폰 가격대' };
  }
  if (cost <= 1200000) {
    return { emoji: '📱', label: '플래그십 스마트폰 한 대 (100~120만원)', text: '최신 스마트폰 기본 모델의 가격대' };
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
