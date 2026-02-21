import { NextResponse } from 'next/server';
import { getNPC, updateNPC, deleteNPC } from '@/lib/storage';
import { NPCUpdateSchema } from '@/lib/schema';
import type { ZodError } from 'zod';

function flattenZodError(err: ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of err.issues) {
    const key = issue.path.join('.') || '_';
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const npc = await getNPC(id);
    if (!npc) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json(npc);
  } catch (err) {
    console.error('[GET /api/npcs/:id] Storage error:', err);
    return NextResponse.json({ error: 'Failed to load NPC' }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const parsed = NPCUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', fields: flattenZodError(parsed.error) },
        { status: 400 },
      );
    }
    const npc = await updateNPC(id, parsed.data);
    if (!npc) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json(npc);
  } catch (err) {
    console.error('[PUT /api/npcs/:id] Storage error:', err);
    return NextResponse.json({ error: 'Failed to update NPC' }, { status: 500 });
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const deleted = await deleteNPC(id);
    if (!deleted) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[DELETE /api/npcs/:id] Storage error:', err);
    return NextResponse.json({ error: 'Failed to delete NPC' }, { status: 500 });
  }
}
