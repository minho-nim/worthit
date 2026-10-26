import React, { useState, useEffect } from 'react';
import { getTargetRecommendations } from '../utils/targetRecommendations';
import {
  X,
  Package,
  RefreshCw,
  CreditCard,
  Sparkles,
  Check,
  Calendar,
  Clock,
  Target,
  ChevronDown,
  ChevronUp,
  Zap,
} from 'lucide-react';
import {
  WorthItem,
  ItemCategory,
  UsageMethod,
  UsageUnit,
  BillingCycle,
  UsageRecord,
} from '../types';
import {
  getTodayDateString,
  formatKRW,
  formatDate,
  calculateRequiredUsage,
  getDaysOwned,
} from '../utils/calculator';

interface ItemFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (
    itemData: Omit<WorthItem, 'id' | 'createdAt' | 'updatedAt'>,
    initialQuantity: number,
    existingId?: string
  ) => void;
  editingItem?: WorthItem | null;
  existingRecords?: UsageRecord[];
}

interface TemplatePreset {
  emoji: string;
  label: string;
  name: string;
  category: ItemCategory;
  usageMethod: UsageMethod;
  usageUnit: UsageUnit;
  defaultPrice: number;
  targetUnitCost: number;
  hint: string;
}

const TEMPLATE_PRESETS: TemplatePreset[] = [
  {
    emoji: '🏋️',
    label: '헬스장',
    name: '헬스장 회원권',
    category: 'membership',
    usageMethod: 'usage',
    usageUnit: '회',
    defaultPrice: 300000,
    targetUnitCost: 10000,
    hint: '30회 방문 시 1회당 10,000원',
  },
  {
    emoji: '🎧',
    label: '헤드폰/이어폰',
    name: '무선 노이즈캔슬링 헤드폰',
    category: 'item',
    usageMethod: 'usage',
    usageUnit: '회',
    defaultPrice: 350000,
    targetUnitCost: 2000,
    hint: '175회 착용 시 1회당 2,000원',
  },
  {
    emoji: '📱',
    label: '스마트폰',
    name: '스마트폰',
    category: 'item',
    usageMethod: 'days',
    usageUnit: '일',
    defaultPrice: 1200000,
    targetUnitCost: 1000,
    hint: '2년(730일) 보유 시 하루 1,600원',
  },
  {
    emoji: '☕',
    label: '커피머신/텀블러',
    name: '홈카페 커피머신',
    category: 'item',
    usageMethod: 'usage',
    usageUnit: '회',
    defaultPrice: 150000,
    targetUnitCost: 1500,
    hint: '100잔 마시면 회당 1,500원',
  },
  {
    emoji: '📺',
    label: 'OTT 구독',
    name: 'OTT 프리미엄 구독',
    category: 'subscription',
    usageMethod: 'usage',
    usageUnit: '시간',
    defaultPrice: 17000,
    targetUnitCost: 500,
    hint: '월 34시간 시청 시 시간당 500원',
  },
  {
    emoji: '👟',
    label: '러닝화/운동화',
    name: '러닝화',
    category: 'item',
    usageMethod: 'usage',
    usageUnit: '회',
    defaultPrice: 180000,
    targetUnitCost: 3000,
    hint: '60회 러닝 시 1회당 3,000원',
  },
  {
    emoji: '💻',
    label: '노트북/태블릿',
    name: '노트북',
    category: 'item',
    usageMethod: 'days',
    usageUnit: '일',
    defaultPrice: 1500000,
    targetUnitCost: 1500,
    hint: '3년(1,000일) 사용 시 하루 1,500원',
  },
];

export const ItemFormModal: React.FC<ItemFormModalProps> = ({
  isOpen,
  onClose,
  onSave,
  editingItem,
  existingRecords = [],
}) => {
  // Main simplified form states
  const [category, setCategory] = useState<ItemCategory>('item');
  const [name, setName] = useState('');
  const [purchasePrice, setPurchasePrice] = useState<string>('');
  const [purchaseDate, setPurchaseDate] = useState(getTodayDateString());
  const [usageMethod, setUsageMethod] = useState<UsageMethod>('usage');
  const [usageUnit, setUsageUnit] = useState<UsageUnit>('회');
  const [targetUnitCost, setTargetUnitCost] = useState<string>('5000');
  const [goalMode, setGoalMode] = useState<'count' | 'cost'>('count');
  const [goalCount, setGoalCount] = useState('');

  // Detailed options (toggleable)
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [initialUsage, setInitialUsage] = useState<string>('0');
  const [billingCycle, setBillingCycle] = useState<BillingCycle>('monthly');
  const [expirationDate, setExpirationDate] = useState('');

  // Errors
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  useEffect(() => {
    if (editingItem) {
      setCategory(editingItem.category);
      setName(editingItem.name);
      setPurchasePrice(editingItem.purchasePrice.toString());
      setPurchaseDate(editingItem.purchaseDate);
      setBillingCycle(editingItem.billingCycle || 'monthly');
      setExpirationDate(editingItem.expirationDate || '');
      setUsageMethod(editingItem.usageMethod);
      setUsageUnit(editingItem.usageUnit);
      setTargetUnitCost(editingItem.targetUnitCost.toString());
      setGoalMode('cost');
      setGoalCount(String(calculateRequiredUsage(editingItem.purchasePrice, editingItem.targetUnitCost, editingItem.usageMethod === 'days' ? '일' : editingItem.usageUnit)));
      const itemRecs = existingRecords.filter((r) => r.itemId === editingItem.id);
      const total = itemRecs.reduce((sum, r) => sum + r.quantity, 0);
      setInitialUsage(total.toString());
      setShowAdvanced(Boolean(editingItem.billingCycle || editingItem.expirationDate || total > 0));
    } else {
      setCategory('item');
      setName('');
      setPurchasePrice('');
      setPurchaseDate(getTodayDateString());
      setBillingCycle('monthly');
      setExpirationDate('');
      setUsageMethod('usage');
      setUsageUnit('회');
      setInitialUsage('0');
      setTargetUnitCost('5000');
      setGoalMode('count');
      setGoalCount('');
      setShowAdvanced(false);
      setErrors({});
    }
  }, [editingItem, isOpen]);

  if (!isOpen) return null;

  const todayStr = getTodayDateString();

  // Apply a 1-tap template
  const handleSelectTemplate = (tmpl: TemplatePreset) => {
    setName(tmpl.name);
    setCategory(tmpl.category);
    setUsageMethod(tmpl.usageMethod);
    setUsageUnit(tmpl.usageUnit);
    if (!purchasePrice) {
      setPurchasePrice(tmpl.defaultPrice.toString());
    }
    setTargetUnitCost(tmpl.targetUnitCost.toString());
    setGoalMode('count');
    setGoalCount(String(calculateRequiredUsage(Number(purchasePrice) || tmpl.defaultPrice, tmpl.targetUnitCost, tmpl.usageUnit)));
    setErrors({});
  };

  // Quick price additions
  const handleAddPrice = (amount: number) => {
    const current = Number(purchasePrice) || 0;
    const next = current + amount;
    setPurchasePrice(next.toString());
  };

  const priceNum = Math.round(Number(purchasePrice) || 0);
  const isDays = usageMethod === 'days';
  const effectiveUnit = isDays ? '일' : usageUnit;
  const countNum = Number(goalCount);
  const activeTargetCost = goalMode === 'count'
    ? (countNum > 0 ? priceNum / countNum : 0)
    : Number(targetUnitCost);

  // Validation
  const validateForm = (): boolean => {
    const errs: { [key: string]: string } = {};

    if (!name.trim()) {
      errs.name = '소비 이름을 입력해 주세요.';
    }

    if (purchasePrice === '' || isNaN(Number(purchasePrice)) || Number(purchasePrice) < 0) {
      errs.purchasePrice = '올바른 구매 금액을 입력해 주세요.';
    }

    if (Number(purchasePrice) > 0) {
      if (goalMode === 'count' && (!Number.isFinite(countNum) || countNum <= 0
        || (effectiveUnit === '시간' ? !Number.isSafeInteger(countNum * 2) : !Number.isSafeInteger(countNum)))) {
        errs.goalCount = effectiveUnit === '시간' ? '목표 사용 시간을 0.5시간 단위로 입력해 주세요.' : '목표 사용량을 1 이상의 정수로 입력해 주세요.';
      } else if (!Number.isFinite(activeTargetCost) || activeTargetCost <= 0) {
        errs.targetUnitCost = '나에게 맞는 목표 단가를 입력해 주세요.';
      }
    }

    if (!purchaseDate) {
      errs.purchaseDate = '구매일을 선택해 주세요.';
    } else if (purchaseDate > todayStr) {
      errs.purchaseDate = '미래 날짜는 구매일로 지정할 수 없습니다.';
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    const price = Math.round(Number(purchasePrice) || 0);
    const targetCost = activeTargetCost;
    const initUsage = Number(initialUsage) || 0;

    const itemData: Omit<WorthItem, 'id' | 'createdAt' | 'updatedAt'> = {
      name: name.trim(),
      category,
      purchasePrice: price,
      purchaseDate,
      usageMethod,
      usageUnit: usageMethod === 'days' ? '일' : usageUnit,
      targetUnitCost: price === 0 ? 0 : targetCost,
      status: 'active',
      billingCycle: category === 'subscription' ? billingCycle : undefined,
      expirationDate: category === 'membership' && expirationDate ? expirationDate : undefined,
    };

    onSave(itemData, initUsage, editingItem?.id);
    onClose();
  };

  // Preserve the chosen usage count; only the displayed cost is rounded.
  const targetCostNum = activeTargetCost || 0;
  const requiredCount = activeTargetCost > 0 ? calculateRequiredUsage(priceNum, activeTargetCost, effectiveUnit) : 0;
  const targetRecommendations = getTargetRecommendations(priceNum, usageMethod, usageUnit, category, billingCycle);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-lg w-full max-h-[92vh] flex flex-col shadow-2xl border border-slate-100 overflow-hidden">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
              <Zap className="w-4 h-4 fill-emerald-600 text-emerald-600" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900">
                {editingItem ? '소비 정보 수정' : '간편 소비 등록'}
              </h2>
              <p className="text-xs text-slate-500">
                {editingItem ? '내용을 수정하고 저장하세요' : '내가 만족할 사용 목표를 정해보세요'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
            aria-label="닫기"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          {/* 1. Quick Presets (Only on new item) */}
          {!editingItem && (
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-bold text-slate-700 flex items-center gap-1">
                  <span>⚡ 1초 템플릿으로 빠른 시작</span>
                </span>
                <span className="text-[11px] text-slate-400">터치 시 자동 입력</span>
              </div>
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1.5 scrollbar-thin">
                {TEMPLATE_PRESETS.map((tmpl) => (
                  <button
                    type="button"
                    key={tmpl.label}
                    onClick={() => handleSelectTemplate(tmpl)}
                    className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 hover:bg-emerald-50 active:bg-emerald-100 border border-slate-200/80 hover:border-emerald-300 rounded-xl text-xs font-semibold text-slate-700 hover:text-emerald-900 transition-all shadow-2xs"
                  >
                    <span>{tmpl.emoji}</span>
                    <span>{tmpl.label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* 2. Item Name */}
          <div>
            <label className="block text-xs font-bold text-slate-800 mb-1">
              무엇을 사셨나요? <span className="text-emerald-600">*</span>
            </label>
            <input
              type="text"
              placeholder="예: 헬스장 6개월권, 소니 헤드폰, 에어프라이어"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (errors.name) setErrors((prev) => ({ ...prev, name: '' }));
              }}
              className={`w-full px-3.5 py-2.5 rounded-xl border text-sm text-slate-900 focus:outline-none transition-all ${
                errors.name
                  ? 'border-rose-400 focus:border-rose-500 bg-rose-50/20'
                  : 'border-slate-200 focus:border-emerald-600'
              }`}
            />
            {errors.name && <p className="text-xs text-rose-500 mt-1">{errors.name}</p>}
          </div>

          {/* 3. Price & Quick Add chips */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-bold text-slate-800">
                얼마에 구매하셨나요? (원) <span className="text-emerald-600">*</span>
              </label>
              {purchasePrice && !isNaN(Number(purchasePrice)) && (
                <span className="text-xs font-bold text-emerald-700">
                  {formatKRW(Number(purchasePrice))}
                </span>
              )}
            </div>
            <input
              type="number"
              min="0"
              step="any"
              placeholder="예: 300000"
              value={purchasePrice}
              onChange={(e) => {
                setPurchasePrice(e.target.value);
                if (errors.purchasePrice)
                  setErrors((prev) => ({ ...prev, purchasePrice: '' }));
              }}
              className={`w-full px-3.5 py-2.5 rounded-xl border text-sm text-slate-900 focus:outline-none transition-all ${
                errors.purchasePrice
                  ? 'border-rose-400 focus:border-rose-500'
                  : 'border-slate-200 focus:border-emerald-600'
              }`}
            />
            {errors.purchasePrice && (
              <p className="text-xs text-rose-500 mt-1">{errors.purchasePrice}</p>
            )}

            {/* Quick Price Buttons */}
            <div className="flex items-center gap-1.5 mt-2">
              <span className="text-[11px] text-slate-400 mr-0.5">금액 추가:</span>
              {[10000, 50000, 100000, 500000].map((amt) => (
                <button
                  type="button"
                  key={amt}
                  onClick={() => handleAddPrice(amt)}
                  className="px-2.5 py-1 text-xs rounded-lg border border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100 font-medium transition-colors"
                >
                  +{amt >= 10000 ? `${amt / 10000}만` : amt}
                </button>
              ))}
            </div>
          </div>

          {/* 4. How to use (Super Simple A/B choices) */}
          <div>
            <label className="block text-xs font-bold text-slate-800 mb-1.5">
              어떻게 사용을 기록할까요?
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  setUsageMethod('usage');
                }}
                className={`p-3 rounded-xl border text-left transition-all ${
                  usageMethod === 'usage'
                    ? 'border-emerald-600 bg-emerald-50/60 shadow-2xs'
                    : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-slate-900">
                    쓸 때마다 기록하기
                  </span>
                  {usageMethod === 'usage' && (
                    <span className="w-2 h-2 rounded-full bg-emerald-600" />
                  )}
                </div>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  헬스장, 헤드폰, 옷, OTT 등
                </p>
              </button>

              <button
                type="button"
                onClick={() => {
                  setUsageMethod('days');
                }}
                className={`p-3 rounded-xl border text-left transition-all ${
                  usageMethod === 'days'
                    ? 'border-emerald-600 bg-emerald-50/60 shadow-2xs'
                    : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-slate-900">
                    매일 소유하고 쓰기
                  </span>
                  {usageMethod === 'days' && (
                    <span className="w-2 h-2 rounded-full bg-emerald-600" />
                  )}
                </div>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  스마트폰, 침대, 가구 등
                </p>
              </button>
            </div>
          </div>

          {/* 5. Target Unit Cost & Goal Presets */}
          <div>
            <p className="text-sm font-bold text-slate-900 mb-1">
              {isDays ? '얼마나 오래 쓰면 돈이 아깝지 않을까요?' : effectiveUnit === '시간' ? '몇 시간 정도 쓰면 돈이 아깝지 않을까요?' : `몇 ${effectiveUnit === '회' ? '번' : effectiveUnit} 정도 쓰면 돈이 아깝지 않을까요?`}
            </p>
            <p className="text-xs text-slate-500 mb-3">본전의 기준은 사람마다 달라요. 내가 만족할 기준을 정하고 언제든 바꿀 수 있어요.</p>
            <div className="flex gap-2 mb-3">
              {(['count', 'cost'] as const).map(mode => <button type="button" key={mode}
                aria-pressed={goalMode === mode}
                onClick={() => {
                  if (mode === 'cost' && goalMode === 'count' && activeTargetCost > 0) setTargetUnitCost(String(activeTargetCost));
                  if (mode === 'count' && goalMode === 'cost' && activeTargetCost > 0) setGoalCount(String(calculateRequiredUsage(priceNum, activeTargetCost, effectiveUnit)));
                  setGoalMode(mode); setErrors(prev => ({ ...prev, goalCount: '', targetUnitCost: '' }));
                }} className={`px-3 py-2 text-xs font-bold rounded-xl border ${goalMode === mode ? 'bg-emerald-50 border-emerald-500 text-emerald-900' : 'border-slate-200 text-slate-500'}`}>
                {mode === 'count' ? `${isDays ? '기간' : '사용량'}으로 정하기` : '단가로 직접 정하기'}
              </button>)}
            </div>
            {goalMode === 'count' ? <div>
              <label htmlFor="goal-count" className="block text-xs font-bold text-slate-800 mb-1">내 사용 목표 ({effectiveUnit})</label>
              <input id="goal-count" type="text" inputMode={effectiveUnit === '시간' ? 'decimal' : 'numeric'}
                value={goalCount} placeholder={isDays ? '예: 365' : effectiveUnit === '시간' ? '예: 20' : '예: 60'}
                onChange={event => {
                  if (!/^\d*\.?\d*$/.test(event.target.value)) return;
                  setGoalCount(event.target.value); setErrors(prev => ({ ...prev, goalCount: '' }));
                }} className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-emerald-600" />
              {errors.goalCount && <p className="text-xs text-rose-500 mt-1">{errors.goalCount}</p>}
              {activeTargetCost > 0 && <p className="text-xs text-emerald-800 mt-2">자동 계산한 목표 단가: 약 {formatKRW(activeTargetCost)}/{effectiveUnit}</p>}
              {isDays && <p className="text-[11px] text-slate-500 mt-1">구매일부터 지난 날짜로 계산해요. 실제 사용 여부를 확인하는 방식은 아니에요.</p>}
            </div> : <>
            <div className="flex items-center justify-between mb-1">
              <label htmlFor="target-unit-cost" className="text-xs font-bold text-slate-800">
                목표 사용단가 ({isDays ? '원/일' : `원/${usageUnit}`})
              </label>
              <span className="text-[11px] text-slate-500">
                내가 만족할 사용 비용
              </span>
            </div>

            <div className="relative">
              <input
                id="target-unit-cost"
                type="text"
                inputMode="decimal"
                placeholder="자유롭게 입력 (예: 500, 1000, 2500...)"
                value={targetUnitCost}
                onChange={(e) => {
                  if (!/^\d*\.?\d*$/.test(e.target.value)) return;
                  setTargetUnitCost(e.target.value);
                  if (errors.targetUnitCost)
                    setErrors((prev) => ({ ...prev, targetUnitCost: '' }));
                }}
                className="w-full pl-3.5 pr-28 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-900 focus:outline-none focus:border-emerald-600"
              />
              <span className="absolute right-3.5 top-2.5 text-xs text-slate-400 font-medium pointer-events-none">
                {targetUnitCost && !isNaN(Number(targetUnitCost))
                  ? formatKRW(Number(targetUnitCost))
                  : ''}
              </span>
            </div>
            {errors.targetUnitCost && (
              <p className="text-xs text-rose-500 mt-1">{errors.targetUnitCost}</p>
            )}

            </>}
            <div className="mt-3 p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
              <p className="text-xs font-semibold text-slate-800">이 정도로 시작해 볼까요?</p>
              <p className="text-xs text-slate-500 leading-relaxed">
                {category === 'subscription'
                  ? '한 결제기간 동안 실제로 쓸 횟수나 시간을 골라보세요. 결제금액을 예상 사용량으로 나누어 계산해요.'
                  : '앞으로 충분히 쓸 수 있는 횟수나 기간을 먼저 정해보세요. 구매금액을 예상 사용량으로 나누면 목표 단가가 돼요.'}
              </p>
              {targetRecommendations.length > 0 ? <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {targetRecommendations.map((option) => (
                  <button
                    type="button"
                    key={option.count}
                    onClick={() => { setGoalCount(String(option.count)); setTargetUnitCost(String(option.unitCost)); setErrors(prev => ({ ...prev, targetUnitCost: '', goalCount: '' })); }}
                    className={`p-2.5 text-left text-xs rounded-lg border transition-colors ${(goalMode === 'count' ? countNum === option.count : Number(targetUnitCost) === option.unitCost) ? 'bg-emerald-50 border-emerald-500 text-emerald-900' : 'bg-white border-slate-200 text-slate-600 hover:border-emerald-400'}`}
                  >
                    <span className="block">{option.label}</span>
                    <strong className="block mt-1">약 {formatKRW(goalMode === 'count' ? priceNum / option.count : option.unitCost)}/{effectiveUnit}</strong>
                  </button>
                ))}
              </div> : <p className="text-xs text-slate-400">구매금액을 입력하면 추천 금액이 표시돼요.</p>}
              <p className="text-[11px] text-slate-500">정답이 아닌 시작 예시예요. 내 사용 계획에 맞춰 바꿔보세요. 금액은 반올림해 표시하며, 사용량 목표는 입력한 값을 유지해요.</p>
            </div>
          </div>

          {/* 6. Live Result Preview Box */}
          {activeTargetCost > 0 && <div className="p-3.5 rounded-2xl bg-emerald-50/60 border border-emerald-200/80 space-y-1">
            <div className="flex items-center justify-between text-xs font-bold text-emerald-900">
              <span>💡 내가 정한 사용 목표</span>
              <span>총 {requiredCount}{effectiveUnit} 필요</span>
            </div>
            <p className="text-xs text-emerald-800 leading-relaxed">
              <strong>{formatKRW(priceNum)}</strong>에 구매하여, 총{' '}
              <strong>{requiredCount}{effectiveUnit}</strong>을 사용하면 목표 단가(
              <strong>약 {formatKRW(targetCostNum)}/{effectiveUnit}</strong>)에 도달해요. 내가 정한 만족 기준이에요.
            </p>
          </div>}

          {/* 7. Advanced options toggle */}
          <div className="pt-1 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors py-1"
            >
              <span>상세 옵션 (카테고리, 구매일, 기존 사용량 등)</span>
              {showAdvanced ? (
                <ChevronUp className="w-3.5 h-3.5" />
              ) : (
                <ChevronDown className="w-3.5 h-3.5" />
              )}
            </button>

            {showAdvanced && (
              <div className="mt-3 p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-3.5 text-xs animate-in fade-in duration-150">
                {/* Category & Unit */}
                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-slate-700 font-bold mb-1">카테고리</label>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value as ItemCategory)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white"
                    >
                      <option value="item">물건 (전자기기, 가구 등)</option>
                      <option value="subscription">구독 (OTT, 서비스)</option>
                      <option value="membership">회원권 (헬스장, 시설)</option>
                      <option value="other">기타</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-700 font-bold mb-1">구매일</label>
                    <input
                      type="date"
                      max={todayStr}
                      value={purchaseDate}
                      onChange={(e) => setPurchaseDate(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white"
                    />
                  </div>
                </div>

                {/* Initial Usage count */}
                {usageMethod === 'usage' && (
                  <div>
                    <label className="block text-slate-700 font-bold mb-1">
                      이미 사용한 횟수가 있나요?
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={initialUsage}
                      onChange={(e) => setInitialUsage(e.target.value)}
                      placeholder="0"
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white"
                    />
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      이전에 사용한 횟수가 있다면 입력 시 첫 기록으로 자동 반영됩니다.
                    </p>
                  </div>
                )}

                {/* Subscription cycle */}
                {category === 'subscription' && (
                  <div>
                    <label className="block text-slate-700 font-bold mb-1">결제 주기</label>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setBillingCycle('monthly')}
                        className={`flex-1 py-1.5 rounded-lg border text-xs font-semibold ${
                          billingCycle === 'monthly'
                            ? 'bg-emerald-600 text-white border-emerald-600'
                            : 'bg-white border-slate-200 text-slate-700'
                        }`}
                      >
                        매월 결제
                      </button>
                      <button
                        type="button"
                        onClick={() => setBillingCycle('yearly')}
                        className={`flex-1 py-1.5 rounded-lg border text-xs font-semibold ${
                          billingCycle === 'yearly'
                            ? 'bg-emerald-600 text-white border-emerald-600'
                            : 'bg-white border-slate-200 text-slate-700'
                        }`}
                      >
                        매년 결제
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Submit Button */}
          <div className="pt-2">
            <button
              type="submit"
              className="w-full py-3.5 px-4 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold text-sm rounded-2xl transition-all shadow-md shadow-emerald-600/25 flex items-center justify-center gap-2 cursor-pointer"
            >
              <Check className="w-4 h-4 stroke-[3]" />
              <span>{editingItem ? '수정 완료' : '등록 완료 (가치 추적 시작)'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
