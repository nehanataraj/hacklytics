import { NextResponse } from "next/server";
import { executeSqlStatement } from "@/lib/databricks";

/**
 * POST /api/databricks/query
 * Body (optional): { "statement": "SELECT ..." }
 * If no body, uses env DATABRICKS_NPC_QUERY (e.g. "SELECT * FROM npc_summary").
 * Returns { rows: [...] } or { error: "..." }.
 */
export async function POST(req: Request) {
  let statement: string;
  try {
    const body = await req.json().catch(() => ({}));
    statement = (body.statement ?? process.env.DATABRICKS_NPC_QUERY ?? "").trim();
  } catch {
    statement = (process.env.DATABRICKS_NPC_QUERY ?? "").trim();
  }

  if (!statement) {
    return NextResponse.json(
      { error: "No statement provided. Set body.statement or env DATABRICKS_NPC_QUERY." },
      { status: 400 }
    );
  }

  const rows = await executeSqlStatement(statement);
  if (rows === null) {
    return NextResponse.json(
      { error: "Databricks not configured or query failed. Check env and server logs." },
      { status: 502 }
    );
  }

  return NextResponse.json({ rows });
}

/**
 * GET /api/databricks/query
 * Runs the default query (DATABRICKS_NPC_QUERY) and returns { rows } or error.
 */
export async function GET() {
  const statement = (process.env.DATABRICKS_NPC_QUERY ?? "").trim();
  if (!statement) {
    return NextResponse.json(
      { error: "Set env DATABRICKS_NPC_QUERY to use GET." },
      { status: 400 }
    );
  }

  const rows = await executeSqlStatement(statement);
  if (rows === null) {
    return NextResponse.json(
      { error: "Databricks not configured or query failed." },
      { status: 502 }
    );
  }

  return NextResponse.json({ rows });
}
