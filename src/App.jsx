// App.jsx (Bloc 1)
import React, { useMemo, useState, useEffect, useContext, createContext, useRef } from "react";
import html2canvas from "html2canvas";
import StepsMonthlyBubbleChart from "./components/StepsMonthlyBubbleChart";
import muscleRag from "./data/muscleRag.json";
// ───────────────────────────────────────────────
// Thème clair / sombre (global)
// ───────────────────────────────────────────────
const ThemeCtx = createContext();

function ThemeProvider({ children }) {
  const [theme, setTheme] = useState("light");

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    localStorage.setItem("theme", theme);
  }, [theme]);

  const toggleTheme = () => setTheme((t) => (t === "light" ? "dark" : "light"));

  return (
    <ThemeCtx.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeCtx.Provider>
  );
}

function useTheme() {
  return useContext(ThemeCtx);
}

import { v4 as uuidv4 } from "uuid";
import {
  Trash2,
  Plus,
  BarChart3,
  Save,
  Edit3,
  Dumbbell,
  LogOut,
  Share2,
  Menu,
  ClipboardList,
  History,
  Clock,
  Scale,
  Footprints,
  Send,
  Sparkles,
  Trophy,
} from "lucide-react";
import {
  LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer,
  BarChart, Bar, PieChart, Pie, Cell, Legend, LabelList,
  ComposedChart, Scatter
} from "recharts";

// Firebase
import { auth, db, onAuth, signInEmail, signUpEmail, signInGoogle, signOutUser, resetPassword } from "./firebase";
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  writeBatch,
  addDoc,
  deleteDoc,
  updateDoc,
  doc
} from "firebase/firestore";


// ───────────────────────────────────────────────────────────────
// Minimal UI responsive
// ───────────────────────────────────────────────────────────────
const SESSION_DRAFT_KEY = "workout-tracker-current-session";
const TEMPLATE_DRAFT_KEY = "workout-tracker-template-draft";
const headerGif = new URL("./components/gif deadlift.gif", import.meta.url).href;
const cn = (...c) => c.filter(Boolean).join(" ");
// Retourne la date locale au format YYYY-MM-DD (évite le décalage UTC de toISOString)
const toLocalISO = (d) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

// ─────────────────────────────────────────────────────────────────
// Soft Glow — Mobile Design System (D1)
// ─────────────────────────────────────────────────────────────────
const SG = {
  bg1: '#F5EFE6', bg2: '#EDE3D4',
  ink: '#1F1A14', inkSoft: 'rgba(31,26,20,0.62)', inkFaint: 'rgba(31,26,20,0.32)',
  accent: '#C8643A', accent2: '#8B9A6B',
  serif: '"Fraunces", Georgia, serif',
};

function useViewport() {
  const [w, setW] = useState(typeof window !== 'undefined' ? window.innerWidth : 1200);
  useEffect(() => {
    const r = () => setW(window.innerWidth);
    window.addEventListener('resize', r);
    return () => window.removeEventListener('resize', r);
  }, []);
  return w;
}

function SGMobileBackground() {
  const blobs = [
    { x: -80, y: -60, size: 300, color: '#F4C9A0', opacity: 0.55, blur: 90 },
    { x: 220, y: 140, size: 260, color: '#D9B89E', opacity: 0.45, blur: 100 },
    { x: -40, y: 500, size: 280, color: '#C8643A', opacity: 0.18, blur: 120 },
    { x: 200, y: 680, size: 240, color: '#8B9A6B', opacity: 0.22, blur: 110 },
  ];
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: -1, overflow: 'hidden', pointerEvents: 'none' }}>
      {blobs.map((b, i) => (
        <div key={i} style={{
          position: 'absolute', left: b.x, top: b.y,
          width: b.size, height: b.size, borderRadius: '50%',
          background: b.color, opacity: b.opacity, filter: `blur(${b.blur}px)`,
        }} />
      ))}
    </div>
  );
}

function MobileSGTabBar({ tab, onTab, onFAB }) {
  const tabs = [
    {
      k: 'log', label: "Aujourd'hui",
      icon: (c, s = 22) => (
        <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 11l9-8 9 8"/><path d="M5 10v10h14V10"/>
        </svg>
      ),
    },
    {
      k: 'sessions', label: 'Historique',
      icon: (c, s = 22) => (
        <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/><path d="M12 7v5l3 2"/>
        </svg>
      ),
    },
    {
      k: 'analytics', label: 'Progrès',
      icon: (c, s = 22) => (
        <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 20V10"/><path d="M10 20V4"/><path d="M16 20v-6"/><path d="M22 20H2"/>
        </svg>
      ),
    },
    {
      k: 'tpl', label: 'Séances',
      icon: (c, s = 22) => (
        <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="9" width="3" height="6" rx="1"/><rect x="19" y="9" width="3" height="6" rx="1"/>
          <rect x="5" y="7" width="3" height="10" rx="1"/><rect x="16" y="7" width="3" height="10" rx="1"/>
          <path d="M8 12h8"/>
        </svg>
      ),
    },
  ];

  const getActive = (t) => {
    if (['log', 'last', 'traction'].includes(t)) return 'log';
    if (['sessions'].includes(t)) return 'sessions';
    if (['analytics', 'weight', 'steps', 'ranking'].includes(t)) return 'analytics';
    return 'tpl';
  };
  const active = getActive(tab);

  const tabBtn = (t) => {
    const isActive = active === t.k;
    const color = isActive ? SG.ink : SG.inkSoft;
    return (
      <button
        key={t.k}
        onClick={() => onTab(t.k)}
        style={{
          flex: 1, height: 56, borderRadius: 18, border: 'none', background: 'transparent',
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 3,
          cursor: 'pointer', color,
          fontFamily: SG.serif.split(',')[0].replace(/"/g, ''),
        }}
      >
        {t.icon(color, 22)}
        <div style={{ fontSize: 10, fontWeight: isActive ? 700 : 600, fontFamily: 'inherit', color }}>{t.label}</div>
      </button>
    );
  };

  return (
    <div style={{
      position: 'fixed', left: 12, right: 12, bottom: 12, zIndex: 100,
      maxWidth: 600, margin: '0 auto',
    }}>
      <div style={{
        height: 68, borderRadius: 36, padding: '0 6px',
        backdropFilter: 'blur(22px) saturate(180%)',
        WebkitBackdropFilter: 'blur(22px) saturate(180%)',
        background: 'rgba(255,255,255,0.65)',
        boxShadow: '0 12px 40px rgba(15,15,30,0.14), 0 2px 6px rgba(15,15,30,0.06)',
        border: '0.5px solid rgba(255,255,255,0.70)',
        display: 'flex', alignItems: 'center',
      }}>
        {tabBtn(tabs[0])}
        {tabBtn(tabs[1])}
        <div style={{ width: 76 }} />
        {tabBtn(tabs[2])}
        {tabBtn(tabs[3])}
      </div>
      <button
        onClick={onFAB}
        aria-label="Nouvelle séance"
        style={{
          position: 'absolute', left: '50%', bottom: 18,
          transform: 'translateX(-50%)',
          width: 68, height: 68, borderRadius: 34,
          background: SG.ink, color: '#fff',
          border: '1px solid rgba(255,255,255,0.20)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: `0 16px 36px ${SG.accent}55, 0 6px 14px rgba(0,0,0,0.22), inset 0 1px 0 rgba(255,255,255,0.20)`,
          cursor: 'pointer',
        }}
      >
        <svg width={30} height={30} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round">
          <path d="M12 5v14"/><path d="M5 12h14"/>
        </svg>
      </button>
    </div>
  );
}

// ─── SGTemplatePicker ─────────────────────────────────────────────────────────
function SGTemplatePicker({ templates, onSelect, onClose }) {
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(31,26,20,0.45)', backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: 600, background: SG.bg1, borderRadius: '28px 28px 0 0', padding: '20px 20px 48px', boxShadow: '0 -20px 50px rgba(0,0,0,0.18)', maxHeight: '80vh', overflowY: 'auto' }}>
        <div style={{ width: 36, height: 4, borderRadius: 2, background: 'rgba(31,26,20,0.12)', margin: '0 auto 20px' }} />
        <div style={{ fontFamily: SG.serif, fontSize: 24, fontWeight: 500, color: SG.ink, marginBottom: 6, textAlign: 'center' }}>Démarrer une séance</div>
        <div style={{ fontSize: 13, color: SG.inkSoft, textAlign: 'center', marginBottom: 20 }}>Choisis un modèle ou démarre librement</div>
        <button onClick={() => onSelect(null)} style={{ width: '100%', padding: '16px 18px', borderRadius: 20, border: `1.5px dashed rgba(31,26,20,0.20)`, background: 'rgba(255,255,255,0.5)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 14, marginBottom: 10, textAlign: 'left' }}>
          <div style={{ width: 44, height: 44, borderRadius: 14, background: SG.ink, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round"><path d="M12 5v14"/><path d="M5 12h14"/></svg>
          </div>
          <div>
            <div style={{ fontFamily: SG.serif, fontSize: 18, fontWeight: 500, color: SG.ink }}>Séance libre</div>
            <div style={{ fontSize: 12, color: SG.inkSoft, marginTop: 2 }}>Commence sans modèle prédéfini</div>
          </div>
        </button>
        {templates.length > 0 && (
          <>
            <div style={{ fontSize: 10, color: SG.inkSoft, fontWeight: 800, letterSpacing: 1.2, textTransform: 'uppercase', margin: '16px 4px 10px' }}>Mes modèles</div>
            {templates.map(tpl => (
              <button key={tpl.id} onClick={() => onSelect(tpl)} style={{ width: '100%', padding: '14px 18px', borderRadius: 20, border: '1px solid rgba(255,255,255,0.5)', background: 'rgba(255,255,255,0.55)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 14, marginBottom: 8, textAlign: 'left', backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)' }}>
                <div style={{ width: 44, height: 44, borderRadius: 14, background: `linear-gradient(135deg, ${SG.accent} 0%, ${SG.accent2} 100%)`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="2" y="9" width="3" height="6" rx="1"/><rect x="19" y="9" width="3" height="6" rx="1"/>
                    <rect x="5" y="7" width="3" height="10" rx="1"/><rect x="16" y="7" width="3" height="10" rx="1"/>
                    <path d="M8 12h8"/>
                  </svg>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontFamily: SG.serif, fontSize: 18, fontWeight: 500, color: SG.ink }}>{tpl.name}</div>
                  <div style={{ fontSize: 12, color: SG.inkSoft, marginTop: 2 }}>{(tpl.exercises || []).length} exercices</div>
                </div>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={SG.inkFaint} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6"/></svg>
              </button>
            ))}
          </>
        )}
      </div>
    </div>
  );
}

// ─── FrDateInput — input date natif (calendrier sur mobile) ──────────────────
function FrDateInput({ value, min, max, onChange, style }) {
  return (
    <input
      type="date" value={value} min={min} max={max}
      onChange={e => onChange(e.target.value)}
      style={{ width: '100%', padding: '10px 12px', borderRadius: 12, border: '1.5px solid rgba(31,26,20,0.12)', background: 'rgba(255,255,255,0.7)', fontSize: 13, color: '#1F1A14', outline: 'none', boxSizing: 'border-box', ...style }}
    />
  );
}

// ─── ExercisePicker ───────────────────────────────────────────────────────────
function ExercisePicker({ knownExercises = [], onSelect, onClose }) {
  const [query, setQuery] = useState('');
  const inputRef = useRef(null);
  const wasFocusedRef = useRef(false);

  // Freeze body scroll so keyboard opening doesn't shift the page
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, []);

  const q = query.trim().toLowerCase();
  const sorted = [...knownExercises].sort((a, b) => a.localeCompare(b, 'fr', { sensitivity: 'base' }));
  const filtered = sorted.filter(e => !q || e.toLowerCase().includes(q));
  const exactMatch = knownExercises.some(e => e.toLowerCase() === q);
  const canCreate = q.length > 0 && !exactMatch;

  // Capture focus state BEFORE onFocus fires so onClick can dismiss correctly
  const handlePointerDown = () => { wasFocusedRef.current = document.activeElement === inputRef.current; };
  const handleClick = () => { if (wasFocusedRef.current) inputRef.current?.blur(); };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 250, background: SG.bg1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '54px 20px 0', maxWidth: 600, margin: '0 auto', width: '100%' }}>
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 20, flexShrink: 0 }}>
          <button onClick={onClose} style={{ width: 36, height: 36, borderRadius: 12, border: 'none', background: 'rgba(31,26,20,0.07)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', marginRight: 14, flexShrink: 0 }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={SG.ink} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5"/><path d="M12 19l-7-7 7-7"/></svg>
          </button>
          <div style={{ fontFamily: SG.serif, fontSize: 24, fontWeight: 500, color: SG.ink }}>Ajouter un exercice</div>
        </div>
        <input
          ref={inputRef}
          type="text" value={query} onChange={e => setQuery(e.target.value)}
          placeholder="Rechercher ou créer..."
          onPointerDown={handlePointerDown}
          onTouchStart={handlePointerDown}
          onClick={handleClick}
          style={{ width: '100%', padding: '12px 16px', borderRadius: 14, border: `1.5px solid rgba(31,26,20,0.14)`, background: 'rgba(255,255,255,0.7)', fontSize: 15, color: SG.ink, outline: 'none', boxSizing: 'border-box', marginBottom: 12, fontFamily: SG.sans, flexShrink: 0 }}
        />
        <div style={{ overflowY: 'auto', flex: 1, paddingBottom: 44 }}>
          {canCreate && (
            <button onClick={() => onSelect(query.trim())} style={{ width: '100%', padding: '13px 16px', borderRadius: 14, border: `1.5px dashed rgba(31,26,20,0.18)`, background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8, textAlign: 'left' }}>
              <div style={{ width: 32, height: 32, borderRadius: 10, background: SG.accent, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round"><path d="M12 5v14"/><path d="M5 12h14"/></svg>
              </div>
              <div>
                <div style={{ fontSize: 15, fontWeight: 600, color: SG.ink }}>Créer « {query.trim()} »</div>
                <div style={{ fontSize: 11, color: SG.inkSoft, marginTop: 1 }}>Nouvel exercice</div>
              </div>
            </button>
          )}
          {filtered.map(ex => (
            <button key={ex} onClick={() => onSelect(ex)} style={{ width: '100%', padding: '13px 16px', borderRadius: 14, border: 'none', background: 'rgba(255,255,255,0.55)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6, textAlign: 'left' }}>
              <div style={{ width: 32, height: 32, borderRadius: 10, background: 'rgba(31,26,20,0.07)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={SG.inkSoft} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="9" width="3" height="6" rx="1"/><rect x="19" y="9" width="3" height="6" rx="1"/><rect x="5" y="7" width="3" height="10" rx="1"/><rect x="16" y="7" width="3" height="10" rx="1"/><path d="M8 12h8"/></svg>
              </div>
              <div style={{ fontSize: 15, fontWeight: 500, color: SG.ink }}>{ex}</div>
            </button>
          ))}
          {filtered.length === 0 && !canCreate && (
            <div style={{ textAlign: 'center', padding: '24px 0', fontSize: 13, color: SG.inkFaint }}>Aucun exercice trouvé</div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── SGMobileProfileModal ─────────────────────────────────────────────────────
function SGMobileProfileModal({ user, onClose }) {
  const firstName = (user?.displayName || user?.email || 'Utilisateur').split(/[@\s]/)[0];
  const firstLetter = firstName[0]?.toUpperCase() || 'U';
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 300, background: 'rgba(31,26,20,0.45)', backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: 600, background: SG.bg1, borderRadius: '28px 28px 0 0', padding: '24px 24px 52px', boxShadow: '0 -20px 50px rgba(0,0,0,0.18)' }}>
        <div style={{ width: 36, height: 4, borderRadius: 2, background: 'rgba(31,26,20,0.12)', margin: '0 auto 22px' }} />
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div style={{ width: 72, height: 72, borderRadius: 36, margin: '0 auto 12px', background: `linear-gradient(135deg, ${SG.accent} 0%, ${SG.accent2} 100%)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: SG.serif, fontSize: 30, fontWeight: 500, color: '#fff', boxShadow: `0 8px 24px ${SG.accent}44` }}>{firstLetter}</div>
          <div style={{ fontFamily: SG.serif, fontSize: 24, fontWeight: 500, color: SG.ink }}>{firstName}</div>
          <div style={{ fontSize: 12, color: SG.inkSoft, marginTop: 3 }}>{user?.email}</div>
        </div>
        <Glass radius={18} tint="rgba(255,255,255,0.55)" style={{ marginBottom: 14, overflow: 'hidden' }}>
          <div>
            <div style={{ padding: '15px 18px', borderBottom: '0.5px solid rgba(31,26,20,0.08)' }}>
              <div style={{ fontSize: 10, color: SG.inkFaint, fontWeight: 700, letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 6 }}>Conditions générales</div>
              <div style={{ fontSize: 13, color: SG.inkSoft, lineHeight: 1.6 }}>En utilisant Workout Tracker, tu acceptes nos conditions d'utilisation. L'application collecte uniquement les données nécessaires à ton suivi sportif.</div>
            </div>
            <div style={{ padding: '15px 18px' }}>
              <div style={{ fontSize: 10, color: SG.inkFaint, fontWeight: 700, letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 6 }}>Politique de confidentialité</div>
              <div style={{ fontSize: 13, color: SG.inkSoft, lineHeight: 1.6 }}>Tes données sont stockées de manière sécurisée via Firebase. Elles ne sont jamais partagées avec des tiers et restent sous ton contrôle.</div>
            </div>
          </div>
        </Glass>
        <button onClick={() => signOutUser()} style={{ width: '100%', padding: 16, borderRadius: 20, border: 'none', background: 'rgba(178,58,58,0.08)', color: '#B23A3A', fontWeight: 700, fontSize: 15, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#B23A3A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><path d="M10 17l5-5-5-5M15 12H3"/></svg>
          Déconnexion
        </button>
        <div style={{ textAlign: 'center', marginTop: 16, fontSize: 11, color: SG.inkFaint }}>Workout Tracker · © 2026 Maxence Chan</div>
      </div>
    </div>
  );
}

// ─── Glass primitive ──────────────────────────────────────────────────────────
function Glass({ children, style = {}, radius = 24, tint = 'rgba(255,255,255,0.50)', onClick }) {
  const ref = useRef(null);
  const [ripple, setRipple] = useState(null);
  const handleTouch = (e) => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const t = e.touches[0];
    setRipple({ x: ((t.clientX - rect.left) / rect.width) * 100, y: ((t.clientY - rect.top) / rect.height) * 100, id: Date.now() });
    setTimeout(() => setRipple(null), 550);
  };
  return (
    <div ref={ref} onClick={onClick} onTouchStart={handleTouch}
      style={{ position: 'relative', borderRadius: radius, cursor: onClick ? 'pointer' : 'default', WebkitTapHighlightColor: 'transparent', ...style }}>
      <div style={{ position: 'absolute', inset: 0, borderRadius: radius, backdropFilter: 'blur(22px) saturate(180%)', WebkitBackdropFilter: 'blur(22px) saturate(180%)', background: tint, overflow: 'hidden' }}>
        {ripple && (
          <div key={ripple.id} style={{ position: 'absolute', left: `${ripple.x}%`, top: `${ripple.y}%`, transform: 'translate(-50%,-50%)', width: '200%', paddingBottom: '200%', borderRadius: '50%', background: 'radial-gradient(circle, rgba(255,255,255,0.45) 0%, transparent 65%)', animation: 'sg-ripple 550ms ease-out forwards', pointerEvents: 'none' }} />
        )}
      </div>
      <div style={{ position: 'absolute', inset: 0, borderRadius: radius, boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.78), inset 0 -1px 0 rgba(0,0,0,0.03)', border: '0.5px solid rgba(255,255,255,0.58)', pointerEvents: 'none' }} />
      <div style={{ position: 'relative', zIndex: 1 }}>{children}</div>
    </div>
  );
}

// ─── SG utility functions ─────────────────────────────────────────────────────
const sgFmt = (iso) => {
  if (!iso) return '';
  const d = new Date(iso + 'T00:00:00');
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
};
const sgTonnage = (session) => {
  try { return session.exercises?.reduce((acc, ex) => acc + (ex.sets||[]).reduce((s, st) => s + Number(st.reps||0)*Number(st.weight||0), 0), 0) || 0; } catch { return 0; }
};
const sgStreak = (sessions) => {
  if (!sessions.length) return 0;
  const getWeekKey = (d) => { const date = new Date(d + 'T00:00:00'); const day = date.getDay(); const diff = day === 0 ? 6 : day - 1; date.setDate(date.getDate() - diff); return date.toISOString().slice(0,10); };
  const byWeek = {};
  sessions.forEach(s => { const k = getWeekKey(s.date); byWeek[k] = (byWeek[k]||0)+1; });
  let streak = 0;
  const today = new Date();
  const day = today.getDay();
  const check = new Date(today);
  check.setDate(today.getDate() - (day===0?6:day-1));
  for (let i = 0; i < 52; i++) {
    const k = check.toISOString().slice(0,10);
    if ((byWeek[k]||0) >= 3) { streak++; check.setDate(check.getDate()-7); }
    else if (i === 0) { check.setDate(check.getDate()-7); }
    else break;
  }
  return streak;
};
const sgWeekDone = (sessions, runActivities = []) => {
  const today = new Date(); const day = today.getDay();
  const monday = new Date(today); monday.setDate(today.getDate() - (day===0?6:day-1)); monday.setHours(0,0,0,0);
  const mondayISO = toLocalISO(monday);
  const todayISO = toLocalISO(today);
  const muscu = sessions.filter(s => s.date >= mondayISO && s.date <= todayISO).length;
  const runs = runActivities.filter(a => a.date >= mondayISO && a.date <= todayISO).length;
  return muscu + runs;
};
const sgWeekDays = (sessions, runActivities = []) => {
  const labels = ['L','M','M','J','V','S','D'];
  const today = new Date(); const todayDay = today.getDay(); const todayOffset = todayDay===0?6:todayDay-1;
  return labels.map((label, i) => {
    const d = new Date(today); d.setDate(today.getDate() + (i - todayOffset)); d.setHours(0,0,0,0);
    const iso = toLocalISO(d);
    const hasMuscu = sessions.some(s => s.date === iso);
    const hasRun = runActivities.some(a => a.date === iso);
    const type = hasMuscu && hasRun ? 'both' : hasMuscu ? 'muscu' : hasRun ? 'run' : null;
    return { label, done: hasMuscu || hasRun, today: i === todayOffset, type };
  });
};

// ─── useTimer + SGActiveSession ───────────────────────────────────────────────
function useTimer(startedAt) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  const elapsed = Math.floor((now - startedAt) / 1000);
  const mm = String(Math.floor(elapsed / 60)).padStart(2, '0');
  const ss = String(elapsed % 60).padStart(2, '0');
  return { display: `${mm}:${ss}`, elapsed, now };
}

function SGActiveSession({ session, onFinish, onClose, onCancel, sessions, knownExercises = [] }) {
  const [timerStart, setTimerStart] = useState(session.startedAt);
  const { display: timerDisplay, now } = useTimer(timerStart);
  const [exercises, setExercises] = useState(session.exercises);
  const [sessionName, setSessionName] = useState(session.name);
  const [curExIdx, setCurExIdx] = useState(0);
  const [curSetIdx, setCurSetIdx] = useState(0);
  const [reps, setReps] = useState(() => session.exercises[0]?.sets[0]?.reps || 10);
  const [kg, setKg] = useState(() => session.exercises[0]?.sets[0]?.weight || 0);
  const [kgInput, setKgInput] = useState('');
  const [repsInput, setRepsInput] = useState('');
  const [editingKg, setEditingKg] = useState(false);
  const [editingReps, setEditingReps] = useState(false);
  const [restEnd, setRestEnd] = useState(null);
  const [showAbandon, setShowAbandon] = useState(false);
  const [expandedIdx, setExpandedIdx] = useState(null);
  const [showReorder, setShowReorder] = useState(false);
  const [showAddEx, setShowAddEx] = useState(false);
  const [newExName, setNewExName] = useState('');
  const [showSummary, setShowSummary] = useState(false);
  const [summarySessionsSnapshot, setSummarySessionsSnapshot] = useState(null);
  const [sessionDate, setSessionDate] = useState(toLocalISO(new Date()));
  const hasSavedRef = useRef(false);
  const longPressRef = useRef(null);
  const [renamingExIdx, setRenamingExIdx] = useState(null);
  const [renameValue, setRenameValue] = useState('');

  const restRemaining = restEnd ? Math.max(0, Math.ceil((restEnd - now) / 1000)) : 0;
  const isResting = restRemaining > 0;
  const currentEx = exercises[curExIdx];
  const tonnage = exercises.reduce((acc, ex) =>
    acc + (ex.sets || []).reduce((s, st) => s + (Number(st.reps) || 0) * (Number(st.weight) || 0), 0), 0);
  const completedSets = exercises.reduce((acc, ex) => acc + ex.sets.filter(s => s.done).length, 0);
  const totalSets = exercises.reduce((acc, ex) => acc + ex.sets.length, 0);

  useEffect(() => {
    if (!currentEx) return;
    const cur = currentEx.sets[curSetIdx];
    setReps(cur?.reps || 10);
    setKg(cur?.weight || 0);
  }, [curExIdx, curSetIdx]);

  const validateSet = () => {
    const updatedExercises = exercises.map((ex, ei) => {
      if (ei !== curExIdx) return ex;
      return { ...ex, sets: ex.sets.map((s, si) => si === curSetIdx ? { ...s, reps, weight: kg, done: true } : s) };
    });
    setExercises(updatedExercises);
    setRestEnd(Date.now() + 90000);
    const ex = updatedExercises[curExIdx];
    const nextSetIdx = curSetIdx + 1;
    if (nextSetIdx < ex.sets.length) {
      setCurSetIdx(nextSetIdx);
    } else {
      const nextExIdx = curExIdx + 1;
      if (nextExIdx < exercises.length) { setCurExIdx(nextExIdx); setCurSetIdx(0); setExpandedIdx(null); }
    }
  };

  const addSet = () => {
    setExercises(exs => exs.map((ex, ei) =>
      ei === curExIdx ? { ...ex, sets: [...ex.sets, { reps, weight: kg, done: false }] } : ex
    ));
  };

  const addExercise = (name) => {
    setExercises(exs => [...exs, { name, sets: Array(3).fill(null).map(() => ({ reps: 10, weight: 0, done: false })) }]);
    setSessionName('Séance libre');
    setNewExName('');
    setShowAddEx(false);
  };

  const deleteExercise = (idx) => {
    if (exercises.length <= 1) return;
    setExercises(exs => exs.filter((_, i) => i !== idx));
    setSessionName('Séance libre');
    if (curExIdx > idx) setCurExIdx(c => c - 1);
    else if (curExIdx === idx) { setCurSetIdx(0); if (curExIdx >= exercises.length - 1 && curExIdx > 0) setCurExIdx(c => c - 1); }
  };

  const moveEx = (idx, dir) => {
    const to = idx + dir;
    if (to < 0 || to >= exercises.length) return;
    setExercises(exs => { const arr = [...exs]; [arr[idx], arr[to]] = [arr[to], arr[idx]]; return arr; });
    setSessionName('Séance libre');
    if (curExIdx === idx) setCurExIdx(to);
    else if (curExIdx === to) setCurExIdx(idx);
  };

  const handleFinish = () => {
    const elapsed = Math.floor((Date.now() - session.startedAt) / 1000);
    const dur = Math.round(elapsed / 60) || 1;
    setSummarySessionsSnapshot([...(sessions || [])]);
    if (!hasSavedRef.current) {
      hasSavedRef.current = true;
      onFinish({ exercises, dur, tonnage, name: sessionName, date: sessionDate });
    }
    setShowSummary(true);
  };

  const handleExLongPressStart = () => { longPressRef.current = setTimeout(() => setShowReorder(true), 500); };
  const handleExLongPressEnd = () => { clearTimeout(longPressRef.current); };
  const renameExercise = (idx, name) => {
    if (!name.trim()) return;
    setExercises(exs => exs.map((ex, i) => i === idx ? { ...ex, name: name.trim() } : ex));
    setSessionName('Séance libre');
    setRenamingExIdx(null);
  };

  const iconCheck = <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M5 13l4 4L19 7"/></svg>;
  const iconMinus = (c='currentColor') => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2.4" strokeLinecap="round"><path d="M5 12h14"/></svg>;
  const iconPlus = (c='currentColor') => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2.4" strokeLinecap="round"><path d="M12 5v14"/><path d="M5 12h14"/></svg>;
  const iconTrash = (c='#B23A3A') => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></svg>;

  const renderExCard = (ex, exIdx, isCurrent, onCollapse) => (
    <Glass radius={26} tint={isCurrent ? 'rgba(255,255,255,0.55)' : 'rgba(255,255,255,0.45)'}
      style={{ marginBottom: 12, border: isCurrent ? `1.5px solid ${SG.accent}` : '1px solid rgba(255,255,255,0.4)', boxShadow: isCurrent ? `0 8px 24px ${SG.accent}22` : 'none' }}>
      <div style={{ padding: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 11, color: isCurrent ? SG.accent : SG.inkSoft, fontWeight: 800, letterSpacing: 0.8, textTransform: 'uppercase' }}>EXERCICE {exIdx + 1} / {exercises.length}</div>
            {renamingExIdx === exIdx ? (
              <input autoFocus value={renameValue} onChange={e => setRenameValue(e.target.value)}
                onBlur={() => renameExercise(exIdx, renameValue)}
                onKeyDown={e => { if (e.key === 'Enter') renameExercise(exIdx, renameValue); if (e.key === 'Escape') setRenamingExIdx(null); }}
                style={{ fontFamily: SG.serif, fontSize: 24, fontWeight: 500, color: SG.ink, border: 'none', borderBottom: `2px solid ${SG.accent}`, background: 'transparent', outline: 'none', width: '100%', marginTop: 3 }} />
            ) : (
              <div style={{ fontFamily: SG.serif, fontSize: 26, fontWeight: 500, marginTop: 3, letterSpacing: -0.4, color: SG.ink }}>{ex.name}</div>
            )}
            {(() => {
              const exTonnage = (ex.sets || []).reduce((s, st) => s + (Number(st.reps)||0) * (Number(st.weight)||0), 0);
              const doneTonnage = (ex.sets || []).filter(s => s.done).reduce((s, st) => s + st.reps * st.weight, 0);
              const hasDone = (ex.sets || []).some(s => s.done);
              if (!exTonnage) return null;
              return (
                <div style={{ fontSize: 11, color: SG.inkSoft, marginTop: 2 }}>
                  {hasDone ? `${(doneTonnage/1000).toFixed(2)} / ` : ''}{(exTonnage/1000).toFixed(2)} t
                </div>
              );
            })()}
          </div>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexShrink: 0, marginLeft: 8 }}>
            {isCurrent && isResting && (
              <div style={{ padding: '8px 10px', borderRadius: 14, background: SG.ink, color: '#fff', fontFamily: SG.serif, fontSize: 15, fontWeight: 500, display: 'flex', alignItems: 'center', gap: 5 }}>
                <div style={{ width: 5, height: 5, borderRadius: 3, background: SG.accent }} />
                {String(Math.floor(restRemaining/60)).padStart(2,'0')}:{String(restRemaining%60).padStart(2,'0')}
              </div>
            )}
            <button onClick={(e) => { e.stopPropagation(); setRenamingExIdx(exIdx); setRenameValue(ex.name); }} style={{ width: 32, height: 32, borderRadius: 10, border: 'none', background: 'rgba(31,26,20,0.06)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={SG.inkSoft} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
            </button>
            <button onClick={(e) => { e.stopPropagation(); deleteExercise(exIdx); }} style={{ width: 32, height: 32, borderRadius: 10, border: 'none', background: 'rgba(178,58,58,0.10)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{iconTrash()}</button>
            {!isCurrent && onCollapse && (
              <button onClick={(e) => { e.stopPropagation(); onCollapse(); }} style={{ width: 32, height: 32, borderRadius: 10, border: 'none', background: 'rgba(31,26,20,0.06)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={SG.inkSoft} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 15l-6-6-6 6"/></svg>
              </button>
            )}
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 14 }}>
          {(ex.sets || []).map((s, si) => {
            const isCur = isCurrent && si === curSetIdx;
            return (
              <div key={si} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', borderRadius: 16, background: isCur ? SG.ink : (s.done ? 'rgba(139,154,107,0.12)' : 'rgba(255,255,255,0.4)'), color: isCur ? '#fff' : SG.ink, transition: 'all 200ms' }}>
                <div style={{ width: 28, height: 28, borderRadius: 14, background: s.done ? SG.accent2 : (isCur ? SG.accent : 'transparent'), border: !s.done && !isCur ? `1.5px solid rgba(31,26,20,0.20)` : 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 12, fontWeight: 800, flexShrink: 0 }}>
                  {s.done ? iconCheck : (si + 1)}
                </div>
                <div style={{ flex: 1, fontFamily: SG.serif, fontSize: 17, fontWeight: 500 }}>
                  {s.done ? `${s.reps} reps · ${s.weight} kg` : (isCur ? `${reps} reps · ${kg} kg` : (s.reps ? `${s.reps} reps · ${s.weight} kg` : '— reps · — kg'))}
                </div>
                {isCur && !s.done && <div style={{ fontSize: 10, fontWeight: 800, color: SG.accent, letterSpacing: 0.5 }}>EN COURS</div>}
              </div>
            );
          })}
          {isCurrent && (
            <button onClick={addSet} style={{ marginTop: 4, padding: '8px 14px', borderRadius: 14, border: `1.5px dashed rgba(31,26,20,0.14)`, background: 'transparent', cursor: 'pointer', fontSize: 12, color: SG.inkSoft, fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
              {iconPlus(SG.inkSoft)} Ajouter une série
            </button>
          )}
        </div>
        {isCurrent && (
          <>
            <div style={{ marginTop: 14, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <Glass radius={18} tint="rgba(255,255,255,0.6)">
                <div style={{ padding: '8px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <button onClick={() => setReps(v => Math.max(1, v - 1))} style={{ width: 36, height: 36, borderRadius: 18, border: 'none', cursor: 'pointer', background: SG.ink, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{iconMinus('#fff')}</button>
                  <div style={{ textAlign: 'center', flex: 1, cursor: 'pointer' }} onClick={() => { setEditingReps(true); setRepsInput(String(reps)); }}>
                    <div style={{ fontSize: 9, color: SG.inkSoft, fontWeight: 800, letterSpacing: 1 }}>REPS</div>
                    {editingReps ? (
                      <input type="number" value={repsInput} onChange={e => setRepsInput(e.target.value)}
                        onBlur={() => { const v = parseInt(repsInput); if (v > 0) setReps(v); setEditingReps(false); }}
                        onKeyDown={e => { if (e.key === 'Enter') { const v = parseInt(repsInput); if (v > 0) setReps(v); setEditingReps(false); } }}
                        autoFocus style={{ width: 60, border: 'none', background: 'transparent', textAlign: 'center', fontFamily: SG.serif, fontSize: 26, fontWeight: 500, color: SG.ink, outline: 'none' }} />
                    ) : (
                      <div style={{ fontFamily: SG.serif, fontSize: 26, fontWeight: 500, lineHeight: 1.1, letterSpacing: -0.5, color: SG.ink }}>{reps}</div>
                    )}
                  </div>
                  <button onClick={() => setReps(v => v + 1)} style={{ width: 36, height: 36, borderRadius: 18, border: 'none', cursor: 'pointer', background: SG.accent, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `0 4px 10px ${SG.accent}44` }}>{iconPlus('#fff')}</button>
                </div>
              </Glass>
              <Glass radius={18} tint="rgba(255,255,255,0.6)">
                <div style={{ padding: '8px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <button onClick={() => setKg(v => Math.max(0, parseFloat((v - 2.5).toFixed(1))))} style={{ width: 36, height: 36, borderRadius: 18, border: 'none', cursor: 'pointer', background: SG.ink, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{iconMinus('#fff')}</button>
                  <div style={{ textAlign: 'center', flex: 1, cursor: 'pointer' }} onClick={() => { setEditingKg(true); setKgInput(String(kg)); }}>
                    <div style={{ fontSize: 9, color: SG.inkSoft, fontWeight: 800, letterSpacing: 1 }}>KG</div>
                    {editingKg ? (
                      <input type="number" step="0.5" value={kgInput} onChange={e => setKgInput(e.target.value)}
                        onBlur={() => { const v = parseFloat(kgInput); if (v >= 0) setKg(v); setEditingKg(false); }}
                        onKeyDown={e => { if (e.key === 'Enter') { const v = parseFloat(kgInput); if (v >= 0) setKg(v); setEditingKg(false); } }}
                        autoFocus style={{ width: 60, border: 'none', background: 'transparent', textAlign: 'center', fontFamily: SG.serif, fontSize: 26, fontWeight: 500, color: SG.ink, outline: 'none' }} />
                    ) : (
                      <div style={{ fontFamily: SG.serif, fontSize: 26, fontWeight: 500, lineHeight: 1.1, letterSpacing: -0.5, color: SG.ink }}>{Number.isInteger(kg) ? kg : kg.toFixed(1)}</div>
                    )}
                  </div>
                  <button onClick={() => setKg(v => parseFloat((v + 2.5).toFixed(1)))} style={{ width: 36, height: 36, borderRadius: 18, border: 'none', cursor: 'pointer', background: SG.accent, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `0 4px 10px ${SG.accent}44` }}>{iconPlus('#fff')}</button>
                </div>
              </Glass>
            </div>
            {curSetIdx < (currentEx?.sets || []).length && !currentEx?.sets[curSetIdx]?.done && (
              <button onClick={validateSet} style={{ marginTop: 14, width: '100%', height: 58, borderRadius: 22, border: 'none', cursor: 'pointer', background: SG.accent, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontWeight: 800, fontSize: 17, letterSpacing: 0.3, boxShadow: `0 12px 28px ${SG.accent}44, inset 0 1px 0 rgba(255,255,255,0.3)` }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M5 13l4 4L19 7"/></svg>
                Valider la série {curSetIdx + 1}
              </button>
            )}
          </>
        )}
        {!isCurrent && (
          <button onClick={() => { setCurExIdx(exIdx); setCurSetIdx(0); setExpandedIdx(null); }} style={{ marginTop: 14, width: '100%', padding: 12, borderRadius: 18, border: `1.5px solid ${SG.ink}`, background: 'transparent', cursor: 'pointer', fontSize: 14, fontWeight: 700, color: SG.ink }}>
            Passer à cet exercice
          </button>
        )}
      </div>
    </Glass>
  );

  if (showSummary) return (
    <SGSessionSummary
      exercises={exercises}
      sessionName={sessionName}
      startedAt={session.startedAt}
      sessions={summarySessionsSnapshot || sessions || []}
      onClose={onClose}
      onBack={() => setShowSummary(false)}
    />
  );

  return (
    <div style={{ position: 'relative', minHeight: '100vh', paddingBottom: 30 }}>
      <div style={{ position: 'relative', padding: '50px 18px 0', maxWidth: 600, margin: '0 auto' }}>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <Glass radius={22} tint="rgba(255,255,255,0.7)" style={{ width: 44, height: 44 }} onClick={() => setShowAbandon(true)}>
            <div style={{ width: 44, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={SG.ink} strokeWidth="2" strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>
            </div>
          </Glass>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 10, color: SG.accent, fontWeight: 800, letterSpacing: 1.5, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
              <div style={{ width: 6, height: 6, borderRadius: 3, background: SG.accent }} /> EN COURS
            </div>
            <div style={{ fontFamily: SG.serif, fontSize: 16, fontStyle: 'italic', color: SG.ink }}>{sessionName}</div>
            <input type="date" value={sessionDate} max={toLocalISO(new Date())} onChange={e => setSessionDate(e.target.value)}
              style={{ marginTop: 4, fontSize: 11, color: SG.inkSoft, background: 'transparent', border: 'none', outline: 'none', textAlign: 'center', cursor: 'pointer', width: '100%' }} />
          </div>
          <div style={{ width: 44, height: 44 }} />
        </div>

        <Glass radius={26} tint="rgba(255,255,255,0.50)" style={{ marginBottom: 12 }}>
          <div style={{ padding: '18px 22px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
              <div>
                <div style={{ fontSize: 10, color: SG.inkSoft, fontWeight: 700, letterSpacing: 0.5, textTransform: 'uppercase' }}>Temps</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ fontFamily: SG.serif, fontSize: 40, fontWeight: 500, letterSpacing: -1, lineHeight: 1, marginTop: 2, color: SG.ink }}>{timerDisplay}</div>
                  <button onClick={() => setTimerStart(Date.now())} title="Réinitialiser le chrono" style={{ marginTop: 4, width: 28, height: 28, borderRadius: 9, border: 'none', background: 'rgba(31,26,20,0.07)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={SG.inkSoft} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>
                  </button>
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 10, color: SG.inkSoft, fontWeight: 700, letterSpacing: 0.5, textTransform: 'uppercase' }}>Tonnage</div>
                <div style={{ fontFamily: SG.serif, fontSize: 40, fontWeight: 500, letterSpacing: -1, lineHeight: 1, marginTop: 2, color: SG.ink }}>{(tonnage / 1000).toFixed(1)}<span style={{ fontSize: 16, color: SG.inkSoft, fontStyle: 'italic' }}>t</span></div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 4, marginTop: 14 }}>
              {exercises.map((ex, i) => {
                const pct = ex.sets.filter(s => s.done).length / ex.sets.length;
                const isActive = i === curExIdx;
                return (
                  <div key={i} style={{ flex: 1, height: 6, borderRadius: 3, overflow: 'hidden', background: 'rgba(31,26,20,0.08)' }}>
                    <div style={{ width: `${(isActive ? pct : ex.sets.every(s => s.done) ? 1 : 0) * 100}%`, height: '100%', background: ex.sets.every(s => s.done) ? SG.accent2 : SG.accent, borderRadius: 3, transition: 'width 300ms' }} />
                  </div>
                );
              })}
            </div>
            <div style={{ fontSize: 11, color: SG.inkFaint, marginTop: 6 }}>Exercice {curExIdx + 1} / {exercises.length} · {completedSets}/{totalSets} séries</div>
          </div>
        </Glass>

        {curExIdx > 0 && (
          <>
            <div style={{ fontSize: 11, color: SG.inkSoft, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', margin: '0 4px 8px' }}>Déjà faits</div>
            {exercises.slice(0, curExIdx).map((ex, i) => {
              const isExpanded = expandedIdx === i;
              return isExpanded
                ? <div key={i}>{renderExCard(ex, i, false, () => setExpandedIdx(null))}</div>
                : (
                  <Glass key={i} radius={18} tint="rgba(255,255,255,0.35)" style={{ marginBottom: 6 }}
                    onClick={() => setExpandedIdx(i)}>
                    <div onTouchStart={handleExLongPressStart} onTouchEnd={handleExLongPressEnd} onTouchCancel={handleExLongPressEnd}
                      style={{ padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ width: 22, height: 22, borderRadius: 11, background: SG.accent2, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        {iconCheck}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontFamily: SG.serif, fontSize: 15, fontWeight: 500, color: SG.inkSoft, textDecoration: 'line-through' }}>{ex.name}</div>
                        <div style={{ fontSize: 11, color: SG.inkFaint }}>{(ex.sets || []).filter(s => s.done).length}/{(ex.sets || []).length} séries</div>
                      </div>
                      <button onClick={e => { e.stopPropagation(); setShowReorder(true); }} style={{ width: 28, height: 28, borderRadius: 8, border: 'none', background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" strokeWidth="0"><circle cx="9" cy="6" r="1.5" fill={SG.inkFaint}/><circle cx="9" cy="12" r="1.5" fill={SG.inkFaint}/><circle cx="9" cy="18" r="1.5" fill={SG.inkFaint}/><circle cx="15" cy="6" r="1.5" fill={SG.inkFaint}/><circle cx="15" cy="12" r="1.5" fill={SG.inkFaint}/><circle cx="15" cy="18" r="1.5" fill={SG.inkFaint}/></svg>
                      </button>
                    </div>
                  </Glass>
                );
            })}
          </>
        )}

        {currentEx && renderExCard(currentEx, curExIdx, true)}

        {exercises.slice(curExIdx + 1).length > 0 && (
          <>
            <div style={{ fontSize: 11, color: SG.inkSoft, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', margin: '14px 4px 8px' }}>À suivre</div>
            {exercises.slice(curExIdx + 1).map((ex, i) => {
              const exIdx = curExIdx + 1 + i;
              const isExpanded = expandedIdx === exIdx;
              return isExpanded
                ? <div key={exIdx}>{renderExCard(ex, exIdx, false, () => setExpandedIdx(null))}</div>
                : (
                  <Glass key={exIdx} radius={18} tint="rgba(255,255,255,0.4)" style={{ marginBottom: 6 }}
                    onClick={() => setExpandedIdx(exIdx)}>
                    <div onTouchStart={handleExLongPressStart} onTouchEnd={handleExLongPressEnd} onTouchCancel={handleExLongPressEnd}
                      style={{ padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ width: 6, height: 32, borderRadius: 3, background: SG.accent2, flexShrink: 0 }} />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontFamily: SG.serif, fontSize: 16, fontWeight: 500, color: SG.ink }}>{ex.name}</div>
                        <div style={{ fontSize: 11, color: SG.inkSoft }}>{(ex.sets || []).length} séries</div>
                      </div>
                      <button onClick={e => { e.stopPropagation(); setShowReorder(true); }} style={{ width: 28, height: 28, borderRadius: 8, border: 'none', background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" strokeWidth="0"><circle cx="9" cy="6" r="1.5" fill={SG.inkFaint}/><circle cx="9" cy="12" r="1.5" fill={SG.inkFaint}/><circle cx="9" cy="18" r="1.5" fill={SG.inkFaint}/><circle cx="15" cy="6" r="1.5" fill={SG.inkFaint}/><circle cx="15" cy="12" r="1.5" fill={SG.inkFaint}/><circle cx="15" cy="18" r="1.5" fill={SG.inkFaint}/></svg>
                      </button>
                      <div style={{ fontSize: 11, color: SG.inkFaint }}>{exIdx + 1} / {exercises.length}</div>
                    </div>
                  </Glass>
                );
            })}
          </>
        )}

        <button onClick={() => setShowAddEx(true)} style={{ width: '100%', padding: '12px 16px', borderRadius: 18, border: `1.5px dashed rgba(31,26,20,0.18)`, background: 'transparent', cursor: 'pointer', fontSize: 13, color: SG.inkSoft, fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 8, marginBottom: 12 }}>
          {iconPlus(SG.inkSoft)} Ajouter un exercice
        </button>

        <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
          <button onClick={() => setShowReorder(true)} title="Réorganiser" style={{ width: 52, height: 58, borderRadius: 18, border: 'none', background: 'rgba(255,255,255,0.55)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={SG.inkSoft} strokeWidth="2" strokeLinecap="round"><circle cx="9" cy="6" r="1" fill={SG.inkSoft}/><circle cx="9" cy="12" r="1" fill={SG.inkSoft}/><circle cx="9" cy="18" r="1" fill={SG.inkSoft}/><circle cx="15" cy="6" r="1" fill={SG.inkSoft}/><circle cx="15" cy="12" r="1" fill={SG.inkSoft}/><circle cx="15" cy="18" r="1" fill={SG.inkSoft}/></svg>
          </button>
          <button onClick={handleFinish} style={{ flex: 1, height: 58, borderRadius: 22, border: 'none', background: SG.ink, color: '#fff', cursor: 'pointer', fontSize: 15, fontWeight: 700, boxShadow: '0 8px 20px rgba(0,0,0,0.15)' }}>
            Terminer la séance
          </button>
        </div>

        {showAbandon && (
          <div style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(31,26,20,0.45)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }} onClick={() => setShowAbandon(false)}>
            <div onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: 600, background: SG.bg1, borderRadius: '28px 28px 0 0', padding: '20px 24px 40px', boxShadow: '0 -20px 50px rgba(0,0,0,0.18)' }}>
              <div style={{ width: 36, height: 4, borderRadius: 2, background: 'rgba(31,26,20,0.12)', margin: '0 auto 20px' }} />
              <div style={{ fontFamily: SG.serif, fontSize: 24, fontWeight: 500, color: SG.ink, marginBottom: 8, textAlign: 'center' }}>Quitter sans enregistrer ?</div>
              <div style={{ fontSize: 13, color: SG.inkSoft, textAlign: 'center', marginBottom: 22 }}>Tu perdras les {completedSets} séries déjà validées.</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <button onClick={onCancel} style={{ padding: 14, borderRadius: 18, border: 'none', cursor: 'pointer', background: '#B23A3A', color: '#fff', fontWeight: 700, fontSize: 15 }}>Abandonner</button>
                <button onClick={() => setShowAbandon(false)} style={{ padding: 14, borderRadius: 18, border: 'none', cursor: 'pointer', background: 'rgba(31,26,20,0.06)', color: SG.ink, fontWeight: 700, fontSize: 15 }}>Continuer ma séance</button>
              </div>
            </div>
          </div>
        )}

        {showReorder && (
          <div style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(31,26,20,0.45)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }} onClick={() => setShowReorder(false)}>
            <div onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: 600, background: SG.bg1, borderRadius: '28px 28px 0 0', padding: '20px 20px 44px', boxShadow: '0 -20px 50px rgba(0,0,0,0.18)', maxHeight: '80vh', overflowY: 'auto' }}>
              <div style={{ width: 36, height: 4, borderRadius: 2, background: 'rgba(31,26,20,0.12)', margin: '0 auto 20px' }} />
              <div style={{ fontFamily: SG.serif, fontSize: 22, fontWeight: 500, color: SG.ink, marginBottom: 16, textAlign: 'center' }}>Réorganiser les exercices</div>
              {exercises.map((ex, idx) => (
                <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: 16, background: idx === curExIdx ? `${SG.accent}14` : 'rgba(255,255,255,0.55)', marginBottom: 6, border: idx === curExIdx ? `1px solid ${SG.accent}44` : '1px solid rgba(255,255,255,0.3)' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontFamily: SG.serif, fontSize: 16, fontWeight: 500, color: SG.ink }}>{ex.name}</div>
                    <div style={{ fontSize: 11, color: SG.inkSoft }}>{ex.sets.filter(s => s.done).length}/{ex.sets.length} séries</div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <button onClick={() => moveEx(idx, -1)} disabled={idx === 0} style={{ width: 30, height: 30, borderRadius: 8, border: 'none', background: idx === 0 ? 'rgba(0,0,0,0.04)' : SG.ink, cursor: idx === 0 ? 'default' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: idx === 0 ? 0.25 : 1 }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 15l7-7 7 7"/></svg>
                    </button>
                    <button onClick={() => moveEx(idx, 1)} disabled={idx === exercises.length - 1} style={{ width: 30, height: 30, borderRadius: 8, border: 'none', background: idx === exercises.length - 1 ? 'rgba(0,0,0,0.04)' : SG.ink, cursor: idx === exercises.length - 1 ? 'default' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: idx === exercises.length - 1 ? 0.25 : 1 }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 9l7 7 7-7"/></svg>
                    </button>
                  </div>
                  <button onClick={() => deleteExercise(idx)} style={{ width: 30, height: 30, borderRadius: 8, border: 'none', background: 'rgba(178,58,58,0.12)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {iconTrash()}
                  </button>
                </div>
              ))}
              <button onClick={() => setShowReorder(false)} style={{ marginTop: 16, width: '100%', padding: 14, borderRadius: 18, border: 'none', cursor: 'pointer', background: SG.ink, color: '#fff', fontWeight: 700, fontSize: 15 }}>OK</button>
            </div>
          </div>
        )}

        {showAddEx && (
          <ExercisePicker
            knownExercises={knownExercises}
            onSelect={(name) => { addExercise(name); setSessionName('Séance libre'); setShowAddEx(false); }}
            onClose={() => setShowAddEx(false)}
          />
        )}
      </div>
    </div>
  );
}

// ─── SGSessionSummary ─────────────────────────────────────────────────────────
function SGSessionSummary({ exercises, sessionName, startedAt, sessions, onClose, onBack }) {
  const elapsed = Math.floor((Date.now() - startedAt) / 1000);
  const dur = Math.round(elapsed / 60) || 1;
  const [expandedEx, setExpandedEx] = useState(null);

  const exTon = (sets) => (sets || []).reduce((s, st) => s + (Number(st.reps)||0) * (Number(st.weight)||0), 0);

  // Current session: only count validated sets
  const curTonnage = exercises.reduce((acc, ex) =>
    acc + (ex.sets || []).filter(s => s.done).reduce((s, st) => s + st.reps * st.weight, 0), 0);

  // Per-exercise: compare vs last recorded session containing that exercise
  const exComparisons = exercises.map(ex => {
    const doneSetsArr = (ex.sets || []).filter(s => s.done);
    const curEx = doneSetsArr.reduce((s, st) => s + st.reps * st.weight, 0);
    let prevEx = null;
    let prevSets = [];
    for (const s of sessions) {
      const match = (s.exercises || []).find(e =>
        typeof e === 'object' && (e.name || '').toLowerCase().trim() === ex.name.toLowerCase().trim()
      );
      if (match) { prevEx = exTon(match.sets); prevSets = match.sets || []; break; }
    }
    const pct = prevEx !== null && prevEx > 0 ? Math.round(((curEx - prevEx) / prevEx) * 100) : null;
    return { name: ex.name, curEx, prevEx, pct, doneSets: doneSetsArr.length, totalSets: (ex.sets||[]).length, sets: doneSetsArr, prevSets };
  });

  // Overall: compare vs last session of same type
  const prevSession = sessions.find(s => s.type === sessionName);
  const prevOverall = prevSession ? exTon((prevSession.exercises||[]).flatMap(e => e.sets||[])) : null;
  const overallPct = prevOverall !== null && prevOverall > 0
    ? Math.round(((curTonnage - prevOverall) / prevOverall) * 100) : null;

  const isFirst = overallPct === null;
  const isPositive = isFirst || overallPct >= 0;

  const title = isFirst
    ? "C'est parti, première séance enregistrée !"
    : overallPct > 0
      ? `Bravo ! Tu as progressé de +${overallPct}% 💪`
      : overallPct === 0
        ? 'Même tonnage que la dernière fois — régulier !'
        : `Continue, le progrès n'est pas linéaire 🔥`;

  const subtitle = isFirst
    ? 'Tu as posé la première pierre. Reviens régulièrement.'
    : isPositive
      ? 'Tu surpasses ta dernière performance. Keep going.'
      : 'Chaque séance compte, même les jours difficiles.';

  return (
    <div style={{ position: 'relative', minHeight: '100vh', paddingBottom: 50 }}>
      <div style={{ position: 'relative', padding: '54px 18px 0', maxWidth: 600, margin: '0 auto' }}>

        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div style={{ fontSize: 52, marginBottom: 10 }}>{isFirst ? '🎉' : isPositive ? '🏆' : '💪'}</div>
          <div style={{ fontFamily: SG.serif, fontSize: 24, fontWeight: 500, color: SG.ink, lineHeight: 1.25, fontStyle: 'italic' }}>{title}</div>
          <div style={{ fontSize: 13, color: SG.inkSoft, marginTop: 8, lineHeight: 1.4 }}>{subtitle}</div>
        </div>

        <Glass radius={26} tint="rgba(255,255,255,0.55)" style={{ marginBottom: 16 }}>
          <div style={{ padding: '18px 20px', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, textAlign: 'center' }}>
            <div>
              <div style={{ fontFamily: SG.serif, fontSize: 28, fontWeight: 500, color: SG.ink }}>{dur}</div>
              <div style={{ fontSize: 10, color: SG.inkSoft, fontWeight: 700, letterSpacing: 0.5, textTransform: 'uppercase', marginTop: 2 }}>min</div>
            </div>
            <div>
              <div style={{ fontFamily: SG.serif, fontSize: 28, fontWeight: 500, color: SG.ink }}>{(curTonnage/1000).toFixed(2)}</div>
              <div style={{ fontSize: 10, color: SG.inkSoft, fontWeight: 700, letterSpacing: 0.5, textTransform: 'uppercase', marginTop: 2 }}>tonnes</div>
            </div>
            <div>
              {overallPct !== null ? (
                <>
                  <div style={{ fontFamily: SG.serif, fontSize: 28, fontWeight: 500, color: overallPct >= 0 ? '#2D7A3A' : '#B23A3A' }}>
                    {overallPct >= 0 ? '+' : ''}{overallPct}%
                  </div>
                  <div style={{ fontSize: 10, color: SG.inkSoft, fontWeight: 700, letterSpacing: 0.5, textTransform: 'uppercase', marginTop: 2 }}>vs dernière</div>
                </>
              ) : (
                <>
                  <div style={{ fontFamily: SG.serif, fontSize: 28, fontWeight: 500, color: SG.ink }}>—</div>
                  <div style={{ fontSize: 10, color: SG.inkSoft, fontWeight: 700, letterSpacing: 0.5, textTransform: 'uppercase', marginTop: 2 }}>1ère fois</div>
                </>
              )}
            </div>
          </div>
        </Glass>

        <div style={{ fontSize: 11, color: SG.inkSoft, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', margin: '0 4px 10px' }}>Par exercice</div>
        {exComparisons.map((ex, i) => {
          const open = expandedEx === i;
          return (
            <Glass key={i} radius={18} tint="rgba(255,255,255,0.5)" style={{ marginBottom: 8 }}
              onClick={() => setExpandedEx(open ? null : i)}>
              <div style={{ padding: '12px 16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontFamily: SG.serif, fontSize: 16, fontWeight: 500, color: SG.ink, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{ex.name}</div>
                    <div style={{ fontSize: 11, color: SG.inkSoft, marginTop: 2 }}>
                      {(ex.curEx/1000).toFixed(2)} t · {ex.doneSets}/{ex.totalSets} séries
                      {ex.prevEx !== null && <> · préc. {(ex.prevEx/1000).toFixed(2)} t</>}
                    </div>
                  </div>
                  {ex.pct !== null ? (
                    <div style={{ flexShrink: 0, padding: '6px 12px', borderRadius: 12, background: ex.pct >= 0 ? 'rgba(45,122,58,0.12)' : 'rgba(178,58,58,0.10)', color: ex.pct >= 0 ? '#2D7A3A' : '#B23A3A', fontFamily: SG.serif, fontSize: 18, fontWeight: 500 }}>
                      {ex.pct >= 0 ? '+' : ''}{ex.pct}%
                    </div>
                  ) : (
                    <div style={{ flexShrink: 0, padding: '6px 10px', borderRadius: 12, background: 'rgba(31,26,20,0.06)', color: SG.inkSoft, fontSize: 11, fontWeight: 700, letterSpacing: 0.3 }}>
                      1ÈRE FOIS
                    </div>
                  )}
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={SG.inkFaint} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, transition: 'transform 200ms', transform: open ? 'rotate(180deg)' : 'rotate(0deg)' }}><path d="M6 9l6 6 6-6"/></svg>
                </div>
                {open && ex.sets.length > 0 && (
                  <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 5 }}>
                    {ex.sets.map((s, si) => {
                      const prevSet = ex.prevSets[si];
                      const curTon = (Number(s.reps) || 0) * (Number(s.weight) || 0);
                      const prevTon = prevSet ? (Number(prevSet.reps) || 0) * (Number(prevSet.weight) || 0) : null;
                      const setPct = prevTon !== null && prevTon > 0 ? Math.round(((curTon - prevTon) / prevTon) * 100) : null;
                      const isExtra = si >= ex.prevSets.length;
                      return (
                        <div key={si} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', borderRadius: 12, background: 'rgba(255,255,255,0.5)' }}>
                          <div style={{ width: 24, height: 24, borderRadius: 12, background: SG.accent2, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 800, color: '#fff', flexShrink: 0 }}>
                            {si + 1}
                          </div>
                          <div style={{ fontFamily: SG.serif, fontSize: 15, fontWeight: 500, color: SG.ink }}>{s.reps} reps</div>
                          <div style={{ fontSize: 12, color: SG.inkSoft }}>×</div>
                          <div style={{ fontFamily: SG.serif, fontSize: 15, fontWeight: 500, color: SG.ink }}>{s.weight} kg</div>
                          <div style={{ flex: 1, textAlign: 'right' }}>
                            {!isExtra && setPct !== null && (
                              <span style={{ fontSize: 12, fontWeight: 700, color: setPct >= 0 ? '#2D7A3A' : '#B23A3A', background: setPct >= 0 ? 'rgba(45,122,58,0.10)' : 'rgba(178,58,58,0.10)', padding: '3px 8px', borderRadius: 8 }}>
                                {setPct >= 0 ? '+' : ''}{setPct}%
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
                {open && ex.sets.length === 0 && (
                  <div style={{ marginTop: 8, fontSize: 12, color: SG.inkFaint, textAlign: 'center' }}>Aucune série validée</div>
                )}
              </div>
            </Glass>
          );
        })}

        <button onClick={onClose} style={{ width: '100%', padding: 16, borderRadius: 22, marginTop: 20, border: 'none', background: SG.ink, color: '#fff', cursor: 'pointer', fontSize: 15, fontWeight: 700, boxShadow: '0 8px 20px rgba(0,0,0,0.15)' }}>
          Fermer
        </button>
        <button onClick={onBack} style={{ width: '100%', padding: 12, borderRadius: 18, marginTop: 8, border: 'none', background: 'transparent', color: SG.inkSoft, cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
          ← Retour à la séance
        </button>
      </div>
    </div>
  );
}

// ─── SGMobileHome ─────────────────────────────────────────────────────────────
function SGMobileHome({ data, user, onOpenForm, onLaunchTpl, onViewSession }) {
  const sessions = data.sessions || [];
  const templates = data.sessionTemplates || [];
  const lastSession = sessions[0];

  const [weekSteps, setWeekSteps] = useState(null);
  const [weekRunKm, setWeekRunKm] = useState(null);
  const [weekRunActivities, setWeekRunActivities] = useState([]);

  useEffect(() => {
    if (!user?.id) return;
    const monday = (() => {
      const d = new Date(); const day = d.getDay();
      d.setDate(d.getDate() - (day === 0 ? 6 : day - 1)); d.setHours(0,0,0,0);
      return toLocalISO(d);
    })();
    const today = toLocalISO(new Date());

    fetch(`/api/steps?uid=${user.id}`)
      .then(r => r.json())
      .then(d => {
        const steps = Array.isArray(d) ? d : (d?.steps || []);
        const total = steps.filter(s => s.date >= monday && s.date <= today).reduce((a,b) => a + (b.steps||0), 0);
        setWeekSteps(total);
      }).catch(() => {});

    fetch(`/api/strava?uid=${user.id}`)
      .then(r => r.json())
      .then(d => {
        const acts = Array.isArray(d) ? d : (d?.activities || []);
        const weekActs = acts.filter(a => a.date >= monday && a.date <= today);
        const dist = weekActs.reduce((a,b) => a + (b.distance||0), 0);
        setWeekRunKm(parseFloat((dist/1000).toFixed(1)));
        setWeekRunActivities(weekActs);
      }).catch(() => {});
  }, [user?.id]);
  const weekDone = sgWeekDone(sessions, weekRunActivities);
  const weekDays = sgWeekDays(sessions, weekRunActivities);
  const firstSession = sessions.length > 0 ? sessions[sessions.length - 1] : null;
  const firstDate = firstSession ? new Date(firstSession.date + 'T00:00:00') : null;
  const weeksElapsed = firstDate ? Math.max(1, Math.round((Date.now() - firstDate.getTime()) / (7 * 24 * 3600 * 1000))) : 1;
  const avgPerWeek = firstDate ? (sessions.length / weeksElapsed) : 0;
  const monthsElapsed = firstDate ? Math.round((Date.now() - firstDate.getTime()) / (30.44 * 24 * 3600 * 1000)) : 0;
  const sinceMonth = firstDate ? firstDate.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }) : null;
  const suggestion = (() => {
    if (!templates.length) return null;
    const lastUsed = (tpl) => {
      const uses = sessions.filter(s => s.type === tpl.name);
      if (!uses.length) return new Date(0);
      return new Date(Math.max(...uses.map(s => new Date(s.date + 'T00:00:00').getTime())));
    };
    return [...templates].sort((a, b) => lastUsed(a) - lastUsed(b))[0];
  })();
  const todayFR = new Date().toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' }).toUpperCase();
  const firstName = (user?.email || 'Toi').split('@')[0];
  const firstLetter = firstName[0]?.toUpperCase() || 'M';
  const weekTonnage = sessions.filter(s => {
    const today = new Date(); const day = today.getDay();
    const monday = new Date(today); monday.setDate(today.getDate() - (day===0?6:day-1)); monday.setHours(0,0,0,0);
    return new Date(s.date+'T00:00:00') >= monday;
  }).reduce((acc, s) => acc + sgTonnage(s), 0);

  return (
    <div style={{ position: 'relative', minHeight: '100vh', paddingBottom: 100 }}>
      <div style={{ position: 'relative', padding: '54px 18px 0', maxWidth: 600, margin: '0 auto' }}>
        <div style={{ marginBottom: 18, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 11, color: SG.inkSoft, fontWeight: 700, letterSpacing: 0.5, textTransform: 'uppercase' }}>{todayFR}</div>
            <h1 style={{ fontFamily: SG.serif, fontSize: 34, fontWeight: 400, lineHeight: 1.05, margin: '4px 0 0', fontStyle: 'italic', color: SG.ink }}>
              Bonjour,<br/><span style={{ fontStyle: 'normal', fontWeight: 500 }}>{firstName}.</span>
            </h1>
          </div>
          <div style={{ width: 48, height: 48, borderRadius: 24, background: `linear-gradient(135deg, ${SG.accent} 0%, ${SG.accent2} 100%)`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontFamily: SG.serif, fontSize: 20, fontWeight: 500, boxShadow: `0 6px 16px ${SG.accent}44` }}>{firstLetter}</div>
        </div>

        <Glass radius={28} style={{ marginBottom: 12 }} tint="rgba(255,255,255,0.52)">
          <div style={{ padding: '20px 22px 22px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontSize: 11, color: SG.inkSoft, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase' }}>Moyenne</div>
              {sinceMonth && (
                <div style={{ fontSize: 11, color: SG.inkSoft, fontStyle: 'italic' }}>
                  depuis {sinceMonth}{monthsElapsed > 0 ? ` · ${monthsElapsed} mois` : ''}
                </div>
              )}
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 14, marginTop: 4 }}>
              <div style={{ fontFamily: SG.serif, fontSize: 88, lineHeight: 0.9, fontWeight: 400, letterSpacing: -2, color: SG.ink }}>
                {sessions.length === 0 ? '—' : avgPerWeek < 10 ? avgPerWeek.toFixed(1) : Math.round(avgPerWeek)}
              </div>
              <div style={{ paddingBottom: 14 }}>
                <div style={{ fontFamily: SG.serif, fontStyle: 'italic', fontSize: 18, color: SG.ink }}>séances</div>
                <div style={{ fontSize: 11, color: SG.inkSoft }}>par semaine</div>
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 14 }}>
              {weekDays.map((wd, i) => (
                <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                  <div style={{ fontSize: 10, color: SG.inkFaint, fontWeight: 700 }}>{wd.label}</div>
                  <div style={{ width: 28, height: 28, borderRadius: 14, background: wd.type === 'muscu' ? SG.accent : wd.type === 'run' ? SG.accent2 : wd.type === 'both' ? `linear-gradient(135deg, ${SG.accent} 0%, ${SG.accent2} 100%)` : 'rgba(255,255,255,0.55)', border: wd.today && !wd.done ? `1.5px solid ${SG.accent}` : 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: wd.type === 'both' ? 9 : 14, boxShadow: wd.done ? `0 3px 10px ${wd.type === 'run' ? SG.accent2 : SG.accent}55` : 'none' }}>
                    {wd.type === 'muscu' && '🏋️'}
                    {wd.type === 'run' && '👟'}
                    {wd.type === 'both' && '🏋️👟'}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Glass>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
          <Glass radius={20} tint="rgba(255,255,255,0.5)">
            <div style={{ padding: 14 }}>
              <div style={{ fontSize: 10, color: SG.inkSoft, fontWeight: 700, letterSpacing: 0.4, textTransform: 'uppercase' }}>Cette sem. · Pas</div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginTop: 6 }}>
                <div style={{ fontFamily: SG.serif, fontSize: 32, fontWeight: 500, lineHeight: 1, color: SG.ink }}>
                  {weekSteps === null ? '—' : weekSteps >= 1000 ? `${(weekSteps/1000).toFixed(1)}k` : weekSteps}
                </div>
              </div>
            </div>
          </Glass>
          <Glass radius={20} tint="rgba(255,255,255,0.5)">
            <div style={{ padding: 14 }}>
              <div style={{ fontSize: 10, color: SG.inkSoft, fontWeight: 700, letterSpacing: 0.4, textTransform: 'uppercase' }}>Total sem. · Séances</div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginTop: 6 }}>
                <div style={{ fontFamily: SG.serif, fontSize: 32, fontWeight: 500, lineHeight: 1, color: SG.ink }}>{weekDone}</div>
              </div>
            </div>
          </Glass>
          <Glass radius={20} tint="rgba(255,255,255,0.5)">
            <div style={{ padding: 14 }}>
              <div style={{ fontSize: 10, color: SG.inkSoft, fontWeight: 700, letterSpacing: 0.4, textTransform: 'uppercase' }}>Tonnage sem.</div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginTop: 6 }}>
                <div style={{ fontFamily: SG.serif, fontSize: 32, fontWeight: 500, lineHeight: 1, color: SG.ink }}>{(weekTonnage/1000).toFixed(1)}</div>
                <div style={{ fontSize: 11, color: SG.inkSoft }}>t</div>
              </div>
            </div>
          </Glass>
          <Glass radius={20} tint="rgba(255,255,255,0.5)">
            <div style={{ padding: 14 }}>
              <div style={{ fontSize: 10, color: SG.inkSoft, fontWeight: 700, letterSpacing: 0.4, textTransform: 'uppercase' }}>Distance sem. · Run</div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginTop: 6 }}>
                <div style={{ fontFamily: SG.serif, fontSize: 32, fontWeight: 500, lineHeight: 1, color: SG.ink }}>
                  {weekRunKm === null ? '—' : weekRunKm}
                </div>
                {weekRunKm !== null && <div style={{ fontSize: 11, color: SG.inkSoft }}>km</div>}
              </div>
            </div>
          </Glass>
        </div>

        {suggestion && (
          <>
            <div style={{ fontSize: 11, color: SG.inkSoft, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', margin: '20px 4px 8px' }}>Suggéré aujourd'hui</div>
            <Glass radius={24} tint="rgba(255,255,255,0.55)" style={{ marginBottom: 12 }}>
              <div style={{ padding: 18, display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={{ width: 52, height: 52, borderRadius: 16, background: `linear-gradient(135deg, ${SG.accent} 0%, ${SG.accent2} 100%)`, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `0 8px 18px ${SG.accent}44`, fontSize: 24 }}>🏋️</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontFamily: SG.serif, fontSize: 19, fontWeight: 500, fontStyle: 'italic', color: SG.ink }}>{suggestion.name}</div>
                  <div style={{ fontSize: 12, color: SG.inkSoft, marginTop: 2 }}>{(suggestion.exercises||[]).length} exercices</div>
                </div>
                <button onClick={() => onLaunchTpl ? onLaunchTpl(suggestion) : onOpenForm()} style={{ padding: '10px 16px', borderRadius: 18, border: 'none', background: SG.ink, color: '#fff', fontWeight: 700, fontSize: 13, display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer', boxShadow: '0 4px 12px rgba(0,0,0,0.18)' }}>
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="#fff"><path d="M6 4l14 8-14 8V4z"/></svg> Go
                </button>
              </div>
            </Glass>
          </>
        )}

        {lastSession && (
          <>
            <div style={{ fontSize: 11, color: SG.inkSoft, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', margin: '20px 4px 8px' }}>Dernière séance</div>
            <Glass radius={22} tint="rgba(255,255,255,0.5)" style={{ marginBottom: 12 }} onClick={() => onViewSession?.(lastSession)}>
              <div style={{ padding: 18 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontFamily: SG.serif, fontSize: 20, fontWeight: 500, color: SG.ink }}>{lastSession.type || 'Séance'}</div>
                    <div style={{ fontSize: 12, color: SG.inkSoft, marginTop: 2 }}>{sgFmt(lastSession.date)} · {(lastSession.exercises||[]).length} exercices{lastSession.dur ? ` · ${lastSession.dur} min` : ''} · {sgTonnage(lastSession).toLocaleString('fr-FR')} kg</div>
                  </div>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={SG.inkFaint} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6"/></svg>
                </div>
              </div>
            </Glass>
          </>
        )}
      </div>
    </div>
  );
}

// ─── SGMobileSessionEdit ──────────────────────────────────────────────────────
function SGMobileSessionEdit({ session, onSave, onCancel, upsertFn }) {
  const [exercises, setExercises] = useState(
    (session.exercises || []).map(ex => ({
      name: ex.name,
      sets: (ex.sets || []).map(s => ({ reps: String(s.reps ?? ''), weight: String(s.weight ?? '') }))
    }))
  );
  const [date, setDate] = useState(session.date || toLocalISO(new Date()));
  const [saving, setSaving] = useState(false);

  const updEx = (i, fn) => setExercises(exs => exs.map((e, idx) => idx === i ? fn(e) : e));
  const updSet = (ei, si, field, val) => updEx(ei, ex => ({ ...ex, sets: ex.sets.map((s, idx) => idx === si ? { ...s, [field]: val } : s) }));
  const addSet = (ei) => updEx(ei, ex => ({ ...ex, sets: [...ex.sets, { reps: '10', weight: '0' }] }));
  const delSet = (ei, si) => updEx(ei, ex => ({ ...ex, sets: ex.sets.filter((_, idx) => idx !== si) }));
  const delEx = (i) => setExercises(exs => exs.filter((_, idx) => idx !== i));
  const addEx = () => setExercises(exs => [...exs, { name: 'Nouvel exercice', sets: [{ reps: '10', weight: '0' }] }]);

  const handleSave = async () => {
    setSaving(true);
    const updated = { ...session, date, exercises: exercises.map(ex => ({ name: ex.name, sets: ex.sets.map(s => ({ reps: Number(s.reps) || 0, weight: Number(s.weight) || 0 })) })) };
    await upsertFn(updated);
    onSave(updated);
    setSaving(false);
  };

  return (
    <div style={{ position: 'relative', minHeight: '100vh', paddingBottom: 120 }}>
      <div style={{ position: 'relative', padding: '54px 18px 0', maxWidth: 600, margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h1 style={{ fontFamily: SG.serif, fontSize: 28, fontWeight: 500, color: SG.ink, margin: 0 }}>Modifier</h1>
          <button onClick={onCancel} style={{ background: 'rgba(31,26,20,0.07)', border: 'none', borderRadius: 14, padding: '8px 14px', fontSize: 13, fontWeight: 600, color: SG.ink, cursor: 'pointer' }}>Annuler</button>
        </div>
        <Glass radius={16} tint="rgba(255,255,255,0.55)" style={{ marginBottom: 14 }}>
          <div style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ fontSize: 11, color: SG.inkFaint, fontWeight: 700, letterSpacing: 0.5, textTransform: 'uppercase', flexShrink: 0 }}>Date</div>
            <input type="date" value={date} max={toLocalISO(new Date())} onChange={e => setDate(e.target.value)}
              style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', fontSize: 15, fontFamily: SG.serif, color: SG.ink, cursor: 'pointer' }} />
          </div>
        </Glass>

        {exercises.map((ex, ei) => (
          <Glass key={ei} radius={26} tint="rgba(255,255,255,0.50)" style={{ marginBottom: 12, border: '1px solid rgba(255,255,255,0.4)' }}>
            <div style={{ padding: 20 }}>
              <div style={{ fontSize: 11, color: SG.inkSoft, fontWeight: 800, letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 4 }}>EXERCICE {ei+1} / {exercises.length}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                <input value={ex.name} onChange={e => updEx(ei, ex => ({ ...ex, name: e.target.value }))}
                  style={{ fontFamily: SG.serif, fontSize: 24, fontWeight: 500, color: SG.ink, background: 'transparent', border: 'none', borderBottom: `1.5px solid rgba(31,26,20,0.15)`, outline: 'none', flex: 1, letterSpacing: -0.4 }} />
                <button onClick={() => delEx(ei)} style={{ background: 'rgba(178,58,58,0.1)', border: 'none', borderRadius: 10, padding: '6px 10px', cursor: 'pointer', color: '#B23A3A', fontSize: 12, fontWeight: 700, flexShrink: 0 }}>Suppr.</button>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {ex.sets.map((s, si) => (
                  <div key={si} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: 14, background: 'rgba(255,255,255,0.5)' }}>
                    <div style={{ width: 26, height: 26, borderRadius: 13, background: SG.ink, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800, color: '#fff', flexShrink: 0 }}>{si+1}</div>
                    <input type="number" value={s.reps} onChange={e => updSet(ei, si, 'reps', e.target.value)}
                      style={{ width: 52, padding: '8px 0', borderRadius: 0, border: 'none', borderBottom: `1.5px solid rgba(31,26,20,0.15)`, background: 'transparent', fontSize: 20, fontFamily: SG.serif, textAlign: 'center', color: SG.ink, outline: 'none' }} />
                    <span style={{ fontSize: 12, color: SG.inkSoft }}>reps ×</span>
                    <input type="number" value={s.weight} onChange={e => updSet(ei, si, 'weight', e.target.value)}
                      style={{ width: 60, padding: '8px 0', borderRadius: 0, border: 'none', borderBottom: `1.5px solid rgba(31,26,20,0.15)`, background: 'transparent', fontSize: 20, fontFamily: SG.serif, textAlign: 'center', color: SG.ink, outline: 'none' }} />
                    <span style={{ fontSize: 12, color: SG.inkSoft }}>kg</span>
                    <button onClick={() => delSet(ei, si)} style={{ marginLeft: 'auto', background: 'none', border: 'none', padding: '4px 6px', cursor: 'pointer', color: SG.inkFaint, fontSize: 20, lineHeight: 1 }}>×</button>
                  </div>
                ))}
              </div>
              <button onClick={() => addSet(ei)} style={{ marginTop: 10, width: '100%', padding: '10px 0', borderRadius: 14, border: `1.5px dashed rgba(31,26,20,0.15)`, background: 'transparent', cursor: 'pointer', fontSize: 13, color: SG.inkSoft, fontWeight: 600 }}>+ Série</button>
            </div>
          </Glass>
        ))}

        <button onClick={addEx} style={{ width: '100%', padding: 14, borderRadius: 20, border: `1.5px dashed rgba(31,26,20,0.18)`, background: 'transparent', cursor: 'pointer', fontSize: 13, color: SG.inkSoft, fontWeight: 600, marginBottom: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={SG.inkSoft} strokeWidth="2.2" strokeLinecap="round"><path d="M12 5v14"/><path d="M5 12h14"/></svg>
          Ajouter un exercice
        </button>

        <button onClick={handleSave} disabled={saving} style={{ width: '100%', padding: 18, borderRadius: 22, border: 'none', background: SG.ink, color: '#fff', fontWeight: 700, fontSize: 16, cursor: 'pointer', boxShadow: '0 8px 20px rgba(0,0,0,0.15)' }}>
          {saving ? 'Enregistrement…' : 'Enregistrer'}
        </button>
      </div>
    </div>
  );
}

// ─── SGMobileHistory ──────────────────────────────────────────────────────────
function SGMobileHistory({ data, user, onDeleteSession, upsertFn, initialDetail, onClearInitialDetail }) {
  const sessions = data.sessions || [];
  const [filter, setFilter] = useState('Tout');
  const [detail, setDetail] = useState(null);
  const [editing, setEditing] = useState(false);
  const detailRef = useRef(null);

  useEffect(() => {
    if (initialDetail) { setDetail(initialDetail); onClearInitialDetail?.(); }
  }, [initialDetail]);

  const exportDetail = async () => {
    if (!detailRef.current) return;
    try {
      const canvas = await html2canvas(detailRef.current, { scale: 3, useCORS: true, backgroundColor: SG.bg1 });
      const blob = await new Promise(res => canvas.toBlob(res, 'image/png'));
      const fileName = `seance-${detail.type || 'Libre'}-${detail.date || 'date'}.png`;
      const isAndroid = /Android/.test(navigator.userAgent);
      if (isAndroid && navigator.canShare && navigator.canShare({ files: [new File([blob], fileName)] })) {
        await navigator.share({ title: '🏋️ Ma séance', text: 'Voici ma séance sur Workout Tracker 💪', files: [new File([blob], fileName, { type: 'image/png' })] });
        return;
      }
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url; link.download = fileName;
      document.body.appendChild(link); link.click(); link.remove();
      URL.revokeObjectURL(url);
      if (/iPad|iPhone|iPod/.test(navigator.userAgent)) alert('📲 Image enregistrée. Tu peux maintenant la partager depuis Photos.');
    } catch (e) { console.error('Export error:', e); alert("Impossible d'exporter la séance."); }
  };
  const types = ['Tout', ...Array.from(new Set(sessions.map(s => s.type).filter(Boolean)))];
  const filtered = filter === 'Tout' ? sessions : sessions.filter(s => s.type === filter);
  const today = new Date();
  const [calMonth, setCalMonth] = useState(today.getMonth());
  const [calYear, setCalYear] = useState(today.getFullYear());
  const daysInMonth = new Date(calYear, calMonth+1, 0).getDate();
  const firstDay = (new Date(calYear, calMonth, 1).getDay() + 6) % 7;
  const sessionDates = new Set(sessions.map(s => s.date));
  const monthNames = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'];
  const prevMonth = () => { if (calMonth === 0) { setCalMonth(11); setCalYear(y => y-1); } else setCalMonth(m => m-1); };
  const nextMonth = () => {
    const isCurrentMonth = calMonth === today.getMonth() && calYear === today.getFullYear();
    if (isCurrentMonth) return;
    if (calMonth === 11) { setCalMonth(0); setCalYear(y => y+1); } else setCalMonth(m => m+1);
  };
  const isCurrentMonth = calMonth === today.getMonth() && calYear === today.getFullYear();

  if (detail && editing) {
    return <SGMobileSessionEdit
      session={detail}
      onSave={(updated) => { setDetail(updated); setEditing(false); }}
      onCancel={() => setEditing(false)}
      upsertFn={upsertFn}
    />;
  }

  if (detail) {
    const tonnage = sgTonnage(detail);
    return (
      <div style={{ position: 'relative', minHeight: '100vh', paddingBottom: 100 }}>
        <div ref={detailRef} style={{ position: 'relative', padding: '54px 18px 0', maxWidth: 600, margin: '0 auto' }}>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 18 }}>
            <Glass radius={22} tint="rgba(255,255,255,0.7)" style={{ width: 44, height: 44 }} onClick={() => setDetail(null)}>
              <div style={{ width: 44, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={SG.ink} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
              </div>
            </Glass>
            <div>
              <div style={{ fontSize: 11, color: SG.inkSoft, fontWeight: 700, letterSpacing: 0.5, textTransform: 'uppercase' }}>{sgFmt(detail.date).toUpperCase()}</div>
              <h1 style={{ fontFamily: SG.serif, fontSize: 28, fontWeight: 500, lineHeight: 1, margin: '4px 0 0', color: SG.ink }}>{detail.type || 'Séance'}</h1>
            </div>
          </div>
          <Glass radius={24} tint="rgba(255,255,255,0.55)" style={{ marginBottom: 14 }}>
            <div style={{ padding: 18, display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
              <div>
                <div style={{ fontSize: 10, color: SG.inkFaint, fontWeight: 700, letterSpacing: 0.5, textTransform: 'uppercase' }}>Tonnage</div>
                <div style={{ fontFamily: SG.serif, fontSize: 24, fontWeight: 500, lineHeight: 1, marginTop: 2, color: SG.ink }}>{tonnage.toLocaleString('fr-FR')}<span style={{ fontSize: 11, color: SG.inkSoft }}>kg</span></div>
              </div>
              <div>
                <div style={{ fontSize: 10, color: SG.inkFaint, fontWeight: 700, letterSpacing: 0.5, textTransform: 'uppercase' }}>Durée</div>
                <div style={{ fontFamily: SG.serif, fontSize: 24, fontWeight: 500, lineHeight: 1, marginTop: 2, color: SG.ink }}>{detail.dur ? <>{detail.dur}<span style={{ fontSize: 11, color: SG.inkSoft }}>min</span></> : '—'}</div>
              </div>
              <div>
                <div style={{ fontSize: 10, color: SG.inkFaint, fontWeight: 700, letterSpacing: 0.5, textTransform: 'uppercase' }}>Exercices</div>
                <div style={{ fontFamily: SG.serif, fontSize: 24, fontWeight: 500, lineHeight: 1, marginTop: 2, color: SG.ink }}>{(detail.exercises||[]).length}</div>
              </div>
            </div>
          </Glass>
          {(detail.exercises||[]).map((ex, i) => (
            <Glass key={i} radius={26} tint="rgba(255,255,255,0.50)" style={{ marginBottom: 12, border: '1px solid rgba(255,255,255,0.4)' }}>
              <div style={{ padding: 20 }}>
                <div style={{ fontSize: 11, color: SG.inkSoft, fontWeight: 800, letterSpacing: 0.8, textTransform: 'uppercase' }}>EXERCICE {i+1} / {(detail.exercises||[]).length}</div>
                <div style={{ fontFamily: SG.serif, fontSize: 24, fontWeight: 500, marginTop: 3, letterSpacing: -0.4, color: SG.ink }}>{ex.name}</div>
                <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {(ex.sets||[]).map((s, j) => (
                    <div key={j} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', borderRadius: 14, background: 'rgba(255,255,255,0.5)' }}>
                      <div style={{ width: 26, height: 26, borderRadius: 13, background: SG.ink, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800, color: '#fff', flexShrink: 0 }}>{j+1}</div>
                      <div style={{ fontFamily: SG.serif, fontSize: 22, fontWeight: 500, color: SG.ink }}>{s.reps}</div>
                      <div style={{ fontSize: 12, color: SG.inkSoft }}>reps ×</div>
                      <div style={{ fontFamily: SG.serif, fontSize: 22, fontWeight: 500, color: SG.ink }}>{s.weight}</div>
                      <div style={{ fontSize: 12, color: SG.inkSoft }}>kg</div>
                      <div style={{ flex: 1, textAlign: 'right', fontSize: 11, color: SG.inkFaint }}>{(((Number(s.reps)||0)*(Number(s.weight)||0))/1000).toFixed(2)} t</div>
                    </div>
                  ))}
                </div>
              </div>
            </Glass>
          ))}
          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            <button onClick={() => setEditing(true)} style={{ flex: 1, padding: 14, borderRadius: 18, border: 'none', background: 'rgba(255,255,255,0.6)', color: SG.ink, cursor: 'pointer', fontWeight: 600, fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={SG.ink} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M4 20h4l11-11-4-4L4 16v4z"/></svg>
              Éditer
            </button>
            <button onClick={exportDetail} style={{ width: 48, padding: 14, borderRadius: 18, border: 'none', background: 'rgba(255,255,255,0.6)', color: SG.ink, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={SG.ink} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/></svg>
            </button>
            <button onClick={async () => { if (window.confirm('Supprimer cette séance ?')) { await onDeleteSession(detail.id); setDetail(null); } }} style={{ flex: 1, padding: 14, borderRadius: 18, border: 'none', background: 'rgba(178,58,58,0.1)', color: '#B23A3A', cursor: 'pointer', fontWeight: 600, fontSize: 14 }}>Supprimer</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ position: 'relative', minHeight: '100vh', paddingBottom: 100 }}>
      <div style={{ position: 'relative', padding: '54px 18px 0', maxWidth: 600, margin: '0 auto' }}>
        <div style={{ marginBottom: 18 }}>
          <div style={{ fontSize: 11, color: SG.inkSoft, fontWeight: 700, letterSpacing: 0.5, textTransform: 'uppercase' }}>{sessions.length} SÉANCES</div>
          <h1 style={{ fontFamily: SG.serif, fontSize: 34, fontWeight: 500, lineHeight: 1, margin: '4px 0 0', color: SG.ink }}>Historique</h1>
        </div>
        <Glass radius={24} tint="rgba(255,255,255,0.5)" style={{ marginBottom: 14 }}>
          <div style={{ padding: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <button onClick={prevMonth} style={{ width: 32, height: 32, borderRadius: 10, border: 'none', background: 'rgba(31,26,20,0.06)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={SG.ink} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
              </button>
              <div style={{ fontFamily: SG.serif, fontSize: 17, fontWeight: 500, color: SG.ink }}>{monthNames[calMonth]} {calYear}</div>
              <button onClick={nextMonth} style={{ width: 32, height: 32, borderRadius: 10, border: 'none', background: isCurrentMonth ? 'rgba(31,26,20,0.03)' : 'rgba(31,26,20,0.06)', cursor: isCurrentMonth ? 'default' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: isCurrentMonth ? 0.3 : 1 }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={SG.ink} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6"/></svg>
              </button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4, marginBottom: 4 }}>
              {['L','M','M','J','V','S','D'].map((d,i) => <div key={i} style={{ textAlign: 'center', fontSize: 10, color: SG.inkFaint, fontWeight: 700 }}>{d}</div>)}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4 }}>
              {Array(firstDay).fill(null).map((_,i) => <div key={'e'+i}/>)}
              {Array.from({ length: daysInMonth }, (_,i) => {
                const day = i+1;
                const iso = `${calYear}-${String(calMonth+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
                const hasSess = sessionDates.has(iso);
                const isToday = isCurrentMonth && day === today.getDate();
                return <div key={day} onClick={() => { const s = sessions.find(x => x.date === iso); if (s) setDetail(s); }} style={{ aspectRatio:'1', borderRadius:10, display:'flex', alignItems:'center', justifyContent:'center', fontSize:12, fontWeight:600, background: hasSess ? SG.accent : (isToday ? 'rgba(31,26,20,0.08)' : 'transparent'), color: hasSess ? '#fff' : SG.ink, border: isToday && !hasSess ? `1.5px solid ${SG.ink}` : 'none', cursor: hasSess ? 'pointer' : 'default' }}>{day}</div>;
              })}
            </div>
          </div>
        </Glass>
        <div style={{ display: 'flex', gap: 6, marginBottom: 12, overflowX: 'auto', paddingBottom: 4 }}>
          {types.map(t => <button key={t} onClick={() => setFilter(t)} style={{ padding: '8px 16px', borderRadius: 16, border: 'none', cursor: 'pointer', background: filter === t ? SG.ink : 'rgba(255,255,255,0.55)', color: filter === t ? '#fff' : SG.ink, fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap', flexShrink: 0 }}>{t}</button>)}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {filtered.map(s => (
            <Glass key={s.id} radius={20} tint="rgba(255,255,255,0.5)" onClick={() => setDetail(s)}>
              <div style={{ padding: '16px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontFamily: SG.serif, fontSize: 19, fontWeight: 500, color: SG.ink }}>
                    {s.type || 'Séance'} <span style={{ fontFamily: SG.sans, fontSize: 13, fontWeight: 500, color: SG.inkSoft }}>· {(s.exercises||[]).length} exercices</span>
                  </div>
                  <div style={{ fontSize: 12, color: SG.inkSoft, marginTop: 3 }}>
                    {sgFmt(s.date)} · {sgTonnage(s).toLocaleString('fr-FR')} kg{s.dur ? ` · ${s.dur} min` : ''}
                  </div>
                </div>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={SG.inkFaint} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 6l6 6-6 6"/></svg>
              </div>
            </Glass>
          ))}
          {filtered.length === 0 && <div style={{ textAlign: 'center', padding: 40, color: SG.inkSoft }}>Aucune séance pour ce filtre.</div>}
        </div>
      </div>
    </div>
  );
}

// ─── SGMobileStats ────────────────────────────────────────────────────────────
function SGMobileStats({ data, user }) {
  const [subTab, setSubTab] = useState('stats');
  const sessions = data.sessions || [];
  const todayISO = new Date().toISOString().slice(0, 10);
  const firstSessionDate = sessions.length > 0 ? sessions[sessions.length - 1].date : todayISO;
  const [startDate, setStartDate] = useState(firstSessionDate);
  const [endDate, setEndDate] = useState(todayISO);
  const filteredSessions = sessions.filter(s => s.date >= startDate && s.date <= endDate);

  const totalTonnage = filteredSessions.reduce((acc, s) => acc + sgTonnage(s), 0);
  const byType = {};
  filteredSessions.forEach(s => { if (s.type) byType[s.type] = (byType[s.type]||0) + sgTonnage(s); });
  const types = Object.entries(byType).sort((a,b) => b[1]-a[1]);
  const typeColors = [SG.accent, SG.accent2, '#D9A441', '#7C3AED'];
  const weeks = Math.max(1, Math.ceil((new Date(endDate) - new Date(startDate+'T00:00:00'))/(7*24*3600*1000)));
  const avgPerWeek = filteredSessions.length > 0 ? (filteredSessions.length / weeks).toFixed(1) : '0';

  const subTabs = [
    { k: 'stats', label: 'Muscu' },
    { k: 'evolution', label: 'Évolution' },
    { k: 'poids', label: 'Poids' },
    { k: 'pas', label: 'Pas' },
    { k: 'run', label: 'Run' },
  ];

  return (
    <div style={{ position: 'relative', minHeight: '100vh', paddingBottom: 100 }}>
      <div style={{ position: 'relative', padding: '54px 18px 0', maxWidth: 600, margin: '0 auto' }}>
        <div style={{ marginBottom: 18 }}>
          <div style={{ fontSize: 11, color: SG.inkSoft, fontWeight: 700, letterSpacing: 0.5, textTransform: 'uppercase' }}>STATISTIQUES</div>
          <h1 style={{ fontFamily: SG.serif, fontSize: 34, fontWeight: 500, lineHeight: 1, margin: '4px 0 0', color: SG.ink }}>Progrès</h1>
        </div>

        {/* Sub-tab pills */}
        <div className="no-scrollbar" style={{ display: 'flex', gap: 6, marginBottom: 14, overflowX: 'auto', paddingBottom: 2 }}>
          {subTabs.map(t => (
            <button key={t.k} onClick={() => setSubTab(t.k)} style={{ padding: '9px 16px', borderRadius: 20, border: 'none', cursor: 'pointer', background: subTab === t.k ? SG.ink : 'rgba(255,255,255,0.55)', color: subTab === t.k ? '#fff' : SG.ink, fontSize: 13, fontWeight: 700, flexShrink: 0, transition: 'all 200ms', boxShadow: subTab === t.k ? '0 4px 12px rgba(0,0,0,0.15)' : 'none', whiteSpace: 'nowrap' }}>{t.label}</button>
          ))}
        </div>

        {/* Date filter — hidden on Poids / Pas tabs */}
        {subTab !== 'poids' && subTab !== 'pas' && subTab !== 'run' && (
          <Glass radius={20} tint="rgba(255,255,255,0.55)" style={{ marginBottom: 14 }}>
            <div style={{ padding: '14px 16px' }}>
              <div style={{ fontSize: 10, color: SG.inkSoft, fontWeight: 700, letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 10 }}>Période</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <div style={{ fontSize: 10, color: SG.inkFaint, marginBottom: 4 }}>Début</div>
                  <FrDateInput value={startDate} max={endDate} onChange={setStartDate} />
                </div>
                <div>
                  <div style={{ fontSize: 10, color: SG.inkFaint, marginBottom: 4 }}>Fin</div>
                  <FrDateInput value={endDate} min={startDate} max={todayISO} onChange={setEndDate} />
                </div>
              </div>
            </div>
          </Glass>
        )}

        {subTab === 'stats' && (
          <>
            <Glass radius={26} tint="rgba(255,255,255,0.5)" style={{ marginBottom: 12 }}>
              <div style={{ padding: 22 }}>
                <div style={{ fontSize: 11, color: SG.inkSoft, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase' }}>Tonnage cumulé</div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginTop: 6 }}>
                  <div style={{ fontFamily: SG.serif, fontSize: 56, fontWeight: 500, letterSpacing: -1.5, lineHeight: 1, color: SG.ink }}>{(totalTonnage/1000).toFixed(1)}</div>
                  <div style={{ fontFamily: SG.serif, fontSize: 22, color: SG.inkSoft, fontStyle: 'italic' }}>tonnes</div>
                </div>
              </div>
            </Glass>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
              <Glass radius={20} tint="rgba(255,255,255,0.5)">
                <div style={{ padding: 14 }}>
                  <div style={{ fontSize: 10, color: SG.inkSoft, fontWeight: 700, letterSpacing: 0.6, textTransform: 'uppercase' }}>Fréquence</div>
                  <div style={{ fontFamily: SG.serif, fontSize: 28, fontWeight: 500, marginTop: 4, color: SG.ink }}>{avgPerWeek}<span style={{ fontSize: 12, color: SG.inkSoft }}>/sem</span></div>
                </div>
              </Glass>
              <Glass radius={20} tint="rgba(255,255,255,0.5)">
                <div style={{ padding: 14 }}>
                  <div style={{ fontSize: 10, color: SG.inkSoft, fontWeight: 700, letterSpacing: 0.6, textTransform: 'uppercase' }}>Total</div>
                  <div style={{ fontFamily: SG.serif, fontSize: 28, fontWeight: 500, marginTop: 4, color: SG.ink }}>{filteredSessions.length}<span style={{ fontSize: 12, color: SG.inkSoft }}> séances</span></div>
                </div>
              </Glass>
            </div>

            {types.length > 0 && (
              <Glass radius={24} tint="rgba(255,255,255,0.5)" style={{ marginBottom: 12 }}>
                <div style={{ padding: 18 }}>
                  <div style={{ fontSize: 11, color: SG.inkSoft, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 14 }}>Répartition par type</div>
                  {types.map(([t, v], i) => {
                    const pct = totalTonnage > 0 ? v/totalTonnage : 0;
                    return (
                      <div key={t} style={{ marginBottom: 12 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5, fontSize: 13, color: SG.ink }}>
                          <span style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                            <span style={{ width: 9, height: 9, borderRadius: 3, background: typeColors[i%typeColors.length], display: 'inline-block' }}/>
                            {t}
                          </span>
                          <span style={{ fontFamily: SG.serif, color: SG.inkSoft }}>{Math.round(pct*100)}%</span>
                        </div>
                        <div style={{ height: 7, borderRadius: 4, background: 'rgba(31,26,20,0.08)', overflow: 'hidden' }}>
                          <div style={{ width: `${pct*100}%`, height: '100%', background: typeColors[i%typeColors.length], borderRadius: 4 }}/>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </Glass>
            )}
          </>
        )}

        {subTab === 'evolution' && (
          <div style={{ marginTop: 4 }}>
            <Analytics sessions={filteredSessions} sessionTemplates={data.sessionTemplates} hideCalendar={true} hideFrequency={true} hideRecentSplit={true} onlyCurves={true} />
          </div>
        )}

        {subTab === 'poids' && (
          <WeightTracker user={user} />
        )}

        {subTab === 'pas' && (
          <StepsTracker user={user} />
        )}

        {subTab === 'run' && (
          <StravaTracker user={user} />
        )}
      </div>
    </div>
  );
}

// ─── SGMobileTemplateEdit ─────────────────────────────────────────────────────
function SGMobileTemplateEdit({ tpl, onSave, onCancel, knownExercises = [] }) {
  const isNew = !tpl?.id;
  const [name, setName] = useState(tpl?.name || '');
  const [exercises, setExercises] = useState([...(tpl?.exercises || [])]);
  const [saving, setSaving] = useState(false);
  const [showExPicker, setShowExPicker] = useState(false);

  const addEx = () => setShowExPicker(true);
  const updEx = (i, v) => setExercises(e => e.map((x, idx) => idx === i ? v : x));
  const delEx = (i) => setExercises(e => e.filter((_, idx) => idx !== i));
  const moveEx = (i, dir) => setExercises(e => {
    const arr = [...e];
    const j = i + dir;
    if (j < 0 || j >= arr.length) return arr;
    [arr[i], arr[j]] = [arr[j], arr[i]];
    return arr;
  });

  const handleSave = async () => {
    setSaving(true);
    const id = tpl?.id || (crypto.randomUUID ? crypto.randomUUID() : `tpl-${Date.now()}`);
    await onSave({ ...(tpl || {}), id, name, exercises: exercises.filter(e => typeof e === 'string' ? e.trim() : e?.name?.trim()) });
    setSaving(false);
  };

  return (
    <div style={{ position: 'relative', minHeight: '100vh', paddingBottom: 120 }}>
      <div style={{ position: 'relative', padding: '54px 18px 0', maxWidth: 600, margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 22 }}>
          <h1 style={{ fontFamily: SG.serif, fontSize: 28, fontWeight: 500, color: SG.ink, margin: 0 }}>{isNew ? 'Nouveau modèle' : 'Modifier le modèle'}</h1>
          <button onClick={onCancel} style={{ background: 'rgba(31,26,20,0.07)', border: 'none', borderRadius: 14, padding: '8px 14px', fontSize: 13, fontWeight: 600, color: SG.ink, cursor: 'pointer' }}>Annuler</button>
        </div>

        <Glass radius={20} tint="rgba(255,255,255,0.6)" style={{ marginBottom: 16 }}>
          <div style={{ padding: 16 }}>
            <div style={{ fontSize: 10, color: SG.inkSoft, fontWeight: 700, letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 8 }}>Nom du modèle</div>
            <input value={name} onChange={e => setName(e.target.value)}
              style={{ width: '100%', fontFamily: SG.serif, fontSize: 20, fontWeight: 500, color: SG.ink, background: 'transparent', border: 'none', outline: 'none' }}
              placeholder="Ex: Pec & Épaules" />
          </div>
        </Glass>

        <div style={{ fontSize: 11, color: SG.inkSoft, fontWeight: 700, letterSpacing: 0.8, textTransform: 'uppercase', margin: '0 4px 10px' }}>Exercices</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 10 }}>
          {exercises.map((ex, i) => (
            <Glass key={i} radius={16} tint="rgba(255,255,255,0.55)">
              <div style={{ padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 2, flexShrink: 0 }}>
                  <button onClick={() => moveEx(i, -1)} disabled={i === 0} style={{ background: 'none', border: 'none', padding: '2px 4px', cursor: i === 0 ? 'default' : 'pointer', opacity: i === 0 ? 0.2 : 0.55, lineHeight: 1 }}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={SG.ink} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 15l-6-6-6 6"/></svg>
                  </button>
                  <button onClick={() => moveEx(i, 1)} disabled={i === exercises.length - 1} style={{ background: 'none', border: 'none', padding: '2px 4px', cursor: i === exercises.length - 1 ? 'default' : 'pointer', opacity: i === exercises.length - 1 ? 0.2 : 0.55, lineHeight: 1 }}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={SG.ink} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9l6 6 6-6"/></svg>
                  </button>
                </div>
                <div style={{ width: 22, height: 22, borderRadius: 11, background: SG.accent, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 10, fontWeight: 800, flexShrink: 0 }}>{i + 1}</div>
                <input value={ex} onChange={e => updEx(i, e.target.value)} placeholder="Nom de l'exercice"
                  style={{ flex: 1, fontFamily: SG.serif, fontSize: 16, fontWeight: 500, color: SG.ink, background: 'transparent', border: 'none', outline: 'none' }} />
                <button onClick={() => delEx(i)} style={{ background: 'none', border: 'none', padding: '4px 8px', cursor: 'pointer', color: SG.inkFaint, fontSize: 20, lineHeight: 1 }}>×</button>
              </div>
            </Glass>
          ))}
        </div>

        <button onClick={addEx} style={{ width: '100%', padding: 14, borderRadius: 18, border: `1.5px dashed rgba(31,26,20,0.15)`, background: 'transparent', cursor: 'pointer', fontSize: 13, color: SG.inkSoft, fontWeight: 600, marginBottom: 20 }}>+ Ajouter un exercice</button>

        <button onClick={handleSave} disabled={saving || !name.trim()} style={{ width: '100%', padding: 16, borderRadius: 22, border: 'none', background: SG.ink, color: '#fff', fontWeight: 700, fontSize: 16, cursor: 'pointer', opacity: !name.trim() ? 0.5 : 1 }}>
          {saving ? 'Enregistrement…' : (isNew ? 'Créer le modèle' : 'Enregistrer le modèle')}
        </button>
      </div>
      {showExPicker && (
        <ExercisePicker
          knownExercises={knownExercises}
          onSelect={(name) => { setExercises(e => [...e, name]); setShowExPicker(false); }}
          onClose={() => setShowExPicker(false)}
        />
      )}
    </div>
  );
}

// ─── SGMobileTpl ──────────────────────────────────────────────────────────────
function SGMobileTpl({ data, user, onTab, onOpenForm, onSaveTpl, knownExercises = [] }) {
  const templates = data.sessionTemplates || [];
  const [editingTpl, setEditingTpl] = useState(null);

  if (editingTpl !== null) {
    return <SGMobileTemplateEdit
      tpl={editingTpl || undefined}
      knownExercises={knownExercises}
      onSave={async (updated) => { await (onSaveTpl ? onSaveTpl(updated) : upsertSessionTemplate(user.id, updated)); setEditingTpl(null); }}
      onCancel={() => setEditingTpl(null)}
    />;
  }

  return (
    <div style={{ position: 'relative', minHeight: '100vh', paddingBottom: 40 }}>
      <div style={{ position: 'relative', padding: '54px 18px 0', maxWidth: 600, margin: '0 auto' }}>
        <div style={{ marginBottom: 18, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
          <div>
            <div style={{ fontSize: 11, color: SG.inkSoft, fontWeight: 700, letterSpacing: 0.5, textTransform: 'uppercase' }}>MODÈLES</div>
            <h1 style={{ fontFamily: SG.serif, fontSize: 34, fontWeight: 500, lineHeight: 1, margin: '4px 0 0', color: SG.ink }}>Séances</h1>
          </div>
          <button onClick={() => setEditingTpl({})} style={{ padding: '10px 16px', borderRadius: 18, border: 'none', background: SG.ink, color: '#fff', fontWeight: 700, fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round"><path d="M12 5v14"/><path d="M5 12h14"/></svg>
            Nouveau
          </button>
        </div>

        {templates.length === 0 ? (
          <Glass radius={22} tint="rgba(255,255,255,0.5)" style={{ marginBottom: 12 }}>
            <div style={{ padding: 28, textAlign: 'center' }}>
              <div style={{ fontFamily: SG.serif, fontSize: 18, fontWeight: 500, color: SG.ink, marginBottom: 8 }}>Aucun modèle</div>
              <div style={{ fontSize: 13, color: SG.inkSoft, marginBottom: 18 }}>Crée ton premier modèle de séance.</div>
              <button onClick={() => setEditingTpl({})} style={{ padding: '12px 22px', borderRadius: 18, border: 'none', background: SG.accent, color: '#fff', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>Créer un modèle</button>
            </div>
          </Glass>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 24 }}>
            {templates.map(tpl => (
              <Glass key={tpl.id} radius={20} tint="rgba(255,255,255,0.5)">
                <div style={{ padding: '16px 18px', display: 'flex', alignItems: 'center', gap: 14 }}>
                  <div style={{ width: 48, height: 48, borderRadius: 14, background: `linear-gradient(135deg, ${SG.accent} 0%, ${SG.accent2} 100%)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0 }}>🏋️</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontFamily: SG.serif, fontSize: 18, fontWeight: 500, color: SG.ink }}>{tpl.name}</div>
                    <div style={{ fontSize: 12, color: SG.inkSoft, marginTop: 2 }}>{(tpl.exercises||[]).length} exercices</div>
                  </div>
                  <button onClick={() => setEditingTpl(tpl)} style={{ padding: '10px 14px', borderRadius: 16, border: 'none', background: 'rgba(31,26,20,0.07)', color: SG.ink, fontWeight: 600, fontSize: 13, cursor: 'pointer', marginRight: 6 }}>Éditer</button>
                  <button onClick={() => onOpenForm(tpl)} style={{ padding: '10px 16px', borderRadius: 16, border: 'none', background: SG.ink, color: '#fff', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>Démarrer</button>
                </div>
              </Glass>
            ))}
          </div>
        )}

      </div>
    </div>
  );
}

const Card = React.forwardRef(({ className, children }, ref) => (
  <div
    ref={ref}
    className={cn(
      "rounded-2xl sm:rounded-[20px] border border-[var(--border-subtle)] bg-white dark:bg-[#141516] shadow-soft card-lift",
      "dark:border-white/5",
      className
    )}
  >
    {children}
  </div>
));
Card.displayName = "Card";

const CardContent = ({ className, children }) => (
  <div className={cn("p-4 sm:p-5 dark:text-white", className)}>{children}</div>
);


function Button({ children, className, variant = "default", ...props }) {
  const base =
    "inline-flex items-center justify-center gap-2 rounded-xl btn-press text-xs sm:text-sm px-3 sm:px-4 py-2 sm:py-2.5 font-medium select-none disabled:opacity-50 disabled:cursor-not-allowed";

  const variants = {
    // Primary — brand green gradient with subtle glow
    default:
      "bg-gradient-to-b from-brand-600 to-brand-700 text-white shadow-soft hover:from-brand-500 hover:to-brand-600 hover:shadow-glow dark:from-brand-500 dark:to-brand-700 dark:hover:from-brand-400 dark:hover:to-brand-600",

    // Secondary — neutral surface
    secondary:
      "bg-white text-gray-900 border border-[var(--border-subtle)] hover:bg-gray-50 hover:border-[var(--border-strong)] dark:bg-[#1f2023] dark:text-white dark:border-white/10 dark:hover:bg-[#26282b]",

    // Destructive
    destructive:
      "bg-gradient-to-b from-red-500 to-red-600 text-white shadow-soft hover:from-red-400 hover:to-red-500",

    // Ghost — minimal
    ghost:
      "bg-transparent text-gray-700 hover:bg-gray-100 dark:text-white dark:hover:bg-white/10",
  };

  return (
    <button
      className={cn(base, variants[variant], className)}
      {...props}
    >
      {children}
    </button>
  );
}


const Input = ({ className, ...props }) => (
  <input
    className={cn(
      "w-full rounded-xl border border-[var(--border-subtle)] px-3 sm:px-3.5 py-2 sm:py-2.5 text-sm outline-none",
      "bg-white text-gray-900 placeholder:text-gray-400",
      "transition-all duration-200 ease-smooth",
      "focus:border-brand-500 focus:ring-4 focus:ring-brand-500/15",
      "dark:bg-[#1f2023] dark:text-white dark:border-white/10 dark:placeholder:text-gray-500 dark:focus:border-brand-400 dark:focus:ring-brand-400/20",
      className
    )}
    {...props}
  />
);

const Label = ({ className, children }) => (
  <label
    className={cn(
      "text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-200 tracking-tight",
      className
    )}
  >
    {children}
  </label>
);

// Tabs
const TabsCtx = createContext(null);
const Tabs = ({ value, onValueChange, children }) =>
  <TabsCtx.Provider value={{ value, onValueChange }}>{children}</TabsCtx.Provider>;
const TabsList = ({ className, children }) => (
  <div
    className={cn(
      "rounded-2xl p-1 flex flex-wrap sm:flex-nowrap gap-1 transition-colors duration-300",
      "bg-gray-100/80 border border-[var(--border-subtle)] dark:bg-white/5 dark:border-white/5 backdrop-blur",
      className
    )}
  >
    {children}
  </div>
);

function TabsTrigger({ value, children }) {
  const ctx = useContext(TabsCtx);
  const active = ctx?.value === value;
  return (
    <button
      onClick={() => ctx?.onValueChange?.(value)}
      className={cn(
        "px-3 sm:px-4 py-2 text-xs sm:text-sm rounded-xl font-medium transition-all duration-300 ease-smooth",
        active
          ? "bg-white text-gray-900 dark:bg-[#1f2023] dark:text-white shadow-soft scale-[1.02]"
          : "text-gray-600 dark:text-gray-300 hover:bg-white/60 hover:text-gray-900 dark:hover:bg-white/5 dark:hover:text-white"
      )}
    >
      {children}
    </button>
  );
}

const TabsContent = ({ value, className, children }) => {
  const ctx = useContext(TabsCtx); if (ctx?.value !== value) return null;
  return <div className={cn("tab-fade-in", className)}>{children}</div>;
};

// ───────────────────────────────────────────────────────────────
// Utils & Domain
// ───────────────────────────────────────────────────────────────
function sortByDateAsc(data) {
  return [...data].sort(
    (a, b) => new Date(a.date) - new Date(b.date)
  );
}
const prettyDate = (d) => new Date(d).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "2-digit" });
const todayISO = () => new Date().toISOString().slice(0, 10);
const normalizeText = (value) => (value || "")
  .toString()
  .normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "")
  .toLowerCase()
  .trim();
const formatNumber = (value) => new Intl.NumberFormat("fr-FR").format(value);
const normalizeDecimalInput = (value) => {
  if (typeof value !== "string") return value;
  const v = value.replace(",", ".");
  const parts = v.split(".");
  return parts.length > 2
    ? parts[0] + "." + parts.slice(1).join("")
    : v;
};
const shortFR = (iso) => {
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" });
};
const volumeOfSets = (sets) => sets.reduce((acc, s) => acc + Number(s.reps || 0) * Number(s.weight || 0), 0);
const computeSessionTonnage = (session) => session.exercises.reduce((acc, ex) => acc + volumeOfSets(ex.sets), 0);
const epley1RM = (weight, reps) => (reps > 1 ? weight * (1 + reps / 30) : weight);

const MUSCLE_LABELS = {
  pectoraux_bas: "pectoraux bas",
  pectoraux_milieu: "pectoraux",
  pectoraux_haut: "pectoraux haut",
  épaules: "épaules",
  trapèzes: "trapèzes",
  grand_dorsal: "dos",
  quadriceps: "quadriceps",
  fessiers: "fessiers",
  ischio_jambiers: "ischios",
  mollets: "mollets",
  abdos: "abdos",
};
const MUSCLE_KEYWORDS = {
  pectoraux_haut: ["pectoraux haut", "pecs haut", "haut des pecs", "upper chest"],
  pectoraux_bas: ["pectoraux bas", "pecs bas", "bas des pecs", "lower chest"],
  pectoraux_milieu: ["pectoraux", "pecs", "pec", "chest"],
  épaules: ["epaule", "epaules", "delto", "shoulder"],
  trapèzes: ["trapeze", "trapezes", "trap"],
  grand_dorsal: ["dorsaux", "grand dorsal", "dos", "lats"],
  quadriceps: ["quadriceps", "quads", "cuisses", "jambes avant"],
  fessiers: ["fessier", "fessiers", "glute", "fesses"],
  ischio_jambiers: ["ischio", "ischios", "hamstrings", "arriere cuisse"],
  mollets: ["mollet", "mollets", "calf"],
  abdos: ["abdo", "abdos", "core", "gainage", "sangle"],
};
const EXERCISE_MUSCLE_MAP = new Map(
  muscleRag.map((row) => [normalizeText(row.exercise), row.muscles])
);
const formatMuscleLabel = (muscle) => MUSCLE_LABELS[muscle] || muscle.replace(/_/g, " ");

const TRACTION_ALLOWED_EMAIL = "maxouchanou2005@gmail.com";
const normalizeEmail = (email) => (email || "").trim().toLowerCase();
const isTractionAuthorized = (email) =>
  normalizeEmail(email) === normalizeEmail(TRACTION_ALLOWED_EMAIL);

// ───────────────────────────────────────────────────────────────
// Local storage helpers
// ───────────────────────────────────────────────────────────────
const STORAGE_NAMESPACE = "workout-tracker-v1";
const keyFor = (uid) => `${STORAGE_NAMESPACE}:${uid || "anon"}`;
const loadDataFor = (uid) => {
  try {
    const raw = localStorage.getItem(keyFor(uid));
    return raw ? JSON.parse(raw) : { sessions: [], customExercises: [] };
  } catch {
    return { sessions: [], customExercises: [] };
  }
};
const saveDataFor = (uid, data) => {
  localStorage.setItem(keyFor(uid), JSON.stringify(data));
};
const migrateLegacyLocal = () => {
  try {
    const raw = localStorage.getItem(STORAGE_NAMESPACE);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
};

// ───────────────────────────────────────────────────────────────
// Firestore helpers (sessions + templates)
// ───────────────────────────────────────────────────────────────
function subscribeSessions(uid, onChange, onError) {
  const q = query(
    collection(db, "sessions"),
    where("user_id", "==", uid),
    orderBy("date", "desc")
  );
  return onSnapshot(q, (snap) => {
    const rows = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    onChange(rows);
  }, (err) => {
    console.error("onSnapshot error:", err);
    onError?.(err);
    alert("Firestore error: " + (err?.message || err));
  });
}

async function upsertSessionTemplate(uid, tpl) {
  const batch = writeBatch(db);
  const ref = doc(db, "session_templates", tpl.id);
  const payload = {
    user_id: uid,
    name: tpl.name,
    exercises: Array.from(new Set(tpl.exercises || [])),
    updated_at: new Date().toISOString(),
  };
  if (!tpl.created_at) payload.created_at = new Date().toISOString();
  batch.set(ref, payload, { merge: true });
  await batch.commit();
}

async function upsertSessions(uid, sessions, userEmail) {
  const batch = writeBatch(db);
  sessions.forEach((s) => {
    const ref = doc(db, "sessions", s.id);
    const resolvedEmail = s.user_email || userEmail;
    batch.set(ref, {
      ...s,
      user_id: uid,
      ...(resolvedEmail ? { user_email: resolvedEmail } : {}),
      updated_at: new Date().toISOString(),
      created_at: s.created_at || new Date().toISOString(),
    }, { merge: true });
  });
  await batch.commit();
}

async function deleteSession(uid, id) {
  await deleteDoc(doc(db, "sessions", id));
}
function subscribeSessionTemplates(uid, onChange, onError) {
  const q = query(
    collection(db, "session_templates"),
    where("user_id", "==", uid),
    orderBy("name", "asc")
  );
  return onSnapshot(q, (snap) => {
    const rows = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    onChange(rows);
  }, (err) => {
    console.error("onSnapshot templates error:", err);
    onError?.(err);
    alert("Firestore error (templates): " + (err?.message || err));
  });
}
async function deleteSessionTemplate(id) {
  await deleteDoc(doc(db, "session_templates", id));
}

// ───────────────────────────────────────────────────────────────
// MAIN APP responsive
// ───────────────────────────────────────────────────────────────
export default function AppWrapper() {
  return (
    <ThemeProvider>
      <App />
    </ThemeProvider>
  );
}

function App() {
  const [data, setData] = useState({ sessions: [], customExercises: [], sessionTemplates: [] });
  const [tab, setTab] = useState("log");
  const [user, setUser] = useState(undefined);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [activePolicyModal, setActivePolicyModal] = useState(null);
  const [route, setRoute] = useState(() => window.location.pathname);
  const vw = useViewport();
  const isMobile = vw < 1024;
  const [activeSession, setActiveSession] = useState(() => {
    try { return JSON.parse(localStorage.getItem('wt_active_session')) || null; } catch { return null; }
  });
  useEffect(() => {
    if (activeSession) localStorage.setItem('wt_active_session', JSON.stringify(activeSession));
    else localStorage.removeItem('wt_active_session');
  }, [activeSession]);
  const [showTplPicker, setShowTplPicker] = useState(false);
  const [showLibrePicker, setShowLibrePicker] = useState(false);
  const [showOptions, setShowOptions] = useState(false);
  const [pendingDetail, setPendingDetail] = useState(null);

  const launchSession = (tpl) => {
    setShowTplPicker(false);
    if (!tpl) {
      setShowLibrePicker(true);
      return;
    }
    try {
      const sessions = data.sessions || [];
      const defaultSets = () => Array(4).fill(null).map(() => ({ reps: 10, weight: 0, done: false }));
      const exercises = (tpl.exercises || []).map(exName => {
        const name = (typeof exName === 'string' ? exName : (exName?.name || '')) || 'Exercice';
        let prefillSets = null;
        for (const s of sessions) {
          const match = (s.exercises || []).find(e =>
            typeof e === 'object' && e !== null && (e.name || '').toLowerCase().trim() === name.toLowerCase().trim()
          );
          if (match?.sets?.length) {
            prefillSets = match.sets.map(st => ({ reps: Number(st?.reps) || 10, weight: Number(st?.weight) || 0, done: false }));
            break;
          }
        }
        return { name, sets: prefillSets || defaultSets() };
      });
      const exList = exercises.length > 0 ? exercises : [{ name: 'Exercice 1', sets: defaultSets() }];
      setActiveSession({ name: tpl.name || 'Séance libre', templateId: tpl.id || null, exercises: exList, startedAt: Date.now() });
    } catch (err) {
      console.error('launchSession error:', err);
      const defaultSets = () => Array(4).fill(null).map(() => ({ reps: 10, weight: 0, done: false }));
      setActiveSession({ name: 'Séance libre', templateId: null, exercises: [{ name: 'Exercice 1', sets: defaultSets() }], startedAt: Date.now() });
    }
  };

  const launchLibreSession = (firstExName) => {
    setShowLibrePicker(false);
    const defaultSets = () => Array(4).fill(null).map(() => ({ reps: 10, weight: 0, done: false }));
    const sessions = data.sessions || [];
    let prefillSets = null;
    for (const s of sessions) {
      const match = (s.exercises || []).find(e =>
        typeof e === 'object' && e !== null && (e.name || '').toLowerCase().trim() === firstExName.toLowerCase().trim()
      );
      if (match?.sets?.length) {
        prefillSets = match.sets.map(st => ({ reps: Number(st?.reps) || 10, weight: Number(st?.weight) || 0, done: false }));
        break;
      }
    }
    setActiveSession({ name: 'Séance libre', templateId: null, exercises: [{ name: firstExName, sets: prefillSets || defaultSets() }], startedAt: Date.now() });
  };

  const saveSession = async ({ exercises, dur, tonnage, name, date }) => {
    const s = {
      id: uuidv4(),
      type: name || activeSession.name,
      date: date || toLocalISO(new Date()),
      exercises,
      dur,
      tonnage,
      note: '',
      user_id: user.id,
      user_email: user.email,
      created_at: new Date().toISOString(),
    };
    try {
      await upsertSessions(user.id, [s], user.email);
      // onSnapshot Firestore met à jour data automatiquement — pas besoin de setData
    } catch (e) {
      console.error('Error saving session:', e);
    }
    // Note: does NOT close the session — summary screen handles that
  };
  const tractionAuthorized = isTractionAuthorized(user?.email);
  const navItems = useMemo(
    () => [
      { value: "tpl", label: "Séances pré-créées", shortLabel: "Séances", icon: ClipboardList },
      { value: "log", label: "Saisir une séance", shortLabel: "Saisie", icon: Plus },
      { value: "sessions", label: "Historique", shortLabel: "Historique", icon: History },
      { value: "last", label: "Dernière séance", shortLabel: "Dernière", icon: Clock },
      { value: "analytics", label: "Statistiques", shortLabel: "Stats", icon: BarChart3 },
      { value: "weight", label: "Suivi du poids", shortLabel: "Poids", icon: Scale },
      { value: "steps", label: "Suivi des pas", shortLabel: "Pas", icon: Footprints },
      { value: "ranking", label: "Classement", shortLabel: "Classement", icon: Trophy },
      ...(tractionAuthorized
        ? [{ value: "traction", label: "Traction", shortLabel: "Traction", icon: Sparkles }]
        : []),
    ],
    [tractionAuthorized]
  );
  const mobileNavItems = useMemo(() => {
    const order = ["tpl", "log", "sessions", "last", "analytics", "weight", "steps", "ranking", "traction"];
    const byValue = new Map(navItems.map((item) => [item.value, item]));
    return order
      .map((value) => byValue.get(value))
      .filter(Boolean)
      .map((item) =>
        item.value === "tpl" ? { ...item, shortLabel: "Templates" } : item
      );
  }, [navItems]);
  const handleTabChange = (value) => {
    setTab(value);
  };

  const navigate = (path) => {
    if (window.location.pathname === path) return;
    window.history.pushState({}, "", path);
    setRoute(path);
  };

  useEffect(() => {
    const handlePopState = () => setRoute(window.location.pathname);
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  useEffect(() => {
    if (!activePolicyModal) return undefined;
    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        setActivePolicyModal(null);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activePolicyModal]);

  useEffect(() => {
    if (tab === "traction" && !tractionAuthorized) {
      setTab("log");
    }
  }, [tab, tractionAuthorized]);

  useEffect(() => {
    let unsubscribeSessions = null;
    let unsubscribeTemplates = null;
    const unsubAuth = onAuth(async (u) => {
      if (!u) {
        setUser(null);
        setData({ sessions: [], customExercises: [], sessionTemplates: [] });
        unsubscribeSessions?.();
        unsubscribeTemplates?.();
        try {
          localStorage.removeItem(keyFor("anon"));
          localStorage.removeItem(keyFor(user?.id));
        } catch (e) { console.warn("Cache clean error:", e); }
        return;
      }
      const uid = u.uid;
      const resolvedEmail = u.email || u.providerData?.find((p) => p?.email)?.email;
      setUser({ id: uid, email: resolvedEmail || "Utilisateur" });

      const legacy = migrateLegacyLocal();
      if (legacy && (legacy.sessions?.length || 0) > 0 && !localStorage.getItem(keyFor(uid))) {
        saveDataFor(uid, legacy);
        localStorage.removeItem(STORAGE_NAMESPACE);
      }
      unsubscribeSessions?.();
      unsubscribeSessions = subscribeSessions(uid, (remoteRows) => {
        const hydrated = {
          sessions: remoteRows,
          customExercises: loadDataFor(uid).customExercises || [],
        };
        setData((cur) => ({ ...cur, sessions: remoteRows, customExercises: hydrated.customExercises }));
        saveDataFor(uid, hydrated);
      });
      unsubscribeTemplates?.();
      unsubscribeTemplates = subscribeSessionTemplates(uid, (trows) => {
        const hydrated = { ...loadDataFor(uid), sessionTemplates: trows };
        setData((cur) => ({ ...cur, sessionTemplates: trows }));
        saveDataFor(uid, hydrated);
      });
    });
    return () => {
      unsubAuth?.(); unsubscribeSessions?.(); unsubscribeTemplates?.();
    };
  }, []);

  useEffect(() => {
    if (!user?.id) return;
    saveDataFor(user.id, data);
  }, [user?.id, data]);

  useEffect(() => {
    if (!user?.id) return;
    const trackLogin = async () => {
      try {
        const token = await auth.currentUser?.getIdToken();
        if (!token) return;
        await fetch("/api/track-login", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
      } catch (error) {
        console.warn("Login tracking failed:", error);
      }
    };
    trackLogin();
  }, [user?.id]);

  if (route === "/privacy") {
    return <PrivacyPolicy onBack={() => navigate("/")} />;
  }

  if (user === undefined) {
    return (
      <div className="min-h-screen grid place-items-center text-gray-600 dark:text-gray-300">
        <div className="flex flex-col items-center gap-5 animate-fade-up">
          <div className="relative">
            <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 shadow-glow grid place-items-center">
              <Dumbbell className="h-7 w-7 text-white animate-float" />
            </div>
            <div className="absolute inset-0 rounded-2xl border-2 border-brand-500/30 animate-ping" />
          </div>
          <div className="flex flex-col items-center gap-1">
            <span className="font-display text-lg font-bold text-gradient-brand">Workout Tracker</span>
            <span className="text-xs text-gray-500 dark:text-gray-400">Chargement de vos données…</span>
          </div>
        </div>
      </div>
    );
  }

  if (user === null) {
    if (route === "/login") {
      return <AuthScreen onBack={() => navigate("/")} />;
    }
    return <PublicHome onLogin={() => navigate("/login")} />;
  }

  if (isMobile) {
    const mobileView = ['sessions','last'].includes(tab) ? 'sessions'
      : ['analytics','weight','steps','ranking'].includes(tab) ? 'analytics'
      : tab === 'tpl' ? 'tpl'
      : 'home';

    if (activeSession) {
      return (
        <div style={{ minHeight: '100vh', overflowX: 'hidden', position: 'relative', fontFamily: SG.sans, color: SG.ink }}>
          <SGMobileBackground />
          <SGActiveSession
            session={activeSession}
            onFinish={saveSession}
            onClose={() => setActiveSession(null)}
            onCancel={() => setActiveSession(null)}
            sessions={data.sessions || []}
            knownExercises={getUserExercises(data)}
          />
        </div>
      );
    }

    return (
      <div style={{ minHeight: '100vh', overflowX: 'hidden', position: 'relative', fontFamily: SG.sans, color: SG.ink }}>
        <SGMobileBackground />
        {/* Options button — always visible */}
        <button onClick={() => setShowOptions(true)} style={{ position: 'fixed', top: 14, right: 14, zIndex: 90, width: 40, height: 40, borderRadius: 20, border: 'none', background: 'rgba(255,255,255,0.60)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', boxShadow: '0 2px 10px rgba(15,15,30,0.10)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={SG.ink} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
          </svg>
        </button>
        {showOptions && <SGMobileProfileModal user={user} onClose={() => setShowOptions(false)} />}
        {mobileView === 'home' && <SGMobileHome data={data} user={user} onOpenForm={() => launchSession(null)} onLaunchTpl={(tpl) => launchSession(tpl)}
          onViewSession={(s) => { setPendingDetail(s); handleTabChange('sessions'); }}
        />}
        {mobileView === 'sessions' && <SGMobileHistory data={data} user={user}
          initialDetail={pendingDetail}
          onClearInitialDetail={() => setPendingDetail(null)}
          onDeleteSession={async (id) => { try { await deleteSession(user.id, id); setData(cur => ({ ...cur, sessions: cur.sessions.filter(s => s.id !== id) })); } catch(e) { alert('Erreur: ' + e.message); } }}
          upsertFn={async (s) => { await upsertSessions(user.id, [s], user.email); setData(cur => ({ ...cur, sessions: cur.sessions.map(x => x.id === s.id ? s : x) })); }}
        />}
        {mobileView === 'analytics' && <SGMobileStats data={data} user={user} />}
        {mobileView === 'tpl' && <SGMobileTpl data={data} user={user} onTab={handleTabChange} onOpenForm={(tpl) => launchSession(tpl)}
          knownExercises={getUserExercises(data)}
          onSaveTpl={async (tpl) => {
            await upsertSessionTemplate(user.id, tpl);
            setData(cur => {
              const exists = cur.sessionTemplates.some(t => t.id === tpl.id);
              return { ...cur, sessionTemplates: exists ? cur.sessionTemplates.map(t => t.id === tpl.id ? tpl : t) : [tpl, ...cur.sessionTemplates] };
            });
          }}
        />}
        {showTplPicker && <SGTemplatePicker templates={data.sessionTemplates || []} onSelect={(tpl) => launchSession(tpl)} onClose={() => setShowTplPicker(false)} />}
        {showLibrePicker && <ExercisePicker knownExercises={getUserExercises(data)} onSelect={launchLibreSession} onClose={() => setShowLibrePicker(false)} />}
        <MobileSGTabBar tab={mobileView} onTab={handleTabChange} onFAB={() => setShowTplPicker(true)} />
      </div>
    );
  }

  return (
<div className="min-h-screen w-full text-gray-900 dark:text-white">
{isMobile && <SGMobileBackground />}
<header
  className="sticky top-0 z-20
  bg-white/80 dark:bg-[#111214]/75
  text-gray-900 dark:text-white
  border-b border-[var(--border-subtle)] dark:border-white/5
  backdrop-blur-xl
  transition-colors duration-300"
>
<div className="max-w-[1600px] mx-auto px-4 sm:px-6 py-3 sm:py-4 flex flex-col sm:flex-row items-center justify-between gap-3">
    <div className="flex items-center gap-2 sm:gap-3">
      <Button
        variant="ghost"
        onClick={() => setIsMenuOpen((prev) => !prev)}
        title="Ouvrir le menu"
        className="hidden md:inline-flex !rounded-full !p-2.5 text-gray-700 dark:text-white hover:bg-gray-100 dark:hover:bg-white/10"
      >
        <Menu className="h-4 w-4" />
      </Button>
      <div className="flex items-center gap-2.5">
        <div className="relative grid place-items-center h-10 w-10 rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 shadow-glow">
          <img
            src={headerGif}
            alt="Workout Tracker"
            className="h-7 w-7 object-contain drop-shadow"
          />
        </div>
        <h1 className="font-display text-lg sm:text-xl md:text-[22px] font-bold tracking-tight flex flex-col leading-none">
          <span className="text-gradient-brand">Workout Tracker</span>
          <span className="text-[10px] sm:text-xs font-medium uppercase tracking-[0.25em] text-gray-400 dark:text-gray-500 mt-1 hidden sm:block">
            Suivi & progression
          </span>
        </h1>
      </div>
    </div>

    <div className="flex items-center gap-2 sm:gap-3">
      <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-gray-100/70 dark:bg-white/5 border border-[var(--border-subtle)] dark:border-white/5">
        <div className="h-2 w-2 rounded-full bg-brand-500 shadow-[0_0_8px_rgba(10,161,101,0.6)]" />
        <span className="text-xs font-medium text-gray-700 dark:text-gray-200 truncate max-w-[200px]">
          {user.email}
        </span>
      </div>
      <ThemeToggleButton />
      <Button
        variant="ghost"
        onClick={() => signOutUser()}
        title="Se déconnecter"
        className="!rounded-full !p-2.5 sm:!px-3 text-gray-700 dark:text-white hover:bg-gray-100 dark:hover:bg-white/10"
      >
        <LogOut className="h-4 w-4" />
        <span className="hidden sm:inline">Déconnexion</span>
      </Button>
    </div>
  </div>
</header>

<div className="mx-auto flex max-w-[1600px] px-4 sm:px-6 py-4 sm:py-6 pb-[calc(8rem+env(safe-area-inset-bottom))] md:pb-8 gap-6">
    <aside
      className={cn(
        "hidden md:flex shrink-0 flex-col gap-1 rounded-2xl border border-[var(--border-subtle)] dark:border-white/5 bg-white/80 dark:bg-[#141516]/80 backdrop-blur shadow-soft overflow-hidden transition-all duration-500 ease-smooth sticky top-[88px] self-start",
        isMenuOpen
          ? "w-64 p-3 opacity-100 max-h-[calc(100vh-120px)]"
          : "w-0 p-0 opacity-0 border-transparent pointer-events-none"
      )}
    >
      <div className="px-3 pt-2 pb-3 text-[10px] uppercase tracking-[0.22em] font-semibold text-gray-400 dark:text-gray-500">
        Navigation
      </div>
      {navItems.map((item) => {
        const Icon = item.icon;
        const active = tab === item.value;
        return (
          <button
            key={item.value}
            onClick={() => handleTabChange(item.value)}
            className={cn(
              "group relative flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-left text-sm font-medium transition-all duration-300 ease-smooth",
              active
                ? "bg-gradient-to-r from-brand-500/15 to-brand-600/5 text-brand-700 dark:text-brand-300 dark:from-brand-400/20 dark:to-brand-600/5"
                : "text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-white/5 dark:hover:text-white"
            )}
          >
            {active && (
              <span className="absolute left-0 top-1/2 -translate-y-1/2 h-6 w-1 rounded-r-full bg-brand-500 dark:bg-brand-400 shadow-[0_0_10px_rgba(10,161,101,0.6)]" />
            )}
            <Icon className={cn("h-[18px] w-[18px] shrink-0 transition-transform duration-300 ease-spring", active && "scale-110")} />
            <span className="truncate">{item.label}</span>
          </button>
        );
      })}
    </aside>
  <main className="min-w-0 flex-1">
    <Tabs value={tab} onValueChange={handleTabChange}>
          <TabsContent value="tpl" className="mt-3 sm:mt-4">
            <TemplatesManager
              user={user}
              allExercises={getUserExercises(data)}
              templates={data.sessionTemplates}
              onCreate={async (tpl) => {
                const id = tpl.id || uuidv4();
                await upsertSessionTemplate(user.id, { ...tpl, id });
              }}
              onDelete={async (id) => { await deleteSessionTemplate(id); }}
            />
          </TabsContent>
          <TabsContent value="log" className="mt-3 sm:mt-4">
  <SessionForm
    user={user}
    customExercises={data.customExercises}
    onAddCustomExercise={(name) => {
      const upd = { ...data, customExercises: [...data.customExercises, name] };
      setData(upd);
      saveDataFor(user.id, upd);
    }}
    onSavedLocally={(s) => {
      const upd = { ...data, sessions: [s, ...data.sessions] };
      setData(upd);
      saveDataFor(user.id, upd);
    }}
    sessionTemplates={data.sessionTemplates}
    onCreateTemplate={async (tpl) => {
      await upsertSessionTemplate(user.id, tpl);
    }}
  />
</TabsContent>

<TabsContent value="sessions" className="mt-3 sm:mt-4">
  <SessionList
  user={user}
  sessions={data.sessions}
  onDelete={async (id) => {
    try {
      await deleteSession(user.id, id);
      setData((cur) => ({
        ...cur,
        sessions: cur.sessions.filter((s) => s.id !== id), // ⬅ supprime aussi côté state
      }));
    } catch (e) {
      console.error("Erreur suppression séance:", e);
      alert("Impossible de supprimer la séance : " + (e?.message || e));
    }
  }}
  onEdit={async (s) => {
    await upsertSessions(user.id, [s], user.email);
  }}
  setTab={setTab}   // 👈 ajouté ici

/>

</TabsContent>


<TabsContent value="analytics" className="mt-3 sm:mt-4">
  <Analytics sessions={data.sessions} sessionTemplates={data.sessionTemplates} />
</TabsContent>

<TabsContent value="last" className="mt-3 sm:mt-4">
  <LastSession sessions={data.sessions} />
</TabsContent>

<TabsContent value="chatbot" className="mt-3 sm:mt-4">
  <ChatbotSection sessions={data.sessions} user={user} />
</TabsContent>

<TabsContent value="weight" className="mt-3 sm:mt-4">
  <WeightTracker user={user} />
</TabsContent>
<TabsContent value="steps" className="mt-3 sm:mt-4">
  <StepsTracker user={user} />
</TabsContent>
<TabsContent value="ranking" className="mt-3 sm:mt-4">
  <RankingSection />
</TabsContent>
<TabsContent value="traction" className="mt-3 sm:mt-4">
  <TractionSection user={user} />
</TabsContent>
           </Tabs>
      </main>
    </div>

      {activePolicyModal && (
        <div className="fixed inset-0 z-30 flex items-center justify-center px-4 py-8">
          <button
            type="button"
            aria-label="Fermer la fenêtre"
            className="absolute inset-0 bg-black/50"
            onClick={() => setActivePolicyModal(null)}
          />
          <div
            role="dialog"
            aria-modal="true"
            className="relative z-10 w-full max-w-2xl rounded-2xl bg-white p-6 text-sm text-gray-700 shadow-2xl dark:bg-[#0d0d0d] dark:text-gray-200"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-widest text-gray-400">Informations légales</p>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  {activePolicyModal === "conditions"
                    ? "Conditions d’utilisation"
                    : "Politique de confidentialité"}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setActivePolicyModal(null)}
                className="rounded-full border border-gray-200 px-3 py-1 text-xs font-semibold text-gray-600 transition hover:border-gray-300 hover:text-gray-900 dark:border-gray-700 dark:text-gray-300 dark:hover:text-white"
              >
                Fermer
              </button>
            </div>

            {activePolicyModal === "conditions" ? (
              <div className="mt-4 space-y-3">
                <p>
                  En utilisant Workout Tracker, vous acceptez ces conditions. L&apos;application est destinée au suivi
                  personnel de l&apos;activité physique et ne remplace pas un avis médical. Vous êtes responsable de
                  l&apos;exactitude des informations saisies et de l&apos;utilisation que vous en faites.
                </p>
                <ul className="list-disc space-y-2 pl-5">
                  <li>
                    <strong>Compte :</strong> vous devez maintenir la confidentialité de vos identifiants et notifier
                    toute utilisation non autorisée.
                  </li>
                  <li>
                    <strong>Usage autorisé :</strong> vous vous engagez à ne pas détourner le service, introduire de
                    contenu illicite ou tenter d&apos;accéder aux données d&apos;autrui.
                  </li>
                  <li>
                    <strong>Contenus :</strong> vous conservez la propriété de vos données. Vous accordez une licence
                    technique pour leur hébergement et l&apos;affichage dans l&apos;application.
                  </li>
                  <li>
                    <strong>Disponibilité :</strong> nous faisons de notre mieux pour garantir la continuité du service,
                    mais des interruptions peuvent survenir (maintenance, mises à jour).
                  </li>
                  <li>
                    <strong>Limitation de responsabilité :</strong> Workout Tracker n&apos;est pas responsable des
                    dommages indirects liés à l&apos;usage de l&apos;application.
                  </li>
                  <li>
                    <strong>Évolutions :</strong> ces conditions peuvent être mises à jour. La date de dernière mise à
                    jour s&apos;affiche ci-dessous.
                  </li>
                </ul>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Dernière mise à jour : {new Date().toLocaleDateString("fr-FR")}
                </p>
              </div>
            ) : (
              <div className="mt-4 space-y-3">
                <p>
                  Nous respectons votre vie privée. Cette politique explique quelles données sont collectées, pourquoi,
                  et comment vous pouvez exercer vos droits.
                </p>
                <ul className="list-disc space-y-2 pl-5">
                  <li>
                    <strong>Données collectées :</strong> email, identifiant utilisateur, séances enregistrées, modèles
                    de séance, données de poids/pas, et données techniques minimales (journal de connexion, type
                    d&apos;appareil).
                  </li>
                  <li>
                    <strong>Finalités :</strong> fournir le service, sauvegarder vos progrès, sécuriser l&apos;accès et
                    améliorer l&apos;expérience utilisateur.
                  </li>
                  <li>
                    <strong>Base légale :</strong> exécution du contrat (service demandé) et intérêt légitime pour la
                    sécurité.
                  </li>
                  <li>
                    <strong>Partage :</strong> vos données sont hébergées via nos prestataires techniques (ex. Firebase),
                    sans vente à des tiers.
                  </li>
                  <li>
                    <strong>Conservation :</strong> vos données sont conservées tant que votre compte est actif. Vous
                    pouvez demander la suppression de vos données via l&apos;application.
                  </li>
                  <li>
                    <strong>Sécurité :</strong> nous appliquons des mesures techniques et organisationnelles
                    raisonnables pour protéger vos informations.
                  </li>
                  <li>
                    <strong>Vos droits :</strong> accès, rectification, suppression, opposition et portabilité selon la
                    réglementation applicable.
                  </li>
                </ul>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Contact : support@workout-tracker.app
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      <footer className="hidden md:block border-t border-gray-200 bg-white/80 py-8 text-sm text-gray-600 backdrop-blur dark:border-[#1f1f1f] dark:bg-[#0d0d0d] dark:text-gray-300">
        <div className="mx-auto flex max-w-[1600px] flex-col gap-6 px-6">
          <div className="flex flex-wrap items-center gap-4 text-sm font-medium">
            <button
              type="button"
              onClick={() => setActivePolicyModal("conditions")}
              className="underline-offset-4 hover:underline"
            >
              Conditions d&apos;utilisation
            </button>
            <button
              type="button"
              onClick={() => setActivePolicyModal("politique")}
              className="underline-offset-4 hover:underline"
            >
              Politique de confidentialité
            </button>
          </div>
        </div>
      </footer>


      {isMobile ? (
        <MobileSGTabBar tab={tab} onTab={handleTabChange} />
      ) : (
        <nav className="fixed bottom-0 left-0 right-0 z-30 border-t border-[var(--border-subtle)] dark:border-white/5 bg-white/85 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl dark:bg-[#111214]/85 md:hidden shadow-[0_-8px_24px_-12px_rgba(0,0,0,0.12)]">
          <div className="mx-auto grid max-w-[1600px] grid-cols-5 gap-y-1 px-2 py-2">
            {mobileNavItems.map((item) => {
              const Icon = item.icon;
              const active = tab === item.value;
              return (
                <button
                  key={item.value}
                  onClick={() => handleTabChange(item.value)}
                  className={cn(
                    "relative flex w-full flex-col items-center gap-1 rounded-xl px-1 py-2 text-[10.5px] font-semibold transition-all duration-300 ease-smooth active:scale-95",
                    active
                      ? "text-brand-600 dark:text-brand-300"
                      : "text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
                  )}
                >
                  {active && (
                    <span className="absolute top-0.5 h-1 w-8 rounded-full bg-brand-500 dark:bg-brand-400 shadow-[0_0_8px_rgba(10,161,101,0.6)]" />
                  )}
                  <span className={cn(
                    "grid place-items-center h-8 w-8 rounded-xl transition-all duration-300 ease-spring",
                    active && "bg-brand-500/10 dark:bg-brand-400/15 scale-105"
                  )}>
                    <Icon className={cn("h-[18px] w-[18px] transition-transform duration-300 ease-spring", active && "scale-110")} />
                  </span>
                  <span className="text-center leading-tight tracking-tight">{item.shortLabel}</span>
                </button>
              );
            })}
          </div>
        </nav>
      )}
    </div>
  );
}
// App.jsx (Bloc 2)

// ───────────────────────────────────────────────────────────────
// Chatbot IA (analyse locale des données utilisateur)
// ───────────────────────────────────────────────────────────────
function buildExerciseTotals(sessions) {
  const totals = new Map();
  sessions.forEach((session) => {
    session.exercises.forEach((exercise) => {
      const volume = exercise.sets.reduce(
        (acc, set) => acc + Number(set.reps || 0) * Number(set.weight || 0),
        0
      );
      totals.set(exercise.name, (totals.get(exercise.name) || 0) + volume);
    });
  });
  return Array.from(totals.entries())
    .map(([name, volume]) => ({ name, volume }))
    .sort((a, b) => b.volume - a.volume);
}

function buildMuscleTotals(sessions) {
  const totals = new Map();
  sessions.forEach((session) => {
    session.exercises.forEach((exercise) => {
      const muscles = EXERCISE_MUSCLE_MAP.get(normalizeText(exercise.name)) || [];
      if (!muscles.length) return;
      const volume = volumeOfSets(exercise.sets);
      const share = volume / muscles.length;
      muscles.forEach((muscle) => {
        totals.set(muscle, (totals.get(muscle) || 0) + share);
      });
    });
  });
  return Array.from(totals.entries())
    .map(([muscle, volume]) => ({ muscle, volume: Math.round(volume) }))
    .sort((a, b) => b.volume - a.volume);
}

function buildSessionHighlights(session) {
  if (!session) return null;
  const exerciseTotals = session.exercises
    .map((exercise) => ({
      name: exercise.name,
      volume: Math.round(volumeOfSets(exercise.sets)),
    }))
    .sort((a, b) => b.volume - a.volume);
  return {
    exerciseCount: session.exercises.length,
    tonnage: Math.round(computeSessionTonnage(session)),
    topExercises: exerciseTotals.slice(0, 3),
  };
}

function findMuscleFocus(message) {
  const normalized = normalizeText(message);
  return Object.entries(MUSCLE_KEYWORDS).find(([, keywords]) =>
    keywords.some((keyword) => normalized.includes(normalizeText(keyword)))
  )?.[0];
}

function buildChatbotReply(message, insights) {
  if (!insights.sessionCount) {
    return [
      "Je n'ai pas encore de séances à analyser.",
      "Ajoute une première séance pour que je puisse te donner des conseils personnalisés (volumes, fréquence, progression).",
    ].join("\n");
  }

  const normalized = normalizeText(message);
  const wantsTonnage = /tonnage|volume|charge|poids/.test(normalized);
  const wantsFrequency = /frequen|regulier|rythme|routine|semaine/.test(normalized);
  const wantsProgress = /progress|evolu|monter|augmenter/.test(normalized);
  const wantsExercises = /exercice|exo|mouvement/.test(normalized);
  const wantsMuscles = /muscle|pec|dos|epaul|abdo|jamb|fess|mollet|ischio/.test(normalized);
  const wantsGoal = /objectif|but|prise de masse|seche|force|hypertroph/.test(normalized);
  const wantsSummary = /resume|résume|recap|bilan|analyse|synthese/.test(normalized);
  const muscleFocus = findMuscleFocus(message);

  const lines = [];
  lines.push("Merci pour ta question ! Voici ce que je peux déduire de tes séances :");

  if (wantsSummary || (!wantsTonnage && !wantsFrequency && !wantsProgress && !wantsExercises && !wantsMuscles && !wantsGoal)) {
    lines.push(
      [
        "📊 **Récap rapide**",
        `• ${insights.sessionCount} séances enregistrées`,
        `• Dernière séance : ${insights.lastSessionLabel}`,
        `• Tonnage total cumulé : ${formatNumber(insights.totalTonnage)} kg`,
        `• Tonnage moyen par séance : ${formatNumber(insights.avgTonnage)} kg`,
        `• Fréquence (28 jours) : ${insights.avgSessionsPerWeek} séances / semaine`,
      ].join("\n")
    );
  }

  if (insights.topExercise) {
    lines.push(`• Exercice le plus travaillé : ${insights.topExercise.name} (${formatNumber(insights.topExercise.volume)} kg)`);
  }

  if (wantsTonnage) {
    const trend = insights.tonnageTrend;
    const trendLine = trend
      ? `Ta dernière séance est ${trend.delta > 0 ? "au-dessus" : "en-dessous"} de ${formatNumber(Math.abs(trend.delta))} kg par rapport à la précédente (${trend.percent}%).`
      : "Ajoute une seconde séance pour qu'on compare ta charge d'une séance à l'autre.";
    lines.push(
      [
        "🏋️ **Tonnage & charge**",
        `• Total : ${formatNumber(insights.totalTonnage)} kg`,
        `• Moyenne : ${formatNumber(insights.avgTonnage)} kg / séance`,
        `• ${trendLine}`,
        "👉 Pour booster ton tonnage, ajoute 1 série OU +2 reps sur 1 à 2 exercices clés.",
      ].join("\n")
    );
  }

  if (wantsFrequency) {
    lines.push(
      [
        "📅 **Fréquence & régularité**",
        `• Moyenne actuelle : ${insights.avgSessionsPerWeek} séances / semaine`,
        `• Dernière séance : ${insights.lastSessionLabel}`,
        "👉 Pour progresser régulièrement, vise 2 à 4 séances / semaine selon ta récupération.",
      ].join("\n")
    );
  }

  if (wantsProgress) {
    lines.push(
      [
        "📈 **Progression**",
        "👉 La progression est plus visible quand tu répètes les mêmes exercices sur 3 à 4 séances consécutives.",
        "👉 Note ton RPE ou garde une marge de 1 à 2 reps pour monter la charge de semaine en semaine.",
      ].join("\n")
    );
  }

  if (wantsExercises) {
    const topExercises = insights.exerciseTotals.slice(0, 3);
    lines.push(
      [
        "🧠 **Exercices dominants**",
        topExercises.length
          ? topExercises.map((ex) => `• ${ex.name} (${formatNumber(ex.volume)} kg)`).join("\n")
          : "Je n'ai pas encore assez d'exercices pour établir un top.",
      ].join("\n")
    );
  }

  if (wantsMuscles) {
    if (muscleFocus) {
      const muscleData = insights.muscleTotals.find((item) => item.muscle === muscleFocus);
      const muscleLabel = formatMuscleLabel(muscleFocus);
      const suggestions = muscleRag
        .filter((row) => row.muscles.includes(muscleFocus))
        .slice(0, 5)
        .map((row) => row.exercise);
      lines.push(
        [
          `💪 **Focus ${muscleLabel}**`,
          muscleData
            ? `• Volume estimé : ${formatNumber(muscleData.volume)} kg`
            : "• Pas assez de données pour estimer le volume sur ce groupe.",
          suggestions.length ? `• Idées d'exos : ${suggestions.join(", ")}` : null,
        ].filter(Boolean).join("\n")
      );
    } else {
      const topMuscles = insights.muscleTotals.slice(0, 4);
      lines.push(
        [
          "💪 **Groupes les plus sollicités**",
          topMuscles.length
            ? topMuscles.map((item) => `• ${formatMuscleLabel(item.muscle)} (${formatNumber(item.volume)} kg)`).join("\n")
            : "Je n'ai pas encore assez d'exercices pour analyser les groupes musculaires.",
        ].join("\n")
      );
    }
  }

  if (wantsGoal) {
    lines.push(
      [
        "🎯 **Objectifs & recommandations**",
        "• Hypertrophie : 6-12 reps, 3-5 séries, RPE 7-9.",
        "• Force : 3-6 reps, 3-6 séries, repos long (2-3 min).",
        "• Séche : garde le volume, ajoute un léger déficit calorique et du NEAT.",
        "👉 Dis-moi ton objectif exact pour un plan plus précis.",
      ].join("\n")
    );
  }

  if (insights.lastSessionHighlights) {
    const highlights = insights.lastSessionHighlights;
    lines.push(
      [
        "🧾 **Dernière séance en bref**",
        `• ${highlights.exerciseCount} exercices`,
        `• ${formatNumber(highlights.tonnage)} kg au total`,
        highlights.topExercises.length
          ? `• Top exercices : ${highlights.topExercises.map((ex) => ex.name).join(", ")}`
          : null,
      ].filter(Boolean).join("\n")
    );
  }

  lines.push("Dis-moi ce que tu veux optimiser (force, volume, fréquence, un muscle précis) et j'adapte !");
  return lines.join("\n");
}

function ChatbotSection({ sessions, user }) {
  const [messages, setMessages] = useState(() => [
    {
      id: uuidv4(),
      role: "assistant",
      content: `Salut ${user?.email || "coaché"} ! Pose-moi n'importe quelle question muscu : je m'appuie sur tes séances pour te répondre.`,
    },
  ]);
  const [input, setInput] = useState("");
  const bottomRef = useRef(null);

  const insights = useMemo(() => {
    const sessionCount = sessions.length;
    const totalTonnage = sessions.reduce(
      (acc, session) => acc + computeSessionTonnage(session),
      0
    );
    const avgTonnage = sessionCount ? Math.round(totalTonnage / sessionCount) : 0;
    const sortedSessions = sessionCount ? sortByDateAsc(sessions) : [];
    const lastSession = sortedSessions[sortedSessions.length - 1];
    const previousSession = sortedSessions[sortedSessions.length - 2];
    const lastSessionLabel = lastSession
      ? new Date(lastSession.date).toLocaleDateString("fr-FR")
      : "—";
    const exerciseTotals = buildExerciseTotals(sessions);
    const topExercise = exerciseTotals[0];
    const muscleTotals = buildMuscleTotals(sessions);
    const lastSessionHighlights = buildSessionHighlights(lastSession);
    const endDate = todayISO();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 27);
    const avgSessionsPerWeek = Number(
      computeAvgSessionsPerWeek(
        sessions,
        startDate.toISOString().slice(0, 10),
        endDate
      ).toFixed(1)
    );
    const tonnageTrend =
      lastSession && previousSession
        ? (() => {
          const current = Math.round(computeSessionTonnage(lastSession));
          const previous = Math.round(computeSessionTonnage(previousSession));
          const delta = current - previous;
          const percent = previous ? Math.round((delta / previous) * 100) : 0;
          return { delta, percent };
        })()
        : null;

    return {
      sessionCount,
      totalTonnage: Math.round(totalTonnage),
      avgTonnage,
      lastSessionLabel,
      topExercise,
      avgSessionsPerWeek,
      exerciseTotals,
      muscleTotals,
      lastSessionHighlights,
      tonnageTrend,
    };
  }, [sessions]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = () => {
    if (!input.trim()) return;
    const userMessage = { id: uuidv4(), role: "user", content: input.trim() };
    const reply = buildChatbotReply(input, insights);
    const assistantMessage = { id: uuidv4(), role: "assistant", content: reply };
    setMessages((cur) => [...cur, userMessage, assistantMessage]);
    setInput("");
  };

  const quickPrompts = [
    "Analyse mon tonnage cette semaine",
    "Comment améliorer ma fréquence ?",
    "Quels exercices dominent mes séances ?",
    "J'aimerais travailler les épaules",
  ];

  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
      <Card className="xl:col-span-2">
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h3 className="text-lg font-semibold">🤖 Coach IA & Analyse</h3>
              <p className="text-xs sm:text-sm text-gray-500">
                Analyse locale basée sur tes séances, sans envoi vers un serveur externe.
              </p>
            </div>
            <Sparkles className="h-5 w-5 text-gray-400" />
          </div>

          <div className="border rounded-xl p-3 sm:p-4 bg-gray-50 dark:bg-[#1c1c1c] space-y-3 max-h-[420px] overflow-y-auto">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={cn(
                  "rounded-xl px-3 py-2 text-sm whitespace-pre-line",
                  msg.role === "assistant"
                    ? "bg-white text-gray-800 border dark:bg-[#0f0f0f] dark:text-white"
                    : "bg-gray-900 text-white ml-auto dark:bg-black"
                )}
              >
                {msg.content}
              </div>
            ))}
            <div ref={bottomRef} />
          </div>

          <div className="flex flex-col sm:flex-row gap-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Demande un diagnostic, une synthèse ou un objectif..."
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSend();
              }}
            />
            <Button onClick={handleSend}>
              <Send className="h-4 w-4" /> Envoyer
            </Button>
          </div>

          <div className="flex flex-wrap gap-2">
            {quickPrompts.map((prompt) => (
              <Button
                key={prompt}
                variant="secondary"
                onClick={() => {
                  setInput(prompt);
                }}
              >
                {prompt}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-3">
          <h4 className="font-semibold">📌 Synthèse instantanée</h4>
          <div className="text-sm text-gray-600 space-y-1">
            <div>• Séances : {insights.sessionCount}</div>
            <div>• Dernière séance : {insights.lastSessionLabel}</div>
            <div>• Tonnage total : {formatNumber(insights.totalTonnage)} kg</div>
            <div>• Tonnage moyen : {formatNumber(insights.avgTonnage)} kg</div>
            <div>• Fréquence 28 j : {insights.avgSessionsPerWeek} / semaine</div>
          </div>
          <div className="rounded-lg border p-3 text-xs sm:text-sm bg-gray-50 dark:bg-[#1c1c1c]">
            💡 Astuce : répète 2 à 3 mouvements clés chaque semaine pour suivre ta progression plus facilement.
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ───────────────────────────────────────────────────────────────
// Public landing
// ───────────────────────────────────────────────────────────────
function PublicHome({ onLogin }) {
  const features = [
    { emoji: "📒", title: "Historique clair", desc: "Enregistrez vos séances, vos séries et conservez votre évolution sur le long terme." },
    { emoji: "📊", title: "Analyses utiles", desc: "Des graphiques pour visualiser votre volume d'entraînement, votre fréquence et vos tendances." },
    { emoji: "🚶", title: "Suivi quotidien", desc: "Synchronisez vos pas, suivez votre poids et centralisez vos habitudes sportives." },
    { emoji: "🔒", title: "Données protégées", desc: "Consultez la politique de confidentialité pour comprendre la collecte et l'utilisation des données." },
  ];
  return (
    <div className="relative min-h-screen text-gray-900 dark:text-white overflow-hidden">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -top-40 -left-20 h-[420px] w-[420px] rounded-full bg-brand-400/20 blur-3xl" />
        <div className="absolute top-40 -right-20 h-[520px] w-[520px] rounded-full bg-brand-600/15 blur-3xl" />
      </div>

      <div className="mx-auto flex min-h-screen max-w-6xl flex-col gap-12 px-5 sm:px-6 py-10 sm:py-14">
        <header className="flex flex-col gap-6 animate-fade-up">
          <div className="flex items-center gap-4">
            <div className="grid place-items-center h-14 w-14 rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 shadow-glow">
              <img
                src={headerGif}
                alt="Workout Tracker"
                className="h-9 w-9 object-contain"
              />
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-[0.3em] font-semibold text-brand-600 dark:text-brand-400">
                Workout Tracker
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">v1.0 · Suivi de progression</p>
            </div>
          </div>

          <div className="max-w-3xl space-y-4">
            <h1 className="font-display text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight leading-[1.05]">
              Suivi des entraînements
              <br />
              <span className="text-gradient-brand">et de la progression.</span>
            </h1>
            <p className="max-w-2xl text-base sm:text-lg text-gray-600 dark:text-gray-300 leading-relaxed">
              Consultez votre historique, suivez votre poids, vos pas et découvrez
              les statistiques clés de vos séances. Cette page reste accessible
              sans compte afin de présenter l&apos;application.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <Button onClick={onLogin} className="!px-6 !py-3 text-sm sm:text-base">
              Se connecter
              <span className="ml-1">→</span>
            </Button>
            <a
              href="/privacy"
              className="inline-flex items-center gap-1.5 px-4 py-3 rounded-xl text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/5 transition"
            >
              Politique de confidentialité
            </a>
          </div>
        </header>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((f, i) => (
            <Card key={f.title} className="group animate-fade-up" style={{ animationDelay: `${i * 80}ms` }}>
              <CardContent className="space-y-3">
                <div className="h-11 w-11 grid place-items-center rounded-xl bg-gradient-to-br from-brand-500/15 to-brand-700/5 text-2xl group-hover:scale-110 transition-transform duration-300 ease-spring">
                  {f.emoji}
                </div>
                <h2 className="text-base font-display font-bold">{f.title}</h2>
                <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
                  {f.desc}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="relative overflow-hidden rounded-3xl border border-[var(--border-subtle)] dark:border-white/5 bg-gradient-to-br from-white to-gray-50 dark:from-[#141516] dark:to-[#0f1012] p-6 sm:p-10 shadow-card">
          <div className="absolute -top-24 -right-24 h-64 w-64 rounded-full bg-brand-500/20 blur-3xl pointer-events-none" />
          <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-5">
            <div className="max-w-xl">
              <h3 className="font-display text-xl sm:text-2xl font-bold">Accéder à votre compte</h3>
              <p className="mt-1 text-sm sm:text-base text-gray-600 dark:text-gray-300">
                Connectez-vous pour saisir vos séances et accéder à toutes les fonctionnalités.
              </p>
            </div>
            <Button onClick={onLogin} className="!px-6 !py-3 w-full sm:w-auto">
              Se connecter
            </Button>
          </div>
        </div>

        <footer className="mt-auto pt-8 border-t border-[var(--border-subtle)] dark:border-white/5 text-xs text-gray-500 dark:text-gray-400 flex flex-wrap items-center justify-between gap-3">
          <span>© 2025 Workout Tracker · Tous droits réservés</span>
          <a href="/privacy" className="hover:text-gray-900 dark:hover:text-white transition">
            Politique de confidentialité
          </a>
        </footer>
      </div>
    </div>
  );
}

// ───────────────────────────────────────────────
// Privacy policy
// ───────────────────────────────────────────────
function PrivacyPolicy({ onBack }) {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#0d0d0d] text-gray-900 dark:text-white">
      <div className="mx-auto flex min-h-screen max-w-4xl flex-col gap-6 px-6 py-10">
        <header className="space-y-2">
          <p className="text-xs uppercase tracking-[0.3em] text-gray-500">
            Workout Tracker
          </p>
          <h1 className="text-3xl font-bold">Politique de confidentialité</h1>
          <p className="text-sm text-gray-600 dark:text-gray-300">
            Dernière mise à jour : 25 septembre 2024
          </p>
        </header>

        <Card>
          <CardContent className="space-y-4 text-sm text-gray-700 dark:text-gray-200">
            <section className="space-y-2">
              <h2 className="text-base font-semibold">Données collectées</h2>
              <ul className="list-disc space-y-1 pl-5">
                <li>Email et informations de compte pour l&apos;authentification.</li>
                <li>Données de séances : exercices, séries, poids, répétitions.</li>
                <li>Données de suivi (poids, pas) si vous connectez Google Fit.</li>
              </ul>
            </section>

            <section className="space-y-2">
              <h2 className="text-base font-semibold">Utilisation des données</h2>
              <ul className="list-disc space-y-1 pl-5">
                <li>Fournir le suivi des entraînements et des statistiques.</li>
                <li>Améliorer l&apos;expérience et sécuriser l&apos;accès.</li>
                <li>Mesurer l&apos;activité globale (ex. consultations).</li>
              </ul>
            </section>

            <section className="space-y-2">
              <h2 className="text-base font-semibold">Partage des données</h2>
              <p>
                Vos données ne sont pas vendues. Elles peuvent être traitées par
                des services tiers nécessaires au fonctionnement (Firebase,
                Google Fit) et respectant leurs propres politiques.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="text-base font-semibold">Vos choix</h2>
              <p>
                Vous pouvez modifier ou supprimer vos données depuis
                l&apos;application. Pour toute demande, contactez&nbsp;:
                <a
                  className="ml-1 text-blue-600 hover:underline"
                  href="mailto:contact@workout-tracker.app"
                >
                  contact@workout-tracker.app
                </a>
              </p>
            </section>
          </CardContent>
        </Card>

        <div className="flex items-center gap-3">
          <Button variant="secondary" onClick={onBack}>
            Retour à l&apos;accueil
          </Button>
          <a href="/login" className="text-sm font-medium text-blue-600 hover:underline">
            Se connecter
          </a>
        </div>
      </div>
    </div>
  );
}

// ───────────────────────────────────────────────────────────────
// Auth screen (responsive login / register)
// ───────────────────────────────────────────────────────────────
function AuthScreen({ onBack }) {
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true); setError("");
    try {
      if (mode === "login") await signInEmail(email, password);
      else await signUpEmail(email, password);
    } catch (err) {
      setError(err.message || "Erreur d'authentification");
    } finally { setLoading(false); }
  };

  return (
    <div className="relative min-h-screen grid place-items-center p-4 sm:p-6 overflow-hidden">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute top-10 left-1/2 -translate-x-1/2 h-[380px] w-[380px] rounded-full bg-brand-500/15 blur-3xl" />
        <div className="absolute bottom-0 right-1/4 h-[300px] w-[300px] rounded-full bg-brand-700/10 blur-3xl" />
      </div>

      <Card className="w-full max-w-md animate-scale-in shadow-lift">
        <CardContent className="space-y-5 sm:space-y-6 p-6 sm:p-7">
          <div className="text-center space-y-3">
            <div className="mx-auto grid place-items-center h-14 w-14 rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 shadow-glow">
              <img
                src={headerGif}
                alt="Workout Tracker"
                className="h-9 w-9 object-contain"
              />
            </div>
            <div className="space-y-1">
              <h2 className="font-display text-2xl font-bold text-gradient-brand">
                Workout Tracker
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {mode === "login"
                  ? "Connecte-toi pour retrouver tes données"
                  : "Crée un compte pour commencer"}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 bg-gray-100/80 dark:bg-white/5 rounded-xl p-1 border border-[var(--border-subtle)] dark:border-white/5">
            <button
              onClick={() => setMode("login")}
              className={cn(
                "py-2.5 rounded-lg text-sm font-medium transition-all duration-300 ease-smooth",
                mode === "login"
                  ? "bg-white dark:bg-[#1f2023] shadow-soft text-gray-900 dark:text-white"
                  : "text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
              )}
            >
              Connexion
            </button>
            <button
              onClick={() => setMode("register")}
              className={cn(
                "py-2.5 rounded-lg text-sm font-medium transition-all duration-300 ease-smooth",
                mode === "register"
                  ? "bg-white dark:bg-[#1f2023] shadow-soft text-gray-900 dark:text-white"
                  : "text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
              )}
            >
              Inscription
            </button>
          </div>

          <form onSubmit={submit} className="space-y-4">
            <div className="grid gap-2">
              <Label>Email</Label>
              <Input type="email" required value={email} onChange={(e)=>setEmail(e.target.value)} placeholder="toi@email.com" />
            </div>
            <div className="grid gap-2">
              <Label>Mot de passe</Label>
              <Input type="password" required value={password} onChange={(e)=>setPassword(e.target.value)} placeholder="••••••••" />
            </div>
            {error && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs sm:text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
                {error}
              </div>
            )}
            <Button disabled={loading} className="w-full !py-3 text-sm sm:text-base">
              {loading ? "Patientez…" : (mode === "login" ? "Se connecter" : "Créer le compte")}
            </Button>
          </form>

          <button
            type="button"
            className="w-full text-xs sm:text-sm text-brand-600 dark:text-brand-400 hover:underline text-center"
            onClick={async () => {
              if (!email) {
                alert("Entre ton email pour réinitialiser le mot de passe.");
                return;
              }
              try {
                await resetPassword(email);
                alert("Un email de réinitialisation a été envoyé à " + email);
              } catch (err) {
                alert("Erreur : " + (err.message || err));
              }
            }}
          >
            Mot de passe oublié ?
          </button>

          <div className="relative my-2">
            <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-[var(--border-subtle)] dark:border-white/10" /></div>
            <div className="relative flex justify-center text-[10px] sm:text-xs uppercase tracking-widest">
              <span className="bg-white dark:bg-[#141516] px-3 text-gray-400">ou</span>
            </div>
          </div>

          <Button
            onClick={async()=>{ try{ await signInGoogle(); }catch(e){ setError(e.message);} }}
            variant="secondary"
            className="w-full !py-3 text-sm sm:text-base"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.1a6.62 6.62 0 0 1 0-4.2V7.06H2.18a11 11 0 0 0 0 9.88l3.66-2.84z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.2 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1A11 11 0 0 0 2.18 7.06l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z"/>
            </svg>
            Continuer avec Google
          </Button>

          <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 pt-1">
            <a href="/privacy" className="hover:text-gray-900 dark:hover:text-white transition">Politique de confidentialité</a>
            {onBack && (
              <button type="button" onClick={onBack} className="hover:text-gray-900 dark:hover:text-white transition">
                ← Retour
              </button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ───────────────────────────────────────────────────────────────
// SessionForm (saisie séance responsive)
// ───────────────────────────────────────────────────────────────
function SessionForm({ user, onSavedLocally, customExercises = [], onAddCustomExercise, sessionTemplates = [], onCreateTemplate }) {
  const [templateId, setTemplateId] = useState("");
  const [exercises, setExercises] = useState([]);
  const [exSelect, setExSelect] = useState("");
  const [date, setDate] = useState(todayISO);
  const [timers, setTimers] = useState({});
  const [globalTimer, setGlobalTimer] = useState({
    running: false,
    startTime: null,
    seconds: 0,
  });
  
// 🔄 Restaure la séance sauvegardée localement si elle existe
useEffect(() => {
  try {
    const raw = localStorage.getItem(SESSION_DRAFT_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      // ❌ On ne restaure PAS la date depuis le cache
      // La date doit toujours être celle du jour
      setDate(todayISO());
      if (parsed.exercises) setExercises(parsed.exercises);
      if (parsed.templateId) setTemplateId(parsed.templateId);
      if (parsed.timers) setTimers(parsed.timers);
      if (parsed.globalTimer) setGlobalTimer(parsed.globalTimer);
    }

    // ✅ Restaure les chronos d'exercices avec recalcul du temps écoulé
    const savedTimers = localStorage.getItem("workout-tracker-exercise-timers");
    if (savedTimers) {
      const parsed = JSON.parse(savedTimers);
      const updated = {};
      Object.entries(parsed).forEach(([exId, t]) => {
        if (t.running && t.startTime) {
          const elapsed = Math.floor((Date.now() - t.startTime) / 1000);
          updated[exId] = { ...t, seconds: elapsed };
        } else {
          updated[exId] = t;
        }
      });
      setTimers(updated);
    }

    // ✅ Restaure le chrono global correctement
    const savedGlobalTimer = localStorage.getItem("workout-tracker-global-timer");
    if (savedGlobalTimer) {
      const parsedTimer = JSON.parse(savedGlobalTimer);
      if (parsedTimer.running && parsedTimer.startTime) {
        const elapsed = Math.floor((Date.now() - parsedTimer.startTime) / 1000);
        setGlobalTimer({ ...parsedTimer, seconds: elapsed });
      } else {
        setGlobalTimer(parsedTimer);
      }
    }

    console.log("⚡ Séance et chronos restaurés depuis le cache local !");
  } catch (e) {
    console.warn("Impossible de charger la séance en cache:", e);
  }
}, []);


  useEffect(() => {
  localStorage.setItem("workout-tracker-exercise-timers", JSON.stringify(timers));
}, [timers]);

  // 🔁 Chrono global basé sur le temps réel
  useEffect(() => {
    let interval = null;
    if (globalTimer.running && globalTimer.startTime) {
      interval = setInterval(() => {
        const elapsed = Math.floor((Date.now() - globalTimer.startTime) / 1000);
        setGlobalTimer((cur) => ({ ...cur, seconds: elapsed }));
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [globalTimer.running, globalTimer.startTime]);

    // 💾 Sauvegarde automatique du chrono global dans le cache
  useEffect(() => {
    localStorage.setItem(
      "workout-tracker-global-timer",
      JSON.stringify(globalTimer)
    );
  }, [globalTimer]);

  const availableExercises = useMemo(() => {
    const tpl = sessionTemplates.find((t) => t.id === templateId);
    const base = tpl ? tpl.exercises : [];
    return Array.from(new Set([...base, ...customExercises]));
  }, [templateId, sessionTemplates, customExercises]);

  const totalTonnage = useMemo(() => exercises.reduce((acc, ex) => acc + volumeOfSets(ex.sets), 0), [exercises]);

  const addExercise = () => {
    if (!exSelect) return;
    setExercises((cur) => [
      ...cur,
      { id: uuidv4(), name: exSelect, sets: [{ reps: "", weight: "" }] }
    ]);
    setExSelect("");
  };

  const addCustom = () => {
    const name = window.prompt("Nom du nouvel exercice ?");
    if (name && name.trim()) {
      onAddCustomExercise(name.trim());
      setExSelect(name.trim());
    }
  };

  const updateSet = (exId, idx, field, value) => {
    setExercises((cur) =>
      cur.map((ex) => (ex.id === exId
        ? { ...ex, sets: ex.sets.map((s, i) => (i === idx ? { ...s, [field]: value } : s)) }
        : ex))
    );
  };

  const addSetRow = (exId) =>
    setExercises((cur) => cur.map((ex) => (ex.id === exId ? { ...ex, sets: [...ex.sets, { reps: "", weight: "" }] } : ex)));

  const removeExercise = (exId) => setExercises((cur) => cur.filter((e) => e.id !== exId));

  const saveSession = async () => {
    if (!date || exercises.length === 0) return alert("Ajoute au moins un exercice.");
    const cleaned = exercises
      .map((ex) => ({ ...ex, sets: ex.sets.filter((s) => s.reps !== "" && s.weight !== "") }))
      .filter((ex) => ex.sets.length > 0);
    if (cleaned.length === 0) return alert("Renseigne au moins une série valide.");

    const tplName = templateId
      ? (sessionTemplates.find(t => t.id === templateId)?.name || "Séance")
      : "Libre";

    const exerciseDurations = {};
    Object.entries(timers).forEach(([exId, t]) => {
      exerciseDurations[exId] = t.seconds || 0;
    });

    const totalDuration = globalTimer.seconds;

    const session = {
      id: uuidv4(),
      date: date || toLocalISO(new Date()),
      type: tplName,
      exercises: cleaned,
      createdAt: new Date().toISOString(),
      totalDuration,
      exerciseDurations,
      user_email: user.email,
    };

    try {
      await upsertSessions(user.id, [session], user.email);
    } catch (e) {
      console.error(e);
      alert("Impossible d’enregistrer sur le cloud : " + (e?.message || e));
      return;
    }

    onSavedLocally?.(session);
    setExercises([]);
    localStorage.removeItem(SESSION_DRAFT_KEY); // 🧹 nettoie le cache après enregistrement

  };

    // Sauvegarde automatique dans localStorage
  useEffect(() => {
    const payload = {
      date,
      exercises,
      templateId,
      timers,
      globalTimer,
    };
    localStorage.setItem(SESSION_DRAFT_KEY, JSON.stringify(payload));
  }, [date, exercises, templateId, timers, globalTimer]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 sm:gap-4">
      {/* Colonne gauche */}
      <Card className="lg:col-span-1">
        <CardContent className="space-y-4">
          <div className="grid gap-2">
            <Label>Date</Label>
            <Input type="date" lang="fr-FR" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>

          {/* Sélection template */}
          <div className="grid gap-2">
            <Label>Séance (template)</Label>
            <div className="flex flex-col sm:flex-row gap-2">
              <select
                className="w-full rounded-lg border p-2 text-sm"
                value={templateId}
                onChange={(e) => {
                  const id = e.target.value;
                  setTemplateId(id);
                  if (!id) return;
                  const tpl = sessionTemplates.find((t) => t.id === id);
                  if (tpl) {
                    setExercises(tpl.exercises.map((name) => ({
                      id: uuidv4(),
                      name,
                      sets: [{ reps: "", weight: "" }],
                    })));
                  }
                }}
              >
                <option value="">— Sélectionner —</option>
                {sessionTemplates.map((t) => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>

              <Button
                variant="secondary"
                onClick={() => {
                  const name = window.prompt("Nom de la nouvelle séance ?");
                  if (!name || !name.trim()) return;
                  const chosen = exercises.map((ex) => ex.name);
                  if (chosen.length === 0) {
                    alert("Ajoute d’abord au moins un exercice pour enregistrer un template.");
                    return;
                  }
                  onCreateTemplate?.({ id: uuidv4(), name: name.trim(), exercises: chosen });
                }}
              >
                Sauver comme séance
              </Button>
            </div>
            <div className="text-xs text-gray-500">Le template pré-remplit la séance.</div>
          </div>

          {/* Ajout exercice */}
          <div className="grid gap-2">
            <Label>Ajouter un exercice</Label>
            <div className="flex gap-2">
              <select
                className="w-full rounded-lg border p-2 text-sm"
                value={exSelect}
                onChange={(e) => setExSelect(e.target.value)}
              >
                <option value="">— Sélectionner —</option>
                {availableExercises.map((name) => (<option key={name} value={name}>{name}</option>))}
              </select>
              <Button onClick={addExercise} title="Ajouter"><Plus className="h-4 w-4" /></Button>
              <Button variant="secondary" onClick={addCustom} title="Créer un exercice">Custom</Button>
            </div>
          </div>

          <div className="border rounded-lg p-2 sm:p-3 bg-gray-50 dark:bg-[#1c1c1c]">
            <div className="text-xs sm:text-sm text-gray-600">Tonnage total (Σ reps × poids)</div>
            <div className="text-lg sm:text-2xl font-semibold">{Math.round(totalTonnage)} kg</div>
          </div>

          <Button className="w-full" onClick={saveSession}>
            <Save className="h-4 w-4 mr-2" /> Enregistrer la séance
          </Button>
        </CardContent>
      </Card>

      {/* Colonne droite (liste exos) */}
      <div className="lg:col-span-2 space-y-3 sm:space-y-4">
        {(templateId || exercises.length > 0) && (
          <div className="border rounded-lg p-3 sm:p-4 bg-gray-50 dark:bg-[#1c1c1c] mb-4">
            <div className="text-sm sm:text-base font-medium text-gray-700 mb-2">
              ⏱️ Chrono de la séance :
              <span className="ml-1 font-mono font-semibold">
                {String(Math.floor(globalTimer.seconds / 60)).padStart(2, "0")} minutes,{" "}
                {String(globalTimer.seconds % 60).padStart(2, "0")} secondes
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
<Button
  variant={globalTimer.running ? "destructive" : "secondary"}
  onClick={() => {
    setGlobalTimer((cur) => {
      if (!cur.running) {
        // ▶️ On relance → recalcule un nouveau startTime
        return {
          ...cur,
          running: true,
          startTime: Date.now() - cur.seconds * 1000, // ✅ reprend là où on s'était arrêté
        };
      } else {
        // ⏸ On met en pause → on fige juste les secondes
        const elapsed = Math.floor((Date.now() - cur.startTime) / 1000);
        return { ...cur, running: false, seconds: elapsed };
      }
    });
  }}
>
  {globalTimer.running ? "Mettre pause sur le chrono" : "Lancer le chrono"}
</Button>

              <Button
                variant="ghost"
                onClick={() => setGlobalTimer({ running: false, seconds: 0 })}
              >
                Réinitialiser le chrono
              </Button>
            </div>
          </div>
        )}

        {exercises.length === 0 ? (
          <EmptyState />
        ) : (
          exercises.map((ex) => (
            <Card key={ex.id}>
              <CardContent>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold text-sm sm:text-lg">{ex.name}</h3>
                  <Button variant="destructive" onClick={() => removeExercise(ex.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>

                <div className="grid grid-cols-3 gap-2 text-xs sm:text-sm font-medium text-gray-600 mb-1">
                  <div>Série</div><div>Réps</div><div>Poids (kg)</div>
                </div>

                {ex.sets.map((s, i) => (
                  <div key={i} className="grid grid-cols-4 gap-2 mb-1 items-center">
                    <div className="text-gray-600">{i + 1}</div>
                    <Input
                      inputMode="numeric"
                      placeholder="10"
                      value={s.reps}
                      onChange={(e) => updateSet(ex.id, i, "reps", e.target.value.replace(/[^0-9]/g, ""))}
                    />
                    <Input
                      type="text"
                      inputMode="decimal"
                      placeholder="40,5"
                      value={s.weight}
                      onChange={(e) =>
                        updateSet(
                          ex.id,
                          i,
                          "weight",
                          normalizeDecimalInput(
                            e.target.value.replace(/[^0-9.,]/g, "")
                          )
                        )
                      }
                    />
                    <Button
                      variant="destructive"
                      onClick={() =>
                        setExercises((cur) =>
                          cur.map((e2) =>
                            e2.id === ex.id
                              ? { ...e2, sets: e2.sets.filter((_, j) => j !== i) }
                              : e2
                          )
                        )
                      }
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}

                <div className="flex justify-end mt-2">
                  <Button variant="secondary" onClick={() => addSetRow(ex.id)}>
                    <Plus className="h-4 w-4 mr-1" /> Ajouter une série
                  </Button>
                </div>

                <div className="mt-3">
                  <Label>Commentaire</Label>
                  <Input
                    placeholder="Ex: ressenti, charge perçue, douleur, note de la séance..."
                    value={ex.comment || ""}
                    onChange={(e) =>
                      setExercises((cur) =>
                        cur.map((e2) =>
                          e2.id === ex.id ? { ...e2, comment: e.target.value } : e2
                        )
                      )
                    }
                  />
                </div>

                <Chrono exId={ex.id} timers={timers} setTimers={setTimers} />
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}


function EmptyState() {
  return (
    <div className="h-40 sm:h-48 border rounded-xl grid place-items-center text-center bg-white">
      <div className="max-w-md px-4 sm:px-6">
        <BarChart3 className="mx-auto mb-2" />
        <p className="text-xs sm:text-sm text-gray-600">
          Ajoute des exercices à ta séance pour commencer le suivi (réps × poids).
        </p>
      </div>
    </div>
  );
}
// App.jsx (Bloc 3)

// ───────────────────────────────────────────────────────────────
// SessionList (Historique des séances)
// ───────────────────────────────────────────────────────────────
function SessionList({ user, sessions, onDelete, onEdit, setTab }) {
  const [filter, setFilter] = useState("ALL"); // ALL | PUSH | PULL | FULL
  const types = useMemo(() => {
    const t = new Set(sessions.map(s => s.type || "Libre"));
    return ["ALL", ...Array.from(t)];
  }, [sessions]);

  const filtered = useMemo(() => {
    if (!sessions) return [];
    if (filter === "ALL") return sessions;
    return sessions.filter(s => (s.type || "Libre") === filter);
  }, [sessions, filter]);

if (!sessions || sessions.length === 0) {
  return (
    <div className="min-h-[300px] flex flex-col items-center justify-center text-center space-y-4">
      <Dumbbell className="h-10 w-10 text-gray-400" />
      <h3 className="text-lg font-semibold text-gray-700">Aucun historique disponible</h3>
      <p className="text-sm text-gray-500 max-w-sm">
        Tu n’as pas encore enregistré de séance. Commence dès maintenant en cliquant sur 
        <span className="font-semibold"> "Saisir une séance"</span> dans le menu.
      </p>
      <Button variant="default" onClick={() => setTab("log")}>
        + Enregistrer ma première séance
      </Button>
    </div>
  );
}

    const allTypes = useMemo(
      () => Array.from(new Set(sessions.map(s => s.type || "Libre"))),
      [sessions]
    );
  return (
    <div className="space-y-3 sm:space-y-4">
      <FilterBar filter={filter} setFilter={setFilter} total={filtered.length} types={types} />
      {filtered.length === 0 ? (
        <Card>
          <CardContent className="p-3 sm:p-4 text-xs sm:text-sm text-gray-600">
            Aucune séance trouvée pour ce filtre.
          </CardContent>
        </Card>
      ) : (
        filtered.map((s) => (

  <SessionCard
  key={s.id}
  session={s}
  onDelete={async () => {
    try {
      await onDelete(s.id);
    } catch (e) {
      console.error("Erreur suppression séance:", e);
      alert("Impossible de supprimer la séance : " + (e?.message || e));
    }
  }}
  onEdit={onEdit}
  allTypes={allTypes}
/>

        ))
      )}
    </div>
  );
}

function FilterBar({ filter, setFilter, total, types }) {
  return (
    <Card>
      <CardContent className="p-2 sm:p-3 flex flex-wrap items-center gap-2 justify-between">
        <div className="flex gap-2 flex-wrap">
          {types.map(t => (
            <Button
              key={t}
              variant={filter === t ? "default" : "secondary"}
              onClick={() => setFilter(t)}
            >
              {t === "ALL" ? "Tout" : t}
            </Button>
          ))}
        </div>
        {typeof total === "number" && (
          <div className="text-xs sm:text-sm text-gray-600">Séances: {total}</div>
        )}
      </CardContent>
    </Card>
  );
}

// ───────────────────────────────────────────────────────────────
// SessionCard (affichage + édition séance individuelle)
// ───────────────────────────────────────────────────────────────
function SessionCard({ session, onDelete, onEdit, allTypes = [] }) {
  if (!session) return null;   // ⬅ sécurité anti-écran blanc

  const [editing, setEditing] = useState(false);
  const [local, setLocal] = useState(session);

  useEffect(() => setLocal(session), [session]);
  const tonnage = useMemo(() => computeSessionTonnage(local), [local]);

  const save = async () => {
    setEditing(false);
    await onEdit(local);
  };

  // 📸 Fonction d'export en image de la carte séance
const exportSessionAsImage = async () => {
  try {
    if (!cardRef.current) return;

    const canvas = await html2canvas(cardRef.current, {
      scale: 3,
      useCORS: true,
      backgroundColor: getComputedStyle(document.body).backgroundColor,
    });

    const blob = await new Promise((resolve) =>
      canvas.toBlob(resolve, "image/png")
    );

    const fileName = `seance-${local.type || "Libre"}-${local.date || "date"}.png`;

    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const isAndroid = /Android/.test(navigator.userAgent);

    // 🟢 ANDROID → partage natif
    if (
      isAndroid &&
      navigator.canShare &&
      navigator.canShare({ files: [new File([blob], fileName)] })
    ) {
      const file = new File([blob], fileName, { type: "image/png" });

      await navigator.share({
        title: "🏋️ Ma séance",
        text: "Voici ma séance sur Workout Tracker 💪",
        files: [file],
      });
      return;
    }

    // 🟠 iOS & PC → téléchargement
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);

    if (isIOS) {
      alert("📲 Image enregistrée. Tu peux maintenant la partager depuis Photos.");
    }
  } catch (e) {
    console.error("Export error:", e);
    alert("Impossible d’exporter la séance.");
  }
};
const cardRef = React.useRef(null);

  return (
<Card ref={cardRef}>
      <CardContent className="p-3 sm:p-4 space-y-2 sm:space-y-3">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
                        <div className="text-xs sm:text-sm text-gray-500 flex items-center gap-2">
                        {editing ? (
                          <div className="flex flex-wrap items-center gap-2">
                            {/* Date */}
                            <input
                              type="date"
                              lang="fr-FR"
                              value={local.date}
                              onChange={(e) =>
                                setLocal((cur) => ({ ...cur, date: e.target.value }))
                              }
                              className="border rounded px-2 py-1 text-xs"
                            />
                        
                            {/* Type de séance */}
                            <select
                              value={local.type || "Libre"}
                              onChange={(e) =>
                                setLocal((cur) => ({ ...cur, type: e.target.value }))
                              }
                              className="border rounded px-2 py-1 text-xs"
                            >
                              <option value="Libre">Libre</option>
                              {allTypes
                                .filter((t) => t !== "Libre")
                                .map((t) => (
                                  <option key={t} value={t}>
                                    {t}
                                  </option>
                                ))}
                            </select>
                          </div>
                        ) : (
                          <>
                            {prettyDate(local.date)} • {local.type}
                          </>
                        )}
            </div>
            <div className="text-lg sm:text-2xl font-semibold">{Math.round(tonnage)} kg</div>
            {local.totalDuration !== undefined && (
              <div className="text-xs sm:text-sm text-gray-600">
                ⏱️ Durée totale : {Math.floor(local.totalDuration / 60)} min {local.totalDuration % 60}s
              </div>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {editing ? (
              <>
                <Button
                  onClick={() => {
                    if (window.confirm("Voulez-vous sauvegarder vos modifications et écraser les anciennes saisies ?")) {
                      save();
                    }
                  }}
                >
                  <Save className="h-4 w-4 mr-1" /> Sauvegarder
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => {
                    if (window.confirm("Êtes-vous sûrs ? Toutes vos modifications ne seront pas prises en compte !")) {
                      setLocal(session);
                      setEditing(false);
                    }
                  }}
                >
                  Annuler
                </Button>
              </>
            ) : (
              <Button variant="secondary" onClick={() => setEditing(true)}>
                <Edit3 className="h-4 w-4 mr-1" /> Éditer
              </Button>
            )}
            <Button
              variant="destructive"
              onClick={() => {
                if (window.confirm("Voulez-vous vraiment supprimer cette séance ?")) {
                  onDelete();
                }
              }}
            >
              <Trash2 className="h-4 w-4 mr-1" /> Supprimer
            </Button>
<Button
  variant="secondary"
  onClick={exportSessionAsImage}
  title="Exporter la séance"
>
  <Share2 className="h-4 w-4 mr-1" /> Partager
</Button>
            
            {editing && (
              <Button
                variant="secondary"
                onClick={() =>
                  setLocal((cur) => ({
                    ...cur,
                    exercises: [
                      ...cur.exercises,
                      {
                        id: uuidv4(),
                        name: window.prompt("Nom du nouvel exercice ?") || "Nouvel exercice",
                        sets: [{ reps: "", weight: "" }],
                      },
                    ],
                  }))
                }
              >
                + Ajouter un exercice
              </Button>
            )}
          </div>
        </div>

        {/* Liste exercices */}
        <div className="space-y-3 sm:space-y-4">
          {local.exercises.map((ex, idx) => (
            <div key={ex.id} className="border rounded-lg sm:rounded-xl p-2 sm:p-3 bg-gray-50 dark:bg-[#1c1c1c]">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-2 gap-1">
                <div className="font-medium text-sm sm:text-base">{ex.name}</div>
                {local.exerciseDurations?.[ex.id] && (
                  <div className="text-xs text-gray-500">
                    Temps : {Math.floor(local.exerciseDurations[ex.id] / 60)} min {local.exerciseDurations[ex.id] % 60}s
                  </div>
                )}
                <div className="text-xs sm:text-sm">
                  Sous-total: <span className="font-semibold">{Math.round(volumeOfSets(ex.sets))} kg</span>
                </div>
              </div>

              {editing ? (
                <>
                  <div className="grid grid-cols-3 gap-2 text-xs sm:text-sm font-medium text-gray-600 mb-1">
                    <div>Série</div><div>Réps</div><div>Poids</div>
                  </div>
                  {ex.sets.map((s, i) => (
                    <div key={i} className="grid grid-cols-4 gap-2 items-center mb-1">
                      <div className="text-gray-600">{i + 1}</div>
                      <Input
                        value={s.reps}
                        onChange={(e) =>
                          setLocal((cur) => ({
                            ...cur,
                            exercises: cur.exercises.map((e2, j) =>
                              j === idx
                                ? { ...e2, sets: e2.sets.map((ss, k) => (k === i ? { ...ss, reps: e.target.value } : ss)) }
                                : e2
                            ),
                          }))
                        }
                      />
                      <Input
                        value={s.weight}
                        onChange={(e) =>
                          setLocal((cur) => ({
                            ...cur,
                            exercises: cur.exercises.map((e2, j) =>
                              j === idx
                                ? { ...e2, sets: e2.sets.map((ss, k) => (k === i ? { ...ss, weight: e.target.value } : ss)) }
                                : e2
                            ),
                          }))
                        }
                      />
                      <Button
                        variant="destructive"
                        onClick={() =>
                          setLocal((cur) => ({
                            ...cur,
                            exercises: cur.exercises.map((e2, j) =>
                              j === idx
                                ? { ...e2, sets: e2.sets.filter((_, k) => k !== i) }
                                : e2
                            ),
                          }))
                        }
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                  <div className="flex justify-end mt-1">
                    <Button
                      variant="secondary"
                      onClick={() =>
                        setLocal((cur) => ({
                          ...cur,
                          exercises: cur.exercises.map((e2, j) =>
                            j === idx
                              ? { ...e2, sets: [...e2.sets, { reps: "", weight: "" }] }
                              : e2
                          ),
                        }))
                      }
                    >
                      + Ajouter une série
                    </Button>
                  </div>
                </>
              ) : (
                <>
                  {ex.sets.map((s, i) => (
                    <div key={i} className="grid grid-cols-3 gap-2 items-center mb-1 text-xs sm:text-sm">
                      <div className="text-gray-600">{i + 1}</div>
                      <div>{s.reps}</div>
                      <div>{s.weight} kg</div>
                    </div>
                  ))}

                  {/* Champ commentaire visible / éditable */}
                  <div className="mt-2">
                    <Label>Commentaire</Label>
                    {editing ? (
                      <Input
                        value={ex.comment || ""}
                        onChange={(e) =>
                          setLocal((cur) => ({
                            ...cur,
                            exercises: cur.exercises.map((e2, j) =>
                              j === idx ? { ...e2, comment: e.target.value } : e2
                            ),
                          }))
                        }
                      />
                    ) : (
                      <div className="text-xs sm:text-sm text-gray-700 italic">
                        {ex.comment || "— Aucun commentaire —"}
                      </div>
                    )}
                  </div>
                </>
              )}

              {editing && (
                <div className="mt-2 flex">
                  <Button
                    variant="destructive"
                    onClick={() =>
                      setLocal((cur) => ({
                        ...cur,
                        exercises: cur.exercises.filter((_, j) => j !== idx),
                      }))
                    }
                  >
                    Supprimer l’exercice
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}


// App.jsx (Bloc 4)

// ───────────────────────────────────────────────────────────────
// Analytics (graphiques + calendrier)
// ───────────────────────────────────────────────────────────────

function Analytics({ sessions, sessionTemplates = [], hideCalendar = false, hideFrequency = false, hideRecentSplit = false, showSectionHeaders = false, onlyCurves = false, onlyTables = false }) {
  // Exos filtrés : uniquement ceux avec des données
  const allExercises = useMemo(() => {
    if (!sessions || sessions.length === 0) return [];
    const names = sessions.flatMap(s => s.exercises.map(ex => ex.name));
    return Array.from(new Set(names));
  }, [sessions]);
  const allTypes = useMemo(() => {
    if (!sessions || sessions.length === 0) return [];
    return Array.from(new Set(sessions.map((s) => s.type || "Libre")));
  }, [sessions]);

  // Sélecteurs initiaux
  const [exerciseTS, setExerciseTS] = useState(allExercises[0] || "");
  const [exerciseSetTon, setExerciseSetTon] = useState(allExercises[0] || "");
  const [exerciseTonnage, setExerciseTonnage] = useState(allExercises[0] || "");
  const [intensityTypeFilter, setIntensityTypeFilter] = useState("ALL");
  const [sessionTypeTonnage, setSessionTypeTonnage] = useState("ALL");
  const [exerciseTemplateFilter, setExerciseTemplateFilter] = useState("ALL");
  const [typeMonthStart, setTypeMonthStart] = useState("");
  const [typeMonthEnd, setTypeMonthEnd] = useState("");
  const [exerciseMonthStart, setExerciseMonthStart] = useState("");
  const [exerciseMonthEnd, setExerciseMonthEnd] = useState("");

  const { firstSessionDate, firstSessionMonth, lastSessionMonth } = useMemo(() => {
    if (!sessions.length) {
      return {
        firstSessionDate: null,
        firstSessionMonth: "",
        lastSessionMonth: "",
      };
    }
    const sortedDates = sessions.map((s) => s.date).sort();
    const firstDate = sortedDates[0];
    const lastDate = sortedDates[sortedDates.length - 1];
    return {
      firstSessionDate: firstDate,
      firstSessionMonth: firstDate.slice(0, 7),
      lastSessionMonth: lastDate.slice(0, 7),
    };
  }, [sessions]);
  
  const today = todayISO();
  
  const [startDate, setStartDate] = useState(firstSessionDate || today);
  const [endDate, setEndDate] = useState(today);

  useEffect(() => {
  if (startDate > endDate) {
    setEndDate(startDate);
  }
  }, [startDate, endDate]);

  useEffect(() => {
  if (firstSessionDate) {
    setStartDate(firstSessionDate);
  }
  }, [firstSessionDate]);

  useEffect(() => {
    if (!typeMonthStart && firstSessionMonth) {
      setTypeMonthStart(firstSessionMonth);
    }
    if (!typeMonthEnd && lastSessionMonth) {
      setTypeMonthEnd(lastSessionMonth);
    }
    if (!exerciseMonthStart && firstSessionMonth) {
      setExerciseMonthStart(firstSessionMonth);
    }
    if (!exerciseMonthEnd && lastSessionMonth) {
      setExerciseMonthEnd(lastSessionMonth);
    }
  }, [
    typeMonthStart,
    typeMonthEnd,
    exerciseMonthStart,
    exerciseMonthEnd,
    firstSessionMonth,
    lastSessionMonth,
  ]);

  const filteredSessionsByDate = useMemo(() => {
  return sessions.filter(s =>
    s.date >= startDate && s.date <= endDate
  );
  }, [sessions, startDate, endDate]);
  
   const avgSessionsPerWeek = useMemo(
    () =>
      computeAvgSessionsPerWeek(
        sessions,
        startDate,
        endDate
      ),
    [sessions, startDate, endDate]
  );
  useEffect(() => {
  if (!sessionTypeTonnage) setSessionTypeTonnage("ALL");
  }, [sessionTypeTonnage]);

  useEffect(() => {
    if (
      exerciseTemplateFilter !== "ALL" &&
      exerciseTemplateFilter !== "OTHERS" &&
      !sessionTemplates.some((tpl) => tpl.id === exerciseTemplateFilter)
    ) {
      setExerciseTemplateFilter("ALL");
    }
  }, [exerciseTemplateFilter, sessionTemplates]);
  
  useEffect(() => {
  setIntensityTypeFilter("ALL");
  }, []);

  useEffect(() => {
    if (!exerciseTS && allExercises.length) setExerciseTS(allExercises[0]);
    if (!exerciseSetTon && allExercises.length) setExerciseSetTon(allExercises[0]);
    if (!exerciseTonnage && allExercises.length) setExerciseTonnage(allExercises[0]); // 👈 AJOUT
  }, [allExercises, exerciseTS, exerciseSetTon, exerciseTonnage]);

  // Données calculées
  const intensitySeries = useMemo(
    () => buildAvgIntensitySeries(sessions, intensityTypeFilter),
    [sessions, intensityTypeFilter]
  );
  const weeklyFreq     = useMemo(() => buildSessionsPerWeekSeries(sessions), [sessions]);
  const splitRecent    = useMemo(() => buildTypeSplitLastNDays(sessions, 30), [sessions]);
  const topSet         = useMemo(() => buildTopSetSeriesByExercise(sessions, exerciseTS), [sessions, exerciseTS]);
  const setTonnage     = useMemo(() => buildExerciseSetTonnageSeries(sessions, exerciseSetTon), [sessions, exerciseSetTon]);
  const tonnageEvolution = useMemo(
  () => buildExerciseTonnageOverTime(sessions, exerciseTonnage),
  [sessions, exerciseTonnage]
  );
  const tonnageByTypeSeries = useMemo(
  () =>
    buildTonnageBySessionTypeOverTime(
      sessions,
      sessionTypeTonnage
    ),
  [sessions, sessionTypeTonnage]
  );
  const [exerciseLast3, setExerciseLast3] = useState(allExercises[0] || "");
  useEffect(() => {
    if (!exerciseLast3 && allExercises.length) setExerciseLast3(allExercises[0]);
  }, [allExercises, exerciseLast3]);
  const [typeProgressSort, setTypeProgressSort] = useState({
    key: "label",
    direction: "asc",
  });
  const [exerciseProgressSort, setExerciseProgressSort] = useState({
    key: "label",
    direction: "asc",
  });
  const exerciseProgressSessions = useMemo(() => {
    if (exerciseTemplateFilter === "LIBRE") {
      return sessions.filter((s) => (s.type || "Libre") === "Libre");
    }
    return sessions;
  }, [exerciseTemplateFilter, sessions]);
  const toggleProgressSort = (setSort, key) => {
    setSort((prev) => ({
      key,
      direction: prev.key === key && prev.direction === "asc" ? "desc" : "asc",
    }));
  };
  const sortIndicator = (sortState, key) =>
    sortState.key === key ? (sortState.direction === "asc" ? "▲" : "▼") : "↕";

  const typeProgressRows = useMemo(() => {
    const sessionsInRange = filterSessionsByMonthRange(
      sessions,
      typeMonthStart,
      typeMonthEnd
    );
    const rows = allTypes
      .filter((type) => type && type.toLowerCase() !== "libre")
      .map((type) => {
        const first = getFirstSessionByType(sessions, type, typeMonthStart);
        const last = getLastSessionByType(sessions, type, typeMonthEnd);
        const sessionCount = sessionsInRange.filter(
          (session) => (session.type || "Libre") === type
        ).length;
      const session1 = first ? Math.round(computeSessionTonnage(first)) : null;
      const session2 = last ? Math.round(computeSessionTonnage(last)) : null;
      const progressPercent =
        session1 > 0 && session2 !== null
          ? ((session2 - session1) / session1) * 100
          : null;
      return {
        label: type,
        sessionCount,
        session1,
        session1Date: first?.date || null,
        session2,
        session2Date: last?.date || null,
        progressPercent,
      };
      });
    const compare = (a, b) => {
      const { key, direction } = typeProgressSort;
      if (key === "label") {
        const labelA = a.label?.toLowerCase() ?? "";
        const labelB = b.label?.toLowerCase() ?? "";
        return direction === "desc"
          ? labelB.localeCompare(labelA, "fr")
          : labelA.localeCompare(labelB, "fr");
      }
      const valA = a[key];
      const valB = b[key];
      if (valA === null && valB === null) return 0;
      if (valA === null) return 1;
      if (valB === null) return -1;
      return direction === "desc" ? valB - valA : valA - valB;
    };
    return rows.sort(compare);
  }, [allTypes, sessions, typeMonthStart, typeMonthEnd, typeProgressSort]);

  const templateExerciseSet = useMemo(
    () => new Set(sessionTemplates.flatMap((tpl) => tpl.exercises || [])),
    [sessionTemplates]
  );

  const exerciseProgressExercises = useMemo(() => {
    if (exerciseTemplateFilter === "ALL") return allExercises;
    if (exerciseTemplateFilter === "LIBRE") {
      const libreExercises = sessions
        .filter((session) => (session.type || "Libre") === "Libre")
        .flatMap((session) => session.exercises.map((ex) => ex.name));
      return Array.from(new Set(libreExercises));
    }
    if (exerciseTemplateFilter === "OTHERS") {
      return allExercises.filter((exercise) => !templateExerciseSet.has(exercise));
    }
    const template = sessionTemplates.find((tpl) => tpl.id === exerciseTemplateFilter);
    if (!template) return [];
    const templateExercises = new Set(template.exercises || []);
    return allExercises.filter((exercise) => templateExercises.has(exercise));
  }, [
    allExercises,
    exerciseTemplateFilter,
    sessions,
    sessionTemplates,
    templateExerciseSet,
  ]);

  const exerciseProgressRows = useMemo(() => {
    const getSessionKey = (session) => session?.id || session?.date || "";
    const sessionsInRange = filterSessionsByMonthRange(
      exerciseProgressSessions,
      exerciseMonthStart,
      exerciseMonthEnd
    );
    const rows = exerciseProgressExercises
      .map((exercise) => {
        const first = getFirstSessionByExercise(
          exerciseProgressSessions,
          exercise,
          exerciseMonthStart
        );
        const last = getLastSessionByExercise(
          exerciseProgressSessions,
          exercise,
          exerciseMonthEnd
        );
      const sessionCount = sessionsInRange.filter((session) =>
        session.exercises.some((ex) => ex.name === exercise)
      ).length;
      const session1 = first ? Math.round(computeExerciseTonnageInSession(first, exercise)) : null;
      const session2 = last ? Math.round(computeExerciseTonnageInSession(last, exercise)) : null;
      const progressPercent =
        session1 > 0 && session2 !== null
          ? ((session2 - session1) / session1) * 100
          : null;
      return {
        label: exercise,
        sessionCount,
        session1,
        session1Date: first?.date || null,
        session1Key: getSessionKey(first),
        session2,
        session2Date: last?.date || null,
        session2Key: getSessionKey(last),
        progressPercent,
      };
      })
      .filter(
        (row) =>
          row.session1Key &&
          row.session2Key &&
          row.session1Key !== row.session2Key
      );
    const compare = (a, b) => {
      const { key, direction } = exerciseProgressSort;
      if (key === "label") {
        const labelA = a.label?.toLowerCase() ?? "";
        const labelB = b.label?.toLowerCase() ?? "";
        return direction === "desc"
          ? labelB.localeCompare(labelA, "fr")
          : labelA.localeCompare(labelB, "fr");
      }
      const valA = a[key];
      const valB = b[key];
      if (valA === null && valB === null) return 0;
      if (valA === null) return 1;
      if (valB === null) return -1;
      return direction === "desc" ? valB - valA : valA - valB;
    };
    return rows.sort(compare);
  }, [
    exerciseProgressExercises,
    exerciseProgressSessions,
    exerciseMonthStart,
    exerciseMonthEnd,
    exerciseProgressSort,
  ]);

  return (
    <div className="space-y-6">
      {/* Bloc 1 : Calendrier + Heatmap */}
      {!onlyCurves && !onlyTables && (!hideCalendar || !hideFrequency) && (
      <div className="grid md:grid-cols-2 gap-4">
        {!hideCalendar && <MonthlyCalendar sessions={sessions} />}
        {!hideFrequency && <Card>
        <CardContent className="p-5 sm:p-6 space-y-4">
          {/* Header */}
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 flex items-center gap-2">
                📊 Fréquence moyenne d’entraînement
              </h3>
      
              <div className="mt-3 flex items-baseline gap-2">
                <span className="text-4xl sm:text-5xl font-extrabold tracking-tight">
                  {avgSessionsPerWeek.toFixed(2)}
                </span>
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  / semaine
                </span>
              </div>
      
              <p className="mt-1 text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                Moyenne calculée sur la période sélectionnée
              </p>
            </div>
      
            <div className="h-12 w-12 rounded-xl bg-green-100 dark:bg-green-500/20 
                            flex items-center justify-center text-green-600 dark:text-green-400 text-xl">
              🏋️
            </div>
          </div>
      
          {/* Filtres dates */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 border-t">
            <div>
              <Label>Date de début</Label>
              <Input
                type="date"
                lang="fr-FR"
                value={startDate}
                min={firstSessionDate || undefined}
                max={endDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>

            <div>
              <Label>Date de fin</Label>
              <Input
                type="date"
                lang="fr-FR"
                value={endDate}
                min={startDate}
                max={today}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>}
      </div>
      )}
      {/* Bloc 2+3 : Courbes */}
      {!onlyTables && <>{showSectionHeaders && <div className="text-xs font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500 pt-2">Évolution — courbes</div>}
      <div className="grid md:grid-cols-2 gap-4">
        {/* Intensité */}
        <Card>
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <h3 className="font-semibold">
                Intensité moyenne par séance
              </h3>
            
              <select
                className="border rounded-xl p-2 text-sm"
                value={intensityTypeFilter}
                onChange={(e) => setIntensityTypeFilter(e.target.value)}
              >
                <option value="ALL">Tous les types</option>
                {Array.from(new Set(sessions.map((s) => s.type))).map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </div>
            <div className="h-64 md:h-80">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={intensitySeries}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip
                    content={({ active, payload, label }) => {
                      if (!active || !payload || !payload.length) return null;
                  
                      const value = payload[0].value;
                  
                      return (
                        <div
                          style={{
                            backgroundColor: "#ffffff",
                            border: "1px solid #e5e7eb",
                            borderRadius: "8px",
                            padding: "8px 10px",
                            color: "#000000",
                          }}
                        >
                          <div style={{ fontWeight: 700, marginBottom: 4 }}>
                            {label}
                          </div>
                          <div style={{ fontSize: 14 }}>
                            Tonnage : <strong>{value} kg</strong>
                          </div>
                        </div>
                      );
                    }}
                  />
                  <Line type="monotone" dataKey="intensity" strokeWidth={2} dot />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Evolution du tonnage par type de séance */}
        <Card>
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <h3 className="font-semibold">
                Évolution du tonnage par type de séance
              </h3>
        
              <select
                className="border rounded-xl p-2 text-sm"
                value={sessionTypeTonnage}
                onChange={(e) => setSessionTypeTonnage(e.target.value)}
              >
                <option value="ALL">Tous les types</option>
                {Array.from(new Set(sessions.map((s) => s.type))).map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </div>
        
            {tonnageByTypeSeries.length === 0 ? (
              <div className="text-sm text-gray-600">
                Pas encore de données pour ce type de séance.
              </div>
            ) : (
              <div className="h-64 md:h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={tonnageByTypeSeries}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip
                      content={({ active, payload, label }) => {
                        if (!active || !payload || !payload.length) return null;
                        return (
                          <div
                            style={{
                              backgroundColor: "#ffffff",
                              border: "1px solid #e5e7eb",
                              borderRadius: "8px",
                              padding: "8px",
                              color: "#000",
                            }}
                          >
                            <div style={{ fontWeight: 700 }}>{label}</div>
                            <div>
                              Tonnage : <strong>{payload[0].value} kg</strong>
                            </div>
                          </div>
                        );
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="volume"
                      strokeWidth={2}
                      dot
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Bloc 3 : Évolution tonnage + 3 dernières séances */}
<div className="grid md:grid-cols-2 gap-4">

  {/* 🔹 Évolution du tonnage par séance */}
  <Card>
    <CardContent className="p-4 space-y-3">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h3 className="font-semibold">
          Évolution du tonnage par exercice
        </h3>

        <select
          className="border rounded-xl p-2 text-sm"
          value={exerciseTonnage}
          onChange={(e) => setExerciseTonnage(e.target.value)}
        >
          {allExercises.map((e) => (
            <option key={e} value={e}>
              {e}
            </option>
          ))}
        </select>
      </div>

      {tonnageEvolution.length === 0 ? (
        <div className="text-sm text-gray-600">
          Pas encore de données pour cet exercice.
        </div>
      ) : (
        <div className="h-64 md:h-80">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={tonnageEvolution}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
                  <Tooltip
                    content={({ active, payload, label }) => {
                      if (!active || !payload || !payload.length) return null;
                  
                      const value = payload[0].value;
                  
                      return (
                        <div
                          style={{
                            backgroundColor: "#ffffff",
                            border: "1px solid #e5e7eb",
                            borderRadius: "8px",
                            padding: "8px 10px",
                            color: "#000000",
                          }}
                        >
                          <div style={{ fontWeight: 700, marginBottom: 4 }}>
                            {label}
                          </div>
                          <div style={{ fontSize: 14 }}>
                            Tonnage : <strong>{value} kg</strong>
                          </div>
                        </div>
                      );
                    }}
                  />
              <Line
                type="monotone"
                dataKey="volume"
                strokeWidth={2}
                dot
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </CardContent>
  </Card>

  {/* 🔹 3 dernières séances */}
  <LastThreeSessionsSetTonnageChart
    sessions={sessions}
    exerciseName={exerciseLast3}
    options={allExercises}
    onChangeExercise={setExerciseLast3}
  />

</div>
</>}
{/* Bloc 4 : Répartition des séances par type sur 30 jours */}
{!onlyCurves && !onlyTables && !hideRecentSplit && <div className="grid md:grid-cols-2 gap-4">
  <Card className="md:col-span-2">
    <CardContent className="p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">Répartition des séances (30 derniers jours)</h3>
        <div className="text-sm text-gray-500">Types de séance</div>
      </div>
      <div className="h-64 md:h-80 grid place-items-center">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={splitRecent}
              dataKey="value"
              nameKey="name"
              innerRadius={60}
              outerRadius={90}
              label
            >
              {splitRecent.map((_, i) => (
                <Cell key={i} fill={colors[i % colors.length]} />
              ))}
            </Pie>
            <Legend />
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload || !payload.length) return null;
            
                const { name, value } = payload[0];
            
                return (
                  <div
                    style={{
                      backgroundColor: "#ffffff",
                      border: "1px solid #e5e7eb",
                      borderRadius: "8px",
                      padding: "8px 10px",
                      color: "#000000",
                    }}
                  >
                    <div style={{ fontWeight: 700, marginBottom: 4 }}>
                      {name}
                    </div>
                    <div style={{ fontSize: 14 }}>
                      Séances : <strong>{value}</strong>
                    </div>
                  </div>
                );
              }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </CardContent>
  </Card>
</div>}

      {/* Bloc 5 : Progression tonnage (séances + exercices) */}
      {!onlyCurves && <>{showSectionHeaders && <div className="text-xs font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500 pt-2">Tableaux</div>}
      <div className="grid gap-4">
        <Card>
          <CardContent className="p-4 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <h3 className="font-semibold">Progression sur le type de Séance</h3>
                <p className="text-xs text-gray-500">
                  Séance 1 = première séance du type (ou du mois sélectionné). Séance 2 = dernière séance du type (ou du mois sélectionné).
                </p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>
                  <Label>Mois séance 1</Label>
                  <Input
                    type="month"
                    lang="fr-FR"
                    value={typeMonthStart}
                    onChange={(e) => setTypeMonthStart(e.target.value)}
                  />
                </div>
                <div>
                  <Label>Mois séance 2</Label>
                  <Input
                    type="month"
                    lang="fr-FR"
                    value={typeMonthEnd}
                    onChange={(e) => setTypeMonthEnd(e.target.value)}
                  />
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full table-fixed text-xs sm:text-sm">
                <thead>
                  <tr className="text-left border-b">
                    <th className="py-2 pr-4 whitespace-normal align-top">
                      <button
                        type="button"
                        onClick={() => toggleProgressSort(setTypeProgressSort, "label")}
                        className="inline-flex items-center gap-1 font-semibold whitespace-normal text-left"
                      >
                        Type de séance
                        <span aria-hidden="true">
                          {sortIndicator(typeProgressSort, "label")}
                        </span>
                      </button>
                    </th>
                    <th className="py-2 pr-4 whitespace-normal align-top">
                      <button
                        type="button"
                        onClick={() =>
                          toggleProgressSort(setTypeProgressSort, "sessionCount")
                        }
                        className="inline-flex items-center gap-1 font-semibold whitespace-normal text-left"
                      >
                        Nombre de séances
                        <span aria-hidden="true">
                          {sortIndicator(typeProgressSort, "sessionCount")}
                        </span>
                      </button>
                    </th>
                    <th className="py-2 pr-4 whitespace-normal align-top">
                      <button
                        type="button"
                        onClick={() => toggleProgressSort(setTypeProgressSort, "session1")}
                        className="inline-flex items-center gap-1 font-semibold whitespace-normal text-left"
                      >
                        Poids total séance 1
                        <span aria-hidden="true">
                          {sortIndicator(typeProgressSort, "session1")}
                        </span>
                      </button>
                    </th>
                    <th className="py-2 pr-4 whitespace-normal align-top">
                      <button
                        type="button"
                        onClick={() => toggleProgressSort(setTypeProgressSort, "session2")}
                        className="inline-flex items-center gap-1 font-semibold whitespace-normal text-left"
                      >
                        Poids total séance 2
                        <span aria-hidden="true">
                          {sortIndicator(typeProgressSort, "session2")}
                        </span>
                      </button>
                    </th>
                    <th className="py-2 pr-4 whitespace-normal align-top">
                      <button
                        type="button"
                        onClick={() =>
                          toggleProgressSort(setTypeProgressSort, "progressPercent")
                        }
                        className="inline-flex items-center gap-1 font-semibold whitespace-normal text-left"
                      >
                        Progression %
                        <span aria-hidden="true">
                          {sortIndicator(typeProgressSort, "progressPercent")}
                        </span>
                      </button>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {typeProgressRows.length === 0 ? (
                    <tr>
                      <td className="py-3 text-gray-500" colSpan={5}>
                        Aucun type de séance disponible.
                      </td>
                    </tr>
                  ) : (
                    typeProgressRows.map((row) => (
                      <tr key={row.label} className="border-b last:border-b-0">
                        <td className="py-2 pr-4 font-medium whitespace-normal break-normal align-top">
                          {row.label}
                        </td>
                        <td className="py-2 pr-4 break-words align-top">
                          {row.sessionCount}
                        </td>
                        <td className="py-2 pr-4 break-words align-top">
                          {row.session1 !== null ? `${row.session1} kg` : "—"}
                          {row.session1Date && (
                            <div className="text-xs text-gray-500">{shortFR(row.session1Date)}</div>
                          )}
                        </td>
                        <td className="py-2 pr-4 break-words align-top">
                          {row.session2 !== null ? `${row.session2} kg` : "—"}
                          {row.session2Date && (
                            <div className="text-xs text-gray-500">{shortFR(row.session2Date)}</div>
                          )}
                        </td>
                        <td className="py-2 pr-4 break-words align-top">
                          {row.progressPercent !== null ? `${row.progressPercent.toFixed(1)}%` : "—"}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <h3 className="font-semibold">Progression sur les exercices</h3>
                <p className="text-xs text-gray-500">
                  Séance 1 = première séance avec l’exercice (ou du mois sélectionné). Séance 2 = dernière séance avec l’exercice (ou du mois sélectionné).
                </p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <div>
                  <Label>Mois séance 1</Label>
                  <Input
                    type="month"
                    lang="fr-FR"
                    value={exerciseMonthStart}
                    onChange={(e) => setExerciseMonthStart(e.target.value)}
                  />
                </div>
                <div>
                  <Label>Mois séance 2</Label>
                  <Input
                    type="month"
                    lang="fr-FR"
                    value={exerciseMonthEnd}
                    onChange={(e) => setExerciseMonthEnd(e.target.value)}
                  />
                </div>
                <div>
                  <Label>Type de séance</Label>
                  <select
                    className="w-full rounded-lg border p-2 text-sm"
                    value={exerciseTemplateFilter}
                    onChange={(e) => setExerciseTemplateFilter(e.target.value)}
                  >
                    <option value="ALL">Tous les templates</option>
                    {sessionTemplates.map((template) => (
                      <option key={template.id} value={template.id}>
                        {template.name}
                      </option>
                    ))}
                    <option value="LIBRE">Séances libres</option>
                    <option value="OTHERS">Autres exercices</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full table-fixed text-xs sm:text-sm">
                <thead>
                  <tr className="text-left border-b">
                    <th className="py-2 pr-4 whitespace-normal align-top">
                      <button
                        type="button"
                        onClick={() =>
                          toggleProgressSort(setExerciseProgressSort, "label")
                        }
                        className="inline-flex items-center gap-1 font-semibold whitespace-normal text-left"
                      >
                        Exercice
                        <span aria-hidden="true">
                          {sortIndicator(exerciseProgressSort, "label")}
                        </span>
                      </button>
                    </th>
                    <th className="py-2 pr-4 whitespace-normal align-top">
                      <button
                        type="button"
                        onClick={() =>
                          toggleProgressSort(setExerciseProgressSort, "sessionCount")
                        }
                        className="inline-flex items-center gap-1 font-semibold whitespace-normal text-left"
                      >
                        Nombre de séances
                        <span aria-hidden="true">
                          {sortIndicator(exerciseProgressSort, "sessionCount")}
                        </span>
                      </button>
                    </th>
                    <th className="py-2 pr-4 whitespace-normal align-top">
                      <button
                        type="button"
                        onClick={() =>
                          toggleProgressSort(setExerciseProgressSort, "session1")
                        }
                        className="inline-flex items-center gap-1 font-semibold whitespace-normal text-left"
                      >
                        Poids total séance 1
                        <span aria-hidden="true">
                          {sortIndicator(exerciseProgressSort, "session1")}
                        </span>
                      </button>
                    </th>
                    <th className="py-2 pr-4 whitespace-normal align-top">
                      <button
                        type="button"
                        onClick={() =>
                          toggleProgressSort(setExerciseProgressSort, "session2")
                        }
                        className="inline-flex items-center gap-1 font-semibold whitespace-normal text-left"
                      >
                        Poids total séance 2
                        <span aria-hidden="true">
                          {sortIndicator(exerciseProgressSort, "session2")}
                        </span>
                      </button>
                    </th>
                    <th className="py-2 pr-4 whitespace-normal align-top">
                      <button
                        type="button"
                        onClick={() =>
                          toggleProgressSort(
                            setExerciseProgressSort,
                            "progressPercent"
                          )
                        }
                        className="inline-flex items-center gap-1 font-semibold whitespace-normal text-left"
                      >
                        Progression %
                        <span aria-hidden="true">
                          {sortIndicator(exerciseProgressSort, "progressPercent")}
                        </span>
                      </button>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {exerciseProgressRows.length === 0 ? (
                    <tr>
                      <td className="py-3 text-gray-500" colSpan={5}>
                        Aucun exercice disponible.
                      </td>
                    </tr>
                  ) : (
                    exerciseProgressRows.map((row) => (
                      <tr key={row.label} className="border-b last:border-b-0">
                        <td className="py-2 pr-4 font-medium whitespace-normal break-normal align-top">
                          {row.label}
                        </td>
                        <td className="py-2 pr-4 break-words align-top">
                          {row.sessionCount}
                        </td>
                        <td className="py-2 pr-4 break-words align-top">
                          {row.session1 !== null ? `${row.session1} kg` : "—"}
                          {row.session1Date && (
                            <div className="text-xs text-gray-500">{shortFR(row.session1Date)}</div>
                          )}
                        </td>
                        <td className="py-2 pr-4 break-words align-top">
                          {row.session2 !== null ? `${row.session2} kg` : "—"}
                          {row.session2Date && (
                            <div className="text-xs text-gray-500">{shortFR(row.session2Date)}</div>
                          )}
                        </td>
                        <td className="py-2 pr-4 break-words align-top">
                          {row.progressPercent !== null ? `${row.progressPercent.toFixed(1)}%` : "—"}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
      </>}

    </div>
  );
}


// ───────────────────────────────────────────────────────────────
// Helpers Analytics
// ───────────────────────────────────────────────────────────────
const colors = ["#8884d8", "#82ca9d", "#ffc658", "#ff7f50", "#6a5acd", "#40e0d0"];
function computeExerciseShare(sessions) {
  const map = {};
  sessions.forEach((s) => {
    s.exercises.forEach((ex) => {
      map[ex.name] = (map[ex.name] || 0) + 1;
    });
  });
  return Object.entries(map).map(([name, value]) => ({ name, value }));
}
function getUserExercises(data) {
  const fromSessions = data.sessions.flatMap((s) => s.exercises.map((ex) => ex.name));
  const fromCustom = data.customExercises || [];
  const fromTemplates = data.sessionTemplates.flatMap((tpl) => tpl.exercises || []);

  const all = [...fromSessions, ...fromCustom, ...fromTemplates];
  return Array.from(new Set(all)); // supprime les doublons
}

function buildTonnageBySessionTypeOverTime(sessions, type) {
  return sortByDateAsc(
    sessions
      .filter(s => type === "ALL" || s.type === type)
      .map(s => ({
        date: s.date, // ⚠️ ISO pour le tri
        volume: s.exercises
          .flatMap(ex => ex.sets)
          .reduce(
            (acc, set) =>
              acc + Number(set.reps || 0) * Number(set.weight || 0),
            0
          ),
      }))
  ).map(d => ({
    ...d,
    date: shortFR(d.date), // ✅ format seulement à la fin
  }));
}
// App.jsx (Bloc 5)

// ───────────────────────────────────────────────────────────────
// Gestion des templates (séances pré-créées)
// ───────────────────────────────────────────────────────────────
function TemplatesManager({ user, allExercises, templates, onCreate, onDelete }) {
  const [name, setName] = useState("");
  const [selected, setSelected] = useState([]);
  const [editingId, setEditingId] = useState(null);

    // 🔄 Restaure le brouillon de séance pré-créée si disponible
  useEffect(() => {
    const raw = localStorage.getItem(TEMPLATE_DRAFT_KEY);
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw);
      if (parsed.name) setName(parsed.name);
      if (parsed.selected) setSelected(parsed.selected);
      if (parsed.editingId) setEditingId(parsed.editingId);
      console.log("⚡ Brouillon de séance pré-créée restauré !");
    } catch (e) {
      console.warn("Erreur de restauration du template :", e);
    }
  }, []);

  const toggle = (ex) => {
    setSelected((cur) =>
      cur.includes(ex) ? cur.filter((x) => x !== ex) : [...cur, ex]
    );
  };

  const saveTemplate = async () => {
    if (!name.trim()) return alert("Donne un nom à la séance.");
    if (selected.length === 0) return alert("Sélectionne au moins un exercice.");

    if (editingId) {
      const confirmSave = window.confirm(
        "Voulez-vous sauvegarder vos modifications et écraser l’ancienne séance pré-créée ?"
      );
      if (!confirmSave) return;
    }

    await onCreate({
      id: editingId ?? uuidv4(),
      name: name.trim(),
      exercises: selected,
      created_at: editingId ? undefined : new Date().toISOString(),
    });

    setName("");
    setSelected([]);
    setEditingId(null);
    localStorage.removeItem(TEMPLATE_DRAFT_KEY); // 🧹 Nettoie le cache après enregistrement

  };

  const startEdit = (tpl) => {
    setName(tpl.name);
    setSelected(tpl.exercises);
    setEditingId(tpl.id);
  };

    // 💾 Sauvegarde automatique du brouillon localement
  useEffect(() => {
    const payload = { name, selected, editingId };
    localStorage.setItem(TEMPLATE_DRAFT_KEY, JSON.stringify(payload));
  }, [name, selected, editingId]);

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Création / édition */}
      <Card>
        <CardContent className="space-y-3 sm:space-y-4">
          <h3 className="font-semibold text-sm sm:text-lg">
            {editingId ? "Modifier une séance" : "Créer une séance pré-créée"}
          </h3>

          <div className="grid gap-2">
            <Label>Nom de la séance</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="ex. PUSH A, PULL B, Full Body"
            />
          </div>
{/* Ajouter un exercice parmi la liste */}
<div className="flex gap-2 items-center">
  <select
    className="flex-1 rounded-lg border p-2 text-sm"
    onChange={(e) => {
      const ex = e.target.value;
      if (ex && !selected.includes(ex)) {
        setSelected((cur) => [...cur, ex]);
      }
    }}
  >
    <option value="">— Choisir un exercice —</option>
    {allExercises.map((ex) => (
      <option key={ex} value={ex}>{ex}</option>
    ))}
  </select>
  <Button
    variant="secondary"
    onClick={() => {
      const name = window.prompt("Nom du nouvel exercice ?");
      if (name && name.trim()) {
        setSelected((cur) => [...cur, name.trim()]);
      }
    }}
  >
    + Custom
  </Button>
</div>
          <div className="grid gap-2">
            <Label>Exercices choisis</Label>
            {selected.length === 0 ? (
              <div className="text-xs sm:text-sm text-gray-500">Aucun exercice sélectionné.</div>
            ) : (
              <div className="space-y-2">
                {selected.map((ex, i) => (
                  <div
                    key={i}
                    className="flex flex-col sm:flex-row sm:items-center justify-between border rounded-lg p-2 bg-white gap-2"
                  >
                    <input
                      className="flex-1 px-2 py-1 border rounded text-sm"
                      value={ex}
                      onChange={(e) =>
                        setSelected((cur) =>
                          cur.map((x, j) => (j === i ? e.target.value : x))
                        )
                      }
                    />
                    <Button
                      variant="destructive"
                      onClick={() =>
                        setSelected((cur) => cur.filter((_, j) => j !== i))
                      }
                      className="text-xs sm:text-sm"
                    >
                      Supprimer
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>



          <div className="flex justify-end gap-2">
            {editingId && (
              <Button
                variant="secondary"
                onClick={() => {
                  if (window.confirm("Êtes-vous sûr ? Toutes vos modifications ne seront pas prises en compte !")) {
                    setEditingId(null);
                    setName("");
                    setSelected([]);
                  }
                }}
                className="text-xs sm:text-sm"
              >
                Annuler
              </Button>
            )}
            <Button onClick={saveTemplate} className="text-xs sm:text-sm">
              {editingId ? "Mettre à jour" : "Enregistrer"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Liste des templates */}
      <Card>
        <CardContent className="space-y-3 sm:space-y-4">
          <h3 className="font-semibold text-sm sm:text-lg">Mes séances pré-créées</h3>
          {(!templates || templates.length === 0) ? (
            <div className="text-xs sm:text-sm text-gray-600">Aucune séance pré-créée.</div>
          ) : (
            <div className="space-y-2">
              {templates.map((t) => (
                <div
                  key={t.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between p-2 rounded-xl border bg-gray-50 dark:bg-[#1c1c1c] gap-2"
                >
                  <div className="flex-1">
                    <div className="font-medium text-sm sm:text-base">{t.name}</div>
                    <div className="text-xs text-gray-500 truncate max-w-[200px] sm:max-w-[400px]">
                      {t.exercises.join(" • ")}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="secondary" onClick={() => startEdit(t)} className="text-xs sm:text-sm">
                      Éditer
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={() => {
                        if (window.confirm("Voulez-vous vraiment supprimer cette séance pré-créée ?")) {
                          onDelete(t.id);
                        }
                      }}
                      className="text-xs sm:text-sm"
                    >
                      Supprimer
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ───────────────────────────────────────────────────────────────
// Dernière séance par type
// ───────────────────────────────────────────────────────────────
function LastSession({ sessions }) {
  const allTypes = useMemo(() => {
    return Array.from(new Set(sessions.map(s => s.type || "Libre")));
  }, [sessions]);

  const [t, setT] = useState(allTypes[0] || "");
  const last = useMemo(() => getLastSessionByType(sessions, t), [sessions, t]);
  const tonnage = useMemo(() => (last ? computeSessionTonnage(last) : 0), [last]);
  const cardRef = React.useRef(null);
const exportLastSession = async () => {
  try {
    if (!cardRef.current) {
      alert("Impossible de trouver la dernière séance à exporter.");
      return;
    }

    // Capture la card
    const canvas = await html2canvas(cardRef.current, {
      scale: 3,
      useCORS: true,
      backgroundColor: getComputedStyle(document.body).backgroundColor,
      logging: false,
    });

    const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
    const file = new File(
      [blob],
      `seance-${t || "Libre"}-${last?.date || "sans-date"}.png`,
      { type: "image/png" }
    );

    // 📱 Détection mobile simple
    const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

    if (isMobile && navigator.canShare && navigator.canShare({ files: [file] })) {
      // ✅ Partage natif sur mobile
      await navigator.share({
        title: `🏋️ Ma séance ${t}`,
        text: `Voici ma dernière séance ${t} sur Workout Tracker 💪`,
        files: [file],
      });
      console.log("✅ Partage réussi via le menu mobile !");
    } else {
      // 💻 Téléchargement direct sur PC
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = file.name;
      link.click();
      alert("💾 Image téléchargée sur ton ordinateur ✅");
    }
  } catch (e) {
    console.error("Erreur export :", e);
    alert("❌ Impossible d’exporter ou de partager la séance (voir console).");
  }
};

  return (
    <div className="space-y-4 sm:space-y-6">
    <Card ref={cardRef}>
        <CardContent className="space-y-3 sm:space-y-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-2">
            <h3 className="font-semibold text-sm sm:text-lg">Dernière séance – {t}</h3>
            <div className="flex gap-2 flex-wrap">
              {allTypes.map(tp => (
                <Button
                  key={tp}
                  variant={t===tp ? "default":"secondary"}
                  onClick={() => setT(tp)}
                  className="text-xs sm:text-sm"
                >
                  {tp}
                </Button>
              ))}
            </div>
            <Button
  variant="secondary"
  onClick={exportLastSession}
  className="text-xs sm:text-sm"
>
  <Share2 className="h-4 w-4 mr-1" /> Partager
</Button>

          </div>

          {!last ? (
            <div className="text-xs sm:text-sm text-gray-600">Aucune séance {t} trouvée.</div>
          ) : (
            <>
              <div className="flex flex-col sm:flex-row items-start sm:items-baseline justify-between gap-2">
                <div className="text-xs sm:text-sm text-gray-500">{prettyDate(last.date)} • {last.type}</div>
                <div className="text-lg sm:text-2xl font-semibold">{Math.round(tonnage)} kg</div>
              </div>
              {last.totalDuration !== undefined && (
                <div className="text-xs sm:text-sm text-gray-600">
                  ⏱️ Durée totale : {Math.floor(last.totalDuration / 60)} min {last.totalDuration % 60}s
                </div>
              )}

              <div className="space-y-3 sm:space-y-4">
{last.exercises.map((ex) => (
  <div key={ex.id} className="border rounded-xl p-2 sm:p-3 bg-gray-50 dark:bg-[#1c1c1c]">
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-2 gap-2">
      <div className="font-medium text-sm sm:text-base">{ex.name}</div>
      <div className="flex flex-col sm:items-end">
        {last.exerciseDurations?.[ex.id] && (
          <div className="text-xs text-gray-500 mb-1">
            ⏱️ Temps : {Math.floor(last.exerciseDurations[ex.id] / 60)} min{" "}
            {last.exerciseDurations[ex.id] % 60}s
          </div>
        )}
        <div className="text-xs sm:text-sm">
          Sous-total : <span className="font-semibold">{Math.round(volumeOfSets(ex.sets))} kg</span>
        </div>
      </div>
    </div>

    <div className="grid grid-cols-3 gap-2 text-xs sm:text-sm font-medium text-gray-600 mb-2">
      <div>Série</div><div>Réps</div><div>Poids</div>
    </div>
    {ex.sets.map((s, i) => (
      <div key={i} className="grid grid-cols-3 gap-2 items-center mb-1 text-xs sm:text-sm">
        <div className="text-gray-600">{i + 1}</div>
        <div>{s.reps}</div>
        <div>{s.weight} kg</div>
      </div>
    ))}

    {/* ✅ Ici, on place le commentaire à l’intérieur */}
    {ex.comment && (
      <div className="mt-2 text-xs sm:text-sm text-gray-700 italic">
        💬 {ex.comment}
      </div>
    )}
  </div>
))}

              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function getMonthKey(dateStr) {
  return dateStr ? dateStr.slice(0, 7) : "";
}

function filterSessionsByMonth(sessions, month) {
  if (!month) return sessions;
  return sessions.filter((s) => getMonthKey(s.date) === month);
}

function filterSessionsByMonthRange(sessions, monthStart = "", monthEnd = "") {
  if (!monthStart && !monthEnd) return sessions;
  const start = monthStart || monthEnd;
  const end = monthEnd || monthStart;
  const min = start <= end ? start : end;
  const max = start <= end ? end : start;
  return sessions.filter((s) => {
    const key = getMonthKey(s.date);
    if (!key) return false;
    return key >= min && key <= max;
  });
}

function getFirstSessionByType(sessions, type, month = "") {
  if (!sessions || sessions.length === 0) return null;
  let rows = filterSessionsByMonth(sessions, month).filter(
    (s) => (s.type || "Libre") === type
  );
  if (rows.length === 0 && month) {
    rows = sessions.filter((s) => (s.type || "Libre") === type);
  }
  if (rows.length === 0) return null;
  rows.sort((a, b) => (a.date > b.date ? 1 : -1));
  return rows[0];
}

function getLastSessionByType(sessions, type, month = "") {
  if (!sessions || sessions.length === 0) return null;
  let rows = filterSessionsByMonth(sessions, month).filter(
    (s) => (s.type || "Libre") === type
  );
  if (rows.length === 0 && month) {
    rows = sessions.filter((s) => (s.type || "Libre") === type);
  }
  if (rows.length === 0) return null;
  rows.sort((a, b) => (a.date < b.date ? 1 : -1));
  return rows[0];
}

function computeExerciseTonnageInSession(session, exerciseName) {
  if (!session) return 0;
  return session.exercises
    .filter((ex) => ex.name === exerciseName)
    .flatMap((ex) => ex.sets)
    .reduce(
      (sum, set) =>
        sum + Number(set.weight || 0) * Number(set.reps || 0),
      0
    );
}

function getFirstSessionByExercise(sessions, exerciseName, month = "") {
  if (!sessions || sessions.length === 0) return null;
  let rows = filterSessionsByMonth(sessions, month).filter((s) =>
    s.exercises.some((ex) => ex.name === exerciseName)
  );
  if (rows.length === 0 && month) {
    rows = sessions.filter((s) =>
      s.exercises.some((ex) => ex.name === exerciseName)
    );
  }
  if (rows.length === 0) return null;
  rows.sort((a, b) => (a.date > b.date ? 1 : -1));
  return rows[0];
}

function getLastSessionByExercise(sessions, exerciseName, month = "") {
  if (!sessions || sessions.length === 0) return null;
  let rows = filterSessionsByMonth(sessions, month).filter((s) =>
    s.exercises.some((ex) => ex.name === exerciseName)
  );
  if (rows.length === 0 && month) {
    rows = sessions.filter((s) =>
      s.exercises.some((ex) => ex.name === exerciseName)
    );
  }
  if (rows.length === 0) return null;
  rows.sort((a, b) => (a.date < b.date ? 1 : -1));
  return rows[0];
}

// ───────────────────────────────────────────────────────────────
// Helpers pour Analytics (calculs et composants)
// ───────────────────────────────────────────────────────────────

// Moyenne intensité kg/rep par séance
function buildAvgIntensitySeries(sessions, type = "ALL") {
  return sortByDateAsc(
    sessions
      .filter(s => type === "ALL" || s.type === type)
      .map(s => {
        const totalReps = s.exercises
          .flatMap(ex => ex.sets)
          .reduce((acc, set) => acc + Number(set.reps || 0), 0);

        const totalWeight = s.exercises
          .flatMap(ex => ex.sets)
          .reduce(
            (acc, set) =>
              acc + Number(set.reps || 0) * Number(set.weight || 0),
            0
          );

        return {
          date: s.date,
          intensity: totalReps ? totalWeight / totalReps : 0,
        };
      })
  ).map(d => ({
    ...d,
    date: shortFR(d.date),
  }));
}
function buildExerciseTonnageOverTime(sessions, exerciseName) {
  if (!exerciseName) return [];

  return sortByDateAsc(
    sessions
      .map((s) => {
        const volume = s.exercises
          .filter((ex) => ex.name === exerciseName)
          .flatMap((ex) => ex.sets)
          .reduce(
            (sum, set) =>
              sum + Number(set.weight || 0) * Number(set.reps || 0),
            0
          );

        return {
          date: s.date, // ISO pour tri
          volume,
        };
      })
      .filter((d) => d.volume > 0)
  ).map(d => ({
    ...d,
    date: shortFR(d.date),
  }));
}
// Nombre de séances par semaine
function buildSessionsPerWeekSeries(sessions) {
  const map = {};
  sessions.forEach(s => {
    const d = new Date(s.date);
    const week = `${d.getFullYear()}-W${Math.ceil((d.getDate() + ((d.getDay() + 6) % 7)) / 7)}`;
    map[week] = (map[week] || 0) + 1;
  });
  return Object.entries(map).map(([weekLabel, count]) => ({ weekLabel, count }));
}

// Répartition type de séance derniers n jours
function buildTypeSplitLastNDays(sessions, nDays = 30) {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - nDays);

  const map = {};
  sessions.forEach((s) => {
    const d = new Date(s.date);
    if (d >= cutoff) {
      const type = s.type || "Libre";
      map[type] = (map[type] || 0) + 1;
    }
  });

  return Object.entries(map).map(([name, value]) => ({ name, value }));
}


// Top set (1RM estimé)
function buildTopSetSeriesByExercise(sessions, exName) {
  const rows = [];
  sessions.forEach(s => {
    s.exercises.filter(ex => ex.name === exName).forEach(ex => {
      ex.sets.forEach(set => {
        const oneRM = epley1RM(Number(set.weight), Number(set.reps));
        rows.push({ date: shortFR(s.date), oneRM, weight: Number(set.weight), reps: Number(set.reps) });
      });
    });
  });
  if (rows.length === 0) return { series: [], record: {} };
  const record = rows.reduce((best, r) => (r.oneRM > (best.oneRM || 0) ? r : best), {});
  return { series: rows, record };
}

// Tonnage par exercice
function buildExerciseSetTonnageSeries(sessions, exName) {
  return sortByDateAsc(
    sessions.map(s => {
      const volume = s.exercises
        .filter(ex => ex.name === exName)
        .flatMap(ex => ex.sets)
        .reduce(
          (acc, set) =>
            acc + Number(set.reps || 0) * Number(set.weight || 0),
          0
        );

      return {
        date: s.date,
        volume,
      };
    })
  ).map(d => ({
    ...d,
    date: shortFR(d.date),
  }));
}

function computeAvgSessionsPerWeek(sessions, startDate, endDate) {
  if (!sessions || sessions.length === 0) return 0;

  // Filtrer les séances sur la période sélectionnée
  const filtered = sessions.filter(
    s => s.date >= startDate && s.date <= endDate
  );

  if (filtered.length === 0) return 0;

  const start = new Date(startDate);
  const end = new Date(endDate);

  // ⏱️ nombre de jours INCLUSIFS
  const diffDays =
    Math.floor((end - start) / (1000 * 60 * 60 * 24)) + 1;

  if (diffDays <= 0) return 0;

  return filtered.length / (diffDays / 7);
}

// Heatmap : répartition par jour de semaine
function buildWeekdayHeatmapData(sessions) {
  const counts = Array(7).fill(0);
  sessions.forEach(s => counts[new Date(s.date).getDay()]++);
  return counts.map((c, i) => ({ day: ["Dim","Lun","Mar","Mer","Jeu","Ven","Sam"][i], value: c }));
}

// ───────────────────────────────────────────────────────────────
// Composants visuels utilisés dans Analytics
// ───────────────────────────────────────────────────────────────

// ──────────────────────────────────────────────
// Calendrier des séances (jours colorés)
// ──────────────────────────────────────────────
function MonthlyCalendar({ sessions }) {
  const [currentDate, setCurrentDate] = useState(new Date());

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const todayStr = new Date().toISOString().slice(0, 10);
  const sessionDays = new Set(
    sessions.map(s => {
      const d = new Date(s.date);
      return d.toLocaleDateString("fr-CA"); // format YYYY-MM-DD local
    })
  );
  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));

  const monthLabel = currentDate.toLocaleDateString("fr-FR", { month: "long", year: "numeric" });

  return (
    <Card>
      <CardContent className="p-4 space-y-3">
        <div className="flex justify-between items-center">
          <Button variant="secondary" onClick={prevMonth}>←</Button>
          <h3 className="font-semibold">{monthLabel}</h3>
          <Button variant="secondary" onClick={nextMonth}>→</Button>
        </div>

        <div className="grid grid-cols-7 gap-1 text-center text-xs font-medium text-gray-600 mt-2">
          {["L", "M", "M", "J", "V", "S", "D"].map((d) => (
            <div key={d}>{d}</div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1 text-center text-xs">
          {/* Cases vides pour aligner le 1er jour du mois */}
          {Array.from({ length: (firstDay + 6) % 7 }).map((_, i) => (
            <div key={"empty" + i} />
          ))}
          {Array.from({ length: daysInMonth }, (_, i) => {
            const day = i + 1;
            const dateStr = new Date(year, month, day).toLocaleDateString("fr-CA");
            const hasSession = sessionDays.has(dateStr);
            const isToday = dateStr === todayStr;

            let bg = "bg-gray-100 text-gray-600 dark:bg-black dark:text-gray-300"; // ⬅️ noir en mode sombre
            if (hasSession) bg = "bg-green-400 text-white dark:bg-green-500"; // séance
            if (hasSession && isToday) bg = "bg-green-600 text-white"; // séance du jour

            return (
              <div
                key={day}
                className={`h-8 w-8 flex items-center justify-center rounded-full ${bg}`}
              >
                {day}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}


// Heatmap par jour de la semaine
function HeatmapCard({ weekdayHM }) {
  return (
    <Card>
      <CardContent className="p-4">
        <h3 className="font-semibold">Répartition par jour de la semaine</h3>
        <div className="flex gap-1 justify-around mt-3">
          {weekdayHM.map((d,i) => (
            <div key={i} className="flex flex-col items-center text-xs">
              <div className="w-6 h-6 rounded" style={{ backgroundColor: d.value ? "#4ade80" : "#e5e7eb" }} />
              <span>{d.day}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// ──────────────────────────────────────────────
// Graphique des 3 dernières séances d’un exo
// ──────────────────────────────────────────────
function LastThreeSessionsSetTonnageChart({ sessions, exerciseName, options, onChangeExercise }) {
  const filtered = sortByDateAsc(
    sessions.filter(s =>
      s.exercises.some(ex => ex.name === exerciseName)
    )
  )
  .slice(-3) // ⬅️ prend les 3 PLUS RÉCENTES mais garde l'ordre
  .map(s => ({
    date: new Date(s.date).toLocaleDateString("fr-FR"),
    sets: s.exercises.find(ex => ex.name === exerciseName).sets,
  }));
  // Construire données par série
  const chartData = [];
  filtered.forEach((s) => {
    s.sets.forEach((set, i) => {
      const tonnage = (Number(set.reps) || 0) * (Number(set.weight) || 0);
      if (!chartData[i]) chartData[i] = { serie: i + 1 };
      chartData[i][s.date] = tonnage;
    });
  });

  return (
    <Card>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h3 className="font-semibold">Évolution du tonnage – 3 dernières séances</h3>
          <select
            className="border rounded-xl p-2"
            value={exerciseName}
            onChange={(e) => onChangeExercise(e.target.value)}
          >
            {options.map((e) => <option key={e} value={e}>{e}</option>)}
          </select>
        </div>

        {filtered.length === 0 ? (
          <div className="text-sm text-gray-600">Pas encore de données.</div>
        ) : (
          <div className="h-64 md:h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
  dataKey="serie"
  tickFormatter={(value) => `Série ${value}`}
/>
                <YAxis />
                <Tooltip
  content={({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-2 border rounded text-xs shadow">
          <div><strong>Série {label}</strong></div>
          {payload.map((entry, index) => (
            <div key={index} style={{ color: entry.color }}>
              {entry.name} : {entry.value} kg
            </div>
          ))}
        </div>
      );
    }
    return null;
  }}
/>
                <Legend /> {/* <── Ajout de la légende */}
                {filtered.map((s, idx) => (
                  <Line
                    key={s.date}
                    type="monotone"
                    dataKey={s.date}
                    stroke={colors[idx % colors.length]}
                    strokeWidth={2}
                    dot
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ───────────────────────────────────────────────
// Composant Chrono pour le temps de repos
// ───────────────────────────────────────────────
function Chrono({ exId, timers, setTimers }) {
  const timer = timers[exId] || { running: false, seconds: 0, startTime: null };

  // ⏱️ Synchronise l'affichage avec le temps réel
  useEffect(() => {
    let interval = null;
    if (timer.running && timer.startTime) {
      interval = setInterval(() => {
        const elapsed = Math.floor((Date.now() - timer.startTime) / 1000);
        setTimers((cur) => ({
          ...cur,
          [exId]: { ...cur[exId], seconds: elapsed },
        }));
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [timer.running, timer.startTime, exId, setTimers]);

  // ▶️ / ⏸️ Démarre ou met en pause
const toggle = () => {
  setTimers((cur) => {
    const existing = cur[exId] || { running: false, seconds: 0, startTime: null };

    if (!existing.running) {
      // ▶️ Reprise
      return {
        ...cur,
        [exId]: {
          ...existing,
          running: true,
          startTime: Date.now() - existing.seconds * 1000, // ✅ reprend là où on s'était arrêté
        },
      };
    } else {
      // ⏸ Pause
      const elapsed = Math.floor((Date.now() - existing.startTime) / 1000);
      return {
        ...cur,
        [exId]: {
          ...existing,
          running: false,
          seconds: elapsed,
        },
      };
    }
  });
};


  // 🔁 Réinitialise le chrono
  const reset = () => {
    setTimers((cur) => ({
      ...cur,
      [exId]: { running: false, seconds: 0, startTime: null },
    }));
  };

  const minutes = Math.floor(timer.seconds / 60);
  const seconds = timer.seconds % 60;

  return (
    <div className="mt-3 p-3 rounded-lg bg-gray-50 dark:bg-[#1c1c1c] border flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
      <div className="text-sm text-gray-700">
        Chrono de l’exercice :
        <span className="ml-1 font-mono font-semibold">
          {minutes} minutes, {seconds} secondes
        </span>
      </div>

      <div className="flex gap-2">
        <Button
          variant={timer.running ? "destructive" : "secondary"}
          onClick={toggle}
        >
          {timer.running
            ? "Mettre pause sur le chrono"
            : "Lancer le chrono"}
        </Button>
        <Button variant="ghost" onClick={reset}>
          Réinitialiser le chrono
        </Button>
      </div>
    </div>
  );
}

function ThemeToggleButton() {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";
  return (
    <button
      onClick={toggleTheme}
      title={isDark ? "Passer en mode clair" : "Passer en mode sombre"}
      aria-label="Changer le thème"
      className="relative grid place-items-center h-10 w-10 rounded-full border border-[var(--border-subtle)] dark:border-white/10 bg-white dark:bg-white/5 text-base transition-all duration-300 ease-spring hover:scale-110 hover:shadow-soft active:scale-95"
    >
      <span className={cn(
        "absolute transition-all duration-500 ease-spring",
        isDark ? "opacity-0 rotate-90 scale-50" : "opacity-100 rotate-0 scale-100"
      )}>🌙</span>
      <span className={cn(
        "absolute transition-all duration-500 ease-spring",
        isDark ? "opacity-100 rotate-0 scale-100" : "opacity-0 -rotate-90 scale-50"
      )}>☀️</span>
    </button>
  );
}

// ───────────────────────────────────────────────────────────────
// Suivi du poids (module indépendant)
// ───────────────────────────────────────────────────────────────
function WeightTracker({ user }) {
  const [date, setDate] = useState(todayISO);
  const [weight, setWeight] = useState("");
  const [data, setData] = useState([]);

  useEffect(() => {
    if (!user?.id) return;

  const q = query(
    collection(db, "weights"),
    where("user_id", "==", user.id)
  );

    return onSnapshot(q, (snap) => {
    setData(
      sortByDateAsc(
        snap.docs.map(d => ({
          id: d.id,
          ...d.data(),
        }))
      )
    );
    });
  }, [user?.id]);
  const deleteWeight = async (id) => {
    if (!window.confirm("Supprimer cette entrée de poids ?")) return;
    await deleteDoc(doc(db, "weights", id));
  };
  
  const updateWeight = async (id, newWeight) => {
    await updateDoc(doc(db, "weights", id), {
      weight: Number(newWeight),
    });
  };

const addWeight = async () => {
  if (!date || !weight) {
    alert("Date et poids requis");
    return;
  }

  try {
    await addDoc(collection(db, "weights"), {
      user_id: user.id,
      date,
      weight: Number(normalizeDecimalInput(weight)),
      created_at: new Date().toISOString(),
    });

    setWeight("");
  } catch (e) {
    console.error("Erreur ajout poids :", e);
    alert("Erreur Firestore : " + e.message);
  }
};


  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <Card>
        <CardContent className="space-y-4">
          <h3 className="font-semibold text-lg">📏 Saisir mon poids</h3>

          <div className="grid gap-2">
            <Label>Date</Label>
            <Input type="date" lang="fr-FR" value={date} onChange={e => setDate(e.target.value)} />
          </div>

          <div className="grid gap-2">
            <Label>Poids (kg)</Label>
          <Input
            type="text"
            inputMode="decimal"
            placeholder="ex: 74,5"
            value={weight}
            onChange={e => setWeight(normalizeDecimalInput(e.target.value))}
           />
          </div>

          <Button onClick={addWeight} className="w-full">
            <Save className="h-4 w-4" /> Enregistrer
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <h3 className="font-semibold text-lg mb-3">📈 Évolution du poids</h3>

          {data.length === 0 ? (
            <div className="text-sm text-gray-500">Aucune donnée enregistrée.</div>
          ) : (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis domain={["dataMin - 1", "dataMax + 1"]} />
                  <Tooltip
                    content={({ active, payload, label }) => {
                      if (!active || !payload || !payload.length) return null;
                  
                      return (
                        <div
                          style={{
                            backgroundColor: "#ffffff",
                            border: "1px solid #e5e7eb",
                            borderRadius: "8px",
                            padding: "8px 10px",
                            color: "#000000",
                          }}
                        >
                          <div style={{ fontWeight: 700, marginBottom: 4 }}>
                            {new Date(label).toLocaleDateString("fr-FR")}
                          </div>
                          <div style={{ fontSize: 14 }}>
                            Poids : <strong>{payload[0].value} kg</strong>
                          </div>
                        </div>
                      );
                    }}
                  />
                  <Line type="monotone" dataKey="weight" strokeWidth={3} dot />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 📜 Historique du poids */}
<Card className="md:col-span-2">
  <CardContent className="space-y-4">
    <h3 className="font-semibold text-lg">📜 Historique du poids</h3>

    {data.length === 0 ? (
      <div className="text-sm text-gray-500">
        Aucun poids enregistré.
      </div>
    ) : (
      <div className="space-y-3">
        {[...data].reverse().map((w) => (
          <WeightCard
            key={w.id}
            entry={w}
            onDelete={deleteWeight}
            onUpdate={updateWeight}
          />
        ))}
      </div>
    )}
  </CardContent>
</Card>

    </div>
  );
}

function WeightCard({ entry, onDelete, onUpdate }) {
  const [editing, setEditing] = useState(false);
  const [localWeight, setLocalWeight] = useState(entry.weight);

  return (
    <Card>
      <CardContent className="flex items-center justify-between gap-4">
        <div>
          <div className="text-xs text-gray-500">
            {new Date(entry.date).toLocaleDateString("fr-FR")}
          </div>

          {editing ? (
            <Input
              type="number"
              step="0.1"
              value={localWeight}
              onChange={(e) => setLocalWeight(e.target.value)}
              className="w-24 mt-1"
            />
          ) : (
            <div className="text-lg font-semibold">
              {entry.weight} kg
            </div>
          )}
        </div>

        <div className="flex gap-2">
          {editing ? (
            <>
              <Button
                onClick={async () => {
                  await onUpdate(entry.id, localWeight);
                  setEditing(false);
                }}
              >
                <Save className="h-4 w-4" />
              </Button>
              <Button
                variant="secondary"
                onClick={() => {
                  setLocalWeight(entry.weight);
                  setEditing(false);
                }}
              >
                Annuler
              </Button>
            </>
          ) : (
            <>
              <Button
                variant="secondary"
                onClick={() => setEditing(true)}
              >
                <Edit3 className="h-4 w-4" />
              </Button>
              <Button
                variant="destructive"
                onClick={() => onDelete(entry.id)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function buildMonthlyStepsSeries(stepsData) {
  const map = {};

  stepsData.forEach(({ date, steps }) => {
    const [y, m] = date.split("-");
    const key = `${y}-${m}`;
    map[key] = (map[key] || 0) + steps;
  });

  return Object.entries(map)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, total]) => {
      const [y, m] = key.split("-");
      const label = new Date(y, m - 1, 1).toLocaleDateString("fr-FR", {
        month: "long",
        year: "2-digit",
      });

      return {
        month: label,      // "octobre 25"
        total,             // valeur brute
        totalK: Math.round(total / 1000), // label 120k
      };
    });
}

const BlackTooltip = ({ active, payload, label }) => {
  if (!active || !payload || !payload.length) return null;

  return (
    <div
      style={{
        background: "#ffffff",
        color: "#000000",
        padding: "8px 10px",
        borderRadius: "6px",
        fontSize: "12px",
        boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
      }}
    >
      <div style={{ fontWeight: 600, marginBottom: 4 }}>
        {label}
      </div>

      {payload.map((p, i) => (
        <div key={i}>
          {p.name} : <strong>{p.value.toLocaleString()}</strong>
        </div>
      ))}
    </div>
  );
};

// ───────────────────────────────────────────────
// Classement des séances
// ───────────────────────────────────────────────
function RankingSection() {
  const [rankingRows, setRankingRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [firstMonth, setFirstMonth] = useState("");
  const [lastMonth, setLastMonth] = useState("");

  const todayMonth = todayISO().slice(0, 7);

  const [monthStart, setMonthStart] = useState("");
  const [monthEnd, setMonthEnd] = useState("");

  useEffect(() => {
    let active = true;
    const loadRanking = async () => {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams();
        if (monthStart) params.set("monthStart", monthStart);
        if (monthEnd) params.set("monthEnd", monthEnd);
        const res = await fetch(`/api/ranking${params.toString() ? `?${params}` : ""}`);
        if (!res.ok) {
          throw new Error(`Erreur serveur (${res.status})`);
        }
        const payload = await res.json();
        if (!active) return;
        setRankingRows(payload.rows || []);
        const resolvedFirst = payload.minMonth || todayMonth;
        const resolvedLast = payload.maxMonth || todayMonth;
        setFirstMonth(resolvedFirst);
        setLastMonth(resolvedLast);
        if (!monthStart) setMonthStart(resolvedFirst);
        if (!monthEnd) setMonthEnd(resolvedLast);
        setLoading(false);
      } catch (err) {
        if (!active) return;
        console.error("Erreur classement:", err);
        setError(err);
        setLoading(false);
      }
    };

    loadRanking();
    return () => {
      active = false;
    };
  }, [monthStart, monthEnd, todayMonth]);

  return (
    <div className="space-y-4">
      <Card>
        <CardContent>
          <h3 className="font-semibold text-lg">🏆 Classement des séances</h3>
          <p className="text-sm text-gray-500 mt-1">
            Classement des personnes ayant enregistré le plus de séances.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <Label>Mois de début</Label>
            <Input
              type="month"
              lang="fr-FR"
              value={monthStart}
              min={firstMonth || todayMonth}
              max={monthEnd || lastMonth || todayMonth}
              onChange={(e) => setMonthStart(e.target.value)}
            />
          </div>
          <div>
            <Label>Mois de fin</Label>
            <Input
              type="month"
              lang="fr-FR"
              value={monthEnd}
              min={monthStart || firstMonth || todayMonth}
              max={lastMonth || todayMonth}
              onChange={(e) => setMonthEnd(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          {loading && <p className="text-sm text-gray-500">Chargement du classement…</p>}
          {!loading && error && (
            <p className="text-sm text-red-500">
              Impossible de charger le classement. Réessaie plus tard.
            </p>
          )}
          {!loading && !error && rankingRows.length === 0 && (
            <p className="text-sm text-gray-500">
              Aucune séance sur la période sélectionnée.
            </p>
          )}
          {!loading && !error && rankingRows.length > 0 && (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-500 border-b">
                    <th className="py-2 pr-4 font-medium">#</th>
                    <th className="py-2 pr-4 font-medium">Email</th>
                    <th className="py-2 font-medium">Séances</th>
                  </tr>
                </thead>
                <tbody>
                  {rankingRows.map((row, index) => (
                    <tr key={row.email} className="border-b last:border-b-0">
                      <td className="py-2 pr-4 font-semibold">{index + 1}</td>
                      <td className="py-2 pr-4">{row.email}</td>
                      <td className="py-2 font-semibold">{formatNumber(row.count)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ───────────────────────────────────────────────
// Traction (metrics business)
// ───────────────────────────────────────────────
function TractionSection({ user }) {
  const { theme } = useTheme();
  const axisColor = "#111827";
  const gridColor = "#e5e7eb";

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [days] = useState(30);

  useEffect(() => {
    if (!user?.id) return;
    if (!isTractionAuthorized(user?.email)) {
      setLoading(false);
      setError("FORBIDDEN");
      return;
    }

    let mounted = true;
    const loadTraction = async () => {
      try {
        setLoading(true);
        setError(null);
        const token = await auth.currentUser?.getIdToken();
        if (!token) throw new Error("AUTH_MISSING");

        const res = await fetch(`/api/traction?days=${days}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!res.ok) {
          const payload = await res.json().catch(() => ({}));
          const message = payload?.error || "API_ERROR";
          throw new Error(res.status === 403 ? "FORBIDDEN" : message);
        }

        const payload = await res.json();
        if (mounted) setData(payload);
      } catch (err) {
        if (mounted) setError(err?.message || "API_ERROR");
      } finally {
        if (mounted) setLoading(false);
      }
    };

    loadTraction();
    return () => {
      mounted = false;
    };
  }, [days, user?.id, user?.email]);

  if (error === "FORBIDDEN") {
    return (
      <Card>
        <CardContent>
          <h3 className="text-lg font-semibold">Accès restreint</h3>
          <p className="text-sm text-gray-500 mt-2">
            Ce tableau de traction est réservé à un compte autorisé.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardContent>
          <h3 className="text-lg font-semibold">📈 Traction</h3>
          <p className="text-sm text-gray-500 mt-1">
            Indicateurs produit et business basés sur l&apos;activité globale.
          </p>
        </CardContent>
      </Card>

      {loading && (
        <Card>
          <CardContent>
            <p className="text-sm text-gray-500">Chargement des métriques…</p>
          </CardContent>
        </Card>
      )}

      {!loading && error && (
        <Card>
          <CardContent>
            <p className="text-sm text-red-500">
              Impossible de charger la traction. Réessaie plus tard.
            </p>
          </CardContent>
        </Card>
      )}

      {!loading && !error && data && (
        <>
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardContent>
                <p className="text-xs uppercase tracking-wide text-gray-500">
                  Utilisateurs actifs (30 jours)
                </p>
                <div className="text-3xl font-semibold">
                  {formatNumber(data.activeUsers || 0)}
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Personnes ayant saisi au moins une séance sur les 30 derniers jours.
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent>
                <p className="text-xs uppercase tracking-wide text-gray-500">
                  Séances totales
                </p>
                <div className="text-3xl font-semibold">
                  {formatNumber(data.totalSessions || 0)}
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Somme de toutes les séances enregistrées dans l&apos;application.
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent>
                <p className="text-xs uppercase tracking-wide text-gray-500">
                  Consultations (30 jours)
                </p>
                <div className="text-3xl font-semibold">
                  {formatNumber(data.totalLogins || 0)}
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Nombre de consultations totales sur les 30 derniers jours.
                </p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-semibold">📊 Consultations par jour</h4>
                <p className="text-sm text-gray-500">
                  Courbe d&apos;évolution des consultations totales par jour.
                </p>
              </div>
              <div className="h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={data.loginsDaily || []}>
                    <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                    <XAxis dataKey="date" tick={{ fill: axisColor }} />
                    <YAxis tick={{ fill: axisColor }} allowDecimals={false} />
                    <Tooltip content={<BlackTooltip />} />
                    <Line type="monotone" dataKey="count" stroke="#22c55e" strokeWidth={3} dot />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

// ───────────────────────────────────────────────
// Suivi Run (Strava)
// ───────────────────────────────────────────────
function StravaTracker({ user }) {
  const { theme } = useTheme();
  const axisColor = "#1F1A14";
  const gridColor = "#e5e7eb";

  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(false);
  const [needsReauth, setNeedsReauth] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!user?.id) return;
    setLoading(true);
    fetch(`/api/strava?uid=${user.id}`)
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) {
          setActivities(data);
          setNeedsReauth(false);
        } else {
          setActivities(data?.activities || []);
          setNeedsReauth(Boolean(data?.needsReauth));
        }
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [user?.id]);

  const connectStrava = () => {
    window.location.href = `/api/auth/strava?uid=${user.id}`;
  };

  // Filtre période
  const todayStr = new Date().toISOString().slice(0,10);
  const firstActivity = useMemo(() => {
    if (!activities.length) return todayStr;
    return [...activities].sort((a,b) => a.date < b.date ? -1 : 1)[0].date;
  }, [activities]);
  const [startDate, setStartDate] = useState(firstActivity);
  const [endDate, setEndDate] = useState(todayStr);
  useEffect(() => { setStartDate(firstActivity); }, [firstActivity]);

  const filtered = useMemo(() =>
    activities.filter(a => a.date >= startDate && a.date <= endDate),
    [activities, startDate, endDate]);

  // Stats sur la période filtrée
  const totalRuns = filtered.length;
  const totalDistKm = (filtered.reduce((s, a) => s + (a.distance || 0), 0) / 1000).toFixed(1);
  const totalTimeMin = Math.round(filtered.reduce((s, a) => s + (a.moving_time || 0), 0) / 60);
  const avgPaceStr = (function() {
    const totalDist = filtered.reduce((s, a) => s + (a.distance || 0), 0);
    const totalTime = filtered.reduce((s, a) => s + (a.moving_time || 0), 0);
    if (!totalDist) return '—';
    const secPKm = totalTime / (totalDist / 1000);
    const m = Math.floor(secPKm / 60);
    const s = Math.round(secPKm % 60);
    return `${m}'${String(s).padStart(2,'0')}"`;
  })();

  // Graphe distance par sortie (nuage de points + tendance)
  const monthsFR = ['jan','fév','mars','avr','mai','juin','juil','août','sep','oct','nov','déc'];
  const fmtDay = (iso) => {
    if (!iso) return '';
    const [y, m, d] = iso.split('-');
    return `${parseInt(d)} ${monthsFR[parseInt(m)-1]} ${y}`;
  };
  const scatterData = [...filtered].sort((a,b) => a.date < b.date ? -1 : 1).map((a, i) => ({
    x: i,
    y: parseFloat((a.distance / 1000).toFixed(2)),
    date: fmtDay(a.date),
    label: a.name,
  }));

  return (
    <div className="space-y-6">
      {/* Connexion */}
      <Card>
        <CardContent>
          <h3 className="font-semibold">🏃 Suivi Run – Strava</h3>
          {loading && <p className="text-sm text-gray-500 mt-2">Chargement des activités…</p>}
          {!loading && error && <div className="mt-2 space-y-2"><p className="text-sm text-red-500">❌ Impossible de récupérer les données Strava.</p><Button variant="secondary" onClick={connectStrava}>Connecter Strava</Button></div>}
          {!loading && needsReauth && <div className="mt-2 space-y-2"><p className="text-sm text-amber-500">⚠️ Reconnexion Strava nécessaire.</p><Button variant="secondary" onClick={connectStrava}>Se reconnecter</Button></div>}
          {!loading && !error && !needsReauth && activities.length === 0 && <div className="mt-2 space-y-2"><p className="text-sm text-gray-500">Connecte ton compte Strava pour voir tes stats de course.</p><Button variant="secondary" onClick={connectStrava}>Connecter Strava</Button></div>}
          {!loading && !error && !needsReauth && activities.length > 0 && <p className="text-sm text-green-500 mt-2">✅ Strava connecté</p>}
        </CardContent>
      </Card>

      {activities.length > 0 && (
        <>
          {/* Filtre période */}
          <Card>
            <CardContent className="grid grid-cols-2 gap-4">
              <div><Label>Début</Label><Input type="date" lang="fr-FR" value={startDate} min={firstActivity} max={endDate} onChange={e => setStartDate(e.target.value)} /></div>
              <div><Label>Fin</Label><Input type="date" lang="fr-FR" value={endDate} min={startDate} max={todayStr} onChange={e => setEndDate(e.target.value)} /></div>
            </CardContent>
          </Card>

          {/* KPIs */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: 'Sorties', value: totalRuns },
              { label: 'Distance', value: `${totalDistKm} km` },
              { label: 'Temps total', value: `${totalTimeMin} min` },
              { label: 'Allure moy.', value: `${avgPaceStr} /km` },
            ].map(({ label, value }) => (
              <Card key={label}>
                <CardContent>
                  <div className="text-xs text-gray-500 font-semibold uppercase tracking-wide">{label}</div>
                  <div className="text-2xl font-bold mt-1">{value}</div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Graphe distance — nuage de points + tendance */}
          <Card>
            <CardContent>
              <h3 className="font-semibold text-lg mb-4">📈 Distance par sortie (km)</h3>
              <ResponsiveContainer width="100%" height={300}>
                <ComposedChart margin={{ top: 10, right: 12, left: 0, bottom: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                  <XAxis type="number" dataKey="x" domain={[-0.5, scatterData.length - 0.5]} hide />
                  <YAxis type="number" dataKey="y" tick={{ fill: axisColor, fontSize: 11 }} width={45} tickFormatter={v => `${v}km`} />
                  <Tooltip content={({ active, payload }) => {
                    if (!active || !payload?.length) return null;
                    const d = payload[0]?.payload;
                    if (!d?.date) return null;
                    return (
                      <div style={{ background: '#1F1A14', color: '#fff', padding: '8px 12px', borderRadius: 8, fontSize: 12 }}>
                        <div style={{ fontWeight: 700 }}>{d.y} km</div>
                        <div style={{ opacity: 0.75 }}>{d.date}</div>
                        {d.label && <div style={{ opacity: 0.55, fontSize: 11 }}>{d.label}</div>}
                      </div>
                    );
                  }} />
                  <Line data={scatterData} type="monotone" dataKey="y" stroke="#fc4c02" strokeWidth={2} dot={{ fill: '#fc4c02', r: 4, strokeWidth: 0 }} activeDot={{ r: 6 }} />
                </ComposedChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Liste des dernières sorties */}
          <Card>
            <CardContent>
              <h3 className="font-semibold text-lg mb-3">🗒️ Dernières sorties</h3>
              <div className="space-y-2">
                {[...filtered].sort((a,b) => b.date < a.date ? -1 : 1).slice(0, 5).map(a => {
                  const km = (a.distance / 1000).toFixed(2);
                  const min = Math.floor(a.moving_time / 60);
                  const sec = a.moving_time % 60;
                  const paceSecPkm = a.distance > 0 ? a.moving_time / (a.distance / 1000) : 0;
                  const pm = Math.floor(paceSecPkm / 60);
                  const ps = Math.round(paceSecPkm % 60);
                  return (
                    <div key={a.id} className="flex items-center justify-between py-2 border-b last:border-0 text-sm">
                      <div>
                        <div className="font-medium">{a.name}</div>
                        <div className="text-xs text-gray-500">{a.date} · {a.elevation} m D+</div>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold">{km} km</div>
                        <div className="text-xs text-gray-500">{min}:{String(sec).padStart(2,'0')} · {pm}'{String(ps).padStart(2,'0')}" /km</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

// ───────────────────────────────────────────────
// Suivi des pas (Apple Health sur iOS, Google Fit sinon)
// ───────────────────────────────────────────────
function StepsTracker({ user }) {
  const { theme } = useTheme();

  const axisColor = "#1F1A14";
  const gridColor = "#e5e7eb";

  // Détection iOS + mode standalone (PWA depuis écran d'accueil)
  const isIOS = useMemo(() => /iPhone|iPad|iPod/.test(navigator.userAgent), []);
  const isStandalone = useMemo(() => window.navigator.standalone === true, []);
  const hasHealthKit = useMemo(() => 'health' in navigator, []);
  const useAppleHealth = isIOS && isStandalone && hasHealthKit;
  const iosNeedsPWA = isIOS && !isStandalone;

  const [stepsData, setStepsData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [needsReauth, setNeedsReauth] = useState(false);
  const [appleStatus, setAppleStatus] = useState('idle'); // idle | requesting | granted | denied | error

  /* ─────────────────────────────
     FETCH APPLE HEALTH (iOS PWA)
  ───────────────────────────── */
  const fetchAppleHealth = async () => {
    try {
      setLoading(true);
      setError(null);
      setAppleStatus('requesting');

      await navigator.health.requestPermission({ read: ['stepCount'] });
      setAppleStatus('granted');

      const end = new Date();
      const start = new Date();
      start.setFullYear(start.getFullYear() - 2); // 2 ans d'historique

      const samples = await navigator.health.queryStatistics({
        type: 'stepCount',
        startDate: start,
        endDate: end,
        interval: 'day',
      });

      const formatted = (samples || [])
        .map(s => ({
          date: new Date(s.startDate).toLocaleDateString('fr-CA'),
          steps: Math.round(s.sumQuantity?.doubleValue ?? s.value ?? 0),
        }))
        .filter(d => d.steps > 0)
        .sort((a, b) => a.date.localeCompare(b.date));

      setStepsData(formatted);
    } catch (e) {
      setAppleStatus(e.name === 'NotAllowedError' ? 'denied' : 'error');
      setError('APPLE_HEALTH_ERROR');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (useAppleHealth) fetchAppleHealth();
  }, [useAppleHealth]);

  /* ─────────────────────────────
     FETCH GOOGLE FIT (non-iOS)
  ───────────────────────────── */
  useEffect(() => {
    if (isIOS || !user?.id) return;

    const fetchSteps = async () => {
      try {
        setLoading(true);
        setError(null);

        const res = await fetch(`/api/steps?uid=${user.id}`);
        if (!res.ok) throw new Error("API_ERROR");

        const data = await res.json();
        if (Array.isArray(data)) {
          setStepsData(data);
          setNeedsReauth(false);
        } else {
          setStepsData(data?.steps || []);
          setNeedsReauth(Boolean(data?.needsReauth));
        }
      } catch {
        setError("API_ERROR");
      } finally {
        setLoading(false);
      }
    };

    fetchSteps();
  }, [user?.id, isIOS]);

  /* ─────────────────────────────
     FILTRE PÉRIODE UNIFIÉ
  ───────────────────────────── */
  const today = todayISO();

  const firstDate = useMemo(() => {
    if (!stepsData.length) return today;
    return stepsData.map(d => d.date).sort()[0];
  }, [stepsData]);

  const [startDate, setStartDate] = useState(firstDate);
  const [endDate, setEndDate] = useState(today);

  useEffect(() => { setStartDate(firstDate); setEndDate(today); }, [firstDate, today]);

  const graphData = useMemo(() =>
    stepsData.filter(d => d.date >= startDate && d.date <= endDate),
    [stepsData, startDate, endDate]);

  const avgSteps = useMemo(() => {
    if (!graphData.length) return 0;
    return Math.round(graphData.reduce((s, d) => s + d.steps, 0) / graphData.length);
  }, [graphData]);

  const monthlySteps = useMemo(() => {
    const map = {};
    graphData.forEach(({ date, steps }) => {
      const key = date.slice(0, 7);
      map[key] = (map[key] || 0) + steps;
    });
    return Object.entries(map).map(([key, total]) => {
      const [y, m] = key.split("-");
      return { month: new Date(y, m - 1).toLocaleDateString("fr-FR", { month: "long", year: "2-digit" }), total, totalK: Math.round(total / 1000) };
    });
  }, [graphData]);

  /* ─────────────────────────────
     RENDER
  ───────────────────────────── */
  return (
    <div className="space-y-6">

      {/* ───── Connexion */}
      <Card>
        <CardContent>
          <h3 className="font-semibold">🚶 Suivi des pas</h3>

          {/* iOS – pas en mode PWA */}
          {iosNeedsPWA && (
            <div className="mt-2 space-y-2">
              <p className="text-sm text-amber-600">📲 Pour accéder à Apple Santé, ouvre l'app depuis ton écran d'accueil (pas depuis Safari).</p>
              <p className="text-xs text-gray-500">Safari → bouton partage → "Ajouter à l'écran d'accueil"</p>
            </div>
          )}

          {/* iOS PWA – Apple Health */}
          {useAppleHealth && (
            <>
              {loading && <p className="text-sm text-gray-500 mt-2">Chargement Apple Santé…</p>}
              {!loading && appleStatus === 'idle' && <p className="text-sm text-gray-500 mt-2">Connexion à Apple Santé…</p>}
              {!loading && appleStatus === 'granted' && stepsData.length > 0 && <p className="text-sm text-green-500 mt-2">✅ Apple Santé connecté</p>}
              {!loading && appleStatus === 'denied' && <div className="mt-2 space-y-2"><p className="text-sm text-red-500">❌ Permission refusée. Va dans Réglages → Confidentialité → Santé pour autoriser l'app.</p><Button variant="secondary" onClick={fetchAppleHealth}>Réessayer</Button></div>}
              {!loading && appleStatus === 'error' && <div className="mt-2 space-y-2"><p className="text-sm text-red-500">❌ Erreur Apple Santé. iOS 18+ requis.</p><Button variant="secondary" onClick={fetchAppleHealth}>Réessayer</Button></div>}
              {!loading && appleStatus === 'granted' && !stepsData.length && <p className="text-sm text-gray-500 mt-2">Aucun pas trouvé dans Apple Santé.</p>}
            </>
          )}

          {/* Android / desktop – Google Fit */}
          {!isIOS && (
            <>
              {loading && <p className="text-sm text-gray-500 mt-2">Chargement des pas…</p>}
              {!loading && error && <div className="mt-2 space-y-2"><p className="text-sm text-red-500">❌ Impossible de récupérer les pas.</p><Button variant="secondary" onClick={() => { window.location.href = `/api/auth/google-fit?uid=${user.id}`; }}>Connecter Google Fit</Button></div>}
              {!loading && !error && !needsReauth && !stepsData.length && <div className="mt-2 space-y-2"><p className="text-sm text-gray-500">⚡ Connecte Google Fit pour commencer le suivi des pas.</p><Button variant="secondary" onClick={() => { window.location.href = `/api/auth/google-fit?uid=${user.id}`; }}>Connecter Google Fit</Button></div>}
              {!loading && !error && !needsReauth && stepsData.length > 0 && <p className="text-sm text-green-500 mt-2">✅ Google Fit connecté</p>}
              {!loading && !error && needsReauth && <div className="mt-2 space-y-2"><p className="text-sm text-amber-500">⚠️ Reconnexion Google Fit nécessaire.</p><Button variant="secondary" onClick={() => { window.location.href = `/api/auth/google-fit?uid=${user.id}`; }}>Se reconnecter</Button></div>}
            </>
          )}
        </CardContent>
      </Card>

      {/* ───── Filtre période */}
      <Card>
        <CardContent className="grid grid-cols-2 gap-4">
          <div><Label>Début</Label><Input type="date" lang="fr-FR" value={startDate} min={firstDate} max={endDate} onChange={e => setStartDate(e.target.value)} /></div>
          <div><Label>Fin</Label><Input type="date" lang="fr-FR" value={endDate} min={startDate} max={today} onChange={e => setEndDate(e.target.value)} /></div>
        </CardContent>
      </Card>

      {/* ───── Moyenne softglow */}
      <Card style={{ boxShadow: '0 10px 40px -10px rgba(59,130,246,0.35)', border: '1px solid rgba(59,130,246,0.18)', background: 'linear-gradient(135deg, rgba(59,130,246,0.06) 0%, rgba(255,255,255,0) 100%)' }}>
        <CardContent>
          <h3 className="font-semibold">📊 Moyenne de pas</h3>
          <div className="text-4xl font-bold mt-2">{avgSteps.toLocaleString()} <span className="text-sm font-normal text-gray-500">/ jour</span></div>
        </CardContent>
      </Card>

      {/* ───── Graphiques */}
      <Card>
        <CardContent className="space-y-6">
          <h3 className="font-semibold text-lg">
            📈 Évolution du nombre de pas par jour et par mois
          </h3>

          <div className="grid lg:grid-cols-2 gap-6">

            {/* Courbe */}
            <ResponsiveContainer width="100%" height={320}>
              <LineChart data={graphData} margin={{ top: 10, right: 12, left: 0, bottom: 40 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                <XAxis dataKey="date" tick={{ fill: axisColor, fontSize: 11 }} angle={-35} textAnchor="end" interval="preserveStartEnd" />
                <YAxis tick={{ fill: axisColor, fontSize: 11 }} width={60} tickFormatter={(v) => `${Math.round(v/1000)}k`} />
                <Tooltip content={<BlackTooltip />} />
                <Line dataKey="steps" stroke="#3b82f6" dot={false} strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>

            {/* Histogramme */}
            <ResponsiveContainer width="100%" height={320}>
              <BarChart data={monthlySteps} margin={{ top: 28, right: 12, left: 0, bottom: 40 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                <XAxis dataKey="month" tick={{ fill: axisColor, fontSize: 11 }} angle={-35} textAnchor="end" interval={0} />
                <YAxis tick={{ fill: axisColor, fontSize: 11 }} width={60} tickFormatter={(v) => `${Math.round(v/1000)}k`} />
                <Tooltip content={<BlackTooltip />} />
                <Bar dataKey="total" fill="#3b82f6">
                  <LabelList
                    dataKey="totalK"
                    position="top"
                    style={{ fill: axisColor, fontSize: 11, fontWeight: 600 }}
                    formatter={(v) => `${v}k`}
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>

          </div>
        </CardContent>
      </Card>

      {/* ───── Calendrier */}
      <Card>
        <CardContent>
          <StepsMonthlyBubbleChart stepsData={stepsData} />
        </CardContent>
      </Card>
    </div>
  );
} 
