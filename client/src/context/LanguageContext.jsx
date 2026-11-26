import { createContext, useCallback, useContext, useEffect, useState } from 'react';

const LanguageContext = createContext(null);

function applyGoogleTranslate(lang) {
  let attempts = 0;
  const timer = setInterval(() => {
    attempts += 1;
    const googleSelect = document.querySelector('.goog-te-combo');
    if (googleSelect) {
      googleSelect.value = lang;
      googleSelect.dispatchEvent(new Event('change'));
      clearInterval(timer);
    } else if (attempts >= 30) {
      clearInterval(timer);
    }
  }, 300);
}

export function LanguageProvider({ children }) {
  const saved = typeof window !== 'undefined' ? localStorage.getItem('language') : null;
  const [language, setLanguageState] = useState(saved || 'en');
  const [showModal, setShowModal] = useState(!saved);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;

    window.googleTranslateElementInit = () => {
      if (window.google?.translate?.TranslateElement) {
        new window.google.translate.TranslateElement(
          {
            pageLanguage: 'en',
            includedLanguages: 'en,te,hi',
            autoDisplay: false,
          },
          'google_translate_element'
        );
      }
    };

    if (!document.getElementById('google-translate-script')) {
      const script = document.createElement('script');
      script.id = 'google-translate-script';
      script.src = '//translate.google.com/translate_a/element.js?cb=googleTranslateElementInit';
      script.async = true;
      document.body.appendChild(script);
    }

    const bannerGuard = setInterval(() => {
      const banner = document.querySelector('.goog-te-banner-frame');
      if (banner) banner.remove();
      const skip = document.querySelector('body > .skiptranslate');
      if (skip) skip.style.display = 'none';
      document.body.style.setProperty('top', '0px', 'important');
    }, 250);

    return () => clearInterval(bannerGuard);
  }, []);

  useEffect(() => {
    if (saved && saved !== 'en') {
      applyGoogleTranslate(saved);
    }
  }, [saved]);

  const setLanguage = useCallback((lang) => {
    localStorage.setItem('language', lang);
    setLanguageState(lang);
    setShowModal(false);
    applyGoogleTranslate(lang);
  }, []);

  return (
    <LanguageContext.Provider value={{ language, setLanguage, showModal, setShowModal }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) {
    throw new Error('useLanguage must be used inside LanguageProvider');
  }
  return ctx;
}

