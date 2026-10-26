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
 * Returns representative everyday purchases for each price band, not market averages.
 * Small amounts use tighter bands so changes in low unit costs are easier to notice.
 */
export function getRealLifeEquivalence(cost: number): { emoji: string; label: string; text: string } {
  if (cost <= 0) {
    return { emoji: '✨', label: '완전 무료', text: '추가 지출 없이 누리는 가치' };
  }
  if (cost <= 500) {
    return { emoji: '🍬', label: '사탕 한 개', text: '주머니 동전으로 살 수 있는 작은 간식' };
  }
  if (cost <= 1000) {
    return { emoji: '🖊️', label: '볼펜 한 자루', text: '자주 쓰는 기본 문구 하나를 사는 금액' };
  }
  if (cost <= 1500) {
    return { emoji: '🚌', label: '서울 시내버스 한 번', text: '성인 교통카드 기본요금 1,500원 기준' };
  }
  if (cost <= 2000) {
    return { emoji: '🧻', label: '물티슈 한 팩', text: '일상에서 자주 다시 사는 생활 소모품' };
  }
  if (cost <= 2500) {
    return { emoji: '🧽', label: '주방 수세미 한 묶음', text: '설거지할 때 쓰는 작은 생활용품' };
  }
  if (cost <= 3000) {
    return { emoji: '📓', label: '노트 한 권', text: '학교나 회사에서 쓰는 기본 노트 가격대' };
  }
  if (cost <= 3500) {
    return { emoji: '🔋', label: '건전지 한 묶음', text: '리모컨이나 생활기기에 넣는 소모품' };
  }
  if (cost <= 4000) {
    return { emoji: '🪥', label: '칫솔 세트', text: '매일 쓰고 주기적으로 바꾸는 위생용품' };
  }
  if (cost <= 4500) {
    return { emoji: '📦', label: '편의점 택배 한 건', text: '작은 물건을 국내로 보내는 배송비 수준' };
  }
  if (cost <= 5000) {
    return { emoji: '🚕', label: '서울 택시 기본요금', text: '주간 중형택시 기본요금 4,800원 기준' };
  }
  if (cost <= 6000) {
    return { emoji: '☕', label: '카페 커피 한 잔', text: '매장에서 사 마시는 음료 한 잔 가격대' };
  }
  if (cost <= 7000) {
    return { emoji: '🔌', label: '휴대폰 충전 케이블', text: '일반형 케이블 하나를 교체하는 금액' };
  }
  if (cost <= 8000) {
    return { emoji: '🧴', label: '샴푸 리필 한 팩', text: '욕실에서 자주 보충하는 생활 소모품' };
  }
  if (cost <= 9000) {
    return { emoji: '🤲', label: '핸드크림 한 개', text: '가볍게 구매하는 기본 보습용품' };
  }
  if (cost <= 10000) {
    return { emoji: '☂️', label: '기본 우산 한 개', text: '갑작스러운 비에 사는 실용적인 생활용품' };
  }
  if (cost <= 12000) {
    return { emoji: '🎵', label: '음악 스트리밍 한 달', text: '개인용 음원 구독 요금제에 가까운 금액' };
  }
  if (cost <= 15000) {
    return { emoji: '🎬', label: '일반 영화 관람권 한 장', text: '성인 일반 2D 영화 한 편을 보는 가격대' };
  }
  if (cost <= 18000) {
    return { emoji: '📚', label: '단행본 한 권', text: '서점에서 에세이나 소설 한 권을 사는 금액' };
  }
  if (cost <= 20000) {
    return { emoji: '📱', label: '휴대폰 케이스 한 개', text: '일반형 케이스로 휴대폰을 보호하는 비용' };
  }
  if (cost <= 30000) {
    return { emoji: '👕', label: '기본 티셔츠 한 장', text: '자주 입는 일상복 하나를 사는 금액' };
  }
  if (cost <= 45000) {
    return { emoji: '🔋', label: '보조배터리 한 개', text: '외출할 때 챙기는 충전용품 가격대' };
  }
  if (cost <= 60000) {
    return { emoji: '🖱️', label: '무선 마우스 한 개', text: '업무나 공부에 쓰는 컴퓨터 주변기기' };
  }
  if (cost <= 90000) {
    return { emoji: '👟', label: '일상용 운동화 한 켤레', text: '출퇴근이나 가벼운 운동에 신는 신발 가격대' };
  }
  if (cost <= 120000) {
    return { emoji: '🏋️', label: '헬스장 한 달 이용', text: '장기 등록 할인 전 월 이용권에 가까운 금액' };
  }
  if (cost <= 300000) {
    return { emoji: '🎧', label: '무선 헤드폰 한 개', text: '음악 감상과 통화에 쓰는 오디오 기기 가격대' };
  }
  if (cost <= 500000) {
    return { emoji: '⌚', label: '스마트워치 한 대', text: '운동 기록과 알림에 쓰는 웨어러블 기기' };
  }
  if (cost <= 800000) {
    return { emoji: '🧹', label: '로봇청소기 한 대', text: '집안일을 줄여 주는 중급 청소가전 가격대' };
  }
  if (cost <= 1000000) {
    return { emoji: '🧺', label: '드럼세탁기 한 대', text: '가정에서 자주 사용하는 기본 세탁가전' };
  }
  if (cost <= 1200000) {
    return { emoji: '💻', label: '일반 노트북 한 대', text: '학업과 사무 작업에 쓰는 노트북 가격대' };
  }
  if (cost <= 1800000) {
    return { emoji: '🧊', label: '가정용 냉장고 한 대', text: '매일 사용하는 대형 생활가전 가격대' };
  }
  if (cost <= 2600000) {
    return { emoji: '📱', label: '프리미엄 스마트폰 한 대', text: '갤럭시 Ultra나 iPhone Pro급 기기의 구매 비용' };
  }
  if (cost <= 4000000) {
    return { emoji: '🖥️', label: '게이밍 PC 한 대', text: '게임과 작업용으로 구성하는 고성능 데스크톱' };
  }
  if (cost <= 7000000) {
    return { emoji: '✈️', label: '두 사람의 해외여행', text: '항공과 숙박을 포함한 두 사람의 여행 경비' };
  }
  if (cost <= 10000000) {
    return { emoji: '🚙', label: '중고 경차 한 대', text: '연식과 주행거리에 따라 달라지는 실용 차량 가격대' };
  }
  return { emoji: '🚗', label: '신차 구매 비용', text: '차종과 옵션에 따라 달라지는 자동차 구매 예산' };
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
