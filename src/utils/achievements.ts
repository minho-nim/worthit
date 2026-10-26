import { WorthItem, UsageRecord, Achievement, BillingPeriod } from '../types';
import { calculateItemStats, calculateConsecutiveDaysStreak } from './calculator';

export function calculateAchievements(
  items: WorthItem[],
  records: UsageRecord[],
  billingPeriods: BillingPeriod[] = []
): Achievement[] {
  const itemCount = items.length;
  const recordCount = records.length;

  // Sum total usage quantity across all records
  const totalUsageCount = records.reduce((sum, r) => sum + (r.quantity || 0), 0);

  // Compute item stats to find how many achieved goal
  const itemStatsList = items.map((it) => calculateItemStats(it, records, billingPeriods));
  const achievedItemsCount = itemStatsList.filter((s) => s.isGoalAchieved).length;

  // Consecutive logging streak
  const streakDays = calculateConsecutiveDaysStreak(records);

  const achievements: Achievement[] = [
    {
      id: 'first_item',
      title: '첫 소비 등록',
      description: '나의 소중한 첫 번째 소비를 등록했어요.',
      iconName: 'Sparkles',
      isUnlocked: itemCount >= 1,
      progressText: `${Math.min(itemCount, 1)} / 1`,
      progressPercent: itemCount >= 1 ? 100 : 0,
    },
    {
      id: 'five_items',
      title: '스마트 소비자',
      description: '물건과 구독을 5개 이상 꼼꼼하게 관리해요.',
      iconName: 'Layers',
      isUnlocked: itemCount >= 5,
      progressText: `${Math.min(itemCount, 5)} / 5`,
      progressPercent: Math.min(100, Math.round((itemCount / 5) * 100)),
    },
    {
      id: 'first_record',
      title: '첫 사용 기록',
      description: '소비를 구매한 후 실제로 사용하고 기록했어요.',
      iconName: 'CheckCircle2',
      isUnlocked: recordCount >= 1,
      progressText: `${Math.min(recordCount, 1)} / 1`,
      progressPercent: recordCount >= 1 ? 100 : 0,
    },
    {
      id: 'usage_10',
      title: '본전 새싹',
      description: '등록한 소비들을 누적 10회 이상 사용했어요.',
      iconName: 'Flame',
      isUnlocked: totalUsageCount >= 10,
      progressText: `${Math.min(Math.floor(totalUsageCount), 10)} / 10회`,
      progressPercent: Math.min(100, Math.round((totalUsageCount / 10) * 100)),
    },
    {
      id: 'usage_100',
      title: '진정한 본전 러버',
      description: '누적 100회 이상 알뜰하게 소비를 활용했어요.',
      iconName: 'Trophy',
      isUnlocked: totalUsageCount >= 100,
      progressText: `${Math.min(Math.floor(totalUsageCount), 100)} / 100회`,
      progressPercent: Math.min(100, Math.round((totalUsageCount / 100) * 100)),
    },
    {
      id: 'first_goal',
      title: '첫 본전 달성',
      description: '내가 정한 목표 사용단가에 처음 도달했어요!',
      iconName: 'Crown',
      isUnlocked: achievedItemsCount >= 1,
      progressText: `${Math.min(achievedItemsCount, 1)} / 1개`,
      progressPercent: achievedItemsCount >= 1 ? 100 : 0,
    },
    {
      id: 'three_goals',
      title: '가치 소비 마스터',
      description: '3개 이상의 소비에서 목표 단가를 달성했어요.',
      iconName: 'Award',
      isUnlocked: achievedItemsCount >= 3,
      progressText: `${Math.min(achievedItemsCount, 3)} / 3개`,
      progressPercent: Math.min(100, Math.round((achievedItemsCount / 3) * 100)),
    },
    {
      id: 'streak_7_days',
      title: '7일 연속 기록',
      description: '7일 동안 매일 꾸준히 사용을 기록했어요.',
      iconName: 'CalendarCheck',
      isUnlocked: streakDays >= 7,
      progressText: `${Math.min(streakDays, 7)} / 7일`,
      progressPercent: Math.min(100, Math.round((streakDays / 7) * 100)),
    },
  ];

  return achievements;
}
