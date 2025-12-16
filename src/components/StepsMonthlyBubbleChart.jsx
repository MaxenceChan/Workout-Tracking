import React, { useMemo, useState } from "react";
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

const DAYS = ["L", "M", "M", "J", "V", "S", "D"];

function getMonthKey(date) {
  return date.slice(0, 7); // YYYY-MM
}

function formatFR(date) {
  return new Date(date).toLocaleDateString("fr-FR");
}

export default function StepsMonthlyBubbleChart({ stepsData }) {
  const [currentMonth, setCurrentMonth] = useState(
    getMonthKey(stepsData.at(-1)?.date || new Date().toISOString())
  );

  // 🔹 Données du mois sélectionné
  const monthlyData = useMemo(() => {
    return stepsData
      .filter((d) => d.date.startsWith(currentMonth))
      .map((d) => {
        const jsDate = new Date(d.date);
        return {
          x: jsDate.getDay() === 0 ? 7 : jsDate.getDay(), // Lundi = 1
          y: jsDate.getDate(),
          steps: d.steps,
          r: Math.max(6, Math.sqrt(d.steps) / 4), // taille bulle
          label: formatFR(d.date),
        };
      });
  }, [stepsData, currentMonth]);

  // 🔹 Navigation mois
  const changeMonth = (dir) => {
    const d = new Date(currentMonth + "-01");
    d.setMonth(d.getMonth() + dir);
    setCurrentMonth(d.toISOString().slice(0, 7));
  };

  return (
    <div className="space-y-3">
      {/* Header navigation */}
      <div className="flex items-center justify-between">
        <button onClick={() => changeMonth(-1)}>←</button>
        <h3 className="font-semibold">
          {new Date(currentMonth + "-01").toLocaleDateString("fr-FR", {
            month: "long",
            year: "numeric",
          })}
        </h3>
        <button onClick={() => changeMonth(1)}>→</button>
      </div>

      {/* Chart */}
      <div className="h-[320px]">
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart>
            <XAxis
              type="number"
              dataKey="x"
              domain={[1, 7]}
              tickFormatter={(v) => DAYS[v - 1]}
            />
            <YAxis
              type="number"
              dataKey="y"
              domain={[1, 31]}
              tickFormatter={(v) => v}
            />

            <Tooltip
              cursor={{ strokeDasharray: "3 3" }}
              content={({ payload }) => {
                if (!payload || !payload.length) return null;
                const p = payload[0].payload;
                return (
                  <div className="bg-white p-2 rounded border text-xs shadow">
                    <div className="font-semibold">{p.label}</div>
                    <div>{p.steps.toLocaleString()} pas</div>
                  </div>
                );
              }}
            />

            <Scatter
              data={monthlyData}
              fill="#22c55e"
            />
          </ScatterChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
