import React, { useMemo, useState, useEffect, useContext, createContext } from "react";
import { v4 as uuidv4 } from "uuid";
import { Trash2, Plus, BarChart3, Save, Edit3, Dumbbell, LogOut } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell, Legend} from "recharts";

// Firebase
import { db, onAuth, signInEmail, signUpEmail, signInGoogle, signOutUser } from "./firebase";
import {
  collection, query, where, orderBy, onSnapshot,
  writeBatch, doc, deleteDoc
} from "firebase/firestore";

// ───────────────────────────────────────────────────────────────
// Minimal UI
// ───────────────────────────────────────────────────────────────
const cn = (...c) => c.filter(Boolean).join(" ");
const Card = ({ className, children }) => <div className={cn("rounded-2xl border bg-white shadow-sm", className)}>{children}</div>;
const CardContent = ({ className, children }) => <div className={cn("p-4", className)}>{children}</div>;
function Button({ children, className, variant = "default", ...props }) {
  const base = "inline-flex items-center justify-center gap-2 rounded-2xl px-3 py-2 text-sm font-medium transition";
  const variants = {
    default: "bg-gray-900 text-white hover:bg-gray-800",
    secondary: "bg-gray-100 text-gray-900 hover:bg-gray-200",
    destructive: "bg-red-600 text-white hover:bg-red-700",
    ghost: "bg-transparent hover:bg-gray-100",
  };
  return <button className={cn(base, variants[variant], className)} {...props}>{children}</button>;
}
const Input = ({ className, ...props }) => <input className={cn("w-full rounded-xl border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-gray-300", className)} {...props} />;
const Label = ({ className, children }) => <label className={cn("text-sm font-medium text-gray-800", className)}>{children}</label>;

// Tabs
const TabsCtx = createContext(null);
const Tabs = ({ value, onValueChange, children }) => <TabsCtx.Provider value={{ value, onValueChange }}>{children}</TabsCtx.Provider>;
const TabsList = ({ className, children }) => <div className={cn("rounded-xl bg-gray-100 p-1 flex gap-1", className)}>{children}</div>;
function TabsTrigger({ value, children }) {
  const ctx = useContext(TabsCtx); const active = ctx?.value === value;
  return <button onClick={() => ctx?.onValueChange?.(value)} className={cn("px-3 py-2 text-sm rounded-lg", active ? "bg-white shadow font-semibold" : "text-gray-600 hover:bg-white/60")}>{children}</button>;
}
const TabsContent = ({ value, className, children }) => {
  const ctx = useContext(TabsCtx); if (ctx?.value !== value) return null; return <div className={className}>{children}</div>;
};

// ───────────────────────────────────────────────────────────────
// Domain
// ───────────────────────────────────────────────────────────────
const EXERCISES = {
  PUSH: ["DC incliné barre smith","DC convergent unilatéral machine","Élévations latérales","Extension triceps triangle","Press horizontal"],
  PULL: ["Tractions","Tirage horizontal","Tirage vertical unilatéral","Leg curl","Face pull","Curl biceps"],
  FULL: [
    "Poulie pec haut","Poulie pec basse","Tirage vertical prise neutre","Tirage horizontal","Press horizontal",
    "Arrière épaule poulie","Extension triceps unilatéral","Curl biceps","Presse à cuisses","Squat guidé","Fentes marchées",
  ],
};
const prettyDate = (d) => new Date(d).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "2-digit" });
const volumeOfSets = (sets) => sets.reduce((acc, s) => acc + Number(s.reps || 0) * Number(s.weight || 0), 0);
const computeSessionTonnage = (session) => session.exercises.reduce((acc, ex) => acc + volumeOfSets(ex.sets), 0);
const epley1RM = (weight, reps) => (reps > 1 ? weight * (1 + reps / 30) : weight);

// ───────────────────────────────────────────────────────────────
// Local cache per UID (optional, for fast reload/offline)
// ───────────────────────────────────────────────────────────────
const STORAGE_NAMESPACE = "workout-tracker-v1";
const keyFor = (uid) => `${STORAGE_NAMESPACE}:${uid || "anon"}`;
const loadDataFor = (uid) => { try { const raw = localStorage.getItem(keyFor(uid)); return raw ? JSON.parse(raw) : { sessions: [], customExercises: [] }; } catch { return { sessions: [], customExercises: [] }; } };
const saveDataFor = (uid, data) => { localStorage.setItem(keyFor(uid), JSON.stringify(data)); };
const migrateLegacyLocal = () => { try { const raw = localStorage.getItem(STORAGE_NAMESPACE); return raw ? JSON.parse(raw) : null; } catch { return null; } };

// ───────────────────────────────────────────────────────────────
// Firestore helpers (REAL-TIME)
// ───────────────────────────────────────────────────────────────
function subscribeSessions(uid, onChange, onError) {
  const q = query(
    collection(db, "sessions"),
    where("user_id", "==", uid),
    orderBy("date", "desc")
  );
  return onSnapshot(
    q,
    (snap) => {
      const rows = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      onChange(rows);
    },
    (err) => {
      console.error("onSnapshot error:", err);
      onError?.(err);
      alert("Firestore error: " + (err?.message || err));
    }
  );
}

async function upsertSessions(uid, sessions) {
  if (!sessions || sessions.length === 0) return;
  const batch = writeBatch(db);
  sessions.forEach((s) => {
    const ref = doc(db, "sessions", s.id);
    batch.set(ref, {
      user_id: uid,
      date: s.date,
      type: s.type,
      exercises: s.exercises,
      created_at: s.createdAt || new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }, { merge: true });
  });
  await batch.commit();
}

async function deleteSession(uid, id) {
  // Rules must allow delete if resource.user_id == request.auth.uid
  await deleteDoc(doc(db, "sessions", id));
}

// ───────────────────────────────────────────────────────────────
// MAIN APP (default export)
// ───────────────────────────────────────────────────────────────
export default function App() {
  const [data, setData] = useState({ sessions: [], customExercises: [] });
  const [tab, setTab] = useState("log");
  const [user, setUser] = useState(undefined); // undefined = loading

  useEffect(() => {
    let unsubscribeSessions = null;

    const unsubAuth = onAuth(async (u) => {
      // Logged out
      if (!u) {
        setUser(null);
        setData({ sessions: [], customExercises: [] });
        unsubscribeSessions?.();
        return;
      }

      // Logged in
      const uid = u.uid;
      setUser({ id: uid, email: u.email || "Utilisateur" });

      // (optional) migrate old cache key to per-uid key
      const legacy = migrateLegacyLocal();
      if (legacy && (legacy.sessions?.length || 0) > 0 && !localStorage.getItem(keyFor(uid))) {
        saveDataFor(uid, legacy);
        localStorage.removeItem(STORAGE_NAMESPACE);
      }

      // Real-time subscription to Firestore
      unsubscribeSessions?.();
      unsubscribeSessions = subscribeSessions(
        uid,
        (remoteRows) => {
          const hydrated = {
            sessions: remoteRows,
            // keep local custom exercises per user
            customExercises: loadDataFor(uid).customExercises || [],
          };
          setData(hydrated);
          saveDataFor(uid, hydrated);
        }
      );
    });

    return () => {
      unsubAuth?.();
      unsubscribeSessions?.();
    };
  }, []);

  // Persist local cache per UID
  useEffect(() => {
    if (!user?.id) return;
    saveDataFor(user.id, data);
  }, [user?.id, data]);

  if (user === undefined) return <div className="min-h-screen grid place-items-center text-gray-600">Chargement…</div>;
  if (user === null) return <AuthScreen />;

  return (
    <div className="min-h-screen w-full bg-gray-50 text-gray-900">
      <header className="sticky top-0 z-10 bg-white/80 backdrop-blur border-b">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Dumbbell className="h-5 w-5" />
            <h1 className="text-xl md:text-2xl font-semibold">Workout Tracker</h1>
            <div className="text-xs text-gray-400">UID: {user?.id}</div>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-sm text-gray-600">{user.email}</div>
            <Button variant="ghost" onClick={() => signOutUser()} title="Se déconnecter">
              <LogOut className="h-4 w-4" /> Déconnexion
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-4">
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="grid grid-cols-3 w-full md:w-auto">
            <TabsTrigger value="log">Saisir une séance</TabsTrigger>
            <TabsTrigger value="sessions">Historique</TabsTrigger>
            <TabsTrigger value="analytics">Datavisualisation</TabsTrigger>
              <TabsTrigger value="last">Dernière séance</TabsTrigger>
          </TabsList>

          <TabsContent value="log" className="mt-4">
            <SessionForm
              user={user}
              onSavedLocally={(session) => {
                // optional optimistic local add (not required because snapshot will update)
                // setData((cur) => ({ ...cur, sessions: [session, ...cur.sessions] }));
              }}
              customExercises={data.customExercises}
              onAddCustomExercise={(name) =>
                setData((cur) => ({ ...cur, customExercises: [...new Set([...(cur.customExercises || []), name])] }))
              }
            />
          </TabsContent>

          <TabsContent value="sessions" className="mt-4">
            <SessionList
              user={user}
              sessions={data.sessions}
              onDelete={async (id) => {
                try { await deleteSession(user.id, id); }
                catch (e) { console.error(e); alert("Suppression impossible: " + (e?.message || e)); }
              }}
              onEdit={async (updated) => {
                try { await upsertSessions(user.id, [updated]); }
                catch (e) { console.error(e); alert("Sauvegarde impossible: " + (e?.message || e)); }
              }}
            />
          </TabsContent>


          <TabsContent value="analytics" className="mt-4">
            <Analytics sessions={data.sessions} allExercises={getAllExercises(data)} />
          </TabsContent>

          <TabsContent value="last" className="mt-4">
            <LastSession sessions={data.sessions} />
          </TabsContent>
          
        </Tabs>
      </main>
    </div>
  );
}

// ───────────────────────────────────────────────────────────────
// Auth screen (Email/Password + Google)
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
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen grid place-items-center p-4">
      <Card className="w-full max-w-md">
        <CardContent className="p-6 space-y-5">
          <div className="text-center space-y-1">
            <Dumbbell className="mx-auto h-8 w-8" />
            <h2 className="text-xl font-semibold">Workout Tracker</h2>
            <p className="text-sm text-gray-600">
              {mode === "login" ? "Connecte-toi pour retrouver tes données" : "Crée un compte pour commencer"}
            </p>
          </div>

          <div className="grid grid-cols-2 bg-gray-100 rounded-xl p-1">
            <button onClick={() => setMode("login")} className={cn("py-2 rounded-lg", mode==="login"?"bg-white shadow font-semibold":"text-gray-600")}>Connexion</button>
            <button onClick={() => setMode("register")} className={cn("py-2 rounded-lg", mode==="register"?"bg-white shadow font-semibold":"text-gray-600")}>Inscription</button>
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
            {error && <div className="text-sm text-red-600">{error}</div>}
            <Button disabled={loading} className="w-full">{mode==="login" ? "Se connecter" : "Créer le compte"}</Button>
          </form>

          <div className="relative">
            <div className="absolute inset-0 flex items-center"><span className="w-full border-t" /></div>
            <div className="relative flex justify-center text-xs uppercase"><span className="bg-white px-2 text-gray-500">ou</span></div>
          </div>

          <Button onClick={async()=>{ try{ await signInGoogle(); }catch(e){ setError(e.message);} }} variant="secondary" className="w-full">
            Continuer avec Google
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

// ───────────────────────────────────────────────────────────────
// Business components
// ───────────────────────────────────────────────────────────────
function getAllExercises(data) {
  const base = new Set([...EXERCISES.PUSH, ...EXERCISES.PULL, ...EXERCISES.FULL]);
  (data.customExercises || []).forEach((e) => base.add(e));
  return Array.from(base);
}

function SessionForm({ user, onSavedLocally, customExercises = [], onAddCustomExercise }) {
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [type, setType] = useState("PUSH");
  const [exercises, setExercises] = useState([]);
  const [exSelect, setExSelect] = useState("");

  const availableExercises = useMemo(() => {
    const base = EXERCISES[type] || [];
    return Array.from(new Set([...base, ...customExercises]));
  }, [type, customExercises]);

  const totalTonnage = useMemo(() => exercises.reduce((acc, ex) => acc + volumeOfSets(ex.sets), 0), [exercises]);

  const addExercise = () => {
    if (!exSelect) return;
    setExercises((cur) => [
      ...cur,
      { id: uuidv4(), name: exSelect, sets: [{ reps: "", weight: "" }, { reps: "", weight: "" }, { reps: "", weight: "" }] },
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
      cur.map((ex) => (ex.id === exId ? { ...ex, sets: ex.sets.map((s, i) => (i === idx ? { ...s, [field]: value } : s)) } : ex))
    );
  };

  const addSetRow = (exId) => setExercises((cur) => cur.map((ex) => (ex.id === exId ? { ...ex, sets: [...ex.sets, { reps: "", weight: "" }] } : ex)));

  const removeExercise = (exId) => setExercises((cur) => cur.filter((e) => e.id !== exId));

  const saveSession = async () => {
    if (!date || !type || exercises.length === 0) return alert("Ajoute au moins un exercice.");
    const cleaned = exercises.map((ex) => ({ ...ex, sets: ex.sets.filter((s) => s.reps !== "" && s.weight !== "") })).filter((ex) => ex.sets.length > 0);
    if (cleaned.length === 0) return alert("Renseigne au moins une série valide.");

    const session = { id: uuidv4(), date, type, exercises: cleaned, createdAt: new Date().toISOString() };

    // 1) Write to Firestore immediately (source of truth)
    try {
      await upsertSessions(user.id, [session]);
    } catch (e) {
      console.error(e);
      alert("Impossible d’enregistrer sur le cloud : " + (e?.message || e));
      return;
    }

    // 2) Optional optimistic local update (snapshot will also refresh)
    onSavedLocally?.(session);

    // reset form
    setExercises([]);
  };

  return (
    <div className="grid md:grid-cols-3 gap-4">
      <Card className="md:col-span-1">
        <CardContent className="space-y-4">
          <div className="grid gap-2">
            <Label>Date</Label>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>

          <div className="grid gap-2">
            <Label>Type de séance</Label>
            <select className="w-full rounded-xl border p-2" value={type} onChange={(e) => setType(e.target.value)}>
              <option value="PUSH">PUSH</option>
              <option value="PULL">PULL</option>
              <option value="FULL">FULL BODY</option>
            </select>
          </div>

          <div className="grid gap-2">
            <Label>Ajouter un exercice</Label>
            <div className="flex gap-2">
              <select className="w-full rounded-xl border p-2" value={exSelect} onChange={(e) => setExSelect(e.target.value)}>
                <option value="">— Sélectionner —</option>
                {availableExercises.map((name) => (<option key={name} value={name}>{name}</option>))}
              </select>
              <Button onClick={addExercise} title="Ajouter"><Plus className="h-4 w-4" /></Button>
              <Button variant="secondary" onClick={addCustom} title="Créer un exercice">Custom</Button>
            </div>
          </div>

          <div className="border rounded-xl p-3 bg-gray-50">
            <div className="text-sm text-gray-600">Tonnage total (Σ reps × poids)</div>
            <div className="text-2xl font-semibold">{Math.round(totalTonnage)} kg</div>
          </div>

          <Button className="w-full" onClick={saveSession}>
            <Save className="h-4 w-4 mr-2" />
            Enregistrer la séance
          </Button>
        </CardContent>
      </Card>

      <div className="md:col-span-2 space-y-4">
        {exercises.length === 0 ? (
          <EmptyState />
        ) : (
          exercises.map((ex) => (
            <Card key={ex.id}>
              <CardContent>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-lg">{ex.name}</h3>
                  <Button variant="destructive" onClick={() => removeExercise(ex.id)}><Trash2 className="h-4 w-4" /></Button>
                </div>

                <div className="grid grid-cols-3 gap-2 text-sm font-medium text-gray-600 mb-2">
                  <div>Série</div><div>Réps</div><div>Poids (kg)</div>
                </div>
                {ex.sets.map((s, i) => (
                  <div key={i} className="grid grid-cols-3 gap-2 mb-2 items-center">
                    <div className="text-gray-600">{i + 1}</div>
                    <Input inputMode="numeric" placeholder="10" value={s.reps} onChange={(e) => updateSet(ex.id, i, "reps", e.target.value.replace(/[^0-9]/g, ""))} />
                    <Input inputMode="decimal" placeholder="40" value={s.weight} onChange={(e) => updateSet(ex.id, i, "weight", e.target.value.replace(/[^0-9.]/g, ""))} />
                  </div>
                ))}

                <div className="flex items-center justify-between mt-3">
                  <div className="text-sm text-gray-700">Sous-total: <span className="font-semibold">{Math.round(volumeOfSets(ex.sets))} kg</span></div>
                  <Button variant="secondary" onClick={() => addSetRow(ex.id)}><Plus className="h-4 w-4 mr-1" /> Ajouter une série</Button>
                </div>
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
    <div className="h-48 border rounded-2xl grid place-items-center text-center bg-white">
      <div className="max-w-md px-6">
        <BarChart3 className="mx-auto mb-2" />
        <p className="text-gray-600">Ajoute des exercices à ta séance pour commencer le suivi (réps × poids). Tu peux aussi créer des exercices personnalisés.</p>
      </div>
    </div>
  );
}

function SessionList({ user, sessions, onDelete, onEdit }) {
  const [filter, setFilter] = useState("ALL"); // ALL | PUSH | PULL | FULL

  const filtered = useMemo(() => {
    if (!sessions) return [];
    if (filter === "ALL") return sessions;
    // "FULL BODY" correspond à type "FULL" dans tes données
    const wanted = filter === "FULL" ? "FULL" : filter; 
    return sessions.filter((s) => s.type === wanted);
  }, [sessions, filter]);

  if (!sessions || sessions.length === 0) {
    return (
      <div className="space-y-4">
        <FilterBar filter={filter} setFilter={setFilter} />
        <EmptyState />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <FilterBar filter={filter} setFilter={setFilter} total={filtered.length} />
      {filtered.length === 0 ? (
        <Card>
          <CardContent className="p-4 text-sm text-gray-600">
            Aucune séance trouvée pour ce filtre.
          </CardContent>
        </Card>
      ) : (
        filtered.map((s) => (
          <SessionCard key={s.id} session={s} onDelete={() => onDelete(s.id)} onEdit={onEdit} />
        ))
      )}
    </div>
  );
}

function FilterBar({ filter, setFilter, total }) {
  return (
    <Card>
      <CardContent className="p-3 flex flex-wrap items-center gap-2 justify-between">
        <div className="flex gap-2">
          <Button
            variant={filter === "ALL" ? "default" : "secondary"}
            onClick={() => setFilter("ALL")}
          >
            Tout
          </Button>
          <Button
            variant={filter === "PUSH" ? "default" : "secondary"}
            onClick={() => setFilter("PUSH")}
          >
            PUSH
          </Button>
          <Button
            variant={filter === "PULL" ? "default" : "secondary"}
            onClick={() => setFilter("PULL")}
          >
            PULL
          </Button>
          <Button
            variant={filter === "FULL" ? "default" : "secondary"}
            onClick={() => setFilter("FULL")}
          >
            FULL BODY
          </Button>
        </div>
        {typeof total === "number" && (
          <div className="text-sm text-gray-600">Séances: {total}</div>
        )}
      </CardContent>
    </Card>
  );
}

function SessionCard({ session, onDelete, onEdit }) {
  const [editing, setEditing] = useState(false);
  const [local, setLocal] = useState(session);
  useEffect(() => setLocal(session), [session]); // keep in sync with snapshot
  const tonnage = useMemo(() => computeSessionTonnage(local), [local]);

  const save = async () => {
    setEditing(false);
    await onEdit(local); // push to Firestore
  };

  return (
    <Card>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm text-gray-500">{prettyDate(local.date)} • {local.type}</div>
            <div className="text-2xl font-semibold">{Math.round(tonnage)} kg</div>
          </div>
          <div className="flex gap-2">
            {editing ? (
              <Button onClick={save}><Save className="h-4 w-4 mr-1" />Sauvegarder</Button>
            ) : (
              <Button variant="secondary" onClick={() => setEditing(true)}><Edit3 className="h-4 w-4 mr-1" />Éditer</Button>
            )}
            <Button variant="destructive" onClick={onDelete}><Trash2 className="h-4 w-4 mr-1" />Supprimer</Button>
          </div>
        </div>

        <div className="space-y-4">
          {local.exercises.map((ex, idx) => (
            <div key={ex.id} className="border rounded-xl p-3 bg-gray-50">
              <div className="flex items-center justify-between mb-2">
                <div className="font-medium">{ex.name}</div>
                <div className="text-sm">Sous-total: <span className="font-semibold">{Math.round(volumeOfSets(ex.sets))} kg</span></div>
              </div>

              {editing ? (
                <>
                  <div className="grid grid-cols-3 gap-2 text-sm font-medium text-gray-600 mb-2">
                    <div>Série</div><div>Réps</div><div>Poids</div>
                  </div>
                  {ex.sets.map((s, i) => (
                    <div key={i} className="grid grid-cols-3 gap-2 items-center mb-1">
                      <div className="text-gray-600">{i + 1}</div>
                      <Input value={s.reps} onChange={(e) => setLocal((cur) => ({
                        ...cur,
                        exercises: cur.exercises.map((e2, j) =>
                          j === idx ? { ...e2, sets: e2.sets.map((ss, k) => (k === i ? { ...ss, reps: e.target.value } : ss)) } : e2
                        ),
                      }))} />
                      <Input value={s.weight} onChange={(e) => setLocal((cur) => ({
                        ...cur,
                        exercises: cur.exercises.map((e2, j) =>
                          j === idx ? { ...e2, sets: e2.sets.map((ss, k) => (k === i ? { ...ss, weight: e.target.value } : ss)) } : e2
                        ),
                      }))} />
                    </div>
                  ))}
                </>
              ) : (
                ex.sets.map((s, i) => (
                  <div key={i} className="grid grid-cols-3 gap-2 items-center mb-1">
                    <div className="text-gray-600">{i + 1}</div>
                    <div>{s.reps}</div>
                    <div>{s.weight} kg</div>
                  </div>
                ))
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function Analytics({ sessions, allExercises }) {
  // Sélecteurs d'exercice (utilisés pour Top Set & Tonnage par série)
  const [exerciseTS, setExerciseTS] = useState(allExercises[0] || "");
  const [exerciseSetTon, setExerciseSetTon] = useState(allExercises[0] || "");
  useEffect(() => {
    if (!exerciseTS && allExercises.length) setExerciseTS(allExercises[0]);
    if (!exerciseSetTon && allExercises.length) setExerciseSetTon(allExercises[0]);
  }, [allExercises, exerciseTS, exerciseSetTon]);

  // Données calculées
  const intensitySeries = useMemo(() => buildAvgIntensitySeries(sessions), [sessions]);
  const weeklyFreq = useMemo(() => buildSessionsPerWeekSeries(sessions), [sessions]);
  const splitRecent = useMemo(() => buildTypeSplitLastNDays(sessions, 30), [sessions]);

  const topSet = useMemo(
    () => buildTopSetSeriesByExercise(sessions, exerciseTS),
    [sessions, exerciseTS]
  );
  const setTonnage = useMemo(
    () => buildExerciseSetTonnageSeries(sessions, exerciseSetTon),
    [sessions, exerciseSetTon]
  );

  const weekdayHM = useMemo(() => buildWeekdayHeatmapData(sessions), [sessions]);

  return (
    <div className="space-y-4">
      {/* 1) Intensité moyenne par séance */}
      <Card>
        <CardContent className="p-4 space-y-3">
          <h3 className="font-semibold">Intensité moyenne par séance (kg / rep)</h3>
          <div className="h-64 md:h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={intensitySeries} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
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

      {/* 2) Fréquence des séances par semaine */}
      <Card>
        <CardContent className="p-4 space-y-3">
          <h3 className="font-semibold">Fréquence des séances par semaine</h3>
          <div className="h-64 md:h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weeklyFreq} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
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

      {/* 3) Top set par exercice (1RM estimé Epley) */}
      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <h3 className="font-semibold">Top set (1RM estimé) – par exercice</h3>
            <select
              className="border rounded-xl p-2"
              value={exerciseTS}
              onChange={(e) => setExerciseTS(e.target.value)}
            >
              {allExercises.map((e) => (
                <option key={e} value={e}>{e}</option>
              ))}
            </select>
          </div>

          {topSet.series.length === 0 ? (
            <div className="text-sm text-gray-600">Pas encore de données pour cet exercice.</div>
          ) : (
            <>
              <div className="text-sm text-gray-600">
                Record: <span className="font-semibold">
                  {Math.round(topSet.record.oneRM)} kg
                </span>
                {" "}({topSet.record.weight} kg × {topSet.record.reps} reps) le {topSet.record.date}
              </div>
              <div className="h-64 md:h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={topSet.series} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
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

      {/* 4) Évolution du tonnage par série pour un exercice (barres empilées) */}
      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <h3 className="font-semibold">Évolution du tonnage par série – {exerciseSetTon}</h3>
            <select
              className="border rounded-xl p-2"
              value={exerciseSetTon}
              onChange={(e) => setExerciseSetTon(e.target.value)}
            >
              {allExercises.map((e) => (
                <option key={e} value={e}>{e}</option>
              ))}
            </select>
          </div>

          {setTonnage.series.length === 0 ? (
            <div className="text-sm text-gray-600">Pas encore de données pour cet exercice.</div>
          ) : (
            <div className="h-64 md:h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={setTonnage.series} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip formatter={(v, name) => [`${Math.round(v)} kg`, name.toUpperCase()]} />
                  {setTonnage.keys.map((k) => (
                    <Bar key={k} dataKey={k} stackId="a" />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 5) Répartition PUSH / PULL / FULL (30 derniers jours) */}
      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">Répartition des séances (30 derniers jours)</h3>
            <div className="text-sm text-gray-500">PUSH / PULL / FULL</div>
          </div>
          <div className="h-64 md:h-80 grid place-items-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={splitRecent} dataKey="value" nameKey="name" innerRadius={60} outerRadius={90} label>
                  {splitRecent.map((_, i) => (
                    <Cell key={i} />
                  ))}
                </Pie>
                <Legend />
                <Tooltip formatter={(v) => [`${v}`, "Séances"]} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* 6) Heatmap des jours de la semaine */}
      <Card>
        <CardContent className="p-4 space-y-3">
          <h3 className="font-semibold">Jours d’entraînement (heatmap hebdo)</h3>
          <div className="text-sm text-gray-500">Plus la case est foncée, plus tu t’entraînes ce jour-là.</div>

          <div className="inline-grid gap-1" style={{ gridTemplateColumns: "repeat(7, 28px)" }}>
            {weekdayHM.counts.map((v, idx) => (
              <div key={idx} className="flex flex-col items-center gap-1">
                <div
                  className={cn(
                    "h-6 w-6 rounded",
                    weekdayHM.level(v)
                  )}
                  title={`${["Lun","Mar","Mer","Jeu","Ven","Sam","Dim"][idx]} • ${v} séance(s)`}
                />
                <div className="text-[10px] text-gray-600">
                  {["L","M","M","J","V","S","D"][idx]}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
// — Intensité moyenne par séance = (Σ reps×poids) / (Σ reps)
function buildAvgIntensitySeries(sessions) {
  return sessions
    .slice()
    .reverse()
    .map((s) => {
      let ton = 0, reps = 0;
      s.exercises.forEach((ex) =>
        ex.sets.forEach((set) => {
          const r = Number(set.reps || 0);
          const w = Number(set.weight || 0);
          ton += r * w;
          reps += r;
        })
      );
      const intensity = reps > 0 ? ton / reps : 0;
      return { date: prettyDate(s.date), intensity };
    });
}

// — Fréquence des séances par semaine (ISO)
function buildSessionsPerWeekSeries(sessions) {
  const map = new Map();
  sessions.forEach((s) => {
    const d = new Date(s.date + "T00:00:00");
    const { year, week } = isoWeek(d);
    const key = `${year}-W${String(week).padStart(2, "0")}`;
    map.set(key, (map.get(key) || 0) + 1);
  });
  return Array.from(map.entries())
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .map(([key, count]) => ({ weekLabel: key, count }));
}

// — Top set (1RM Epley) par exercice, + record global
function buildTopSetSeriesByExercise(sessions, exercise) {
  const series = [];
  let best = { oneRM: 0, date: "", weight: 0, reps: 0 };
  sessions
    .slice()
    .reverse()
    .forEach((s) => {
      let bestDay = 0;
      let bestDetail = { weight: 0, reps: 0 };
      s.exercises
        .filter((ex) => ex.name === exercise)
        .forEach((ex) => {
          ex.sets.forEach((set) => {
            const w = Number(set.weight || 0);
            const r = Number(set.reps || 0);
            const curr = epley1RM(w, r);
            if (curr > bestDay) {
              bestDay = curr;
              bestDetail = { weight: w, reps: r };
            }
          });
        });
      if (bestDay > 0) {
        series.push({ date: prettyDate(s.date), oneRM: bestDay });
        if (bestDay > best.oneRM) {
          best = { oneRM: bestDay, date: prettyDate(s.date), weight: bestDetail.weight, reps: bestDetail.reps };
        }
      }
    });
  return { series, record: best };
}

// — Évolution du tonnage par série pour un exercice (barres empilées set1,set2,...)
function buildExerciseSetTonnageSeries(sessions, exercise) {
  // On doit homogénéiser le nombre de sets (clés)
  let maxSets = 0;
  const rows = [];

  sessions
    .slice()
    .reverse()
    .forEach((s) => {
      const exRows = s.exercises.filter((ex) => ex.name === exercise);
      if (exRows.length === 0) return;

      // On concatène toutes les séries de cet exo pour la séance (au cas de plusieurs blocs)
      const sets = [];
      exRows.forEach((ex) => {
        ex.sets.forEach((set) => {
          const r = Number(set.reps || 0);
          const w = Number(set.weight || 0);
          sets.push({ ton: r * w });
        });
      });

      if (sets.length === 0) return;
      maxSets = Math.max(maxSets, sets.length);

      const row = { date: prettyDate(s.date) };
      sets.forEach((st, i) => {
        row[`set${i + 1}`] = st.ton;
      });
      rows.push(row);
    });

  const keys = Array.from({ length: maxSets }, (_, i) => `set${i + 1}`);
  // Remplir les trous à 0 pour Recharts
  const filled = rows.map((r) => {
    const out = { date: r.date };
    keys.forEach((k) => (out[k] = Number(r[k] || 0)));
    return out;
    });

  return { series: filled, keys };
}

// — Heatmap simple des jours de la semaine (compte total sur l’historique)
function buildWeekdayHeatmapData(sessions) {
  const counts = Array(7).fill(0); // Lun=0 ... Dim=6
  sessions.forEach((s) => {
    const d = new Date(s.date + "T00:00:00");
    const col = (d.getDay() + 6) % 7;
    counts[col] += 1;
  });
  const max = counts.reduce((a, b) => Math.max(a, b), 0);

  // Échelle en 5 niveaux
  const level = (v) => {
    if (v === 0) return "bg-gray-100";
    const p = v / (max || 1);
    if (p < 0.2) return "bg-green-100";
    if (p < 0.4) return "bg-green-200";
    if (p < 0.6) return "bg-green-300";
    if (p < 0.8) return "bg-green-400";
    return "bg-green-500";
  };

  return { counts, max, level };
}

function buildExerciseSeries(sessions, exercise) {
  const byDate = {};
  sessions.slice().reverse().forEach((s) => {
    const vol = s.exercises.filter((ex) => ex.name === exercise).reduce((acc, ex) => acc + volumeOfSets(ex.sets), 0);
    if (vol > 0) {
      const key = prettyDate(s.date);
      byDate[key] = (byDate[key] || 0) + vol;
    }
  });
  return Object.entries(byDate).map(([date, tonnage]) => ({ date, tonnage }));
}
function buildTonnageSeries(sessions) {
  return sessions.slice().reverse().map((s) => ({ date: prettyDate(s.date), tonnage: computeSessionTonnage(s) }));
}
function OneRMPanel({ sessions, exercise }) {
  const series = useMemo(() => {
    const rows = [];
    sessions.slice().reverse().forEach((s) => {
      let best = 0;
      s.exercises.filter((ex) => ex.name === exercise).forEach((ex) => {
        ex.sets.forEach((set) => {
          const w = Number(set.weight || 0);
          const r = Number(set.reps || 0);
          best = Math.max(best, epley1RM(w, r));
        });
      });
      if (best > 0) rows.push({ date: prettyDate(s.date), oneRM: best });
    });
    return rows;
  }, [sessions, exercise]);
  if (series.length === 0) return null;

  return (
    <Card className="lg:col-span-2">
      <CardContent className="p-4 space-y-3">
        <h3 className="font-semibold">Estimation 1RM (Epley) – {exercise}</h3>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={series} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" /><YAxis />
              <Tooltip formatter={(v) => [`${Math.round(v)} kg`, "1RM estimé"]} />
              <Line type="monotone" dataKey="oneRM" strokeWidth={2} dot />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

function LastSession({ sessions }) {
  const [t, setT] = useState("PUSH"); // type sélectionné

  const last = useMemo(() => getLastSessionByType(sessions, t), [sessions, t]);
  const tonnage = useMemo(() => (last ? computeSessionTonnage(last) : 0), [last]);

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">Dernière séance – {t}</h3>
            <div className="flex gap-2">
              <Button variant={t==="PUSH" ? "default" : "secondary"} onClick={() => setT("PUSH")}>PUSH</Button>
              <Button variant={t==="PULL" ? "default" : "secondary"} onClick={() => setT("PULL")}>PULL</Button>
              <Button variant={t==="FULL" ? "default" : "secondary"} onClick={() => setT("FULL")}>FULL BODY</Button>
            </div>
          </div>

          {!last ? (
            <div className="text-gray-600">Aucune séance {t} trouvée.</div>
          ) : (
            <>
              <div className="flex items-baseline justify-between">
                <div className="text-sm text-gray-500">{prettyDate(last.date)} • {last.type}</div>
                <div className="text-2xl font-semibold">{Math.round(tonnage)} kg</div>
              </div>

              <div className="space-y-4">
                {last.exercises.map((ex) => (
                  <div key={ex.id} className="border rounded-xl p-3 bg-gray-50">
                    <div className="flex items-center justify-between mb-2">
                      <div className="font-medium">{ex.name}</div>
                      <div className="text-sm">
                        Sous-total: <span className="font-semibold">{Math.round(volumeOfSets(ex.sets))} kg</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-sm font-medium text-gray-600 mb-2">
                      <div>Série</div><div>Réps</div><div>Poids (kg)</div>
                    </div>
                    {ex.sets.map((s, i) => (
                      <div key={i} className="grid grid-cols-3 gap-2 items-center mb-1">
                        <div className="text-gray-600">{i + 1}</div>
                        <div>{s.reps}</div>
                        <div>{s.weight} kg</div>
                      </div>
                    ))}
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

// utilitaire pour trouver la dernière séance d'un type donné
function getLastSessionByType(sessions, type) {
  if (!sessions || sessions.length === 0) return null;
  const rows = sessions.filter((s) => s.type === type);
  if (rows.length === 0) return null;
  // Les dates sont au format "YYYY-MM-DD" → tri lexical ok ; sinon on convertit en Date
  rows.sort((a, b) => (a.date < b.date ? 1 : -1)); // desc
  return rows[0];
}
