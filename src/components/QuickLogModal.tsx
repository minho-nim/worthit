import React, { useEffect, useState } from 'react';
import { X, Plus, Calendar, FileText } from 'lucide-react';
import { WorthItem, UsageRecord } from '../types';
import { getTodayDateString } from '../utils/calculator';

interface QuickLogModalProps {
  isOpen: boolean;
  item: WorthItem | null;
  onClose: () => void;
  onSaveRecord: (itemId: string, quantity: number, usedAt: string, note?: string) => void;
  editingRecord?: UsageRecord | null;
  onUpdateRecord?: (recordId: string, quantity: number, usedAt: string, note?: string) => void;
}

export const QuickLogModal: React.FC<QuickLogModalProps> = ({
  isOpen,
  item,
  onClose,
  onSaveRecord,
  editingRecord,
  onUpdateRecord,
}) => {
  const [quantity, setQuantity] = useState<string>(
    editingRecord ? editingRecord.quantity.toString() : '1'
  );
  const [usedAt, setUsedAt] = useState<string>(
    editingRecord ? editingRecord.usedAt : getTodayDateString()
  );
  const [note, setNote] = useState<string>(editingRecord?.note || '');
  const [error, setError] = useState<string>('');

  useEffect(() => {
    if (!isOpen) return;
    setQuantity(editingRecord ? editingRecord.quantity.toString() : '1');
    setUsedAt(editingRecord ? editingRecord.usedAt : getTodayDateString());
    setNote(editingRecord?.note || '');
    setError('');
  }, [isOpen, item?.id, editingRecord]);

  if (!isOpen || !item) return null;

  const todayStr = getTodayDateString();
  const unit = item.usageUnit;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const qty = Number(quantity);

    if (!Number.isFinite(qty) || qty <= 0) {
      setError('0보다 큰 숫자를 입력해 주세요.');
      return;
    }

    if (unit !== '시간' && !Number.isInteger(qty)) {
      setError('정수로 입력해 주세요.');
      return;
    }

    if (!usedAt) {
      setError('사용 날짜를 선택해 주세요.');
      return;
    }

    if (editingRecord && onUpdateRecord) {
      onUpdateRecord(editingRecord.id, qty, usedAt, note.trim() || undefined);
    } else {
      onSaveRecord(item.id, qty, usedAt, note.trim() || undefined);
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-2xl border border-slate-100">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div>
            <h3 className="font-bold text-base text-slate-900">
              {editingRecord ? '사용 기록 수정' : '사용 기록 추가'}
            </h3>
            <p className="text-xs text-slate-500 mt-0.5 truncate max-w-[220px]">
              {item.name}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
            aria-label="닫기"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          {/* Quantity */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              사용량 ({unit})
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min="0.5"
                step={unit === '시간' ? '0.5' : '1'}
                value={quantity}
                onChange={(e) => {
                  setQuantity(e.target.value);
                  setError('');
                }}
                className="flex-1 px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-900 focus:outline-none focus:border-emerald-600"
                autoFocus
              />
              {!editingRecord && (
                <div className="flex gap-1">
                  {[1, 2, 5].map((val) => (
                    <button
                      type="button"
                      key={val}
                      onClick={() => setQuantity(val.toString())}
                      className="px-2.5 py-2 text-xs font-medium rounded-lg border border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100"
                    >
                      +{val}
                    </button>
                  ))}
                </div>
              )}
            </div>
            {error && <p className="text-xs text-rose-500 mt-1">{error}</p>}
          </div>

          {/* Date */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              사용 날짜
            </label>
            <div className="relative">
              <input
                type="date"
                max={todayStr}
                value={usedAt}
                onChange={(e) => setUsedAt(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-900 focus:outline-none focus:border-emerald-600"
              />
            </div>
          </div>

          {/* Note */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              메모 (선택)
            </label>
            <input
              type="text"
              placeholder="예: 어깨 운동, 친구와 시청 등"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-900 focus:outline-none focus:border-emerald-600"
            />
          </div>

          <div className="pt-2 flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-xl"
            >
              취소
            </button>
            <button
              type="submit"
              className="flex-1 py-2.5 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 rounded-xl shadow-sm shadow-emerald-600/20"
            >
              {editingRecord ? '수정 완료' : '기록 저장'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
