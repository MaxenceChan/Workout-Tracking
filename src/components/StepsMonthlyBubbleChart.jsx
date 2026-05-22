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

// Date locale sûre (évite bug UTC)
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
            <span className="font-medium text-gray-500">
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

          const size = 18 + (c.steps / maxSteps) * 28;
          const isSelected = selectedDay?.date === c.date;

          return (
            <div key={i} className="flex items-center justify-center">
              <div
                onClick={() => {
                  if (isSelected) {
                    setSelectedDay(null);
                    return;
                  }
                  setSelectedDay(c);
                }}
                className={`rounded-full cursor-pointer flex items-center justify-center
                           text-white text-xs transition ${
                             isSelected
                               ? "bg-blue-700 ring-2 ring-blue-300"
                               : "bg-blue-500 hover:bg-blue-600"
                           }`}
                style={{ width: size, height: size }}
              >
                {c.day}
              </div>
            </div>
          );
        })}
      </div>

      {/* Panneau de détail toujours visible sous le calendrier */}
      <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 px-4 py-3 text-sm min-h-[64px] flex items-center">
        {selectedDay ? (
          <div>
            <div className="font-semibold mb-1 capitalize">
              {new Date(selectedDay.date + "T12:00:00").toLocaleDateString("fr-FR", {
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
        ) : (
          <div className="text-gray-400 text-xs">
            Clique sur un jour du calendrier pour voir le détail
          </div>
        )}
      </div>
    </div>
  );
}
