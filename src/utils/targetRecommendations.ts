import type { BillingCycle, ItemCategory, UsageMethod, UsageUnit } from '../types';

export function getTargetRecommendations(
  price: number,
  method: UsageMethod,
  unit: UsageUnit,
  category: ItemCategory,
  cycle: BillingCycle
) {
  if (!Number.isFinite(price) || price <= 0) return [];
  const subscription = category === 'subscription';
  const yearly = cycle === 'yearly';
  const effectiveUnit = method === 'days' ? '일' : unit;
  const counts = method === 'days'
    ? subscription ? [yearly ? 365 : 30] : [180, 365, 730]
    : subscription
      ? unit === '시간' ? (yearly ? [120, 240, 480] : [10, 20, 40]) : (yearly ? [48, 96, 144] : [4, 8, 12])
      : unit === '시간' ? [20, 50, 100] : [30, 60, 100];
  return counts.map((count, index) => ({
    count,
    unitCost: Math.max(1, Math.ceil(price / count)),
    label: subscription
      ? `${yearly ? '1년' : '한 달'} ${count}${effectiveUnit} 기준`
      : `${count}${effectiveUnit} 사용 기준`,
    recommended: counts.length === 1 || index === 1,
  }));
}
