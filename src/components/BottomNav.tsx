import React from 'react';
import { Home, Layers, Plus, PieChart, Award } from 'lucide-react';

interface BottomNavProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onOpenAddItem: () => void;
  unlockedCount?: number;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  activeTab,
  setActiveTab,
  onOpenAddItem,
  unlockedCount = 0,
}) => {
  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200/90 pb-safe shadow-lg shadow-slate-900/5">
      <div className="flex items-center justify-around h-16 px-3 relative">
        {/* 1. Home */}
        <button
          onClick={() => setActiveTab('home')}
          className={`flex-1 flex flex-col items-center justify-center py-1 transition-colors ${
            activeTab === 'home' ? 'text-slate-900 font-bold' : 'text-slate-400 hover:text-slate-600'
          }`}
        >
          <Home className={`w-5 h-5 ${activeTab === 'home' ? 'stroke-[2.5]' : 'stroke-2'}`} />
          <span className="text-[10px] mt-1">홈</span>
        </button>

        {/* 2. Items Feed */}
        <button
          onClick={() => setActiveTab('items')}
          className={`flex-1 flex flex-col items-center justify-center py-1 transition-colors ${
            activeTab === 'items' ? 'text-slate-900 font-bold' : 'text-slate-400 hover:text-slate-600'
          }`}
        >
          <Layers className={`w-5 h-5 ${activeTab === 'items' ? 'stroke-[2.5]' : 'stroke-2'}`} />
          <span className="text-[10px] mt-1">내 소비</span>
        </button>

        {/* 3. Center Elevated Plus Button (Instagram / YouTube style) */}
        <div className="flex-1 flex items-center justify-center -mt-4">
          <button
            type="button"
            onClick={onOpenAddItem}
            className="w-12 h-12 rounded-full bg-emerald-600 active:bg-emerald-700 text-white flex items-center justify-center shadow-lg shadow-emerald-600/35 transition-transform active:scale-90"
            title="새 소비 등록"
            aria-label="새 소비 등록"
          >
            <Plus className="w-6 h-6 stroke-[3]" />
          </button>
        </div>

        {/* 4. Analytics */}
        <button
          onClick={() => setActiveTab('analytics')}
          className={`flex-1 flex flex-col items-center justify-center py-1 transition-colors ${
            activeTab === 'analytics'
              ? 'text-slate-900 font-bold'
              : 'text-slate-400 hover:text-slate-600'
          }`}
        >
          <PieChart className={`w-5 h-5 ${activeTab === 'analytics' ? 'stroke-[2.5]' : 'stroke-2'}`} />
          <span className="text-[10px] mt-1">분석</span>
        </button>

        {/* 5. Achievements */}
        <button
          onClick={() => setActiveTab('achievements')}
          className={`flex-1 flex flex-col items-center justify-center py-1 transition-colors relative ${
            activeTab === 'achievements'
              ? 'text-slate-900 font-bold'
              : 'text-slate-400 hover:text-slate-600'
          }`}
        >
          <div className="relative">
            <Award
              className={`w-5 h-5 ${
                activeTab === 'achievements' ? 'stroke-[2.5]' : 'stroke-2'
              }`}
            />
            {unlockedCount > 0 && (
              <span className="absolute -top-1 -right-2 w-4 h-4 bg-emerald-600 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                {unlockedCount}
              </span>
            )}
          </div>
          <span className="text-[10px] mt-1">업적</span>
        </button>
      </div>
    </nav>
  );
};
