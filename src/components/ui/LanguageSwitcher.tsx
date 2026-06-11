import { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Globe, ChevronDown } from 'lucide-react';

interface Language {
  code: string;
  label: string;
  flag: string;
}

const LANGUAGES: Language[] = [
  { code: 'fr', label: 'Français', flag: '🇫🇷' },
  { code: 'en', label: 'English', flag: '🇬🇧' },
  { code: 'de', label: 'Deutsch', flag: '🇩🇪' },
  { code: 'es', label: 'Español', flag: '🇪🇸' },
  { code: 'it', label: 'Italiano', flag: '🇮🇹' },
];

export function LanguageSwitcher() {
  const { i18n } = useTranslation();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const current = LANGUAGES.find((l) => l.code === i18n.language) ?? LANGUAGES[0];

  const handleSelect = (code: string) => {
    i18n.changeLanguage(code);
    localStorage.setItem('language', code);
    setOpen(false);
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 hover:border-slate-300 transition-all focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-1"
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <Globe className="w-4 h-4 text-slate-400" />
        <span className="text-base leading-none">{current.flag}</span>
        <span className="hidden sm:inline text-slate-700">{current.label}</span>
        <ChevronDown
          className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-150 ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && (
        <div className="absolute right-0 mt-1.5 w-44 bg-white border border-slate-200 rounded-xl shadow-lg z-50 overflow-hidden">
          <ul role="listbox">
            {LANGUAGES.map((lang) => (
              <li key={lang.code} role="option" aria-selected={lang.code === current.code}>
                <button
                  onClick={() => handleSelect(lang.code)}
                  className={`flex items-center gap-3 w-full px-3 py-2.5 text-sm transition-colors ${
                    lang.code === current.code
                      ? 'bg-brand-50 text-brand-700 font-medium'
                      : 'text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <span className="text-base">{lang.flag}</span>
                  <span>{lang.label}</span>
                  {lang.code === current.code && (
                    <span className="ml-auto w-1.5 h-1.5 rounded-full bg-brand-600" />
                  )}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
