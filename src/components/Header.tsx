import React from 'react';
import { Plus, Database, Sparkles, TrendingUp } from 'lucide-react';

interface HeaderProps {
  onOpenAddItem: () => void;
  onOpenSettings: () => void;
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenAddItem,
  onOpenSettings,
  activeTab,
  setActiveTab,
}) => {
  return (
    <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-slate-200">
      <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between gap-4">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center text-white shadow-sm shadow-emerald-600/20">
            <TrendingUp className="w-5 h-5 stroke-[2.5]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-lg tracking-tight text-slate-900">WorthIt</span>
              <span className="text-[11px] font-medium text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200/60">
                v0.1
              </span>
            </div>
            <p className="text-xs text-slate-500 hidden sm:block">내가 산 물건, 본전은 뽑았을까?</p>
          </div>
        </div>

        {/* Desktop Nav Links */}
        <nav className="hidden md:flex items-center gap-1">
          {[
            { id: 'home', label: '홈' },
            { id: 'items', label: '내 소비' },
            { id: 'analytics', label: '분석' },
            { id: 'achievements', label: '업적' },
          ].map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                  isActive
                    ? 'bg-slate-100 text-slate-900 font-semibold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </nav>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={onOpenSettings}
            className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors border border-transparent hover:border-slate-200"
            title="데이터 백업 및 설정"
            aria-label="데이터 백업 및 설정"
          >
            <Database className="w-5 h-5" />
          </button>

          <button
            onClick={onOpenAddItem}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-medium text-sm rounded-lg transition-colors shadow-sm shadow-emerald-600/20"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>소비 등록</span>
          </button>
        </div>
      </div>
    </header>
  );
};
