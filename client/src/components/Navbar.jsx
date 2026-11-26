import { useEffect, useState } from 'react';
import { NavLink } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';

export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const { language, setLanguage } = useLanguage();

  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [menuOpen]);

  const closeMenu = () => setMenuOpen(false);

  return (
    <>
      <div className="navbar-wrapper">
        <nav className="navbar">
          <NavLink to="/" className="navbar__logo">
            <img src="/gramsetu-logo.png" alt="GRAMSETU" />
            <span className="nav__logo-text">
              Gram<span className="nav__logo-green">Setu</span>
            </span>
          </NavLink>
          <ul className="navbar__links">
            <li>
              <NavLink to="/" end className={({ isActive }) => (isActive ? 'active' : '')}>
                Home
              </NavLink>
            </li>
            <li>
              <NavLink to="/complaint" className={({ isActive }) => (isActive ? 'active' : '')}>
                Register Complaint
              </NavLink>
            </li>
            <li>
              <NavLink to="/track" className={({ isActive }) => (isActive ? 'active' : '')}>
                Track Complaint
              </NavLink>
            </li>
            <li>
              <NavLink to="/map" className={({ isActive }) => (isActive ? 'active' : '')}>
                Complaint Map
              </NavLink>
            </li>
            <li>
              <NavLink to="/admin/login" className={({ isActive }) => (isActive ? 'active' : '')}>
                Panchayat Login
              </NavLink>
            </li>
          </ul>
          <div className="navbar__actions">
            <div className="language-selector">
              <select
                id="languageSwitcher"
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
              >
                <option value="en">🇬🇧 EN</option>
                <option value="te">🇮🇳 తెలుగు</option>
                <option value="hi">🇮🇳 हिन्दी</option>
              </select>
            </div>
            <button
              type="button"
              className="mobile-menu-btn"
              id="mobileMenuBtn"
              onClick={(e) => {
                e.stopPropagation();
                setMenuOpen((prev) => !prev);
              }}
              aria-label="Toggle Menu"
            >
              ☰
            </button>
          </div>
        </nav>
      </div>

      <div
        className={`mobile-overlay${menuOpen ? ' active' : ''}`}
        id="mobileOverlay"
        onClick={closeMenu}
      />
      <div className={`mobile-menu${menuOpen ? ' active' : ''}`} id="mobileMenu">
        <NavLink to="/" end onClick={closeMenu}>
          🏠 Home
        </NavLink>
        <NavLink to="/complaint" onClick={closeMenu}>
          📝 Register Complaint
        </NavLink>
        <NavLink to="/track" onClick={closeMenu}>
          🔍 Track Complaint
        </NavLink>
        <NavLink to="/map" onClick={closeMenu}>
          🗺️ Complaint Map
        </NavLink>
        <NavLink to="/admin/login" onClick={closeMenu}>
          🏛️ Panchayat Login
        </NavLink>
      </div>
    </>
  );
}

