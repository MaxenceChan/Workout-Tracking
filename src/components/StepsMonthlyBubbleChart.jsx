import React, { useMemo, useState } from "react";

const WEEKDAYS = [
  "Lundi",
  "Mardi",
  "Mercredi",
  "Jeudi",
  "Vendredi",
  "Samedi",
  "Dimanche",
];

// Date locale sûre (pas d'UTC)
const formatLocalDate = (year, month, day) => {
  const m = String(month + 1).padStart(2, "0");
  const d = String(day).padStart(2, "0");
  return `${year}-${m}-${d}`;
};

export default function StepsMonthlyBubbleChart({ stepsData }) {
  /* ───────────── STATE ───────────── */
  const [current, setCurrent] = useState(() => {
    if (stepsData?.length) {
      return stepsData.at(-1).date.slice(0, 7);
    }
    return new Date().toISOString().slice(0, 7);
  });

  const [selectedDay, setSelectedDay] = useState(null);

  /* ───────────── MONTH INFO ───────────── */
  const monthDate = new Date(current + "-01");
  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();

  const monthLabel = monthDate.toLocaleDateString("fr-FR", {
    month: "long",
    year: "numeric",
  });

  const today = new Date();
  const isCurrentMonth =
    today.getFullYear() === year && today.getMonth() === month;

  /* ───────────── DATA MAP ───────────── */
  const stepsMap = useMemo(() => {
    const m = {};
    stepsData.forEach((d) => {
      m[d.date] = d.steps;
    });
    return m;
  }, [stepsData]);

  /* ───────────── CALENDAR BUILD ───────────── */
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const daysInMonth = lastDay.getDate();

  const startOffset = (firstDay.getDay() + 6) % 7; // lundi = 0

  const cells = [];
  for (let i = 0; i < startOffset; i++) cells.push(null);

  for (let d = 1; d <= daysInMonth; d++) {
    const date = formatLocalDate(year, month, d);
    cells.push({
      day: d,
      date,
      steps: stepsMap[date] || 0,
    });
  }

  const maxSteps = Math.max(...cells.map((c) => c?.steps || 0), 1);
  const totalSteps = cells.reduce((s, c) => s + (c?.steps || 0), 0);

  /* ───────────── MOYENNE MENSUELLE ───────────── */
  const daysForAverage = isCurrentMonth
    ? Math.min(today.getDate(), daysInMonth)
    : daysInMonth;

  const averageSteps =
    daysForAverage > 0
      ? Math.round(totalSteps / daysForAverage)
      : 0;

  /* ───────────── NAVIGATION ───────────── */
  const changeMonth = (dir) => {
    const [y, m] = current.split("-").map(Number);
    const newDate = new Date(y, m - 1 + dir, 1);

    const yyyy = newDate.getFullYear();
    const mm = String(newDate.getMonth() + 1).padStart(2, "0");

    setCurrent(`${yyyy}-${mm}`);
    setSelectedDay(null);
  };

  return (
    <div className="space-y-4 relative">
      {/* Header */}
      <div className="flex items-center justify-between">
        <button onClick={() => changeMonth(-1)} className="text-xl">
          ←
        </button>

        <div className="text-center space-y-1">
          <div className="font-semibold text-lg capitalize">
            {monthLabel}
          </div>

          <div className="text-sm text-gray-400">
            👣 {totalSteps.toLocaleString()} pas ·{" "}
            <span className="font-medium text-gray-600">
              Ø {averageSteps.toLocaleString()} / jour
            </span>
          </div>
        </div>

        <button onClick={() => changeMonth(1)} className="text-xl">
          →
        </button>
      </div>

      {/* Weekdays */}
      <div className="grid grid-cols-7 text-center text-xs text-gray-400">
        {WEEKDAYS.map((d) => (
          <div key={d}>{d}</div>
        ))}
      </div>

      {/* Calendar */}
      <div className="grid grid-cols-7 auto-rows-[64px] gap-x-2 gap-y-2">
        {cells.map((c, i) => {
          if (!c) return <div key={i} />;

      // ❌ Pas de data → pas de bulle
      if (c.steps === 0) {
        return (
          <div
            key={i}
            className="flex items-center justify-center text-xs text-gray-400"
          >
            {c.day}
          </div>
        );
      }
      
      // ✅ Data présente → bulle normale
      const size = 18 + (c.steps / maxSteps) * 28;
      
      return (
        <div key={i} className="flex items-center justify-center">
          <div
            onClick={(e) => {
              const r = e.currentTarget.getBoundingClientRect();
              setSelectedDay({
                ...c,
                x: r.left + r.width / 2,
                y: r.top,
              });
            }}
            className="rounded-full bg-blue-500 hover:bg-blue-600
                       cursor-pointer flex items-center justify-center
                       text-white text-xs transition"
            style={{ width: size, height: size }}
          >
            {c.day}
          </div>
        </div>
      );
        })}
      </div>

      {/* Tooltip */}
      {selectedDay && (
        <div
          className="fixed z-50"
          style={{
            left: selectedDay.x,
            top: selectedDay.y - 8,
            transform: "translate(-50%, -100%)",
          }}
        >
          <div className="bg-white text-black rounded-lg shadow-lg border px-4 py-3 text-sm">
            <div className="font-semibold mb-1">
              {new Date(
                selectedDay.date + "T12:00:00"
              ).toLocaleDateString("fr-FR", {
                weekday: "long",
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </div>

            <div>
              👣 <strong>{selectedDay.steps.toLocaleString()}</strong> pas
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
