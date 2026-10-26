import React from 'react';
import {
  Sparkles,
  Layers,
  CheckCircle2,
  Flame,
  Trophy,
  Crown,
  Award,
  CalendarCheck,
  Lock,
} from 'lucide-react';
import { Achievement } from '../types';

interface AchievementsViewProps {
  achievements: Achievement[];
  consecutiveStreak: number;
}

export const AchievementsView: React.FC<AchievementsViewProps> = ({
  achievements,
  consecutiveStreak,
}) => {
  const iconMap: Record<string, React.ElementType> = {
    Sparkles,
    Layers,
    CheckCircle2,
    Flame,
    Trophy,
    Crown,
    Award,
    CalendarCheck,
  };

  const unlockedCount = achievements.filter((a) => a.isUnlocked).length;
  const totalCount = achievements.length;
  const completionPercent = Math.round((unlockedCount / totalCount) * 100);

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header Banner */}
      <div className="p-5 sm:p-6 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-700 text-white shadow-md shadow-emerald-700/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-semibold text-emerald-100 uppercase tracking-wider">
            소비 가치 성취
          </span>
          <h2 className="text-xl sm:text-2xl font-bold mt-0.5">업적 & 챌린지</h2>
          <p className="text-xs sm:text-sm text-emerald-100 mt-1 max-w-sm">
            등록하고 꾸준히 사용하는 만큼 달성률과 칭호가 차곡차곡 쌓여요.
          </p>
        </div>

        <div className="p-3.5 rounded-xl bg-white/10 backdrop-blur-sm border border-white/20 flex items-center gap-4 shrink-0">
          <div>
            <span className="text-[11px] text-emerald-200 font-medium block">업적 달성률</span>
            <span className="text-2xl font-bold">{unlockedCount} / {totalCount}</span>
          </div>
          <div className="w-12 h-12 rounded-full border-4 border-emerald-400/40 border-t-white flex items-center justify-center font-bold text-xs">
            {completionPercent}%
          </div>
        </div>
      </div>

      {/* Streak Notice */}
      <div className="p-4 rounded-xl bg-amber-50/70 border border-amber-200/80 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-amber-500 text-white shadow-sm">
            <Flame className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-slate-800">
              현재 연속 기록: <span className="text-amber-600 font-extrabold">{consecutiveStreak}일 연속</span>
            </h3>
            <p className="text-[11px] text-slate-500 mt-0.5">
              사용을 잊지 않고 매일 기록하여 7일 연속 업적에 도전해 보세요!
            </p>
          </div>
        </div>
        <span className="text-xs font-bold text-amber-800 bg-amber-100/80 px-2.5 py-1 rounded-full shrink-0">
          {consecutiveStreak >= 7 ? '🔥 7일 달성완료!' : `${consecutiveStreak} / 7일`}
        </span>
      </div>

      {/* Achievements Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
        {achievements.map((ach) => {
          const Icon = iconMap[ach.iconName] || Trophy;
          const isUnlocked = ach.isUnlocked;

          return (
            <div
              key={ach.id}
              className={`p-4 sm:p-5 rounded-2xl border transition-all duration-200 flex items-start gap-3.5 relative overflow-hidden ${
                isUnlocked
                  ? 'bg-white border-emerald-200/90 shadow-sm shadow-emerald-500/5'
                  : 'bg-slate-50/70 border-slate-200/70 opacity-80'
              }`}
            >
              {/* Icon */}
              <div
                className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${
                  isUnlocked
                    ? 'bg-emerald-100 text-emerald-800 shadow-sm'
                    : 'bg-slate-200 text-slate-400'
                }`}
              >
                {isUnlocked ? <Icon className="w-5 h-5" /> : <Lock className="w-5 h-5" />}
              </div>

              {/* Text & Progress */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <h3
                    className={`font-bold text-sm truncate ${
                      isUnlocked ? 'text-slate-900' : 'text-slate-600'
                    }`}
                  >
                    {ach.title}
                  </h3>
                  {isUnlocked && (
                    <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200/60 shrink-0">
                      달성완료
                    </span>
                  )}
                </div>

                <p className="text-xs text-slate-500 mt-0.5 leading-normal">
                  {ach.description}
                </p>

                {/* Progress bar */}
                <div className="mt-2.5 space-y-1">
                  <div className="w-full bg-slate-200/80 rounded-full h-1.5 overflow-hidden">
                    <div
                      className={`h-1.5 rounded-full transition-all duration-300 ${
                        isUnlocked ? 'bg-emerald-600' : 'bg-slate-400'
                      }`}
                      style={{ width: `${ach.progressPercent}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-[11px] text-slate-400">
                    <span>진행도</span>
                    <span className="font-semibold text-slate-600">{ach.progressText}</span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
