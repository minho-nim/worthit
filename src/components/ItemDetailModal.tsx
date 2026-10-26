import React, { useState } from 'react';
import {
  X,
  Edit,
  Trash2,
  Plus,
  Calendar,
  CheckCircle2,
  Clock,
  ArrowLeft,
  FileText,
  AlertCircle,
  Package,
  RefreshCw,
  CreditCard,
  Sparkles,
  CreditCard as BillingIcon,
  Receipt,
  TrendingDown,
  Calculator,
} from 'lucide-react';
import { WorthItem, UsageRecord, BillingPeriod, ItemStats } from '../types';
import {
  formatKRW,
  formatDate,
  getRealLifeEquivalence,
  simulateNextUses,
} from '../utils/calculator';

interface ItemDetailModalProps {
  stats: ItemStats;
  records: UsageRecord[];
  billingPeriods: BillingPeriod[];
  isOpen: boolean;
  onClose: () => void;
  onEditItem: () => void;
  onDeleteItem: (itemId: string) => void;
  onAddQuickRecord: (quantity: number) => void;
  onOpenLogModal: (recordToEdit?: UsageRecord) => void;
  onDeleteRecord: (recordId: string) => void;
  onAddBillingPeriod: (period: Omit<BillingPeriod, 'id' | 'itemId'>) => void;
  onDeleteBillingPeriod: (periodId: string) => void;
  onChangeStatus: (newStatus: WorthItem['status']) => void;
  onOpenReceipt?: () => void;
}

export const ItemDetailModal: React.FC<ItemDetailModalProps> = ({
  stats,
  records,
  billingPeriods,
  isOpen,
  onClose,
  onEditItem,
  onDeleteItem,
  onAddQuickRecord,
  onOpenLogModal,
  onDeleteRecord,
  onAddBillingPeriod,
  onDeleteBillingPeriod,
  onChangeStatus,
  onOpenReceipt,
}) => {
  const [activeTab, setActiveTab] = useState<'records' | 'simulator'>('records');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [recordToDelete, setRecordToDelete] = useState<string | null>(null);
  const [showAddPeriod, setShowAddPeriod] = useState(false);

  // Period form
  const [periodStart, setPeriodStart] = useState('');
  const [periodEnd, setPeriodEnd] = useState('');
  const [periodAmount, setPeriodAmount] = useState(stats.item.purchasePrice.toString());

  if (!isOpen) return null;

  const { item, progress, isGoalAchieved, remainingUsage, requiredUsage, daysOwned, totalUsage } =
    stats;
  const isDays = item.usageMethod === 'days';
  const unit = isDays ? '일' : item.usageUnit;

  const itemRecords = records
    .filter((r) => r.itemId === item.id)
    .sort((a, b) => b.usedAt.localeCompare(a.usedAt));

  const itemPeriods = billingPeriods.filter((b) => b.itemId === item.id);

  const categoryIcons = {
    item: Package,
    subscription: RefreshCw,
    membership: CreditCard,
    other: Sparkles,
  };
  const Icon = categoryIcons[item.category] || Sparkles;

  const equivalence = stats.currentUnitCost !== null
    ? getRealLifeEquivalence(stats.currentUnitCost)
    : null;

  const simulations = simulateNextUses(item, totalUsage, [1, 3, 5, 10]);

  const handlePeriodSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!periodStart || !periodEnd) return;
    onAddBillingPeriod({
      periodStart,
      periodEnd,
      amount: Math.round(Number(periodAmount) || 0),
      status: 'paid',
    });
    setShowAddPeriod(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-slate-100 overflow-hidden">
        {/* Top Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
              aria-label="뒤로가기"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-emerald-50 text-emerald-700">
                <Icon className="w-4 h-4" />
              </div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 truncate max-w-[200px] sm:max-w-xs">
                {item.name}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-1">
            {onOpenReceipt && (
              <button
                onClick={onOpenReceipt}
                className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-colors border border-emerald-200/80 mr-1"
                title="본전 영수증 보기"
              >
                <Receipt className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">영수증</span>
              </button>
            )}
            <button
              onClick={onEditItem}
              className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
              title="수정하기"
            >
              <Edit className="w-4 h-4" />
            </button>
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
              title="삭제하기"
            >
              <Trash2 className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors ml-1"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
          {/* Status selector banner */}
          <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-200/80 text-xs">
            <div className="flex items-center gap-2">
              <span className="text-slate-500 font-medium">상태:</span>
              <div className="inline-flex rounded-lg border border-slate-200 bg-white p-0.5">
                {(['active', 'completed', 'archived'] as WorthItem['status'][]).map((st) => (
                  <button
                    key={st}
                    onClick={() => onChangeStatus(st)}
                    className={`px-2.5 py-1 text-xs rounded-md transition-colors ${
                      item.status === st
                        ? 'bg-slate-900 text-white font-semibold'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {st === 'active' ? '사용 중' : st === 'completed' ? '사용 종료' : '보관'}
                  </button>
                ))}
              </div>
            </div>

            <span className="text-slate-400 hidden sm:inline">
              구매일 {formatDate(item.purchaseDate)}
            </span>
          </div>

          {/* Key Metrics Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div className="p-3.5 rounded-2xl border border-slate-200 bg-white">
              <span className="text-xs text-slate-500 font-medium">구매 금액</span>
              <p className="text-base sm:text-lg font-bold text-slate-900 mt-0.5">
                {formatKRW(item.purchasePrice)}
              </p>
            </div>

            <div className="p-3.5 rounded-2xl border border-slate-200 bg-white">
              <span className="text-xs text-slate-500 font-medium">현재 사용단가</span>
              <p className="text-base sm:text-lg font-bold text-slate-900 mt-0.5">
                {stats.currentUnitCost !== null
                  ? `${formatKRW(stats.currentUnitCost)}/${unit}`
                  : '기록 대기'}
              </p>
            </div>

            <div className="p-3.5 rounded-2xl border border-emerald-200 bg-emerald-50/40 col-span-2 sm:col-span-1">
              <span className="text-xs text-emerald-800 font-medium">목표 사용단가</span>
              <p className="text-base sm:text-lg font-bold text-emerald-700 mt-0.5">
                {formatKRW(item.targetUnitCost)}/{unit}
              </p>
            </div>
          </div>

          {/* Progress Section */}
          <div className="p-4 sm:p-5 rounded-2xl border border-slate-200 bg-white space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-slate-900">목표 달성률</span>
                {isGoalAchieved && (
                  <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> 본전 달성!
                  </span>
                )}
              </div>
              <span className="text-base font-bold text-slate-900">{progress}%</span>
            </div>

            <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
              <div
                className={`h-3 rounded-full transition-all duration-300 ${
                  isGoalAchieved ? 'bg-emerald-600' : 'bg-emerald-500'
                }`}
                style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
              />
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between text-xs text-slate-600 gap-1 pt-1">
              <span>{stats.statusMessage}</span>
              <span>
                {isDays ? (
                  <>
                    총 {requiredUsage}일 중 <strong>{daysOwned}일 경과</strong> (앞으로{' '}
                    <strong>{remainingUsage}일</strong> 남음)
                  </>
                ) : (
                  <>
                    총 {requiredUsage}
                    {unit} 중 <strong>{totalUsage}회 사용</strong> (앞으로{' '}
                    <strong>
                      {remainingUsage}
                      {unit}
                    </strong>{' '}
                    남음)
                  </>
                )}
              </span>
            </div>

            {/* Real Life Equivalence Banner */}
            {equivalence && (
              <div className="mt-2 pt-3 border-t border-slate-100 flex items-center gap-2 text-xs">
                <span className="text-base">{equivalence.emoji}</span>
                <span className="font-semibold text-slate-800">
                  {equivalence.label}:
                </span>
                <span className="text-slate-500">{equivalence.text}</span>
              </div>
            )}
          </div>

          {/* Quick Usage Recording Controls (for usage based) */}
          {!isDays && (
            <div className="p-4 rounded-2xl border border-emerald-100 bg-emerald-50/30 space-y-2.5">
              <span className="text-xs font-bold text-slate-800">빠른 사용 기록 추가</span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => onAddQuickRecord(1)}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-semibold transition-colors shadow-sm shadow-emerald-600/20"
                >
                  <Plus className="w-4 h-4 stroke-[2.5]" />
                  <span>+1{unit} 사용</span>
                </button>
                <button
                  type="button"
                  onClick={() => onAddQuickRecord(unit === '시간' ? 2 : 5)}
                  className="px-4 py-2.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-xl text-sm font-medium transition-colors"
                >
                  +{unit === '시간' ? '2시간' : '5회'}
                </button>
                <button
                  type="button"
                  onClick={() => onOpenLogModal()}
                  className="px-4 py-2.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-xl text-sm font-medium transition-colors flex items-center gap-1"
                >
                  <Clock className="w-3.5 h-3.5" />
                  <span>직접 입력</span>
                </button>
              </div>
            </div>
          )}

          {/* Tab Switcher: 기록 내역 vs 가치 시뮬레이터 */}
          {!isDays && (
            <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl">
              <button
                type="button"
                onClick={() => setActiveTab('records')}
                className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                  activeTab === 'records'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                사용 기록 내역 ({itemRecords.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('simulator')}
                className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-colors flex items-center justify-center gap-1 ${
                  activeTab === 'simulator'
                    ? 'bg-white text-emerald-800 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Calculator className="w-3.5 h-3.5" />
                <span>본전 시뮬레이터</span>
              </button>
            </div>
          )}

          {/* SIMULATOR TAB */}
          {!isDays && activeTab === 'simulator' && (
            <div className="p-4 rounded-2xl border border-slate-200 bg-white space-y-3.5">
              <div>
                <h3 className="font-bold text-sm text-slate-900">
                  더 사용했을 때 1{unit}당 단가 변화
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  방치하지 않고 몇 번만 더 써도 단가가 눈에 띄게 줄어듭니다!
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2.5 pt-1">
                {simulations.map((sim) => (
                  <div
                    key={sim.additional}
                    className="p-3 rounded-xl border border-slate-200 bg-slate-50/70 text-xs space-y-1"
                  >
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-slate-700">
                        +{sim.additional}{unit} 더 쓰면
                      </span>
                      <span className="text-[11px] text-emerald-600 font-bold flex items-center gap-0.5">
                        <TrendingDown className="w-3 h-3" />
                        -{formatKRW(sim.reduction)}
                      </span>
                    </div>
                    <p className="text-base font-bold text-slate-900">
                      {formatKRW(sim.cost)}/{unit}
                    </p>
                    <p className="text-[10px] text-slate-400">
                      누적 {sim.totalCount}{unit} 도달 시
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Subscription Billing Periods (if subscription) */}
          {item.category === 'subscription' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-sm text-slate-900 flex items-center gap-1.5">
                  <BillingIcon className="w-4 h-4 text-emerald-600" />
                  <span>구독 결제 기간 관리 ({itemPeriods.length}건)</span>
                </h3>
                <button
                  onClick={() => setShowAddPeriod(!showAddPeriod)}
                  className="text-xs font-semibold text-emerald-600 hover:text-emerald-700"
                >
                  + 새 결제기간 추가
                </button>
              </div>

              {showAddPeriod && (
                <form
                  onSubmit={handlePeriodSubmit}
                  className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 space-y-3 text-xs"
                >
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-slate-600 mb-1">시작일</label>
                      <input
                        type="date"
                        value={periodStart}
                        onChange={(e) => setPeriodStart(e.target.value)}
                        required
                        className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-600 mb-1">종료일</label>
                      <input
                        type="date"
                        value={periodEnd}
                        onChange={(e) => setPeriodEnd(e.target.value)}
                        required
                        className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-slate-600 mb-1">결제 금액 (원)</label>
                    <input
                      type="number"
                      value={periodAmount}
                      onChange={(e) => setPeriodAmount(e.target.value)}
                      required
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white"
                    />
                  </div>
                  <div className="flex justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setShowAddPeriod(false)}
                      className="px-3 py-1.5 text-slate-600 hover:bg-slate-200 rounded-lg"
                    >
                      취소
                    </button>
                    <button
                      type="submit"
                      className="px-3 py-1.5 bg-emerald-600 text-white font-medium rounded-lg"
                    >
                      저장
                    </button>
                  </div>
                </form>
              )}

              {itemPeriods.length === 0 ? (
                <p className="text-xs text-slate-400 py-2">
                  등록된 추가 결제기간이 없습니다. 최초 구매 금액이 기본 적용됩니다.
                </p>
              ) : (
                <div className="space-y-1.5">
                  {itemPeriods.map((p) => (
                    <div
                      key={p.id}
                      className="flex items-center justify-between p-2.5 rounded-xl border border-slate-200 bg-white text-xs"
                    >
                      <div>
                        <span className="font-semibold text-slate-800">
                          {formatKRW(p.amount)}
                        </span>
                        <span className="text-slate-400 ml-2">
                          {formatDate(p.periodStart)} ~ {formatDate(p.periodEnd)}
                        </span>
                      </div>
                      <button
                        onClick={() => onDeleteBillingPeriod(p.id)}
                        className="text-slate-400 hover:text-rose-500 p-1"
                        title="결제기간 삭제"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Usage History List (for usage based) */}
          {(!isDays && activeTab === 'records') && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-sm text-slate-900">
                  사용 기록 내역 ({itemRecords.length}건)
                </h3>
                <button
                  type="button"
                  onClick={() => onOpenLogModal()}
                  className="text-xs text-emerald-600 font-semibold hover:text-emerald-700"
                >
                  + 기록 추가
                </button>
              </div>

              {itemRecords.length === 0 ? (
                <div className="text-center py-8 rounded-2xl border border-dashed border-slate-200 bg-slate-50/50">
                  <Clock className="w-6 h-6 text-slate-300 mx-auto mb-1.5" />
                  <p className="text-xs text-slate-500 font-medium">아직 사용 기록이 없습니다.</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    위 버튼을 눌러 첫 사용을 기록해 보세요!
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {itemRecords.map((record) => (
                    <div
                      key={record.id}
                      className="flex items-center justify-between p-3 rounded-xl border border-slate-100 bg-slate-50 hover:bg-slate-100/60 transition-colors"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-slate-800">
                            +{record.quantity}
                            {unit}
                          </span>
                          <span className="text-xs text-slate-500">
                            {formatDate(record.usedAt)}
                          </span>
                        </div>
                        {record.note && (
                          <p className="text-xs text-slate-600 mt-0.5 truncate max-w-xs">
                            {record.note}
                          </p>
                        )}
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => onOpenLogModal(record)}
                          className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-white"
                          title="기록 수정"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setRecordToDelete(record.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-500 rounded-lg hover:bg-white"
                          title="기록 삭제"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Delete Record Confirmation Modal */}
        {recordToDelete && (
          <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in">
            <div className="bg-white rounded-2xl max-w-xs w-full p-5 shadow-xl border border-slate-100">
              <h4 className="text-sm font-bold text-slate-900">사용 기록 삭제</h4>
              <p className="text-xs text-slate-600 mt-1">
                이 기록을 삭제하시겠습니까? 삭제 시 사용단가와 달성률이 다시 계산됩니다.
              </p>
              <div className="flex items-center justify-end gap-2 mt-4">
                <button
                  onClick={() => setRecordToDelete(null)}
                  className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  취소
                </button>
                <button
                  onClick={() => {
                    onDeleteRecord(recordToDelete);
                    setRecordToDelete(null);
                  }}
                  className="px-3 py-1.5 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-lg"
                >
                  삭제하기
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Delete Item Confirmation Modal */}
        {showDeleteConfirm && (
          <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in">
            <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-xl border border-slate-100">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-xl bg-rose-50 text-rose-600">
                  <AlertCircle className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900">소비 항목 삭제</h4>
                  <p className="text-xs text-slate-600 mt-1">
                    <strong>"{item.name}"</strong> 소비와 연결된{' '}
                    <strong>{itemRecords.length}건</strong>의 모든 사용 기록이 영구히 삭제됩니다. 계속하시겠습니까?
                  </p>
                </div>
              </div>
              <div className="flex items-center justify-end gap-2 mt-5">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="px-3.5 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  취소
                </button>
                <button
                  onClick={() => {
                    onDeleteItem(item.id);
                    setShowDeleteConfirm(false);
                    onClose();
                  }}
                  className="px-4 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-sm shadow-rose-600/20"
                >
                  삭제 확인
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
