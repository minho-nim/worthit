import React, { useState } from 'react';
import { X, Check, Copy, Sparkles, TrendingUp, Download } from 'lucide-react';
import { ItemStats } from '../types';
import { formatKRW, formatDate, getRealLifeEquivalence } from '../utils/calculator';

interface ReceiptModalProps {
  stats: ItemStats | null;
  isOpen: boolean;
  onClose: () => void;
  onCopySuccess: () => void;
}

export const ReceiptModal: React.FC<ReceiptModalProps> = ({
  stats,
  isOpen,
  onClose,
  onCopySuccess,
}) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen || !stats) return null;

  const { item, progress, isGoalAchieved, currentUnitCost, totalUsage, daysOwned } = stats;
  const isDays = item.usageMethod === 'days';
  const unit = isDays ? '일' : item.usageUnit;
  const equivalence = getRealLifeEquivalence(currentUnitCost ?? item.purchasePrice);

  const handleCopySummary = () => {
    const text = `🧾 [WorthIt 본전 영수증]\n항목: ${item.name}\n구매가: ${formatKRW(item.purchasePrice)}\n현재 사용단가: ${stats.unitCostFormatted}\n목표 단가: ${stats.targetCostFormatted}\n달성률: ${progress}%\n현실 체감 가치: ${equivalence.emoji} ${equivalence.label} (${equivalence.text})\n상태: ${isGoalAchieved ? '🎉 본전 달성 완료!' : '꾸준히 가치 창출 중!'}\n\n#WorthIt #본전뽑기 #가치소비`;

    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      onCopySuccess();
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 relative overflow-hidden flex flex-col items-center">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
          aria-label="닫기"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Receipt Outer Container */}
        <div className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-5 relative shadow-inner font-mono text-xs text-slate-800 space-y-4">
          {/* Header */}
          <div className="text-center border-b border-dashed border-slate-300 pb-3">
            <span className="text-[10px] tracking-widest text-slate-400 uppercase font-sans font-bold">
              OFFICIAL VALUE RECEIPT
            </span>
            <h3 className="text-base font-bold tracking-tight text-slate-900 font-sans mt-0.5">
              WorthIt 가치 증명서
            </h3>
            <p className="text-[11px] text-slate-500 font-sans mt-0.5">
              이미 산 물건을 가장 지혜롭게 쓰는 방법
            </p>
          </div>

          {/* Item Info */}
          <div className="space-y-1.5 text-xs">
            <div className="flex justify-between items-center">
              <span className="text-slate-500 font-sans">소비 항목</span>
              <strong className="font-sans text-slate-900 truncate max-w-[170px]">
                {item.name}
              </strong>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-500 font-sans">최초 구매 금액</span>
              <span>{formatKRW(item.purchasePrice)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-500 font-sans">구매일</span>
              <span>{formatDate(item.purchaseDate)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-500 font-sans">
                {isDays ? '누적 보유 일수' : '누적 사용량'}
              </span>
              <strong>
                {isDays ? `${daysOwned}일` : `${totalUsage}${unit}`}
              </strong>
            </div>
          </div>

          {/* Divider */}
          <div className="border-t border-dashed border-slate-300 pt-3 space-y-2">
            <div className="flex justify-between items-baseline">
              <span className="font-sans text-slate-600 font-semibold">현재 1{unit}당 비용</span>
              <span className="text-sm font-bold text-slate-900 font-sans">
                {stats.currentUnitCost !== null
                  ? `${formatKRW(stats.currentUnitCost)}`
                  : '기록 없음'}
              </span>
            </div>
            <div className="flex justify-between items-center text-[11px] text-slate-500">
              <span className="font-sans">목표 설정 단가</span>
              <span>{formatKRW(item.targetUnitCost)}/{unit}</span>
            </div>
            <div className="flex justify-between items-center text-[11px]">
              <span className="font-sans text-slate-500">목표 달성률</span>
              <span className="font-bold text-emerald-600 font-sans">{progress}%</span>
            </div>
          </div>

          {/* Real-life Equivalence Box */}
          <div className="p-2.5 rounded-xl bg-white border border-slate-200/80 font-sans">
            <span className="text-[10px] text-slate-400 block font-bold">체감 소비 수준</span>
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 mt-0.5">
              <span>{equivalence.emoji}</span>
              <span>{equivalence.label}</span>
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5">{equivalence.text}</p>
          </div>

          {/* Stamp Graphic */}
          <div className="py-2 flex justify-center">
            {isGoalAchieved ? (
              <div className="border-2 border-emerald-600 text-emerald-700 font-sans font-black tracking-widest px-4 py-1.5 rounded-lg -rotate-3 uppercase text-xs shadow-xs">
                ★ 본전 달성 완료 (PAID OFF) ★
              </div>
            ) : (
              <div className="border-2 border-amber-500 text-amber-700 font-sans font-black tracking-wider px-3.5 py-1 rounded-lg rotate-2 text-[11px]">
                가치 창출 중 ({progress}%)
              </div>
            )}
          </div>

          {/* Footer Barcode effect */}
          <div className="pt-1 text-center font-sans text-[10px] text-slate-400 border-t border-dashed border-slate-300">
            <span>ISSUED BY WORTHIT · {new Date().toLocaleDateString('ko-KR')}</span>
          </div>
        </div>

        {/* Copy Action */}
        <div className="w-full mt-4 flex gap-2">
          <button
            type="button"
            onClick={handleCopySummary}
            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white rounded-xl text-xs font-bold transition-colors shadow-sm shadow-emerald-600/20"
          >
            {copied ? (
              <>
                <Check className="w-4 h-4 stroke-[3]" />
                <span>복사 완료!</span>
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" />
                <span>영수증 텍스트 복사</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
