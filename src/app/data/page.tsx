import { listNPCs } from "@/lib/storage";
import { executeSqlStatement, isDatabricksConfigured } from "@/lib/databricks";
import type { NPC } from "@/lib/schema";
import Link from "next/link";
import { CollapsibleSection } from "./CollapsibleSection";

export const metadata = {
  title: "NPC Studio Data",
  description: "Metrics and analytics for NPC Studio — aligned with Databricks analysis",
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
  const maxRoleCount = Math.max(1, ...roleList.map((r) => r.count));

  return {
    totalNpcs: npcs.length,
    totalLore,
    avgLorePerNpc: npcs.length ? totalLore / npcs.length : 0,
    avgBackstoryLen: npcs.length ? totalBackstory / npcs.length : 0,
    avgGoalsLen: npcs.length ? totalGoals / npcs.length : 0,
    withSpoilerPolicy,
    roleList,
    maxRoleCount,
    rows: rows.sort((a, b) => a.role.localeCompare(b.role) || a.name.localeCompare(b.name)),
  };
}

/** Same metrics shape from Databricks synced table rows (flat columns). */
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
    const doNotCount = doNotStr ? doNotStr.split(";").length : 0;
    const gesturesStr = String(r.allowed_gestures ?? "");
    const actionsStr = String(r.allowed_actions ?? "");
    const gestureCount = gesturesStr ? gesturesStr.split(";").length : 0;
    const actionCount = actionsStr ? actionsStr.split(";").length : 0;
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
  const maxRoleCount = Math.max(1, ...roleList.map((r) => r.count));

  return {
    totalNpcs: flatRows.length,
    totalLore,
    avgLorePerNpc: flatRows.length ? totalLore / flatRows.length : 0,
    avgBackstoryLen: flatRows.length ? totalBackstory / flatRows.length : 0,
    avgGoalsLen: flatRows.length ? totalGoals / flatRows.length : 0,
    withSpoilerPolicy,
    roleList,
    maxRoleCount,
    rows: rows.sort((a, b) => a.role.localeCompare(b.role) || a.name.localeCompare(b.name)),
  };
}

function isSyncedTableShape(row: Record<string, unknown>): boolean {
  return "role" in row && "name" in row && ("lore_facts_count" in row || "backstory" in row);
}

export default async function NpcStudioDataPage() {
  let npcs: NPC[] = [];
  try {
    npcs = await listNPCs();
  } catch (e) {
    console.error("Failed to load NPCs for data page:", e);
  }

  // Prefer Databricks for graphs when configured and query returns synced-table-shaped rows
  const databricksQuery = process.env.DATABRICKS_NPC_QUERY?.trim();
  let databricksRows: Record<string, unknown>[] | null = null;
  if (databricksQuery && isDatabricksConfigured()) {
    databricksRows = await executeSqlStatement(databricksQuery);
  }

  const useDatabricksForMetrics =
    databricksRows &&
    databricksRows.length > 0 &&
    isSyncedTableShape(databricksRows[0]);

  const m = useDatabricksForMetrics
    ? computeMetricsFromFlatRows(databricksRows!)
    : computeMetrics(npcs);
  const dataSourceLabel = useDatabricksForMetrics
    ? "Databricks (synced when you add or edit NPCs)"
    : null;

  return (
    <div className="space-y-10">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">NPC Studio Data</h1>
          <p className="text-gray-400 mt-1 text-sm">
            Metrics from your NPC roster — same dimensions used in the analysis notebook and Databricks.
          </p>
          {dataSourceLabel && (
            <p className="text-emerald-400/90 mt-1 text-xs font-medium">
              Graphs and table below: {dataSourceLabel}
            </p>
          )}
        </div>
        <Link
          href="/"
          className="text-sm text-gray-400 hover:text-white transition-colors"
        >
          ← Back to NPCs
        </Link>
      </div>

      {/* Sync status: so you know data is from Databricks and when it updates */}
      {useDatabricksForMetrics && (
        <div className="rounded-lg border border-emerald-800/60 bg-emerald-950/30 px-4 py-3">
          <p className="text-emerald-200/90 text-sm font-medium">
            Synced from Databricks: showing {m.totalNpcs} NPC{m.totalNpcs !== 1 ? "s" : ""}.
          </p>
          <p className="text-gray-400 text-xs mt-0.5">
            Data updates automatically when you add or edit an NPC in NPC Studio (each change pushes the full roster to Databricks, then this page reads from the same table).
          </p>
        </div>
      )}

      {/* Summary cards */}
      <CollapsibleSection title="Summary" defaultOpen={true}>
        <div className="p-4 grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="rounded-lg border border-gray-800 bg-gray-900/50 p-4">
            <div className="text-2xl font-bold text-white">{m.totalNpcs}</div>
            <div className="text-sm text-gray-400">Total NPCs</div>
          </div>
          <div className="rounded-lg border border-gray-800 bg-gray-900/50 p-4">
            <div className="text-2xl font-bold text-white">{m.totalLore}</div>
            <div className="text-sm text-gray-400">Total lore facts</div>
          </div>
          <div className="rounded-lg border border-gray-800 bg-gray-900/50 p-4">
            <div className="text-2xl font-bold text-white">{m.avgLorePerNpc.toFixed(1)}</div>
            <div className="text-sm text-gray-400">Avg lore per NPC</div>
          </div>
          <div className="rounded-lg border border-gray-800 bg-gray-900/50 p-4">
            <div className="text-2xl font-bold text-white">{m.withSpoilerPolicy}</div>
            <div className="text-sm text-gray-400">With spoiler policy</div>
          </div>
        </div>
      </CollapsibleSection>

      {/* Persona depth */}
      <CollapsibleSection title="Persona depth" defaultOpen={true}>
        <div className="p-4 grid grid-cols-2 gap-4">
          <div>
            <div className="text-lg font-medium text-white">{Math.round(m.avgBackstoryLen)}</div>
            <div className="text-sm text-gray-400">Avg backstory length (chars)</div>
          </div>
          <div>
            <div className="text-lg font-medium text-white">{Math.round(m.avgGoalsLen)}</div>
            <div className="text-sm text-gray-400">Avg goals length (chars)</div>
          </div>
        </div>
      </CollapsibleSection>

      {/* NPCs by role */}
      <CollapsibleSection title="NPCs by role" defaultOpen={true}>
        <div className="p-4 overflow-hidden">
          <div className="divide-y divide-gray-800">
            {m.roleList.map(({ role, count }) => (
              <div key={role} className="px-4 py-3 flex items-center gap-4">
                <div className="w-32 text-sm font-medium text-white shrink-0">{role}</div>
                <div className="flex-1 flex items-center gap-2">
                  <div
                    className="h-6 rounded bg-emerald-600/60"
                    style={{ width: `${(count / m.maxRoleCount) * 100}%`, minWidth: count ? "2rem" : 0 }}
                  />
                  <span className="text-sm text-gray-400">{count}</span>
                </div>
              </div>
            ))}
          </div>
          {m.roleList.length === 0 && (
            <div className="px-4 py-6 text-center text-gray-500 text-sm">No NPCs yet.</div>
          )}
        </div>
      </CollapsibleSection>

      {/* Per-NPC metrics table */}
      <CollapsibleSection title="Per-NPC metrics" defaultOpen={true}>
        <div className="p-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-800 text-left text-gray-400">
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Role</th>
                <th className="px-4 py-3 font-medium">Backstory</th>
                <th className="px-4 py-3 font-medium">Goals</th>
                <th className="px-4 py-3 font-medium">Lore</th>
                <th className="px-4 py-3 font-medium">Do not</th>
                <th className="px-4 py-3 font-medium">Gestures</th>
                <th className="px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {m.rows.map((r) => (
                <tr key={r.name + r.role} className="text-white">
                  <td className="px-4 py-2 font-medium">{r.name}</td>
                  <td className="px-4 py-2 text-gray-300">{r.role}</td>
                  <td className="px-4 py-2 text-gray-400">{r.backstoryLen}</td>
                  <td className="px-4 py-2 text-gray-400">{r.goalsLen}</td>
                  <td className="px-4 py-2 text-gray-400">{r.loreCount}</td>
                  <td className="px-4 py-2 text-gray-400">{r.doNotCount}</td>
                  <td className="px-4 py-2 text-gray-400">{r.gestureCount}</td>
                  <td className="px-4 py-2 text-gray-400">{r.actionCount}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {m.rows.length === 0 && (
            <div className="px-4 py-6 text-center text-gray-500 text-sm">No NPCs yet.</div>
          )}
        </div>
      </CollapsibleSection>

      {/* From Databricks: only show when we have rows to show (raw table or empty-query hint). Hide when query failed so the page stays clean. */}
      {!useDatabricksForMetrics && databricksRows !== null && (
        <section>
          <h2 className="text-lg font-semibold text-white mb-3">From Databricks</h2>
          {databricksRows.length > 0 ? (
            <div className="rounded-lg border border-gray-800 bg-gray-900/50 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-800 text-left text-gray-400">
                    {Object.keys(databricksRows[0]).map((key) => (
                      <th key={key} className="px-4 py-3 font-medium capitalize">
                        {key.replace(/_/g, " ")}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800">
                  {databricksRows.map((row, i) => (
                    <tr key={i} className="text-white">
                      {Object.values(row).map((val, j) => (
                        <td key={j} className="px-4 py-2 text-gray-300">
                          {val != null ? String(val) : "—"}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-gray-500 text-sm">Query returned no rows. Add or edit an NPC to sync data to Databricks, then refresh.</p>
          )}
        </section>
      )}

      <p className="text-gray-500 text-sm">
        These metrics match the analysis in the <code className="text-gray-400 rounded px-1 bg-gray-800">notebooks/npc_studio_analysis.ipynb</code> notebook and can be reproduced in Databricks using the export from <Link href="/api/export/npcs" className="text-emerald-400 hover:underline">/api/export/npcs</Link>.
      </p>
    </div>
  );
}
