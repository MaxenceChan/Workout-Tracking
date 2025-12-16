import React, { useMemo, useState } from "react";

const WEEKDAYS = ["L", "M", "M", "J", "V", "S", "D"];

export default function StepsMonthlyBubbleChart({ stepsData }) {
  const [current, setCurrent] = useState(
    stepsData.at(-1)?.date?.slice(0, 7) ||
      new Date().toISOString().slice(0, 7)
  );

  const monthDate = new Date(current + "-01");
  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();

  const monthLabel = monthDate.toLocaleDateString("fr-FR", {
    month: "long",
    year: "numeric",
  });

  // Map date -> steps
  const stepsMap = useMemo(() => {
    const m = {};
    stepsData.forEach((d) => {
      m[d.date] = d.steps;
    });
    return m;
  }, [stepsData]);

  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const daysInMonth = lastDay.getDate();

  // Monday-based index
  const startOffset = (firstDay.getDay() + 6) % 7;

  const cells = [];
  for (let i = 0; i < startOffset; i++) cells.push(null);

  for (let d = 1; d <= daysInMonth; d++) {
    const iso = new Date(year, month, d).toISOString().slice(0, 10);
    cells.push({
      day: d,
      date: iso,
      steps: stepsMap[iso] || 0,
    });
  }

  const maxSteps = Math.max(...cells.map(c => c?.steps || 0), 1);

  const totalSteps = cells.reduce(
    (sum, c) => sum + (c?.steps || 0),
    0
  );

const changeMonth = (dir) => {
  const [y, m] = current.split("-").map(Number);
  const d = new Date(y, m - 1 + dir, 1);
  setCurrent(d.toISOString().slice(0, 7));
};

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <button onClick={() => changeMonth(-1)} className="text-xl">←</button>

        <div className="text-center">
          <div className="font-semibold text-lg capitalize">
            {monthLabel}
          </div>
          <div className="text-sm text-gray-400">
            👣 {totalSteps.toLocaleString()} pas
          </div>
        </div>

        <button onClick={() => changeMonth(1)} className="text-xl">→</button>
      </div>

      {/* Weekdays */}
      <div className="grid grid-cols-7 text-center text-xs text-gray-400">
        {WEEKDAYS.map((d) => (
          <div key={d}>{d}</div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-y-6 gap-x-2 justify-items-center">
        {cells.map((c, i) => {
          if (!c) return <div key={i} />;

          const size = 18 + (c.steps / maxSteps) * 36;

          return (
            <div key={i} className="flex flex-col items-center gap-1">
              <div
                title={`${c.steps.toLocaleString()} pas`}
                className="rounded-full bg-blue-500/70 hover:bg-blue-500 transition cursor-pointer flex items-center justify-center text-white text-xs"
                style={{ width: size, height: size }}
              >
                {c.day}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
