'use client';

import { useEffect, useState } from 'react';
import { APP_VERSION, APP_VERSION_LABEL } from '@/lib/app-version';
import { getPlatformName } from '@/lib/brand-profile';

const LS_KEY = 'mitty-app-version';

/**
 * Lightweight update banner for installed / PWA / mobile-browser users.
 *
 * On first load it silently seeds the stored version.
 * On subsequent loads, if the stored version differs from APP_VERSION it
 * shows a non-intrusive banner prompting the user to reload.
 *
 * No service worker, no offline cache, no external requests.
 */
export function UpdateBanner() {
  const [showBanner, setShowBanner] = useState(false);
  const platformName = getPlatformName();

  useEffect(() => {
    try {
      const stored = localStorage.getItem(LS_KEY);

      if (stored && stored !== APP_VERSION) {
        // Version mismatch → show reload prompt
        setShowBanner(true);
      } else {
        // First visit or already current → store silently
        localStorage.setItem(LS_KEY, APP_VERSION);
      }
    } catch {
      // localStorage unavailable (private browsing, etc.). Do nothing
    }
  }, []);

  const handleReload = () => {
    try {
      localStorage.setItem(LS_KEY, APP_VERSION);
    } catch {
      // best-effort
    }
    window.location.reload();
  };

  const handleDismiss = () => {
    try {
      localStorage.setItem(LS_KEY, APP_VERSION);
    } catch {
      // best-effort
    }
    setShowBanner(false);
  };

  if (!showBanner) {
    return null;
  }

  return (
    <div
      role="alert"
      className="fixed inset-x-0 top-0 z-[9999] flex items-center justify-center gap-3 bg-[#171717] px-4 py-2.5 text-sm text-white shadow-lg"
    >
      <span>
        New {platformName} update available. Reload to use{' '}
        <strong>{APP_VERSION_LABEL}</strong>.
      </span>
      <button
        type="button"
        onClick={handleReload}
        className="rounded-md bg-[#d4b06a] px-3 py-1 text-xs font-semibold text-[#171717] transition-colors hover:bg-[#e8c97e]"
      >
        Reload Now
      </button>
      <button
        type="button"
        onClick={handleDismiss}
        aria-label="Dismiss update banner"
        className="ml-1 text-white/50 transition-colors hover:text-white"
      >
        ✕
      </button>
    </div>
  );
}
