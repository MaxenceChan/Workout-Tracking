function StepsTracker({ user }) {
  const [stepsData, setStepsData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const connectGoogleFit = () => {
    window.location.href = `/api/auth/google-fit?uid=${user.id}`;
  };

  useEffect(() => {
    if (!user?.id) return;

    // Lance l'import (non bloquant)
    fetch(`/api/steps?uid=${user.id}`).catch(() => {});

    const stepsRef = collection(db, "users", user.id, "steps");

    return onSnapshot(
      stepsRef,
      (snap) => {
        const rows = snap.docs
          .map((d) => d.data())
          .sort((a, b) => a.date.localeCompare(b.date));

        setStepsData(rows);
        setLoading(false);
        setError(null);
      },
      (e) => {
        console.error("🔥 Firestore steps error:", e);
        setError("FIRESTORE_ERROR");
        setLoading(false);
      }
    );
  }, [user?.id]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <Card>
        <CardContent className="space-y-4">
          <h3 className="font-semibold text-lg">🚶 Suivi des pas</h3>

          {loading && <p className="text-sm text-gray-500">Chargement…</p>}

          {error === "FIRESTORE_ERROR" && (
            <p className="text-sm text-red-500">
              Erreur Firestore.
            </p>
          )}

          {!loading && stepsData.length === 0 && !error && (
            <>
              <p className="text-sm text-gray-500">
                Google Fit n’est pas connecté.
              </p>
              <Button onClick={connectGoogleFit}>
                Se connecter à Google Fit
              </Button>
            </>
          )}

          {!loading && stepsData.length > 0 && (
            <p className="text-sm text-green-600">
              ✅ Google Fit connecté
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <h3 className="font-semibold text-lg mb-3">📊 Pas par jour</h3>

          {stepsData.length > 0 && (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={stepsData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Line
                    type="monotone"
                    dataKey="steps"
                    strokeWidth={3}
                    dot
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
