import { useLanguage } from '../context/LanguageContext';

export default function LanguageModal() {
  const { showModal, setLanguage } = useLanguage();

  if (!showModal) {
    return null;
  }

  return (
    <div className="language-modal" id="languageModal">
      <div className="language-card">
        <h2>🌐 Welcome to GramSetu</h2>
        <p>Select your preferred language</p>
        <button type="button" className="lang-btn" onClick={() => setLanguage('en')}>
          🇬🇧 English
        </button>
        <button type="button" className="lang-btn" onClick={() => setLanguage('te')}>
          🇮🇳 తెలుగు
        </button>
        <button type="button" className="lang-btn" onClick={() => setLanguage('hi')}>
          🇮🇳 हिन्दी
        </button>
      </div>
    </div>
  );
}

