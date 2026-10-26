import React, { useState, useRef } from 'react';
import {
  X,
  Download,
  Upload,
  RefreshCw,
  Trash2,
  Database,
  CheckCircle2,
  AlertTriangle,
  Info,
  Sparkles,
} from 'lucide-react';
import {
  exportBackupData,
  validateAndParseBackup,
  restoreBackupData,
  clearAllData,
  isDemoMode,
  demoPageUrl,
  BackupData,
} from '../utils/storage';
import { getTodayDateString } from '../utils/calculator';

interface SettingsModalProps {
  allowDemo: boolean;
  isOpen: boolean;
  onClose: () => void;
  onDataChanged: () => void;
  showToast: (title: string, desc?: string, type?: 'success' | 'info' | 'warning') => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  allowDemo,
  isOpen,
  onClose,
  onDataChanged,
  showToast,
}) => {
  const [pendingBackup, setPendingBackup] = useState<BackupData | null>(null);
  const [pendingSummary, setPendingSummary] = useState<{
    itemsCount: number;
    recordsCount: number;
    periodsCount: number;
  } | null>(null);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  // Handle Export
  const handleExport = () => {
    try {
      const jsonString = exportBackupData();
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const dateStr = getTodayDateString();
      a.href = url;
      a.download = `worthit-backup-${dateStr}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showToast('백업 파일이 다운로드되었습니다.', '안전한 위치에 보관해 주세요.');
    } catch (err: any) {
      showToast('백업 실패', err.message, 'warning');
    }
  };

  // Handle File Selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const result = validateAndParseBackup(text);
      if (result.success && result.data && result.summary) {
        setPendingBackup(result.data);
        setPendingSummary(result.summary);
      } else {
        showToast('가져오기 실패', result.error || '올바른 백업 파일이 아닙니다.', 'warning');
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Confirm Import
  const handleConfirmImport = () => {
    if (!pendingBackup) return;
    restoreBackupData(pendingBackup);
    setPendingBackup(null);
    setPendingSummary(null);
    onDataChanged();
    showToast('데이터가 성공적으로 복원되었습니다.', '기존 데이터가 백업 파일 내용으로 교체되었습니다.');
    onClose();
  };

  // Confirm Clear All
  const handleClearAll = () => {
    clearAllData();
    setShowClearConfirm(false);
    onDataChanged();
    showToast('모든 데이터가 초기화되었습니다.', '기존 소비와 기록이 삭제되었습니다.', 'info');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl max-w-md w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-100 overflow-hidden">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-emerald-50 text-emerald-700">
              <Database className="w-5 h-5" />
            </div>
            <h2 className="font-bold text-base sm:text-lg text-slate-900">
              데이터 백업 및 설정
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
            aria-label="닫기"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* Persistence Notice */}
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex items-start gap-3 text-xs text-slate-600 leading-relaxed">
            <Info className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-slate-800">{isDemoMode ? '샘플 체험 안내' : '로컬 브라우저 저장 안내'}</p>
              {isDemoMode
                ? '체험 중 변경은 임시로만 유지되며 내 소비에는 반영되지 않아요. 새로고침하면 샘플로 돌아와요.'
                : '내 소비는 이 브라우저에 자동 저장돼요. 다른 기기와 자동으로 공유되지 않으며, 사이트 데이터를 삭제하면 사라질 수 있어요. 정기적으로 백업해 주세요.'}
            </div>
          </div>

          {/* Backup Download & Restore */}
          <div className="space-y-2">
            <span className="text-xs font-bold text-slate-700">데이터 백업 / 복원</span>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={handleExport}
                className="flex items-center justify-center gap-1.5 p-3 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-800 text-xs font-semibold transition-colors"
              >
                <Download className="w-4 h-4 text-emerald-600" />
                <span>JSON 내보내기</span>
              </button>

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center justify-center gap-1.5 p-3 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-800 text-xs font-semibold transition-colors"
              >
                <Upload className="w-4 h-4 text-blue-600" />
                <span>JSON 가져오기</span>
              </button>
            </div>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept=".json"
              className="hidden"
            />
          </div>

          {!isDemoMode && (
            <button type="button" onClick={() => {
              window.dispatchEvent(new Event('worthit:show-install-guide'));
              onClose();
            }} className="w-full flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl border border-slate-200 text-slate-700 text-xs font-semibold hover:bg-slate-50">
              <Download className="w-4 h-4" /> 앱 설치 안내 다시 보기
            </button>
          )}

          {/* Demo Data Preset */}
          {(allowDemo || isDemoMode) && <div className="pt-2 border-t border-slate-100">
            <span className="text-xs font-bold text-slate-700 block mb-1.5">
              체험용 예시 데이터
            </span>
            <p className="text-xs text-slate-500 mb-2">
              별도 샘플 페이지에서 기능을 체험할 수 있어요. 현재 내 소비는 그대로 유지돼요.
            </p>
            <button
              type="button"
              onClick={() => window.location.assign(demoPageUrl)}
              className="w-full flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-semibold transition-colors"
            >
              <Sparkles className="w-4 h-4 text-emerald-600" />
              <span>별도 샘플 페이지 열기</span>
            </button>
          </div>}

          {/* Danger zone: Clear data */}
          <div className="pt-2 border-t border-slate-100">
            <span className="text-xs font-bold text-slate-700 block mb-1.5">위험 구역</span>
            <button
              type="button"
              onClick={() => setShowClearConfirm(true)}
              className="w-full flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl border border-rose-200 bg-rose-50/50 hover:bg-rose-50 text-rose-700 text-xs font-semibold transition-colors"
            >
              <Trash2 className="w-4 h-4 text-rose-600" />
              <span>모든 데이터 초기화</span>
            </button>
          </div>
        </div>

        {/* Modal footer */}
        <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-200 rounded-xl transition-colors"
          >
            닫기
          </button>
        </div>

        {/* Confirm Import Modal */}
        {pendingBackup && pendingSummary && (
          <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in">
            <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-2xl border border-slate-100">
              <h3 className="font-bold text-base text-slate-900">백업 데이터 복원 확인</h3>
              <p className="text-xs text-slate-600 mt-2">
                선택한 백업 파일에서 다음 데이터를 가져옵니다:
              </p>
              <div className="my-3 p-3 rounded-xl bg-slate-50 border border-slate-100 text-xs space-y-1 text-slate-700">
                <p>· 등록된 소비: <strong>{pendingSummary.itemsCount}개</strong></p>
                <p>· 사용 기록: <strong>{pendingSummary.recordsCount}건</strong></p>
                <p>· 결제 기간: <strong>{pendingSummary.periodsCount}건</strong></p>
              </div>
              <p className="text-xs text-rose-600 font-medium">
                ⚠️ 기존에 등록되어 있던 모든 데이터는 이 백업 내용으로 교체됩니다.
              </p>
              <div className="flex justify-end gap-2 mt-4">
                <button
                  onClick={() => {
                    setPendingBackup(null);
                    setPendingSummary(null);
                  }}
                  className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  취소
                </button>
                <button
                  onClick={handleConfirmImport}
                  className="px-4 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm"
                >
                  데이터 복원하기
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Confirm Clear All */}
        {showClearConfirm && (
          <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in">
            <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-2xl border border-slate-100">
              <h3 className="font-bold text-base text-rose-600 flex items-center gap-1.5">
                <AlertTriangle className="w-5 h-5" />
                <span>모든 데이터 초기화</span>
              </h3>
              <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                등록된 모든 소비 항목, 사용 기록, 결제기간이 영구히 삭제됩니다. 정말 초기화하시겠습니까?
              </p>
              <div className="flex justify-end gap-2 mt-4">
                <button
                  onClick={() => setShowClearConfirm(false)}
                  className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  취소
                </button>
                <button
                  onClick={handleClearAll}
                  className="px-4 py-1.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg shadow-sm"
                >
                  영구 삭제
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
