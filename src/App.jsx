import React, { useMemo, useState, useEffect, useContext, createContext } from "react";
import { v4 as uuidv4 } from "uuid";
import { Trash2, Plus, Download, Upload, BarChart3, Save, Edit3 } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer, BarChart, Bar } from "recharts";

// Firebase
import { db, ensureAnonLogin } from "./firebase";
import { collection, query, where, orderBy, getDocs, writeBatch, doc } from "firebase/firestore";

// ───────────────────────────────────────────────────────────────
// UI primitives inline (style shadcn-like)
// ───────────────────────────────────────────────────────────────
const cn = (...c) => c.filter(Boolean).join(" ");

function Card({ className, children }) {
  return <div className={cn("rounded-2xl border bg-white shadow-sm", className)}>{children}</div>;
}
function CardContent({ className, children }) {
  return <div className={cn("p-4", className)}>{children}</div>;
}
function Button({ children, className, variant = "default", ...props }) {
  const base = "inline-flex items-center justify-center gap-2 rounded-2xl px-3 py-2 text-sm font-medium transition";
  const variants = {
    default: "bg-gray-900 text-white hover:bg-gray-800",
    secondary: "bg-gray-100 text-gray-900 hover:bg-gray-200",
    destructive: "bg-red-600 text-white hover:bg-red-700",
  };
  return (
    <button className={cn(base, variants[variant], className)} {...props}>
      {children}
    </button>
  );
}
function Input({ className, ...props }) {
  return (
    <input
      className={cn("w-full rounded-xl border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-gray-300", className)}
      {...props}
    />
  );
}
function Label({ className, children, ...props }) {
  return (
    <label className={cn("text-sm font-medium text-gray-800", className)} {...props}>
      {children}
    </label>
  );
}

// Tabs
const TabsCtx = createContext(null);
function Tabs({ value, onValueChange, children }) {
  return <TabsCtx.Provider value={{ value, onValueChange }}>{children}</TabsCtx.Provider>;
}
function TabsList({ className, children }) {
  return <div className={cn("rounded-xl bg-gray-100 p-1 flex gap-1", className)}>{children}</div>;
}
function TabsTrigger({ value, children }) {
  const ctx = useContext(TabsCtx);
  const active = ctx?.value === value;
  return (
    <button
      onClick={() => ctx?.onValueChange?.(value)}
      className={cn("px-3 py-2 text-sm rounded-lg", active ? "bg-white shadow font-semibold" : "text-gray-600 hover:bg-white/60")}
    >
      {children}
    </button>
  );
}
function TabsContent({ value, className, children }) {
  const ctx = useContext(TabsCtx);
  if (ctx?.value !== value) return null;
  return <div className={className}>{children}</div>;
}

// ───────────────────────────────────────────────────────────────
// Domain helpers
// ───────────────────────────────────────────────────────────────
const EXERCISES = {
  PUSH: [
    "DC incliné barre smith",
    "DC convergent unilatéral machine",
    "Élévations latérales",
    "Extension triceps triangle",
    "Press horizontal",
  ],
  PULL: ["Tractions", "Tirage horizontal", "Tirage vertical unilatéral", "Leg curl", "Face pull", "Curl biceps"],
  FULL: [
    "Poulie pec haut",
    "Poulie pec basse",
    "Tirage vertical prise neutre",
    "Tirage horizontal",
    "Press horizontal",
    "Arrière épaule poulie",
    "Extension triceps unilatéral",
    "Curl biceps",
    "Presse à cuisses",
    "Squat guidé",
    "Fentes marchées",
  ],
};

const prettyDate = (d) =>
  new Date(d).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "2-digit" });
const volumeOfSets = (sets) => sets.reduce((acc, s) => acc + Number(s.reps || 0) * Number(s.weight || 0), 0);
const computeSessionTonnage = (session) => session.exercises.reduce((acc, ex) => acc + volumeOfSets(ex.sets), 0);
const epley1RM = (weight, reps) => (reps > 1 ? weight * (1 + reps / 30) : weight);

const STORAGE_KEY = "workout-tracker-v1";
const loadData = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : { sessions: [], customExercises: [] };
  } catch (e) {
    console.error(e);
    return { sessions: [], customExercises: [] };
  }
};
const saveData = (data) => localStorage.setItem(STORAGE_KEY, JSON.stringify(data));

// Firestore helpers
async function fetchSessions(uid) {
  const q = query(collection(db, "sessions"), where("user_id", "==", uid), orderBy("date", "desc"));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}
async function upsertSessions(uid, sessions) {
  if (!sessions || sessions.length === 0) return;
  const batch = writeBatch(db);
  sessions.forEach((s) => {
    const ref = doc(db, "sessions", s.id);
    batch.set(
      ref,
      {
        user_id: uid,
        date: s.date,
        type: s.type,
        exercises: s.exercises,
        created_at: s.createdAt || new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      { merge: true }
    );
  });
  await batch.commit();
}

export default function App() {
  const [data, setData] = useState(loadData());
  const [tab, setTab] = useState("log");
  const [user, setUser] = useState(null);

  useEffect(() => saveData(data), [data]);

  // Auto-login invité + sync cloud
  useEffect(() => {
    ensureAnonLogin(async (u) => {
      setUser({ id: u.uid });
      try {
        const remote = await fetchSessions(u.uid);
        if (remote.length === 0 && (data.sessions?.length || 0) > 0) {
          await upsertSessions(u.uid, data.sessions); // pousse le local si le cloud est vide
        } else if (remote.length > 0) {
          setData((cur) => ({ ...cur, sessions: remote })); // remplace local par cloud
        }
      } catch (e) {
        console.error(e);
      }
    });
  }, []);

  // Pousse au cloud quand les sessions changent
  useEffect(() => {
    if (!user?.id) return;
    upsertSessions(user.id, data.sessions).catch(console.error);
  }, [user, data.sessions]);

  return (
    <div className="min-h-screen w-full bg-gray-50 text-gray-900">
      <header className="sticky top-0 z-10 bg-white/80 backdrop-blur border-b">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <h1 className="text-xl md:text-2xl font-semibold">Workout Tracker – Push / Pull / Full</h1>
          <div className="flex gap-2">
            <ExportButton data={data} />
            <ImportButton onImport={(d) => setData(d)} />
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-4">
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="grid grid-cols-3 w-full md:w-auto">
            <TabsTrigger value="log">Saisir une séance</TabsTrigger>
            <TabsTrigger value="sessions">Historique</TabsTrigger>
            <TabsTrigger value="analytics">Datavisualisation</TabsTrigger>
          </TabsList>

          <TabsContent value="log" className="mt-4">
            <SessionForm
              onSave={(session) => setData((cur) => ({ ...cur, sessions: [session, ...cur.sessions] }))}
              customExercises={data.customExercises}
              onAddCustomExercise={(name) =>
                setData((cur) => ({ ...cur, customExercises: [...new Set([...(cur.customExercises || []), name])] }))
              }
            />
          </TabsContent>

          <TabsContent value="sessions" className="mt-4">
            <SessionList
              sessions={data.sessions}
              onDelete={(id) => setData((cur) => ({ ...cur, sessions: cur.sessions.filter((s) => s.id !== id) }))}
              onEdit={(updated) =>
                setData((cur) => ({
                  ...cur,
                  sessions: cur.sessions.map((s) => (s.id === updated.id ? updated : s)),
                }))
              }
            />
          </TabsContent>

          <TabsContent value="analytics" className="mt-4">
            <Analytics sessions={data.sessions} allExercises={getAllExercises(data)} />
            <CloudStatus user={user} sessionsCount={data.sessions.length} />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

function getAllExercises(data) {
  const base = new Set([...EXERCISES.PUSH, ...EXERCISES.PULL, ...EXERCISES.FULL]);
  (data.customExercises || []).forEach((e) => base.add(e));
  return Array.from(base);
}

// ------------------ Session Form ------------------
function SessionForm({ onSave, customExercises = [], onAddCustomExercise }) {
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

  const addSetRow = (exId) => {
    setExercises((cur) => cur.map((ex) => (ex.id === exId ? { ...ex, sets: [...ex.sets, { reps: "", weight: "" }] } : ex)));
  };

  const removeExercise = (exId) => setExercises((cur) => cur.filter((e) => e.id !== exId));

  const saveSession = () => {
    if (!date || !type || exercises.length === 0) return alert("Ajoute au moins un exercice.");
    const cleaned = exercises
      .map((ex) => ({ ...ex, sets: ex.sets.filter((s) => s.reps !== "" && s.weight !== "") }))
      .filter((ex) => ex.sets.length > 0);
    if (cleaned.length === 0) return alert("Renseigne au moins une série valide.");

    const session = { id: uuidv4(), date, type, exercises: cleaned, createdAt: new Date().toISOString() };
    onSave(session);
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
                {availableExercises.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
              <Button onClick={addExercise} title="Ajouter">
                <Plus className="h-4 w-4" />
              </Button>
              <Button variant="secondary" onClick={addCustom} title="Créer un exercice">
                Custom
              </Button>
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
                  <Button variant="destructive" onClick={() => removeExercise(ex.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>

                <div className="grid grid-cols-3 gap-2 text-sm font-medium text-gray-600 mb-2">
                  <div>Série</div>
                  <div>Réps</div>
                  <div>Poids (kg)</div>
                </div>
                {ex.sets.map((s, i) => (
                  <div key={i} className="grid grid-cols-3 gap-2 mb-2 items-center">
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
                  </div>
                ))}

                <div className="flex items-center justify-between mt-3">
                  <div className="text-sm text-gray-700">
                    Sous-total: <span className="font-semibold">{Math.round(volumeOfSets(ex.sets))} kg</span>
                  </div>
                  <Button variant="secondary" onClick={() => addSetRow(ex.id)}>
                    <Plus className="h-4 w-4 mr-1" /> Ajouter une série
                  </Button>
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
        <p className="text-gray-600">
          Ajoute des exercices à ta séance pour commencer le suivi (réps × poids). Tu peux aussi créer des exercices
          personnalisés.
        </p>
      </div>
    </div>
  );
}

// ------------------ Session List ------------------
function SessionList({ sessions, onDelete, onEdit }) {
  if (!sessions || sessions.length === 0) {
    return <EmptyState />;
  }

  return (
    <div className="space-y-4">
      {sessions.map((s) => (
        <SessionCard key={s.id} session={s} onDelete={() => onDelete(s.id)} onEdit={onEdit} />
      ))}
    </div>
  );
}

function SessionCard({ session, onDelete, onEdit }) {
  const [editing, setEditing] = useState(false);
  const [local, setLocal] = useState(session);

  const tonnage = useMemo(() => computeSessionTonnage(local), [local]);

  const save = () => {
    setEditing(false);
    onEdit(local);
  };

  return (
    <Card>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm text-gray-500">
              {prettyDate(local.date)} • {local.type}
            </div>
            <div className="text-2xl font-semibold">{Math.round(tonnage)} kg</div>
          </div>
          <div className="flex gap-2">
            {editing ? (
              <Button onClick={save}>
                <Save className="h-4 w-4 mr-1" />
                Sauvegarder
              </Button>
            ) : (
              <Button variant="secondary" onClick={() => setEditing(true)}>
                <Edit3 className="h-4 w-4 mr-1" />
                Éditer
              </Button>
            )}
            <Button variant="destructive" onClick={onDelete}>
              <Trash2 className="h-4 w-4 mr-1" />
              Supprimer
            </Button>
          </div>
        </div>

        <div className="space-y-4">
          {local.exercises.map((ex, idx) => (
            <div key={ex.id} className="border rounded-2xl p-3 bg-gray-50">
              <div className="flex items-center justify-between mb-2">
                <div className="font-medium">{ex.name}</div>
                <div className="text-sm">
                  Sous-total: <span className="font-semibold">{Math.round(volumeOfSets(ex.sets))} kg</span>
                </div>
              </div>
              {editing ? (
                <div className="grid grid-cols-3 gap-2 text-sm font-medium text-gray-600 mb-2">
                  <div>Série</div>
                  <div>Réps</div>
                  <div>Poids</div>
                </div>
              ) : null}
              {ex.sets.map((s, i) => (
                <div key={i} className="grid grid-cols-3 gap-2 items-center mb-1">
                  <div className="text-gray-600">{i + 1}</div>
                  {editing ? (
                    <Input
                      value={s.reps}
                      onChange={(e) =>
                        setLocal((cur) => ({
                          ...cur,
                          exercises: cur.exercises.map((e2, j) =>
                            j === idx ? { ...e2, sets: e2.sets.map((ss, k) => (k === i ? { ...ss, reps: e.target.value } : ss)) } : e2
                          ),
                        }))
                      }
                    />
                  ) : (
                    <div>{s.reps}</div>
                  )}
                  {editing ? (
                    <Input
                      value={s.weight}
                      onChange={(e) =>
                        setLocal((cur) => ({
                          ...cur,
                          exercises: cur.exercises.map((e2, j) =>
                            j === idx ? { ...e2, sets: e2.sets.map((ss, k) => (k === i ? { ...ss, weight: e.target.value } : ss)) } : e2
                          ),
                        }))
                      }
                    />
                  ) : (
                    <div>{s.weight} kg</div>
                  )}
                </div>
              ))}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// ------------------ Analytics ------------------
function Analytics({ sessions, allExercises }) {
  const [exercise, setExercise] = useState(allExercises[0] || "");

  useEffect(() => {
    if (!exercise && allExercises.length) setExercise(allExercises[0]);
  }, [allExercises, exercise]);

  const perExerciseSeries = useMemo(() => buildExerciseSeries(sessions, exercise), [sessions, exercise]);
  const tonnageSeries = useMemo(() => buildTonnageSeries(sessions), [sessions]);

  return (
    <div className="grid lg:grid-cols-2 gap-4">
      <Card>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">Évolution du tonnage – {exercise}</h3>
            <select className="border rounded-xl p-2" value={exercise} onChange={(e) => setExercise(e.target.value)}>
              {allExercises.map((e) => (
                <option key={e} value={e}>
                  {e}
                </option>
              ))}
            </select>
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={perExerciseSeries} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip formatter={(v) => [`${Math.round(v)} kg`, "Tonnage"]} />
                <Line type="monotone" dataKey="tonnage" strokeWidth={2} dot />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-3">
          <h3 className="font-semibold">Tonnage total par séance</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={tonnageSeries} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip formatter={(v) => [`${Math.round(v)} kg`, "Tonnage total"]} />
                <Bar dataKey="tonnage" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <OneRMPanel sessions={sessions} exercise={exercise} />
    </div>
  );
}

function buildExerciseSeries(sessions, exercise) {
  const byDate = {};
  sessions
    .slice()
    .reverse()
    .forEach((s) => {
      const vol = s.exercises.filter((ex) => ex.name === exercise).reduce((acc, ex) => acc + volumeOfSets(ex.sets), 0);
      if (vol > 0) {
        const key = prettyDate(s.date);
        byDate[key] = (byDate[key] || 0) + vol;
      }
    });
  return Object.entries(byDate).map(([date, tonnage]) => ({ date, tonnage }));
}

function buildTonnageSeries(sessions) {
  return sessions
    .slice()
    .reverse()
    .map((s) => ({ date: prettyDate(s.date), tonnage: computeSessionTonnage(s) }));
}

function OneRMPanel({ sessions, exercise }) {
  const series = useMemo(() => {
    const rows = [];
    sessions
      .slice()
      .reverse()
      .forEach((s) => {
        let best = 0;
        s.exercises
          .filter((ex) => ex.name === exercise)
          .forEach((ex) => {
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
      <CardContent className="space-y-3">
        <h3 className="font-semibold">Estimation 1RM (Epley) – {exercise}</h3>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={series} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip formatter={(v) => [`${Math.round(v)} kg`, "1RM estimé"]} />
              <Line type="monotone" dataKey="oneRM" strokeWidth={2} dot />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

function ExportButton({ data }) {
  const exportJSON = () => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `workout-data-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };
  return (
    <Button onClick={exportJSON} variant="secondary" title="Exporter JSON">
      <Download className="h-4 w-4" />Exporter
    </Button>
  );
}

function ImportButton({ onImport }) {
  const onFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    try {
      const json = JSON.parse(text);
      onImport(json);
    } catch (e) {
      alert("Fichier invalide");
    }
  };
  return (
    <label className="inline-flex items-center gap-2 px-3 py-2 border rounded-2xl cursor-pointer bg-white hover:bg-gray-50">
      <Upload className="h-4 w-4" /> Importer
      <input type="file" accept="application/json" className="hidden" onChange={onFile} />
    </label>
  );
}

function CloudStatus({ user, sessionsCount }) {
  return (
    <Card className="mt-4">
      <CardContent className="flex items-center justify-between">
        <div>
          <div className="text-sm text-gray-500">Cloud</div>
          <div className="text-lg font-semibold">{user ? 'Connecté (invité)' : 'Initialisation…'}</div>
          <div className="text-sm text-gray-600">Séances locales: {sessionsCount}</div>
        </div>
      </CardContent>
    </Card>
  );
}
