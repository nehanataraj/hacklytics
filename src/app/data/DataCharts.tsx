"use client";

import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
  PieChart, Pie,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
} from "recharts";

const AMBER = "#f59e0b";
const AMBER_DIM = "#b45309";
const AMBER_GLOW = "rgba(245, 158, 11, 0.15)";
const COLORS = ["#f59e0b", "#fbbf24", "#d97706", "#92400e", "#fcd34d", "#b45309"];

type RoleCount = { role: string; count: number };
type NpcRow = {
  name: string;
  role: string;
  backstoryLen: number;
  goalsLen: number;
  loreCount: number;
  doNotCount: number;
  gestureCount: number;
  actionCount: number;
};

function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: { value: number }[]; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-gray-900 border border-gray-700 px-3 py-2 rounded-lg shadow-xl">
      <p className="text-white text-sm font-medium">{label}</p>
      <p className="text-amber-400 text-sm">{payload[0].value}</p>
    </div>
  );
}

export function RoleBarChart({ data }: { data: RoleCount[] }) {
  return (
    <ResponsiveContainer width="100%" height={Math.max(200, data.length * 50)}>
      <BarChart data={data} layout="vertical" margin={{ left: 10, right: 30, top: 10, bottom: 10 }}>
        <XAxis type="number" stroke="#4b5563" tick={{ fill: "#9ca3af", fontSize: 12 }} />
        <YAxis type="category" dataKey="role" width={140} tick={{ fill: "#e5e7eb", fontSize: 13 }} />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: AMBER_GLOW }} />
        <Bar dataKey="count" radius={[0, 6, 6, 0]} barSize={28}>
          {data.map((_, i) => (
            <Cell key={i} fill={COLORS[i % COLORS.length]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

export function PersonaDepthChart({ data }: { data: NpcRow[] }) {
  const chartData = data.map((r) => ({
    name: r.name.length > 12 ? r.name.slice(0, 12) + "…" : r.name,
    Backstory: r.backstoryLen,
    Goals: r.goalsLen,
  }));

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={chartData} margin={{ left: 10, right: 30, top: 10, bottom: 10 }}>
        <XAxis dataKey="name" stroke="#4b5563" tick={{ fill: "#9ca3af", fontSize: 12 }} />
        <YAxis stroke="#4b5563" tick={{ fill: "#9ca3af", fontSize: 12 }} />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: AMBER_GLOW }} />
        <Bar dataKey="Backstory" fill={AMBER} radius={[4, 4, 0, 0]} barSize={20} />
        <Bar dataKey="Goals" fill={AMBER_DIM} radius={[4, 4, 0, 0]} barSize={20} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function CapabilitiesPie({ data }: { data: NpcRow[] }) {
  const totalGestures = data.reduce((a, r) => a + r.gestureCount, 0);
  const totalActions = data.reduce((a, r) => a + r.actionCount, 0);
  const totalRules = data.reduce((a, r) => a + r.doNotCount, 0);
  const totalLore = data.reduce((a, r) => a + r.loreCount, 0);

  const pieData = [
    { name: "Gestures", value: totalGestures },
    { name: "Actions", value: totalActions },
    { name: "Rules", value: totalRules },
    { name: "Lore", value: totalLore },
  ].filter((d) => d.value > 0);

  if (pieData.length === 0) return <p className="text-gray-500 text-sm text-center py-8">No capability data yet.</p>;

  return (
    <ResponsiveContainer width="100%" height={280}>
      <PieChart>
        <Pie
          data={pieData}
          cx="50%"
          cy="50%"
          innerRadius={60}
          outerRadius={100}
          paddingAngle={4}
          dataKey="value"
          stroke="none"
          label={({ name, value }) => `${name}: ${value}`}
        >
          {pieData.map((_, i) => (
            <Cell key={i} fill={COLORS[i % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip />
      </PieChart>
    </ResponsiveContainer>
  );
}

export function NpcRadarChart({ data }: { data: NpcRow[] }) {
  if (data.length === 0) return null;

  const maxVals = {
    backstoryLen: Math.max(1, ...data.map((r) => r.backstoryLen)),
    goalsLen: Math.max(1, ...data.map((r) => r.goalsLen)),
    loreCount: Math.max(1, ...data.map((r) => r.loreCount)),
    gestureCount: Math.max(1, ...data.map((r) => r.gestureCount)),
    actionCount: Math.max(1, ...data.map((r) => r.actionCount)),
  };

  const radarData = [
    { axis: "Backstory", ...Object.fromEntries(data.map((r) => [r.name, Math.round((r.backstoryLen / maxVals.backstoryLen) * 100)])) },
    { axis: "Goals", ...Object.fromEntries(data.map((r) => [r.name, Math.round((r.goalsLen / maxVals.goalsLen) * 100)])) },
    { axis: "Lore", ...Object.fromEntries(data.map((r) => [r.name, Math.round((r.loreCount / maxVals.loreCount) * 100)])) },
    { axis: "Gestures", ...Object.fromEntries(data.map((r) => [r.name, Math.round((r.gestureCount / maxVals.gestureCount) * 100)])) },
    { axis: "Actions", ...Object.fromEntries(data.map((r) => [r.name, Math.round((r.actionCount / maxVals.actionCount) * 100)])) },
  ];

  return (
    <ResponsiveContainer width="100%" height={320}>
      <RadarChart data={radarData}>
        <PolarGrid stroke="#374151" />
        <PolarAngleAxis dataKey="axis" tick={{ fill: "#9ca3af", fontSize: 12 }} />
        <PolarRadiusAxis tick={false} axisLine={false} />
        {data.slice(0, 6).map((r, i) => (
          <Radar
            key={r.name}
            name={r.name}
            dataKey={r.name}
            stroke={COLORS[i % COLORS.length]}
            fill={COLORS[i % COLORS.length]}
            fillOpacity={0.15}
            strokeWidth={2}
          />
        ))}
        <Tooltip />
      </RadarChart>
    </ResponsiveContainer>
  );
}

export function NpcProfileCards({ data }: { data: NpcRow[] }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {data.map((r, i) => {
        const stats = [
          { label: "Backstory", value: r.backstoryLen, unit: "chars" },
          { label: "Goals", value: r.goalsLen, unit: "chars" },
          { label: "Lore facts", value: r.loreCount, unit: "" },
          { label: "Gestures", value: r.gestureCount, unit: "" },
          { label: "Actions", value: r.actionCount, unit: "" },
          { label: "Rules", value: r.doNotCount, unit: "" },
        ];
        return (
          <div key={r.name + r.role} className="rounded-xl bg-gray-900/40 p-5 space-y-3">
            <div className="flex items-center gap-3">
              <div
                className="w-3 h-3 rounded-full shrink-0"
                style={{ backgroundColor: COLORS[i % COLORS.length] }}
              />
              <div>
                <h3 className="text-white font-semibold text-sm">{r.name}</h3>
                <p className="text-gray-500 text-xs">{r.role}</p>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {stats.map((s) => (
                <div key={s.label} className="text-center">
                  <div className="text-amber-400 font-bold text-lg">{s.value}</div>
                  <div className="text-gray-500 text-[10px] uppercase tracking-wider">{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
