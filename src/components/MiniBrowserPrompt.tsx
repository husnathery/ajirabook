import { useEffect, useState } from 'react';
import { detectBrowser, redirectToMainBrowser } from '@/lib/browserDetection';
import { AlertDialog, AlertDialogContent, AlertDialogDescription, AlertDialogHeader, AlertDialogTitle, AlertDialogAction, AlertDialogFooter } from '@/components/ui/alert-dialog';

export function MiniBrowserPrompt() {
  const [showPrompt, setShowPrompt] = useState(false);
  const [browserInfo, setBrowserInfo] = useState<ReturnType<typeof detectBrowser> | null>(null);

  useEffect(() => {
    const info = detectBrowser();
    setBrowserInfo(info);

    if (info.isMiniBrowser && !info.isPWA) {
      setShowPrompt(true);
    }
  }, []);

  const handleOpenInBrowser = () => {
    if (!browserInfo) return;

    const currentUrl = window.location.href;

    if (browserInfo.osType === 'android') {
      redirectToMainBrowser('android', currentUrl);
    } else if (browserInfo.osType === 'ios') {
      setShowPrompt(false);
    }
  };

  if (!showPrompt || !browserInfo) return null;

  const getBrowserName = () => {
    const names = {
      facebook: 'Facebook',
    instagram: 'Instagram',
    tiktok: 'TikTok',
    telegram: 'Telegram',
    twitter: 'Twitter (X)',
    linkedin: 'LinkedIn',
    snapchat: 'Snapchat',
    reddit: 'Reddit',
    pinterest: 'Pinterest'
    };
    return names[browserInfo.browserType as keyof typeof names] || 'this';
  };

  const getInstructionText = () => {
    if (browserInfo.osType === 'android') {
      return 'For the best experience, please open this site in Chrome. Tap "Open in Chrome" below.';
    } else if (browserInfo.osType === 'ios') {
      return 'For the best experience, please open this site in Safari. Tap the share button and select "Open in Safari".';
    }
    return 'For the best experience, please open this site in your default browser.';
  };

  return (
    <AlertDialog open={showPrompt} onOpenChange={setShowPrompt}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Open in Main Browser</AlertDialogTitle>
          <AlertDialogDescription>
            You are viewing this site in the {getBrowserName()} browser. {getInstructionText()}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          {browserInfo.osType === 'android' ? (
            <AlertDialogAction onClick={handleOpenInBrowser}>
              Open in Chrome
            </AlertDialogAction>
          ) : (
            <AlertDialogAction onClick={() => setShowPrompt(false)}>
              Got it
            </AlertDialogAction>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
