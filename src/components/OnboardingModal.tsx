import React from 'react';
import { Sparkles, PlusCircle, CheckCircle, TrendingDown, X } from 'lucide-react';

interface OnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStartAdd: () => void;
  onOpenDemo: () => void;
}

export const OnboardingModal: React.FC<OnboardingModalProps> = ({
  isOpen,
  onClose,
  onStartAdd,
  onOpenDemo,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-100 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1 rounded-lg"
          aria-label="닫기"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-4">
          <Sparkles className="w-6 h-6" />
        </div>

        <h2 className="text-xl font-bold text-slate-900 mb-1">
          내 소비, 얼마나 잘 쓰고 있을까?
        </h2>
        <p className="text-sm text-slate-600 mb-6 leading-relaxed">
          구매한 물건이나 구독 서비스를 등록하고 실제 사용 가치를 확인해 보세요.
        </p>

        {/* 3 Steps */}
        <div className="space-y-3.5 mb-6">
          <div className="flex items-start gap-3.5 p-3 rounded-xl bg-slate-50 border border-slate-100">
            <div className="w-7 h-7 rounded-lg bg-emerald-600 text-white flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
              1
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-900">구매한 소비 등록</p>
              <p className="text-xs text-slate-500 mt-0.5">
                물건, 회원권, 구독 서비스의 가격과 내가 만족할 사용 목표를 정해요.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3.5 p-3 rounded-xl bg-slate-50 border border-slate-100">
            <div className="w-7 h-7 rounded-lg bg-emerald-600 text-white flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
              2
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-900">사용한 만큼 기록</p>
              <p className="text-xs text-slate-500 mt-0.5">
                홈 화면에서 버튼 한 번으로 간편하게 사용 횟수를 누적해요.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3.5 p-3 rounded-xl bg-slate-50 border border-slate-100">
            <div className="w-7 h-7 rounded-lg bg-emerald-600 text-white flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
              3
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-900">낮아지는 단가와 내 목표 달성</p>
              <p className="text-xs text-slate-500 mt-0.5">
                쓸 때마다 회당 단가가 뚝뚝 떨어지며 내가 정한 목표를 달성하는 성취감을 느껴보세요!
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={onOpenDemo}
            className="flex-1 py-2.5 px-4 text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors text-center"
          >
            샘플 둘러보기
          </button>
          <button
            onClick={() => {
              onClose();
              onStartAdd();
            }}
            className="flex-1 py-2.5 px-4 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 rounded-xl transition-colors shadow-sm shadow-emerald-600/20 text-center"
          >
            첫 소비 등록하기
          </button>
        </div>
      </div>
    </div>
  );
};
