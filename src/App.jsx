// App.jsx (Bloc 1)
import React, { useMemo, useState, useEffect, useContext, createContext } from "react";
import html2canvas from "html2canvas";
// ───────────────────────────────────────────────
// Thème clair / sombre (global)
// ───────────────────────────────────────────────
const ThemeCtx = createContext();

function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => localStorage.getItem("theme") || "light");

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
import { Trash2, Plus, BarChart3, Save, Edit3, Dumbbell, LogOut, Share2 } from "lucide-react";
import {
  LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer,
  BarChart, Bar, PieChart, Pie, Cell, Legend
} from "recharts";

// Firebase
import { db, onAuth, signInEmail, signUpEmail, signInGoogle, signOutUser, resetPassword } from "./firebase";
import {
  collection, query, where, orderBy, onSnapshot,
  writeBatch, doc, deleteDoc
} from "firebase/firestore";

// ───────────────────────────────────────────────────────────────
// Minimal UI responsive
// ───────────────────────────────────────────────────────────────
const SESSION_DRAFT_KEY = "workout-tracker-current-session";
const TEMPLATE_DRAFT_KEY = "workout-tracker-template-draft";
const cn = (...c) => c.filter(Boolean).join(" ");
const Card = React.forwardRef(({ className, children }, ref) => (
  <div
    ref={ref}
    className={cn(
      "rounded-xl sm:rounded-2xl border bg-white dark:bg-[#1c1c1c] shadow-sm transition-colors duration-300",
      className
    )}
  >
    {children}
  </div>
));
Card.displayName = "Card";

const CardContent = ({ className, children }) => (
  <div className={cn("p-3 sm:p-4 dark:text-white", className)}>{children}</div>
);


function Button({ children, className, variant = "default", ...props }) {
  const base =
    "inline-flex items-center justify-center gap-2 rounded-lg sm:rounded-xl transition-colors duration-300 text-xs sm:text-sm px-2 sm:px-3 py-1.5 sm:py-2 font-medium";

  const variants = {
    // ✅ Boutons principaux : noir en mode sombre, gris foncé au survol
    default:
      "bg-gray-900 text-white hover:bg-gray-800 dark:bg-[#000000] dark:text-white dark:hover:bg-[#222222]",

    // ✅ Boutons secondaires : gris clair en clair, gris foncé en sombre
    secondary:
      "bg-gray-100 text-gray-900 hover:bg-gray-200 dark:bg-[#1e1e1e] dark:text-white dark:hover:bg-[#2a2a2a]",

    // ⚠️ Boutons destructifs : rouge inchangé
    destructive: "bg-red-600 text-white hover:bg-red-700",

    // 👻 Boutons fantômes : fond transparent
    ghost:
      "bg-transparent hover:bg-gray-100 dark:text-white dark:hover:bg-[#2a2a2a]",
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
      "w-full rounded-lg sm:rounded-xl border px-2 sm:px-3 py-1.5 sm:py-2 text-sm outline-none focus:ring-2 focus:ring-gray-300",
      "bg-white text-gray-900 dark:bg-[#2a2a2a] dark:text-white dark:border-gray-700 dark:focus:ring-gray-600 transition-colors duration-300",
      className
    )}
    {...props}
  />
);

const Label = ({ className, children }) => (
  <label
    className={cn(
      "text-xs sm:text-sm font-medium text-gray-800 dark:text-white transition-colors duration-300",
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
      "rounded-lg sm:rounded-xl p-1 flex flex-wrap sm:flex-nowrap gap-1 transition-colors duration-300",
      "bg-gray-100 dark:bg-[#111111]",
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
        "px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm rounded-md sm:rounded-lg font-medium transition-colors duration-300",
        active
          ? "bg-white text-gray-900 dark:bg-black dark:text-white shadow"
          : "text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-[#222]"
      )}
    >
      {children}
    </button>
  );
}

const TabsContent = ({ value, className, children }) => {
  const ctx = useContext(TabsCtx); if (ctx?.value !== value) return null;
  return <div className={className}>{children}</div>;
};

// ───────────────────────────────────────────────────────────────
// Utils & Domain
// ───────────────────────────────────────────────────────────────
const prettyDate = (d) => new Date(d).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "2-digit" });
const shortFR = (iso) => {
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" });
};
const volumeOfSets = (sets) => sets.reduce((acc, s) => acc + Number(s.reps || 0) * Number(s.weight || 0), 0);
const computeSessionTonnage = (session) => session.exercises.reduce((acc, ex) => acc + volumeOfSets(ex.sets), 0);
const epley1RM = (weight, reps) => (reps > 1 ? weight * (1 + reps / 30) : weight);

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

async function upsertSessions(uid, sessions) {
  const batch = writeBatch(db);
  sessions.forEach((s) => {
    const ref = doc(db, "sessions", s.id);
    batch.set(ref, {
      ...s,
      user_id: uid,
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
      setUser({ id: uid, email: u.email || "Utilisateur" });

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

  if (user === undefined) return <div className="min-h-screen grid place-items-center text-gray-600">Chargement…</div>;
  if (user === null) return <AuthScreen />;

  return (
<div className="min-h-screen w-full bg-gray-50 dark:bg-[#1c1c1c] text-gray-900 dark:bg-[#0d0d0d] dark:text-white transition-colors duration-300">
<header
  className="sticky top-0 z-10 
  bg-white dark:bg-[#007B5E]
  text-black dark:text-white 
  shadow-md border-b border-gray-200 dark:border-[#00634A] 
  transition-colors duration-300"
>
  <div className="max-w-6xl mx-auto px-3 sm:px-6 py-3 sm:py-4 flex flex-col sm:flex-row items-center justify-between gap-2">
    <div className="flex items-center gap-2">
      <Dumbbell className="h-5 w-5 text-current" />
      <h1 className="text-lg sm:text-xl md:text-2xl font-bold tracking-tight">Workout Tracker</h1>
      <div className="hidden sm:block text-xs text-black/60 dark:text-white/70">
        UID: {user?.id}
      </div>
    </div>

    <div className="flex items-center gap-3">
      <div className="text-xs sm:text-sm text-black dark:text-white truncate">
        {user.email}
      </div>
      <ThemeToggleButton />
      <Button
        variant="ghost"
        onClick={() => signOutUser()}
        title="Se déconnecter"
        className="text-black dark:text-white hover:bg-black/5 dark:hover:bg-white/20"
      >
        <LogOut className="h-4 w-4" /> Déconnexion
      </Button>
    </div>
  </div>
</header>

      <main className="max-w-6xl mx-auto p-2 sm:p-4">
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 w-full text-xs sm:text-sm">
            <TabsTrigger value="tpl">Séances pré-créées</TabsTrigger>
            <TabsTrigger value="log">Saisir une séance</TabsTrigger>
            <TabsTrigger value="sessions">Historique</TabsTrigger>
            <TabsTrigger value="analytics">Datavisualisation</TabsTrigger>
            <TabsTrigger value="last">Dernière séance</TabsTrigger>
          </TabsList>

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
    await upsertSessions(user.id, [s]);
  }}
  setTab={setTab}   // 👈 ajouté ici

/>

</TabsContent>


<TabsContent value="analytics" className="mt-3 sm:mt-4">
  <Analytics sessions={data.sessions} />
</TabsContent>

<TabsContent value="last" className="mt-3 sm:mt-4">
  <LastSession sessions={data.sessions} />
</TabsContent>

           </Tabs>
      </main>
    </div>
  );
}
// App.jsx (Bloc 2)

// ───────────────────────────────────────────────────────────────
// Auth screen (responsive login / register)
// ───────────────────────────────────────────────────────────────
function AuthScreen() {
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
    <div className="min-h-screen grid place-items-center p-3 sm:p-4">
      <Card className="w-full max-w-sm sm:max-w-md">
        <CardContent className="space-y-4 sm:space-y-5">
          <div className="text-center space-y-1">
            <Dumbbell className="mx-auto h-7 w-7 sm:h-8 sm:w-8" />
            <h2 className="text-lg sm:text-xl font-semibold">Workout Tracker</h2>
            <p className="text-xs sm:text-sm text-gray-600">
              {mode === "login"
                ? "Connecte-toi pour retrouver tes données"
                : "Crée un compte pour commencer"}
            </p>
          </div>

          <div className="grid grid-cols-2 bg-gray-100 rounded-lg sm:rounded-xl p-1">
            <button
              onClick={() => setMode("login")}
              className={cn("py-2 rounded-md sm:rounded-lg text-xs sm:text-sm",
                mode === "login" ? "bg-white shadow font-semibold" : "text-gray-600")}
            >
              Connexion
            </button>
            <button
              onClick={() => setMode("register")}
              className={cn("py-2 rounded-md sm:rounded-lg text-xs sm:text-sm",
                mode === "register" ? "bg-white shadow font-semibold" : "text-gray-600")}
            >
              Inscription
            </button>
          </div>

          <form onSubmit={submit} className="space-y-3">
            <div className="grid gap-1.5">
              <Label>Email</Label>
              <Input type="email" required value={email} onChange={(e)=>setEmail(e.target.value)} placeholder="toi@email.com" />
            </div>
 

            <div className="grid gap-1.5">
              <Label>Mot de passe</Label>
              <Input type="password" required value={password} onChange={(e)=>setPassword(e.target.value)} placeholder="••••••••" />
            </div>
            {error && <div className="text-xs sm:text-sm text-red-600">{error}</div>}
            <Button disabled={loading} className="w-full text-sm sm:text-base">
              {mode==="login" ? "Se connecter" : "Créer le compte"}
            </Button>
          </form>
          <Button
  variant="ghost"
  className="w-full text-xs sm:text-sm text-blue-600 hover:underline"
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
</Button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center"><span className="w-full border-t" /></div>
            <div className="relative flex justify-center text-[10px] sm:text-xs uppercase">
              <span className="bg-white px-2 text-gray-500">ou</span>
            </div>
          </div>

          <Button
            onClick={async()=>{ try{ await signInGoogle(); }catch(e){ setError(e.message);} }}
            variant="secondary"
            className="w-full text-sm sm:text-base"
          >
            Continuer avec Google
          </Button>
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
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
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
      if (parsed.date) setDate(parsed.date);
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
      date,
      type: tplName,
      exercises: cleaned,
      createdAt: new Date().toISOString(),
      totalDuration,
      exerciseDurations,
    };

    try {
      await upsertSessions(user.id, [session]);
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
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
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
                      inputMode="decimal"
                      placeholder="40"
                      value={s.weight}
                      onChange={(e) => updateSet(ex.id, i, "weight", e.target.value.replace(/[^0-9.]/g, ""))}
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
function SessionCard({ session, onDelete, onEdit }) {
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
    if (!cardRef.current) {
      alert("Impossible de trouver la séance à exporter (cardRef vide).");
      return;
    }

    // Scroll au bon endroit pour éviter que la capture soit coupée
    cardRef.current.scrollIntoView({ behavior: "instant", block: "center" });

    // Capture fidèle du style clair/sombre
    const canvas = await html2canvas(cardRef.current, {
      scale: 3,
      useCORS: true,
      backgroundColor: getComputedStyle(document.body).backgroundColor,
      windowWidth: document.documentElement.scrollWidth,
      windowHeight: document.documentElement.scrollHeight,
      logging: false,
    });

    const imageData = canvas.toDataURL("image/png");

    const link = document.createElement("a");
    link.href = imageData;
    link.download = `seance-${local.type || "Libre"}-${local.date || "sans-date"}.png`;
    link.click();
  } catch (e) {
    console.error("Erreur export :", e);
    alert("❌ Impossible d’exporter la séance (voir console).");
  }
};

const cardRef = React.useRef(null);

  return (
<Card ref={cardRef}>
      <CardContent className="p-3 sm:p-4 space-y-2 sm:space-y-3">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <div className="text-xs sm:text-sm text-gray-500">{prettyDate(local.date)} • {local.type}</div>
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

function Analytics({ sessions }) {
  // Exos filtrés : uniquement ceux avec des données
  const allExercises = useMemo(() => {
    if (!sessions || sessions.length === 0) return [];
    const names = sessions.flatMap(s => s.exercises.map(ex => ex.name));
    return Array.from(new Set(names));
  }, [sessions]);

  // Sélecteurs initiaux
  const [exerciseTS, setExerciseTS] = useState(allExercises[0] || "");
  const [exerciseSetTon, setExerciseSetTon] = useState(allExercises[0] || "");

  useEffect(() => {
    if (!exerciseTS && allExercises.length) setExerciseTS(allExercises[0]);
    if (!exerciseSetTon && allExercises.length) setExerciseSetTon(allExercises[0]);
  }, [allExercises, exerciseTS, exerciseSetTon]);

  // Données calculées
  const intensitySeries = useMemo(() => buildAvgIntensitySeries(sessions), [sessions]);
  const weeklyFreq     = useMemo(() => buildSessionsPerWeekSeries(sessions), [sessions]);
  const splitRecent    = useMemo(() => buildTypeSplitLastNDays(sessions, 30), [sessions]);
  const topSet         = useMemo(() => buildTopSetSeriesByExercise(sessions, exerciseTS), [sessions, exerciseTS]);
  const setTonnage     = useMemo(() => buildExerciseSetTonnageSeries(sessions, exerciseSetTon), [sessions, exerciseSetTon]);
  const weekdayHM      = useMemo(() => buildWeekdayHeatmapData(sessions), [sessions]);

  const [exerciseLast3, setExerciseLast3] = useState(allExercises[0] || "");
  useEffect(() => {
    if (!exerciseLast3 && allExercises.length) setExerciseLast3(allExercises[0]);
  }, [allExercises, exerciseLast3]);
  
  return (
    <div className="space-y-6">
      {/* Bloc 1 : Calendrier + Heatmap */}
      <div className="grid md:grid-cols-2 gap-4">
        <MonthlyCalendar sessions={sessions} />
        <HeatmapCard weekdayHM={weekdayHM} />
      </div>

      {/* Bloc 2 : Intensité + Fréquence */}
      <div className="grid md:grid-cols-2 gap-4">
        {/* Intensité */}
        <Card>
          <CardContent className="p-4 space-y-3">
            <h3 className="font-semibold">Intensité moyenne par séance (kg / rep)</h3>
            <div className="h-64 md:h-80">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={intensitySeries}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip formatter={(v) => [`${(Number(v) || 0).toFixed(1)} kg/rep`, "Intensité"]} />
                  <Line type="monotone" dataKey="intensity" strokeWidth={2} dot />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Fréquence */}
        <Card>
          <CardContent className="p-4 space-y-3">
            <h3 className="font-semibold">Fréquence des séances par semaine</h3>
            <div className="h-64 md:h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={weeklyFreq}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="weekLabel" />
                  <YAxis allowDecimals={false} />
                  <Tooltip formatter={(v) => [`${v}`, "Séances"]} />
                  <Bar dataKey="count" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Bloc 3 : Top set + 3 dernières séances */}
      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <h3 className="font-semibold">Top set (1RM estimé) – par exercice</h3>
              <select className="border rounded-xl p-2" value={exerciseTS} onChange={(e) => setExerciseTS(e.target.value)}>
                {allExercises.map((e) => <option key={e} value={e}>{e}</option>)}
              </select>
            </div>

            {topSet.series.length === 0 ? (
              <div className="text-sm text-gray-600">Pas encore de données pour cet exercice.</div>
            ) : (
              <>
                <div className="text-sm text-gray-600">
                  Record: <span className="font-semibold">{Math.round(topSet.record.oneRM)} kg</span>
                  {" "}({topSet.record.weight} kg × {topSet.record.reps} reps) le {topSet.record.date}
                </div>
                <div className="h-64 md:h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={topSet.series}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip formatter={(v) => [`${Math.round(v)} kg`, "1RM estimé"]} />
                      <Line type="monotone" dataKey="oneRM" strokeWidth={2} dot />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <LastThreeSessionsSetTonnageChart
          sessions={sessions}
          exerciseName={exerciseLast3}
          options={allExercises}
          onChangeExercise={setExerciseLast3}
        />
      </div>

{/* Bloc 4 : Répartition des séances par type sur 30 jours */}
<div className="grid md:grid-cols-2 gap-4">
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
            <Tooltip formatter={(v) => [`${v}`, "Séances"]} />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </CardContent>
  </Card>
</div>

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

  return (
    <div className="space-y-4 sm:space-y-6">
      <Card>
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

function getLastSessionByType(sessions, type) {
  if (!sessions || sessions.length === 0) return null;
  const rows = sessions.filter((s) => s.type === type);
  if (rows.length === 0) return null;
  rows.sort((a, b) => (a.date < b.date ? 1 : -1));
  return rows[0];
}

// ───────────────────────────────────────────────────────────────
// Helpers pour Analytics (calculs et composants)
// ───────────────────────────────────────────────────────────────

// Moyenne intensité kg/rep par séance
function buildAvgIntensitySeries(sessions) {
  return sessions.map(s => {
    const totalReps = s.exercises.flatMap(ex => ex.sets).reduce((acc, set) => acc + Number(set.reps || 0), 0);
    const totalWeight = s.exercises.flatMap(ex => ex.sets).reduce((acc, set) => acc + Number(set.reps || 0) * Number(set.weight || 0), 0);
    return { date: shortFR(s.date), intensity: totalReps ? totalWeight / totalReps : 0 };
  });
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
  return sessions.map(s => {
    const volume = s.exercises.filter(ex => ex.name === exName)
      .flatMap(ex => ex.sets)
      .reduce((acc, set) => acc + Number(set.reps || 0) * Number(set.weight || 0), 0);
    return { date: shortFR(s.date), volume };
  });
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
  const filtered = sessions
    .filter(s => s.exercises.some(ex => ex.name === exerciseName))
    .slice(0, 3) // dernières 3 séances
    .map(s => ({
      date: new Date(s.date).toLocaleDateString("fr-FR"),
      sets: s.exercises.find(ex => ex.name === exerciseName).sets
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
  return (
    <Button
      variant="ghost"
      onClick={toggleTheme}
      title={theme === "light" ? "Passer en mode sombre" : "Passer en mode clair"}
    >
      {theme === "light" ? "🌙" : "☀️"}
    </Button>
  );
}
