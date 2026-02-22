import type { NPC } from "./schema";

const HOST = () => process.env.DATABRICKS_HOST?.replace(/\/+$/, "") ?? "";
const TOKEN = () => process.env.DATABRICKS_ACCESS_TOKEN ?? "";
const WAREHOUSE = () => process.env.DATABRICKS_WAREHOUSE_ID ?? "";
const SYNC_TABLE = () => process.env.DATABRICKS_SYNC_TABLE ?? "";

export function isDatabricksConfigured(): boolean {
  return !!(HOST() && TOKEN() && WAREHOUSE());
}

export async function executeSqlStatement(
  statement: string,
): Promise<Record<string, unknown>[] | null> {
  if (!isDatabricksConfigured()) return null;

  const url = `${HOST()}/api/2.0/sql/statements/`;
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${TOKEN()}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        warehouse_id: WAREHOUSE(),
        statement,
        wait_timeout: "30s",
        disposition: "INLINE",
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      console.error(`[databricks] SQL exec failed (${res.status}):`, text);
      return null;
    }

    const data = await res.json();

    if (data.status?.state === "FAILED") {
      console.error("[databricks] Statement failed:", data.status.error);
      return null;
    }

    const cols: { name: string }[] = data.manifest?.schema?.columns ?? [];
    const chunks: string[][] = data.result?.data_array ?? [];

    return chunks.map((row) => {
      const obj: Record<string, unknown> = {};
      cols.forEach((col, i) => {
        obj[col.name] = row[i] ?? null;
      });
      return obj;
    });
  } catch (err) {
    console.error("[databricks] executeSqlStatement error:", err);
    return null;
  }
}

export async function syncNpcsToDatabricks(npcs: NPC[]): Promise<boolean> {
  const table = SYNC_TABLE();
  if (!table || !isDatabricksConfigured()) return false;

  try {
    const createSql = `CREATE TABLE IF NOT EXISTS ${table} (
      id STRING,
      name STRING,
      role STRING,
      backstory STRING,
      goals STRING,
      voice_style STRING,
      spoiler_policy STRING,
      do_not STRING,
      lore_facts_count INT,
      allowed_gestures STRING,
      allowed_actions STRING,
      createdAt STRING,
      updatedAt STRING
    ) USING DELTA`;
    const createResult = await executeSqlStatement(createSql);
    if (createResult === null) {
      console.error("[databricks] Failed to create sync table");
      return false;
    }

    await executeSqlStatement(`DELETE FROM ${table} WHERE 1=1`);

    for (const n of npcs) {
      const p = n.persona ?? { backstory: "", goals: "", voice_style: "" };
      const r = n.rules ?? { do_not: [], spoiler_policy: "" };
      const c = n.capabilities ?? {
        allowed_gestures: [],
        allowed_actions: [],
      };
      const lore = n.lore_facts ?? [];

      const esc = (s: string) => s.replace(/'/g, "''");

      const sql = `INSERT INTO ${table} VALUES (
        '${esc(n.id)}',
        '${esc(n.name)}',
        '${esc(n.role)}',
        '${esc(p.backstory ?? "")}',
        '${esc(p.goals ?? "")}',
        '${esc(p.voice_style ?? "")}',
        '${esc(r.spoiler_policy ?? "")}',
        '${esc((r.do_not ?? []).join("; "))}',
        ${lore.length},
        '${esc((c.allowed_gestures ?? []).join("; "))}',
        '${esc((c.allowed_actions ?? []).join("; "))}',
        '${esc(n.createdAt ?? "")}',
        '${esc(n.updatedAt ?? "")}'
      )`;
      await executeSqlStatement(sql);
    }

    console.log(`[databricks] Synced ${npcs.length} NPCs to ${table}`);
    return true;
  } catch (err) {
    console.error("[databricks] syncNpcsToDatabricks error:", err);
    return false;
  }
}
