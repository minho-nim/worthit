import { useEffect, useState } from 'react';
import { Download, RefreshCw } from 'lucide-react';
import { useRegisterSW } from 'virtual:pwa-register/react';

interface InstallPrompt extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function AppInstall() {
  const [installPrompt, setInstallPrompt] = useState<InstallPrompt | null>(null);
  const [showHelp, setShowHelp] = useState(false);
  const [installed, setInstalled] = useState(false);
  const [installing, setInstalling] = useState(false);
  const { needRefresh: [needRefresh, setNeedRefresh], updateServiceWorker } = useRegisterSW();

  useEffect(() => {
    const media = window.matchMedia('(display-mode: standalone)');
    const syncInstalled = () => setInstalled(media.matches || Boolean((navigator as Navigator & { standalone?: boolean }).standalone));
    const capture = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as InstallPrompt);
    };
    const onInstalled = () => { setInstalled(true); setInstallPrompt(null); };
    syncInstalled();
    media.addEventListener('change', syncInstalled);
    window.addEventListener('beforeinstallprompt', capture);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      media.removeEventListener('change', syncInstalled);
      window.removeEventListener('beforeinstallprompt', capture);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  const install = async () => {
    if (!installPrompt) { setShowHelp(!showHelp); return; }
    setInstalling(true);
    try {
      await installPrompt.prompt();
      const choice = await installPrompt.userChoice;
      if (choice.outcome === 'accepted') setShowHelp(false);
    } catch {
      setShowHelp(true);
    } finally {
      setInstallPrompt(null);
      setInstalling(false);
    }
  };

  return (
    <div className="space-y-2">
      {!installed && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-bold text-emerald-900">WorthIt을 앱처럼 사용하세요</p>
              <p className="text-[11px] text-emerald-800 mt-1">홈 화면에서 바로 열고, 처음 불러온 뒤에는 오프라인에서도 기록할 수 있어요.</p>
            </div>
            <button type="button" onClick={install} disabled={installing} aria-expanded={showHelp}
              className="shrink-0 flex items-center gap-1 rounded-xl bg-emerald-700 text-white px-3 py-2 text-xs font-bold disabled:opacity-50">
              <Download className="w-3.5 h-3.5" /> {installPrompt ? '앱 설치' : '설치 안내'}
            </button>
          </div>
          {showHelp && <div className="text-xs text-emerald-900 mt-3 leading-relaxed space-y-1">
            <p>아이폰·아이패드: Safari에서 이 페이지를 연 뒤 공유 메뉴 → 홈 화면에 추가를 선택하세요.</p>
            <p>안드로이드·PC: Chrome 또는 Edge의 메뉴에서 앱 설치 또는 홈 화면에 추가를 선택하세요. 브라우저에 따라 메뉴가 다를 수 있어요.</p>
            <p>기록은 기기·브라우저별로 저장돼요. 설치 전 설정에서 백업해 두면 필요할 때 복원할 수 있어요.</p>
          </div>}
        </div>
      )}
      {needRefresh && <div role="status" className="rounded-xl border border-slate-200 bg-white px-4 py-3 flex flex-wrap items-center gap-3 text-xs">
        <span className="flex-1">새 버전이 준비됐어요. 입력을 마친 뒤 업데이트해 주세요.</span>
        <button type="button" onClick={() => updateServiceWorker(true)} className="font-bold text-emerald-700 flex items-center gap-1"><RefreshCw className="w-3.5 h-3.5" />업데이트</button>
        <button type="button" onClick={() => setNeedRefresh(false)} className="text-slate-500">나중에</button>
      </div>}
    </div>
  );
}
