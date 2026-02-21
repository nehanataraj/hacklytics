import { NextResponse } from 'next/server';
import { listNPCs, createNPC } from '@/lib/storage';
import { NPCCreateSchema } from '@/lib/schema';
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
  const npcs = listNPCs();
  return NextResponse.json(npcs);
}

export async function POST(request: Request) {
  const body = await request.json();
  const parsed = NPCCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validation failed', fields: flattenZodError(parsed.error) },
      { status: 400 },
    );
  }
  const npc = await createNPC(parsed.data);
  return NextResponse.json(npc, { status: 201 });
}
