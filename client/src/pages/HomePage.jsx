import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import LanguageModal from '../components/LanguageModal';
import '../styles/home.css';

const FAQ_ITEMS = [
  {
    q: 'How do I register a complaint?',
    a: (
      <>
        Click <strong>File a Complaint</strong> on the homepage. Fill in the issue details, choose a
        category, optionally attach a photo or voice note, and pin your location. Submit — and your
        complaint is instantly registered with a unique tracking ID.
      </>
    ),
  },
  {
    q: 'Can I track my complaint?',
    a: (
      <>
        Yes. Use the <strong>Track Complaint</strong> page and enter your tracking ID. You&apos;ll
        see the full status timeline — from submission to assignment to resolution — updated in real
        time by the Panchayat officials.
      </>
    ),
  },
  {
    q: 'Do I need an account to file a complaint?',
    a: (
      <>
        No account needed to file or track a complaint. Just your mobile number for OTP
        verification. Creating an optional profile lets you view complaint history and get push
        notifications.
      </>
    ),
  },
  {
    q: 'Can I upload photos with my complaint?',
    a: (
      <>
        Absolutely. You can attach up to <strong>3 photos</strong> per complaint directly from your
        camera or gallery. Clear images help officials assess the severity faster and speed up
        resolution.
      </>
    ),
  },
  {
    q: 'Can I submit a voice complaint?',
    a: (
      <>
        Yes — tap the microphone button on the complaint form and record up to{' '}
        <strong>60 seconds</strong> of audio. This is especially useful for citizens who find typing
        difficult or prefer speaking in their local language.
      </>
    ),
  },
  {
    q: 'How long does resolution take?',
    a: (
      <>
        Most complaints are acknowledged within <strong>24 hours</strong> and resolved within{' '}
        <strong>7 working days</strong> depending on the category and urgency. Critical issues like
        water contamination or exposed wiring are escalated automatically for faster response.
      </>
    ),
  },
  {
    q: 'Is my complaint information kept private?',
    a: (
      <>
        Your personal details are encrypted and only visible to authorised Panchayat officials
        handling your complaint. Public dashboards show only anonymised, aggregated data — never
        your identity.
      </>
    ),
  },
];

const CATEGORIES = [
  { icon: '💡', title: 'Street Lights', desc: 'Broken or missing lights on roads and public spaces.' },
  { icon: '🛣', title: 'Roads', desc: 'Potholes, damaged roads, or missing road signs.' },
  { icon: '💧', title: 'Water Supply', desc: 'No water, contamination, or leaking pipelines.' },
  { icon: '🗑', title: 'Sanitation', desc: 'Garbage overflow, blocked drains, or open defecation.' },
  { icon: '🌳', title: 'Environment', desc: 'Illegal dumping, deforestation, or pollution incidents.' },
  { icon: '⚡', title: 'Electricity', desc: 'Power cuts, exposed wiring, or faulty transformers.' },
  { icon: '🏫', title: 'Public Infrastructure', desc: 'Damaged schools, hospitals, or community buildings.' },
  { icon: '🐄', title: 'Animal Issues', desc: 'Stray animals, injured cattle, or livestock on roads.' },
];

const TICKER_ITEMS = [
  '🟢 Pothole fixed in Gudlavalleru',
  '🟢 Water supply restored in Eluru',
  '🟢 Street light replaced in Vijayawada',
  '🟢 Drain cleared in Nuzividu',
  '🟢 Animal issue resolved in Machilipatnam',
  '🟢 Electricity fault fixed in Kaikaluru',
];

export default function HomePage() {
  const canvasRef = useRef(null);
  const statsSectionRef = useRef(null);
  const [openFaq, setOpenFaq] = useState(null);
  const [statsAnimated, setStatsAnimated] = useState(false);
  const [counts, setCounts] = useState([0, 0, 0, 0]);

  useEffect(() => {
    document.title = 'GRAMSETU';
  }, []);

  // Animated wave canvas (exact port of index.php #waveCanvas)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    const ctx = canvas.getContext('2d');
    if (!ctx) return undefined;

    function resize() {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    }
    resize();
    window.addEventListener('resize', resize);

    let time = 0;
    let rafId = 0;
    const NUM_LAYERS = 16;

    const layers = Array.from({ length: NUM_LAYERS }, (_, i) => {
      const t = i / (NUM_LAYERS - 1);
      const hue = 105 + t * 22;
      const sat = 55 + t * 38;
      const lit = 11 + t * 38;
      return {
        ringFraction: 0.45 + t * 0.55,
        rotSpeed: 0.003 + (1 - t) * 0.006,
        rotDir: i % 2 === 0 ? 1 : -1,
        waveAmp: 0.018 + (1 - t) * 0.06,
        waveFreq: 2 + Math.floor((1 - t) * 5),
        wavePhase: (i / NUM_LAYERS) * Math.PI * 2.7,
        pulseAmp: 0.022,
        pulseFreq: 0.018 + (1 - t) * 0.012,
        color: `hsl(${hue}, ${sat}%, ${lit}%)`,
        segments: 320,
      };
    });

    function drawLayer(layer, cx, cy, baseR, t) {
      const r =
        baseR *
        layer.ringFraction *
        (1 + layer.pulseAmp * Math.sin(layer.pulseFreq * t + layer.wavePhase));
      const angle = layer.rotDir * layer.rotSpeed * t;

      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(angle);
      ctx.beginPath();
      for (let s = 0; s <= layer.segments; s += 1) {
        const theta = (s / layer.segments) * Math.PI * 2;
        const wave =
          1 +
          layer.waveAmp *
            Math.sin(layer.waveFreq * theta + layer.wavePhase + t * 0.025 * layer.rotDir);
        const rx = r * wave * 1.12;
        const ry = r * wave * 0.9;
        const px = rx * Math.cos(theta);
        const py = ry * Math.sin(theta);
        if (s === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.fillStyle = layer.color;
      ctx.fill();
      ctx.restore();
    }

    function draw() {
      const W = canvas.width;
      const H = canvas.height;
      const cx = W / 2;
      const cy = H / 2;
      const baseR = Math.max(W, H) * 0.74;

      ctx.clearRect(0, 0, W, H);
      ctx.fillStyle = 'hsl(127, 93%, 49%)';
      ctx.fillRect(0, 0, W, H);

      for (let i = NUM_LAYERS - 1; i >= 0; i -= 1) {
        drawLayer(layers[i], cx, cy, baseR, time);
      }

      const innerR = baseR * 0.45 * 0.95;
      const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, innerR);
      grad.addColorStop(0, '#0c0e1c');
      grad.addColorStop(0.58, '#0c0e1c');
      grad.addColorStop(0.8, 'rgba(12,14,28,0.5)');
      grad.addColorStop(1, 'rgba(12,14,28,0)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, W, H);

      time += 1;
      rafId = requestAnimationFrame(draw);
    }

    draw();
    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('resize', resize);
    };
  }, []);

  // Stats count-up animation via IntersectionObserver
  useEffect(() => {
    const targets = [15248, 12731, 83, 145];
    const section = statsSectionRef.current;
    if (!section) return undefined;

    function easeOutExpo(t) {
      return t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          setStatsAnimated(true);
          const duration = 2200;
          const start = performance.now();

          function step(now) {
            const elapsed = now - start;
            const progress = Math.min(elapsed / duration, 1);
            const eased = easeOutExpo(progress);
            setCounts(
              targets.map((target) => (progress < 1 ? Math.floor(eased * target) : target))
            );
            if (progress < 1) {
              requestAnimationFrame(step);
            }
          }

          requestAnimationFrame(step);
          observer.disconnect();
        });
      },
      { threshold: 0.25 }
    );

    observer.observe(section);
    return () => observer.disconnect();
  }, []);

  const handleCardMouseMove = (e) => {
    const card = e.currentTarget;
    const rect = card.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    card.style.transform = `translateY(-10px) rotateX(${-y * 10}deg) rotateY(${x * 10}deg)`;
  };

  const handleCardMouseLeave = (e) => {
    e.currentTarget.style.transform = '';
  };

  return (
    <div className="page-home">
      <section className="hero">
        <canvas id="waveCanvas" ref={canvasRef} />
        <Navbar />

        <section className="hero">
          <div className="hero-content">
            <div className="hero-badge" data-lang="hero_badge">
              <span>🌱 Your Voice, Your Village</span>
            </div>

            <h1 data-lang="hero_title">
              <span>Stronger Villages</span> <br />
              <span>Start with </span>
              <span>Your Voice</span>
            </h1>

            <p data-lang="hero_desc">
              <span>
                Report local issues directly to your Panchayat and track progress in real-time.
                Together we can build cleaner, safer and stronger communities.
              </span>
            </p>

            <div className="hero-buttons">
              <Link to="/complaint" className="btn-primary" data-lang="complaint_btn">
                <span>📝 File a Complaint</span>
              </Link>

              <Link to="/track" className="btn-secondary" data-lang="track_btn">
                <span>🔍 Track Complaint</span>
              </Link>
            </div>

            <div className="hero-features">
              <span>🛡 Secure &amp; Private</span>
              <span>⚡ Quick Response</span>
              <span>👥 For Every Citizen</span>
            </div>
          </div>
        </section>
      </section>

      {/* HOW IT WORKS SECTION */}
      <section className="hiw">
        <div className="hiw__container">
          <div className="hiw__header">
            <span className="hiw__badge">⚙️ How It Works</span>
            <h2 className="hiw__title">
              Simple. <span className="hiw__title--green">Transparent.</span> Effective.
            </h2>
            <p className="hiw__subtitle">Four easy steps to get your village issue resolved.</p>
          </div>

          <div className="hiw__track">
            <div className="hiw__card">
              <div className="hiw__icon-wrap">
                <span className="hiw__icon">📝</span>
                <div className="hiw__icon-ring" />
              </div>
              <span className="hiw__step-num">01</span>
              <h3 className="hiw__card-title">Register Complaint</h3>
              <p className="hiw__card-desc">
                Submit issue details, photos, or voice recordings easily from your phone.
              </p>
            </div>

            <div className="hiw__arrow">
              <svg viewBox="0 0 60 20" xmlns="http://www.w3.org/2000/svg">
                <defs>
                  <filter id="glow1">
                    <feGaussianBlur stdDeviation="2.5" result="coloredBlur" />
                    <feMerge>
                      <feMergeNode in="coloredBlur" />
                      <feMergeNode in="SourceGraphic" />
                    </feMerge>
                  </filter>
                </defs>
                <path
                  d="M0 10 Q15 3 30 10 Q45 17 60 10"
                  stroke="#4ade80"
                  strokeWidth="1.8"
                  fill="none"
                  strokeDasharray="4 3"
                  filter="url(#glow1)"
                  opacity="0.85"
                />
                <polygon points="56,6 64,10 56,14" fill="#4ade80" filter="url(#glow1)" opacity="0.85" />
              </svg>
            </div>

            <div className="hiw__card">
              <div className="hiw__icon-wrap">
                <span className="hiw__icon">🏛️</span>
                <div className="hiw__icon-ring" />
              </div>
              <span className="hiw__step-num">02</span>
              <h3 className="hiw__card-title">Panchayat Review</h3>
              <p className="hiw__card-desc">
                Officials review and assign the complaint to the right department.
              </p>
            </div>

            <div className="hiw__arrow">
              <svg viewBox="0 0 60 20" xmlns="http://www.w3.org/2000/svg">
                <defs>
                  <filter id="glow2">
                    <feGaussianBlur stdDeviation="2.5" result="coloredBlur" />
                    <feMerge>
                      <feMergeNode in="coloredBlur" />
                      <feMergeNode in="SourceGraphic" />
                    </feMerge>
                  </filter>
                </defs>
                <path
                  d="M0 10 Q15 3 30 10 Q45 17 60 10"
                  stroke="#4ade80"
                  strokeWidth="1.8"
                  fill="none"
                  strokeDasharray="4 3"
                  filter="url(#glow2)"
                  opacity="0.85"
                />
                <polygon points="56,6 64,10 56,14" fill="#4ade80" filter="url(#glow2)" opacity="0.85" />
              </svg>
            </div>

            <div className="hiw__card">
              <div className="hiw__icon-wrap">
                <span className="hiw__icon">📍</span>
                <div className="hiw__icon-ring" />
              </div>
              <span className="hiw__step-num">03</span>
              <h3 className="hiw__card-title">Track Progress</h3>
              <p className="hiw__card-desc">
                Receive live updates at every stage — no more chasing officials.
              </p>
            </div>

            <div className="hiw__arrow">
              <svg viewBox="0 0 60 20" xmlns="http://www.w3.org/2000/svg">
                <defs>
                  <filter id="glow3">
                    <feGaussianBlur stdDeviation="2.5" result="coloredBlur" />
                    <feMerge>
                      <feMergeNode in="coloredBlur" />
                      <feMergeNode in="SourceGraphic" />
                    </feMerge>
                  </filter>
                </defs>
                <path
                  d="M0 10 Q15 3 30 10 Q45 17 60 10"
                  stroke="#4ade80"
                  strokeWidth="1.8"
                  fill="none"
                  strokeDasharray="4 3"
                  filter="url(#glow3)"
                  opacity="0.85"
                />
                <polygon points="56,6 64,10 56,14" fill="#4ade80" filter="url(#glow3)" opacity="0.85" />
              </svg>
            </div>

            <div className="hiw__card hiw__card--last">
              <div className="hiw__icon-wrap">
                <span className="hiw__icon">✅</span>
                <div className="hiw__icon-ring" />
              </div>
              <span className="hiw__step-num">04</span>
              <h3 className="hiw__card-title">Resolution</h3>
              <p className="hiw__card-desc">
                Issue resolved and marked completed. Your village grows stronger.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* WHY USE GRAMSETU SECTION */}
      <section className="why">
        <div className="why__container">
          <div className="why__left">
            <div className="why__illustration">
              <div className="why__phone">
                <div className="why__phone-screen">
                  <div className="why__phone-bar" />
                  <div className="why__phone-line" />
                  <div className="why__phone-line why__phone-line--short" />
                  <div className="why__phone-badge">
                    <span className="why__phone-dot" /> Complaint Filed
                  </div>
                  <div className="why__phone-line" />
                  <div className="why__phone-line why__phone-line--short" />
                </div>
              </div>

              <div className="why__float-card why__float-card--tl">
                <span className="why__float-icon">🛡️</span>
                <span>100% Secure</span>
              </div>
              <div className="why__float-card why__float-card--br">
                <span className="why__float-icon">✅</span>
                <span>Resolved in 48h</span>
              </div>

              <div className="why__orb" />
            </div>
          </div>

          <div className="why__right">
            <div className="why__header">
              <span className="why__badge">💡 Why GramSetu</span>
              <h2 className="why__title">
                Built for <span className="why__title--green">Every Citizen.</span>
                <br />
                Designed for <span className="why__title--green">Trust.</span>
              </h2>
              <p className="why__subtitle">
                A platform that puts the power back in the hands of the people — simple, transparent,
                and effective.
              </p>
            </div>

            <ul className="why__features">
              <li className="why__feature">
                <div className="why__feature-icon">🛡</div>
                <div className="why__feature-body">
                  <h4 className="why__feature-title">Secure Complaint Submission</h4>
                  <p className="why__feature-desc">
                    Your data is encrypted and visible only to authorised Panchayat officials.
                  </p>
                </div>
              </li>
              <li className="why__feature">
                <div className="why__feature-icon">📱</div>
                <div className="why__feature-body">
                  <h4 className="why__feature-title">Mobile Friendly</h4>
                  <p className="why__feature-desc">
                    Works seamlessly on any smartphone — no app download required.
                  </p>
                </div>
              </li>
              <li className="why__feature">
                <div className="why__feature-icon">🎤</div>
                <div className="why__feature-body">
                  <h4 className="why__feature-title">Voice Complaint Recording</h4>
                  <p className="why__feature-desc">
                    Not comfortable typing? Just speak — we&apos;ll capture your complaint.
                  </p>
                </div>
              </li>
              <li className="why__feature">
                <div className="why__feature-icon">📍</div>
                <div className="why__feature-body">
                  <h4 className="why__feature-title">Location Based Reporting</h4>
                  <p className="why__feature-desc">
                    Pin the exact problem spot on the map for faster resolution.
                  </p>
                </div>
              </li>
              <li className="why__feature">
                <div className="why__feature-icon">🔔</div>
                <div className="why__feature-body">
                  <h4 className="why__feature-title">Real-Time Status Updates</h4>
                  <p className="why__feature-desc">
                    Get notified at every stage — from submission to resolution.
                  </p>
                </div>
              </li>
              <li className="why__feature">
                <div className="why__feature-icon">📊</div>
                <div className="why__feature-body">
                  <h4 className="why__feature-title">Transparency &amp; Accountability</h4>
                  <p className="why__feature-desc">
                    Public dashboards keep officials accountable to the community.
                  </p>
                </div>
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* COMPLAINT CATEGORIES SECTION */}
      <section className="cats">
        <div className="cats__container">
          <div className="cats__header">
            <span className="cats__badge">📋 What Can You Report?</span>
            <h2 className="cats__title">
              Know Your <span className="cats__title--green">Complaint Categories</span>
            </h2>
            <p className="cats__subtitle">
              From broken streetlights to water issues — if it affects your village, report it.
            </p>
          </div>

          <div className="cats__grid">
            {CATEGORIES.map((cat) => (
              <div key={cat.title} className="cats__card">
                <div className="cats__icon-wrap">
                  <span className="cats__icon">{cat.icon}</span>
                  <div className="cats__icon-glow" />
                </div>
                <h3 className="cats__card-title">{cat.title}</h3>
                <p className="cats__card-desc">{cat.desc}</p>
                <span className="cats__arrow">→</span>
              </div>
            ))}
          </div>

          <div className="cats__cta">
            <p className="cats__cta-text">
              Don&apos;t see your issue? You can still file a custom complaint.
            </p>
            <Link to="/complaint" className="cats__cta-btn">
              File a Custom Complaint →
            </Link>
          </div>
        </div>
      </section>

      {/* LIVE STATISTICS SECTION */}
      <section className="stats" ref={statsSectionRef}>
        <div className="stats__divider stats__divider--top">
          <svg viewBox="0 0 1440 60" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M0,30 C360,60 1080,0 1440,30 L1440,0 L0,0 Z" fill="#060d08" />
          </svg>
        </div>

        <div className="stats__container">
          <div className="stats__header">
            <span className="stats__badge">📡 Live Data</span>
            <h2 className="stats__title">
              Real Impact. <span className="stats__title--green">Real Numbers.</span>
            </h2>
            <p className="stats__subtitle">
              Updated in real-time from Panchayats across the network.
            </p>
          </div>

          <div className="stats__grid">
            <div
              className="stats__card"
              onMouseMove={handleCardMouseMove}
              onMouseLeave={handleCardMouseLeave}
            >
              <div className="stats__card-inner">
                <div className="stats__icon-ring">
                  <span className="stats__icon">📝</span>
                </div>
                <div className="stats__number-wrap">
                  <span className="stats__number">{counts[0].toLocaleString('en-IN')}</span>
                </div>
                <p className="stats__label">Complaints Registered</p>
                <div className="stats__bar">
                  <div
                    className={`stats__bar-fill${statsAnimated ? ' animated' : ''}`}
                    style={{ '--bar-w': '100%' }}
                  />
                </div>
              </div>
              <div className="stats__card-glow" />
            </div>

            <div
              className="stats__card"
              onMouseMove={handleCardMouseMove}
              onMouseLeave={handleCardMouseLeave}
            >
              <div className="stats__card-inner">
                <div className="stats__icon-ring">
                  <span className="stats__icon">✅</span>
                </div>
                <div className="stats__number-wrap">
                  <span className="stats__number">{counts[1].toLocaleString('en-IN')}</span>
                </div>
                <p className="stats__label">Complaints Resolved</p>
                <div className="stats__bar">
                  <div
                    className={`stats__bar-fill${statsAnimated ? ' animated' : ''}`}
                    style={{ '--bar-w': '83%' }}
                  />
                </div>
              </div>
              <div className="stats__card-glow" />
            </div>

            <div
              className="stats__card stats__card--highlight"
              onMouseMove={handleCardMouseMove}
              onMouseLeave={handleCardMouseLeave}
            >
              <div className="stats__card-inner">
                <div className="stats__icon-ring">
                  <span className="stats__icon">📊</span>
                </div>
                <div className="stats__number-wrap">
                  <span className="stats__number">{counts[2].toLocaleString('en-IN')}%</span>
                </div>
                <p className="stats__label">Resolution Rate</p>
                <div className="stats__bar">
                  <div
                    className={`stats__bar-fill${statsAnimated ? ' animated' : ''}`}
                    style={{ '--bar-w': '83%' }}
                  />
                </div>
              </div>
              <div className="stats__card-glow stats__card-glow--bright" />
            </div>

            <div
              className="stats__card"
              onMouseMove={handleCardMouseMove}
              onMouseLeave={handleCardMouseLeave}
            >
              <div className="stats__card-inner">
                <div className="stats__icon-ring">
                  <span className="stats__icon">🏛️</span>
                </div>
                <div className="stats__number-wrap">
                  <span className="stats__number">{counts[3].toLocaleString('en-IN')}</span>
                </div>
                <p className="stats__label">Active Panchayats</p>
                <div className="stats__bar">
                  <div
                    className={`stats__bar-fill${statsAnimated ? ' animated' : ''}`}
                    style={{ '--bar-w': '58%' }}
                  />
                </div>
              </div>
              <div className="stats__card-glow" />
            </div>
          </div>

          <div className="stats__ticker">
            <div className="stats__ticker-track">
              {[...TICKER_ITEMS, ...TICKER_ITEMS].map((item, idx) => (
                <span key={idx}>{item}</span>
              ))}
            </div>
          </div>
        </div>

        <div className="stats__divider stats__divider--bottom">
          <svg viewBox="0 0 1440 60" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M0,30 C360,0 1080,60 1440,30 L1440,60 L0,60 Z" fill="#060d08" />
          </svg>
        </div>
      </section>

      {/* FAQ SECTION */}
      <section className="faq">
        <div className="faq__container">
          <div className="faq__header">
            <span className="faq__badge">❓ FAQ</span>
            <h2 className="faq__title">
              Got <span className="faq__title--green">Questions?</span>
            </h2>
            <p className="faq__subtitle">Everything you need to know about using GramSetu.</p>
          </div>

          <div className="faq__layout">
            <div className="faq__list">
              {FAQ_ITEMS.map((item, idx) => {
                const isOpen = openFaq === idx;
                return (
                  <div key={item.q} className={`faq__item${isOpen ? ' open' : ''}`}>
                    <button
                      type="button"
                      className="faq__question"
                      aria-expanded={isOpen}
                      onClick={() => setOpenFaq(isOpen ? null : idx)}
                    >
                      <span>{item.q}</span>
                      <span className="faq__icon">
                        <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                          <path
                            className="faq__icon-h"
                            d="M4 9h10"
                            stroke="#4ade80"
                            strokeWidth="1.8"
                            strokeLinecap="round"
                          />
                          <path
                            className="faq__icon-v"
                            d="M9 4v10"
                            stroke="#4ade80"
                            strokeWidth="1.8"
                            strokeLinecap="round"
                          />
                        </svg>
                      </span>
                    </button>
                    <div className="faq__answer">
                      <p>{item.a}</p>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="faq__side">
              <div className="faq__side-card">
                <div className="faq__side-icon">🤝</div>
                <h3 className="faq__side-title">Still have questions?</h3>
                <p className="faq__side-desc">
                  Our support team is available Monday to Saturday, 9 AM – 6 PM. We typically
                  respond within 2 hours.
                </p>
                <a href="#contact" className="faq__side-btn">
                  Contact Support →
                </a>
              </div>

              <div className="faq__side-stats">
                <div className="faq__side-stat">
                  <span className="faq__side-num">2 hrs</span>
                  <span className="faq__side-lbl">Avg. response time</span>
                </div>
                <div className="faq__side-divider" />
                <div className="faq__side-stat">
                  <span className="faq__side-num">98%</span>
                  <span className="faq__side-lbl">Satisfaction rate</span>
                </div>
                <div className="faq__side-divider" />
                <div className="faq__side-stat">
                  <span className="faq__side-num">24/7</span>
                  <span className="faq__side-lbl">Platform uptime</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="footer">
        <div className="footer__container">
          <div className="footer__top">
            <div className="footer__brand">
              <div className="footer__logo">
                <span className="footer__logo-icon">
                  <Link to="/" className="footer__logo">
                    <img src="/gramsetu-logo.png" alt="GRAMSETU" />
                  </Link>
                </span>
                <span className="footer__logo-text">
                  Gram<span className="footer__logo-green">Setu</span>
                </span>
              </div>
              <p className="footer__tagline">
                Connecting citizens to their Panchayat.
                <br />
                Your voice. Your village. Your change.
              </p>
              <div className="footer__socials">
                <a href="#twitter" className="footer__social" aria-label="Twitter">
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M23 3a10.9 10.9 0 01-3.14 1.53A4.48 4.48 0 0016 2a4.48 4.48 0 00-4.48 4.48v1A10.66 10.66 0 013 4s-4 9 5 13a11.64 11.64 0 01-7 2c9 5 20 0 20-11.5a4.5 4.5 0 00-.08-.83A7.72 7.72 0 0023 3z" />
                  </svg>
                </a>
                <a href="#facebook" className="footer__social" aria-label="Facebook">
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M18 2h-3a5 5 0 00-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 011-1h3z" />
                  </svg>
                </a>
                <a href="#instagram" className="footer__social" aria-label="Instagram">
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
                    <circle cx="12" cy="12" r="4" />
                    <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
                  </svg>
                </a>
                <a href="#youtube" className="footer__social" aria-label="YouTube">
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M22.54 6.42a2.78 2.78 0 00-1.95-1.96C18.88 4 12 4 12 4s-6.88 0-8.59.46A2.78 2.78 0 001.46 6.42 29 29 0 001 12a29 29 0 00.46 5.58 2.78 2.78 0 001.95 1.95C5.12 20 12 20 12 20s6.88 0 8.59-.47a2.78 2.78 0 001.95-1.95A29 29 0 0023 12a29 29 0 00-.46-5.58z" />
                    <polygon points="9.75 15.02 15.5 12 9.75 8.98 9.75 15.02" fill="currentColor" stroke="none" />
                  </svg>
                </a>
              </div>
            </div>

            <div className="footer__links-group">
              <h4 className="footer__group-title">Platform</h4>
              <ul className="footer__links">
                <li>
                  <a href="#about">About GramSetu</a>
                </li>
                <li>
                  <a href="#how-it-works">How It Works</a>
                </li>
                <li>
                  <a href="#categories">Complaint Categories</a>
                </li>
                <li>
                  <a href="#stats">Live Statistics</a>
                </li>
              </ul>
            </div>

            <div className="footer__links-group">
              <h4 className="footer__group-title">Quick Access</h4>
              <ul className="footer__links">
                <li>
                  <Link to="/complaint">File a Complaint</Link>
                </li>
                <li>
                  <Link to="/track">Track Complaint</Link>
                </li>
                <li>
                  <Link to="/admin/login">Panchayat Login</Link>
                </li>
                <li>
                  <a href="#support">Citizen Support</a>
                </li>
              </ul>
            </div>

            <div className="footer__links-group">
              <h4 className="footer__group-title">Legal</h4>
              <ul className="footer__links">
                <li>
                  <a href="#privacy">Privacy Policy</a>
                </li>
                <li>
                  <a href="#terms">Terms of Service</a>
                </li>
                <li>
                  <a href="#contact">Contact</a>
                </li>
              </ul>
            </div>
          </div>

          <div className="footer__divider" />

          <div className="footer__bottom">
            <p className="footer__copy">© 2025 GramSetu. Made with 🌿 for every citizen of India.</p>
            <div className="footer__bottom-badges">
              <span className="footer__bottom-badge">🛡 Secure</span>
              <span className="footer__bottom-badge">📱 Mobile Friendly</span>
              <span className="footer__bottom-badge">🇮🇳 Made in India</span>
            </div>
          </div>
        </div>
      </footer>

      <LanguageModal />
    </div>
  );
}

