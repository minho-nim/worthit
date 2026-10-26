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
    return { emoji: '🥤', label: '편의점 간편식과 음료', text: '간단한 먹거리와 마실 것을 함께 사는 금액' };
  }
  if (cost <= 3000) {
    return { emoji: '🚌', label: '서울 시내버스 왕복 한 번', text: '기본요금 1,500원 기준 왕복 교통비' };
  }
  if (cost <= 3500) {
    return { emoji: '🥪', label: '편의점 간편식 한 끼', text: '삼각김밥이나 샌드위치로 간단히 해결하는 가격' };
  }
  if (cost <= 4000) {
    return { emoji: '🍙', label: '김밥 한 줄 (4,000원 안팎)', text: '2026년 서울 평균에 가까운 기본 김밥 한 줄' };
  }
  if (cost <= 4500) {
    return { emoji: '📦', label: '편의점 택배 한 건', text: '작은 물건을 국내로 보내는 기본 배송비 수준' };
  }
  if (cost <= 5000) {
    return { emoji: '🚕', label: '서울 중형택시 기본요금', text: '기본거리 1.6km까지의 주간 기본요금' };
  }
  if (cost <= 6000) {
    return { emoji: '☕', label: '프랜차이즈 아메리카노 한 잔', text: '일반 카페에서 커피를 사는 가격대' };
  }
  if (cost <= 7000) {
    return { emoji: '🥐', label: '카페 음료와 베이커리 간식', text: '커피나 음료에 작은 빵을 곁들이는 금액' };
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
    return { emoji: '🎬', label: '영화 관람권 한 장', text: '극장에서 영화 한 편을 보는 비용에 가까운 금액' };
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
    return { emoji: '📱', label: '한 달 휴대폰 요금과 구독료', text: '요금제와 이용 서비스에 따라 달라지는 월간 디지털 지출' };
  }
  if (cost <= 120000) {
    return { emoji: '🎟️', label: '공연 티켓 두 장 또는 고급 외식', text: '두 사람이 함께 즐기는 공연이나 특별한 식사' };
  }
  if (cost <= 300000) {
    return { emoji: '✈️', label: '국내 여행 교통과 숙박', text: '1~2명이 떠나는 짧은 국내 여행의 일부 비용' };
  }
  if (cost <= 500000) {
    return { emoji: '🎮', label: '게임기나 소형 가전 한 대', text: '많이 찾는 전자기기나 생활가전 구매 비용' };
  }
  if (cost <= 800000) {
    return { emoji: '📱', label: '중급 스마트폰이나 태블릿 한 대', text: '일상적으로 많이 쓰는 모바일 기기 가격대' };
  }
  if (cost <= 1000000) {
    return { emoji: '💻', label: '실속형 노트북 한 대', text: '학업이나 업무에 쓰는 보급형 노트북 가격대' };
  }
  if (cost <= 1200000) {
    return { emoji: '💻', label: '태블릿과 액세서리 구성', text: '태블릿 본체에 키보드나 펜을 더한 구매 비용' };
  }
  if (cost <= 1800000) {
    return { emoji: '📱', label: '기본형 플래그십 스마트폰', text: '갤럭시 S26·S26+급 스마트폰 가격대' };
  }
  if (cost <= 2600000) {
    return { emoji: '📱', label: '플래그십 Pro·Ultra 스마트폰', text: '갤럭시 S26 Ultra나 iPhone Pro급 가격대' };
  }
  if (cost <= 4000000) {
    return { emoji: '📱', label: '폴더블 또는 초고용량 프리미엄 스마트폰', text: '최상위 저장용량이나 접히는 화면을 갖춘 기기 가격대' };
  }
  if (cost <= 7000000) {
    return { emoji: '✈️', label: '2인 해외여행 항공·숙박비', text: '여행 시기와 지역에 따라 달라지는 두 사람의 여행 경비' };
  }
  if (cost <= 10000000) {
    return { emoji: '🛋️', label: '대형 가전 여러 대 또는 가구 교체', text: '냉장고·세탁기 같은 생활가전을 함께 바꾸는 비용' };
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
