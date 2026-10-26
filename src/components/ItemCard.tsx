import React from 'react';
import {
  Package,
  RefreshCw,
  CreditCard,
  Sparkles,
  Plus,
  CheckCircle2,
  Calendar,
  Clock,
  ChevronRight,
  Receipt,
  Heart,
} from 'lucide-react';
import { ItemStats } from '../types';
import { formatKRW, getRealLifeEquivalence } from '../utils/calculator';

interface ItemCardProps {
  stats: ItemStats;
  onClick: () => void;
  onQuickAddOne?: (e: React.MouseEvent) => void;
  onOpenLogModal?: (e: React.MouseEvent) => void;
  onOpenReceipt?: (e: React.MouseEvent) => void;
}

export const ItemCard: React.FC<ItemCardProps> = ({
  stats,
  onClick,
  onQuickAddOne,
  onOpenLogModal,
  onOpenReceipt,
}) => {
  const { item, progress, isGoalAchieved, remainingUsage, daysOwned } = stats;

  const isDays = item.usageMethod === 'days';
  const unit = isDays ? '일' : item.usageUnit;

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

  const emoji = getEmoji(item.name, item.category);

  const equivalence = stats.currentUnitCost !== null
    ? getRealLifeEquivalence(stats.currentUnitCost)
    : null;

  return (
    <div
      onClick={onClick}
      className="group bg-white rounded-3xl border border-slate-200/90 hover:border-emerald-300 p-5 shadow-xs hover:shadow-md transition-all duration-200 cursor-pointer flex flex-col justify-between relative overflow-hidden"
    >
      <div>
        {/* Top Header Row (Pinterest style) */}
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-slate-100 flex items-center justify-center text-xl shrink-0 shadow-2xs group-hover:scale-105 transition-transform">
              <span>{emoji}</span>
            </div>
            <div className="min-w-0">
              <h3 className="font-bold text-base text-slate-900 truncate group-hover:text-emerald-700 transition-colors">
                {item.name}
              </h3>
              <div className="flex items-center gap-1.5 text-xs text-slate-400 mt-0.5">
                <span>{formatKRW(item.purchasePrice)}</span>
                <span>·</span>
                <span>{item.purchaseDate}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {onOpenReceipt && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onOpenReceipt(e);
                }}
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors"
                title="영수증 보기"
              >
                <Receipt className="w-4 h-4" />
              </button>
            )}

            {isGoalAchieved ? (
              <span className="text-[11px] font-extrabold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200/80 shadow-2xs flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>본전 달성</span>
              </span>
            ) : (
              <span className="text-xs font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-lg">
                {progress}%
              </span>
            )}
          </div>
        </div>

        {/* Big Value Showcase (Instagram/Pinterest focus) */}
        <div className="py-2.5 px-3.5 rounded-2xl bg-slate-50/80 border border-slate-100/90 mb-3 flex items-baseline justify-between">
          <div>
            <span className="text-[11px] font-medium text-slate-400 block">현재 1{unit}당 비용</span>
            <div className="flex items-baseline gap-1 mt-0.5">
              <span className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                {stats.currentUnitCost !== null
                  ? formatKRW(stats.currentUnitCost)
                  : '기록 대기'}
              </span>
              <span className="text-xs text-slate-400 font-medium">/{unit}</span>
            </div>
          </div>

          <div className="text-right">
            <span className="text-[10px] text-slate-400 block">목표 단가</span>
            <span className="text-xs font-bold text-emerald-700">
              {formatKRW(item.targetUnitCost)}/{unit}
            </span>
          </div>
        </div>

        {/* Realistic Equivalence Tag */}
        {equivalence && (
          <div className="flex items-center gap-1.5 text-xs text-slate-600 mb-3 px-1">
            <span>{equivalence.emoji}</span>
            <span className="font-bold text-slate-800">{equivalence.label}</span>
            <span className="text-slate-400 text-[11px]">({equivalence.text})</span>
          </div>
        )}

        {/* Progress Bar */}
        <div className="space-y-1 mb-2">
          <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
            <div
              className={`h-2 rounded-full transition-all duration-300 ${
                isGoalAchieved ? 'bg-emerald-600' : 'bg-emerald-500'
              }`}
              style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
            />
          </div>
          <div className="flex justify-between items-center text-[11px] text-slate-400 pt-0.5">
            <span>{stats.statusMessage}</span>
            <span className="font-medium text-slate-600">
              {isGoalAchieved ? '목표 달성완료' : `앞으로 ${remainingUsage}${unit} 남음`}
            </span>
          </div>
        </div>
      </div>

      {/* Card Action Footer */}
      <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2 mt-auto">
        {isDays ? (
          <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium py-1">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            <span>보유 {daysOwned}일째</span>
          </div>
        ) : (
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={onQuickAddOne}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white rounded-xl text-xs font-bold transition-all shadow-sm shadow-emerald-600/20"
              title="+1회 빠른 기록"
            >
              <Plus className="w-3.5 h-3.5 stroke-[3]" />
              <span>+1{unit} 사용</span>
            </button>
            <button
              type="button"
              onClick={onOpenLogModal}
              className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl text-xs"
              title="상세 기록"
            >
              <Clock className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        <div className="flex items-center text-xs font-semibold text-slate-400 group-hover:text-emerald-700 transition-colors">
          <span>상세보기</span>
          <ChevronRight className="w-4 h-4 ml-0.5" />
        </div>
      </div>
    </div>
  );
};
