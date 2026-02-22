import { listNPCs } from "@/lib/storage";
import { executeSqlStatement, isDatabricksConfigured } from "@/lib/databricks";
import type { NPC } from "@/lib/schema";
import Link from "next/link";
import {
  RoleBarChart,
  PersonaDepthChart,
  CapabilitiesPie,
  NpcRadarChart,
  NpcProfileCards,
} from "./DataCharts";
import { AnimatedCounter } from "./AnimatedCounter";

export const metadata = {
  title: "Playable.exe — Data",
  description: "Analytics and metrics from your NPC roster",
};

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

function computeMetrics(npcs: NPC[]) {
  const roleCounts = new Map<string, number>();
  let totalLore = 0;
  let totalBackstory = 0;
  let totalGoals = 0;
  let withSpoilerPolicy = 0;
  const rows: NpcRow[] = [];

  for (const n of npcs) {
    const role = n.role || "Unknown";
    roleCounts.set(role, (roleCounts.get(role) ?? 0) + 1);

    const p = n.persona ?? { backstory: "", goals: "", voice_style: "" };
    const r = n.rules ?? { do_not: [], spoiler_policy: "" };
    const c = n.capabilities ?? { allowed_gestures: [], allowed_actions: [] };
    const lore = n.lore_facts ?? [];
    const doNot = r.do_not ?? [];

    totalLore += lore.length;
    totalBackstory += (p.backstory ?? "").length;
    totalGoals += (p.goals ?? "").length;
    if ((r.spoiler_policy ?? "").trim()) withSpoilerPolicy += 1;

    rows.push({
      name: n.name,
      role,
      backstoryLen: (p.backstory ?? "").length,
      goalsLen: (p.goals ?? "").length,
      loreCount: lore.length,
      doNotCount: doNot.length,
      gestureCount: (c.allowed_gestures ?? []).length,
      actionCount: (c.allowed_actions ?? []).length,
    });
  }

  const roleList: RoleCount[] = Array.from(roleCounts.entries())
    .map(([role, count]) => ({ role, count }))
    .sort((a, b) => b.count - a.count);

  return {
    totalNpcs: npcs.length,
    totalLore,
    avgLorePerNpc: npcs.length ? totalLore / npcs.length : 0,
    avgBackstoryLen: npcs.length ? totalBackstory / npcs.length : 0,
    avgGoalsLen: npcs.length ? totalGoals / npcs.length : 0,
    withSpoilerPolicy,
    roleList,
    rows: rows.sort((a, b) => a.role.localeCompare(b.role) || a.name.localeCompare(b.name)),
  };
}

function computeMetricsFromFlatRows(flatRows: Record<string, unknown>[]): ReturnType<typeof computeMetrics> {
  const roleCounts = new Map<string, number>();
  let totalLore = 0;
  let totalBackstory = 0;
  let totalGoals = 0;
  let withSpoilerPolicy = 0;
  const rows: NpcRow[] = [];

  for (const r of flatRows) {
    const role = String(r.role ?? "Unknown");
    roleCounts.set(role, (roleCounts.get(role) ?? 0) + 1);

    const backstory = String(r.backstory ?? "");
    const goals = String(r.goals ?? "");
    const loreCount = Number(r.lore_facts_count ?? 0);
    const doNotStr = String(r.do_not ?? "");
    const doNotCount = doNotStr.trim() ? doNotStr.split(";").length : 0;
    const gesturesStr = String(r.allowed_gestures ?? "");
    const actionsStr = String(r.allowed_actions ?? "");
    const gestureCount = gesturesStr.trim() ? gesturesStr.split(";").length : 0;
    const actionCount = actionsStr.trim() ? actionsStr.split(";").length : 0;
    const hasSpoiler = Boolean((r.spoiler_policy ?? "").toString().trim());

    totalLore += loreCount;
    totalBackstory += backstory.length;
    totalGoals += goals.length;
    if (hasSpoiler) withSpoilerPolicy += 1;

    rows.push({
      name: String(r.name ?? ""),
      role,
      backstoryLen: backstory.length,
      goalsLen: goals.length,
      loreCount,
      doNotCount,
      gestureCount,
      actionCount,
    });
  }

  const roleList: RoleCount[] = Array.from(roleCounts.entries())
    .map(([role, count]) => ({ role, count }))
    .sort((a, b) => b.count - a.count);

  return {
    totalNpcs: flatRows.length,
    totalLore,
    avgLorePerNpc: flatRows.length ? totalLore / flatRows.length : 0,
    avgBackstoryLen: flatRows.length ? totalBackstory / flatRows.length : 0,
    avgGoalsLen: flatRows.length ? totalGoals / flatRows.length : 0,
    withSpoilerPolicy,
    roleList,
    rows: rows.sort((a, b) => a.role.localeCompare(b.role) || a.name.localeCompare(b.name)),
  };
}

function isSyncedTableShape(row: Record<string, unknown>): boolean {
  return "role" in row && "name" in row && ("lore_facts_count" in row || "backstory" in row);
}

export default async function DataPage() {
  let npcs: NPC[] = [];
  try {
    npcs = await listNPCs();
  } catch (e) {
    console.error("Failed to load NPCs for data page:", e);
  }

  const databricksQuery = process.env.DATABRICKS_NPC_QUERY?.trim();
  let databricksRows: Record<string, unknown>[] | null = null;
  if (databricksQuery && isDatabricksConfigured()) {
    databricksRows = await executeSqlStatement(databricksQuery);
  }

  const useDatabricks =
    databricksRows &&
    databricksRows.length > 0 &&
    isSyncedTableShape(databricksRows[0]);

  const m = useDatabricks
    ? computeMetricsFromFlatRows(databricksRows!)
    : computeMetrics(npcs);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Analytics</h1>
          <p className="text-gray-400 mt-1 text-sm">
            Character roster metrics {useDatabricks ? "from Databricks" : "from local storage"}.
          </p>
        </div>
        <div className="flex items-center gap-4">
          <Link
            href="/api/export/npcs?format=csv"
            className="text-xs text-gray-500 hover:text-amber-400 transition-colors border border-gray-800 px-3 py-1.5 rounded-lg"
          >
            Export CSV
          </Link>
          <Link
            href="/"
            className="text-sm text-gray-400 hover:text-white transition-colors"
          >
            &larr; Back
          </Link>
        </div>
      </div>

      {/* Databricks status */}
      {useDatabricks && (
        <div className="px-1 py-3 flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
          <p className="text-amber-200/90 text-sm">
            Live from Databricks &mdash; {m.totalNpcs} character{m.totalNpcs !== 1 ? "s" : ""} synced
          </p>
        </div>
      )}

      {/* Summary stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 py-2">
        {[
          { value: m.totalNpcs, label: "Characters", accent: true },
          { value: m.totalLore, label: "Lore Facts", accent: true },
          { value: Math.round(m.avgBackstoryLen), label: "Avg Backstory", unit: "chars" },
          { value: m.withSpoilerPolicy, label: "Spoiler Policies" },
        ].map((card) => (
          <div key={card.label} className="p-4">
            <AnimatedCounter
              value={card.value}
              className={`text-4xl font-bold tabular-nums ${card.accent ? "text-amber-400" : "text-white"}`}
            />
            <div className="text-gray-500 text-xs mt-2 uppercase tracking-wider">
              {card.label}
              {card.unit && <span className="text-gray-600 ml-1">({card.unit})</span>}
            </div>
          </div>
        ))}
      </div>

      {/* Charts row: Role distribution + Capabilities */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Role distribution */}
        <div className="rounded-xl bg-gray-900/30 p-6">
          <h2 className="text-white font-semibold text-sm mb-4 uppercase tracking-wider">Roles Distribution</h2>
          {m.roleList.length > 0 ? (
            <RoleBarChart data={m.roleList} />
          ) : (
            <p className="text-gray-500 text-sm text-center py-8">No data yet.</p>
          )}
        </div>

        {/* Capabilities donut */}
        <div className="rounded-xl bg-gray-900/30 p-6">
          <h2 className="text-white font-semibold text-sm mb-4 uppercase tracking-wider">Capability Breakdown</h2>
          <CapabilitiesPie data={m.rows} />
        </div>
      </div>

      {/* Persona depth chart */}
      <div className="rounded-xl bg-gray-900/30 p-6">
        <h2 className="text-white font-semibold text-sm mb-4 uppercase tracking-wider">Persona Depth by Character</h2>
        {m.rows.length > 0 ? (
          <PersonaDepthChart data={m.rows} />
        ) : (
          <p className="text-gray-500 text-sm text-center py-8">No data yet.</p>
        )}
        <div className="flex items-center gap-6 mt-4 justify-center">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-sm bg-amber-500" />
            <span className="text-gray-400 text-xs">Backstory</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-sm bg-amber-800" />
            <span className="text-gray-400 text-xs">Goals</span>
          </div>
        </div>
      </div>

      {/* Radar chart */}
      {m.rows.length > 0 && (
        <div className="rounded-xl bg-gray-900/30 p-6">
          <h2 className="text-white font-semibold text-sm mb-4 uppercase tracking-wider">Character Comparison</h2>
          <NpcRadarChart data={m.rows} />
          <div className="flex flex-wrap items-center gap-4 mt-4 justify-center">
            {m.rows.slice(0, 6).map((r, i) => (
              <div key={r.name} className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: ["#f59e0b", "#fbbf24", "#d97706", "#92400e", "#fcd34d", "#b45309"][i % 6] }}
                />
                <span className="text-gray-400 text-xs">{r.name}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* NPC profile cards */}
      {m.rows.length > 0 && (
        <div>
          <h2 className="text-white font-semibold text-sm mb-4 uppercase tracking-wider">Character Profiles</h2>
          <NpcProfileCards data={m.rows} />
        </div>
      )}

      {/* Footer */}
      <p className="text-gray-600 text-xs text-center pt-4">
        Data from{" "}
        <Link href="/api/export/npcs" className="text-amber-600 hover:underline">/api/export/npcs</Link>
        {" "}&middot;{" "}
        Analysis notebook at <code className="text-gray-500">notebooks/npc_studio_analysis.ipynb</code>
      </p>
    </div>
  );
}
