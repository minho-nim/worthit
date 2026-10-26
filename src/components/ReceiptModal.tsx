import React, { useEffect, useRef, useState } from 'react';
import { X, Copy, Download, FileDown, Image } from 'lucide-react';
import { ItemStats } from '../types';
import { formatKRW, formatDate, getRealLifeEquivalence, getTodayDateString } from '../utils/calculator';
import { downloadReceipt, receiptFilename, receiptPng, saveReceiptPdf } from '../utils/receiptExport';

interface ReceiptModalProps {
  stats: ItemStats | null;
  isOpen: boolean;
  onClose: () => void;
}

export const ReceiptModal: React.FC<ReceiptModalProps> = ({
  stats,
  isOpen,
  onClose,
}) => {
  const [busy, setBusy] = useState<'png' | 'image' | 'pdf' | 'text' | null>(null);
  const [message, setMessage] = useState('');
  const [exportError, setExportError] = useState('');
  const receiptNode = useRef<HTMLDivElement>(null);
  const operation = useRef(0);
  const inProgress = useRef(false);
  const closeButton = useRef<HTMLButtonElement>(null);
  const onCloseRef = useRef(onClose);
  useEffect(() => { onCloseRef.current = onClose; }, [onClose]);

  useEffect(() => {
    if (!isOpen) return;
    const previousFocus = document.activeElement as HTMLElement | null;
    setBusy(null);
    setMessage('');
    setExportError('');
    closeButton.current?.focus();
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        onCloseRef.current();
      }
    };
    document.addEventListener('keydown', handleKey, true);
    return () => {
      operation.current += 1;
      inProgress.current = false;
      document.removeEventListener('keydown', handleKey, true);
      previousFocus?.focus();
    };
  }, [isOpen]);

  if (!isOpen || !stats) return null;

  const { item, progress, isGoalAchieved, currentUnitCost, totalUsage, daysOwned } = stats;
  const isDays = item.usageMethod === 'days';
  const unit = isDays ? '일' : item.usageUnit;
  const equivalence = getRealLifeEquivalence(currentUnitCost ?? item.purchasePrice);

  const handleExport = async (action: 'png' | 'image' | 'pdf' | 'text') => {
    const node = receiptNode.current;
    if (!node || inProgress.current) return;
    inProgress.current = true;
    const currentOperation = ++operation.current;
    setBusy(action);
    setMessage('');
    setExportError('');
    const filename = receiptFilename(item.name, getTodayDateString());
    const text = `🧾 [WorthIt 본전 영수증]\n항목: ${item.name}\n구매가: ${formatKRW(item.purchasePrice)}\n현재 사용단가: ${stats.unitCostFormatted}\n목표 단가: ${stats.targetCostFormatted}\n달성률: ${progress}%\n현실 체감 가치: ${equivalence.emoji} ${equivalence.label} (${equivalence.text})\n상태: ${isGoalAchieved ? '🎉 본전 달성 완료!' : '꾸준히 가치 창출 중!'}\n\n#WorthIt #본전뽑기 #가치소비`;
    try {
      if (action === 'image') {
        if (!navigator.clipboard?.write || typeof ClipboardItem === 'undefined'
          || (ClipboardItem.supports && !ClipboardItem.supports('image/png'))) {
          throw new Error('이 브라우저에서는 이미지 복사를 지원하지 않아요. PNG 저장을 이용해 주세요.');
        }
        // Start write during the click gesture, before async rendering, for Safari support.
        await navigator.clipboard.write([new ClipboardItem({ 'image/png': receiptPng(node) })]);
      } else if (action === 'png') {
        const png = await receiptPng(node);
        if (currentOperation !== operation.current) return;
        downloadReceipt(png, `${filename}.png`);
      } else if (action === 'pdf') {
        await saveReceiptPdf(node, filename);
      } else {
        if (!navigator.clipboard?.writeText) throw new Error('이 브라우저에서는 텍스트 복사를 지원하지 않아요.');
        await navigator.clipboard.writeText(text);
      }
      if (currentOperation === operation.current) setMessage({
        png: 'PNG 다운로드를 시작했어요.', image: '영수증 이미지를 복사했어요. 채팅이나 메모에 붙여넣어 보세요.',
        pdf: 'PDF 다운로드를 시작했어요.', text: '영수증 텍스트를 복사했어요.',
      }[action]);
    } catch (error) {
      if (currentOperation === operation.current) setExportError(
        error instanceof Error && error.name !== 'NotAllowedError' ? error.message
          : '복사 권한을 확인하거나 PNG 저장을 이용해 주세요.'
      );
    } finally {
      if (currentOperation === operation.current) { setBusy(null); inProgress.current = false; }
    }
  };

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={(event) => { if (event.target === event.currentTarget) onClose(); }}
    >
      <div role="dialog" aria-modal="true" aria-labelledby="receipt-title" className="bg-white rounded-3xl max-w-sm w-full max-h-[90dvh] overflow-y-auto p-6 pt-14 shadow-2xl border border-slate-200 relative flex flex-col items-center">
        {/* Close Button */}
        <button
          ref={closeButton}
          type="button"
          onClick={onClose}
          className="absolute z-10 top-3 right-3 p-2 text-slate-600 hover:text-slate-900 rounded-lg hover:bg-slate-100"
          aria-label="영수증 닫기"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Receipt Outer Container */}
        <div ref={receiptNode} className="w-full shrink-0 bg-slate-50 border border-slate-200 rounded-2xl p-5 relative shadow-inner font-mono text-xs text-slate-800 space-y-4">
          {/* Header */}
          <div className="text-center border-b border-dashed border-slate-300 pb-3">
            <span className="text-[10px] tracking-widest text-slate-400 uppercase font-sans font-bold">
              OFFICIAL VALUE RECEIPT
            </span>
            <h3 id="receipt-title" className="text-base font-bold tracking-tight text-slate-900 font-sans mt-0.5">
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
              <strong className="font-sans text-slate-900 text-right break-words max-w-[170px]">
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

        <div className="w-full mt-4 grid grid-cols-3 gap-2" aria-busy={busy !== null}>
          <button type="button" onClick={() => handleExport('png')} disabled={busy !== null} className="flex flex-col items-center gap-1.5 py-3 rounded-xl bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 disabled:opacity-50"><Download className="w-4 h-4" />PNG 저장</button>
          <button type="button" onClick={() => handleExport('image')} disabled={busy !== null} className="flex flex-col items-center gap-1.5 py-3 rounded-xl border border-emerald-300 text-emerald-800 text-xs font-bold hover:bg-emerald-50 disabled:opacity-50"><Image className="w-4 h-4" />이미지 복사</button>
          <button type="button" onClick={() => handleExport('pdf')} disabled={busy !== null} className="flex flex-col items-center gap-1.5 py-3 rounded-xl border border-slate-300 text-slate-700 text-xs font-bold hover:bg-slate-50 disabled:opacity-50"><FileDown className="w-4 h-4" />PDF 저장</button>
        </div>
        <p className="w-full mt-2 text-xs text-emerald-700" role="status" aria-live="polite">{busy ? '영수증을 준비하고 있어요…' : message}</p>
        <div className="w-full mt-3 flex gap-2">
          <button type="button" onClick={onClose} className="px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50">닫기</button>
          <button
            type="button"
            onClick={() => handleExport('text')}
            disabled={busy !== null}
            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 px-4 text-slate-600 rounded-xl text-xs font-semibold hover:bg-slate-50 disabled:opacity-50"
          >
            <Copy className="w-4 h-4" /><span>텍스트 복사</span>
          </button>
        </div>
        {exportError && <p role="alert" className="mt-2 text-xs text-rose-600">{exportError}</p>}
      </div>
    </div>
  );
};
