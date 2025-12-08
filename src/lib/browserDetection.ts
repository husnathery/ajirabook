export interface BrowserInfo {
  isMiniBrowser: boolean;
  browserType: 'facebook' | 'instagram' | 'telegram' | 'tiktok' | 'chrome' | 'safari' | 'firefox' | 'other';
  osType: 'android' | 'ios' | 'windows' | 'mac' | 'linux' | 'other';
  isPWA: boolean;
}

export function detectBrowser(): BrowserInfo {
  const userAgent = navigator.userAgent.toLowerCase();
  const standalone = (window.matchMedia('(display-mode: standalone)').matches) ||
                     (window.navigator as any).standalone === true;

  const isAndroid = /android/i.test(userAgent);
  const isIOS = /iphone|ipad|ipod/i.test(userAgent);
  const isWindows = /windows/i.test(userAgent);
  const isMac = /mac os x/i.test(userAgent);
  const isLinux = /linux/i.test(userAgent) && !isAndroid;

  const isFacebookBrowser = /fban|fbav/i.test(userAgent) || /fb_iab/i.test(userAgent);
  const isInstagramBrowser = /instagram/i.test(userAgent);
  const isTelegramBrowser = /telegram/i.test(userAgent);
  const isTikTokBrowser = /tiktok/i.test(userAgent) || /bytedance/i.test(userAgent);

  const isChrome = /chrome|chromium|crios/i.test(userAgent) && !/edg/i.test(userAgent);
  const isSafari = /safari/i.test(userAgent) && !/chrome|chromium|crios/i.test(userAgent);
  const isFirefox = /firefox|fxios/i.test(userAgent);

  let browserType: BrowserInfo['browserType'] = 'other';
  let isMiniBrowser = false;

  if (isFacebookBrowser) {
    browserType = 'facebook';
    isMiniBrowser = true;
  } else if (isInstagramBrowser) {
    browserType = 'instagram';
    isMiniBrowser = true;
  } else if (isTelegramBrowser) {
    browserType = 'telegram';
    isMiniBrowser = true;
  } else if (isTikTokBrowser) {
    browserType = 'tiktok';
    isMiniBrowser = true;
  } else if (isChrome) {
    browserType = 'chrome';
  } else if (isSafari) {
    browserType = 'safari';
  } else if (isFirefox) {
    browserType = 'firefox';
  }

  let osType: BrowserInfo['osType'] = 'other';
  if (isAndroid) osType = 'android';
  else if (isIOS) osType = 'ios';
  else if (isWindows) osType = 'windows';
  else if (isMac) osType = 'mac';
  else if (isLinux) osType = 'linux';

  return {
    isMiniBrowser,
    browserType,
    osType,
    isPWA: standalone
  };
}

export function redirectToMainBrowser(osType: 'android' | 'ios', currentUrl: string) {
  if (osType === 'android') {
    const chromeIntent = `intent://${currentUrl.replace(/^https?:\/\//, '')}#Intent;scheme=https;package=com.android.chrome;end`;
    window.location.href = chromeIntent;
  }
}
