import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Cookie, X } from 'lucide-react';

const COOKIE_CONSENT_KEY = 'patyka_cookie_consent';

export function CookieBanner() {
  const { t } = useTranslation();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem(COOKIE_CONSENT_KEY);
    if (!consent) {
      const timer = setTimeout(() => setVisible(true), 500);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleAccept = () => {
    localStorage.setItem(COOKIE_CONSENT_KEY, 'accepted');
    setVisible(false);
  };

  const handleDecline = () => {
    localStorage.setItem(COOKIE_CONSENT_KEY, 'declined');
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4 sm:p-6">
      <div className="max-w-3xl mx-auto bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
        <div className="flex items-start gap-4 p-5">
          <div className="flex-shrink-0 w-10 h-10 bg-brand-100 rounded-full flex items-center justify-center mt-0.5">
            <Cookie className="w-5 h-5 text-brand-600" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm text-slate-700 leading-relaxed">
              {t('privacy.cookieBannerText')}{' '}
              <Link
                to="/privacy"
                className="text-brand-600 hover:text-brand-700 font-medium underline underline-offset-2"
              >
                {t('privacy.cookieBannerLink')}
              </Link>
              .
            </p>
          </div>
          <button
            onClick={handleDecline}
            className="flex-shrink-0 text-slate-400 hover:text-slate-600 transition-colors"
            aria-label="Fermer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="flex gap-3 px-5 pb-5">
          <button
            onClick={handleDecline}
            className="flex-1 px-4 py-2.5 text-sm font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
          >
            {t('privacy.cookieDecline')}
          </button>
          <button
            onClick={handleAccept}
            className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-brand-600 hover:bg-brand-700 rounded-lg transition-colors"
          >
            {t('privacy.cookieAccept')}
          </button>
        </div>
      </div>
    </div>
  );
}
