import { useEffect, useState } from 'react';
import { detectBrowser } from '@/lib/browserDetection';
import { Button } from '@/components/ui/button';
import { X, Download } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function PWAInstallPrompt() {
  const [showPrompt, setShowPrompt] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [browserInfo, setBrowserInfo] = useState<ReturnType<typeof detectBrowser> | null>(null);

  useEffect(() => {
    const info = detectBrowser();
    setBrowserInfo(info);

    if (info.isPWA || info.isMiniBrowser) {
      return;
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener('beforeinstallprompt', handler);

    const timer = setTimeout(() => {
      if (!info.isPWA && !info.isMiniBrowser && (info.browserType === 'chrome' || info.browserType === 'safari')) {
        setShowPrompt(true);
      }
    }, 10000);

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
      clearTimeout(timer);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) {
      return;
    }

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === 'accepted') {
      setShowPrompt(false);
      setDeferredPrompt(null);
    }
  };

  if (!showPrompt || !browserInfo || browserInfo.isPWA || browserInfo.isMiniBrowser) {
    return null;
  }

  return (
    <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50 bg-background border-2 border-primary rounded-lg shadow-2xl p-6 max-w-sm w-full mx-4 animate-in fade-in slide-in-from-bottom-4">
      <button
        onClick={() => setShowPrompt(false)}
        className="absolute top-3 right-3 text-muted-foreground hover:text-foreground transition-colors"
        aria-label=""
      >
        <X className="h-5 w-5" />
      </button>

      <div className="flex flex-col items-center text-center space-y-4">
        <div className="bg-primary/10 p-3 rounded-full">
          <Download className="h-8 w-8 text-primary" />
        </div>

        <div>
          <h3 className="font-semibold text-lg mb-2">Install Our App</h3>
          <p className="text-sm text-muted-foreground">
            Get quick access and a better experience by installing our app.
          </p>
        </div>

        <Button
          onClick={handleInstallClick}
          className="w-full"
          size="lg"
        >
          Install Now
        </Button>

        <button
          onClick={() => setShowPrompt(false)}
          className="text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
         
        </button>
      </div>
    </div>
  );
}
