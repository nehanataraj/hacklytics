import { NextResponse } from 'next/server';
import { listNPCs, createNPC } from '@/lib/storage';
import { NPCCreateSchema } from '@/lib/schema';
import { syncNpcsToDatabricks } from '@/lib/databricks';
import type { ZodError } from 'zod';

/** Converts Zod issues to a flat `{ 'persona.voice_style': 'Too short' }` map. */
function flattenZodError(err: ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of err.issues) {
    const key = issue.path.join('.') || '_';
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}

export async function GET() {
  try {
    const npcs = await listNPCs();
    return NextResponse.json(npcs);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[GET /api/npcs] Storage error:', err);
    return NextResponse.json({ error: 'Failed to load NPCs', detail: msg }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = NPCCreateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', fields: flattenZodError(parsed.error) },
        { status: 400 },
      );
    }
    const npc = await createNPC(parsed.data);
    const npcs = await listNPCs();
    syncNpcsToDatabricks(npcs).catch((e) => console.error('[POST /api/npcs] Databricks sync error:', e));
    return NextResponse.json(npc, { status: 201 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    const stack = err instanceof Error ? err.stack : undefined;
    console.error('[POST /api/npcs] Storage error:', err);
    return NextResponse.json({ error: 'Failed to create NPC', detail: msg, stack }, { status: 500 });
  }
}
