import { NextResponse } from 'next/server';
import { listNPCs } from '@/lib/storage';
import type { NPC } from '@/lib/schema';

/**
 * GET /api/export/npcs
 * Query: format=json (default) | csv
 * Returns the full NPC list for Sphinx, Databricks, Figma Make, etc.
 * No auth; file-based data only.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const format = searchParams.get('format') ?? 'json';

  let npcs: NPC[];
  try {
    npcs = await listNPCs();
  } catch (err) {
    console.error('[export/npcs] Failed to list NPCs:', err);
    return NextResponse.json(
      { error: 'Failed to load NPCs' },
      { status: 500 },
    );
  }

  if (format === 'csv') {
    const csv = toCsv(npcs);
    return new NextResponse(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': 'attachment; filename="npcs.csv"',
      },
    });
  }

  // Pretty-print so the export is readable and matches single-NPC JSON file format
  const body = JSON.stringify(npcs, null, 2);
  return new NextResponse(body, {
    status: 200,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Content-Disposition': 'attachment; filename="npcs.json"',
    },
  });
}

function escapeCsvCell(value: string | number): string {
  const s = String(value ?? '');
  if (s.includes(',') || s.includes('"') || s.includes('\n') || s.includes('\r')) {
    return '"' + s.replace(/"/g, '""') + '"';
  }
  return s;
}

function toCsv(npcs: NPC[]): string {
  const headers = [
    'id',
    'name',
    'role',
    'backstory',
    'goals',
    'voice_style',
    'spoiler_policy',
    'do_not',
    'lore_facts_count',
    'allowed_gestures',
    'allowed_actions',
    'createdAt',
    'updatedAt',
  ];
  const rows = npcs.map((n) => {
    const p = n.persona ?? { backstory: '', goals: '', voice_style: '' };
    const r = n.rules ?? { do_not: [], spoiler_policy: '' };
    const c = n.capabilities ?? { allowed_gestures: [], allowed_actions: [] };
    const cells = [
      n.id,
      n.name,
      n.role,
      p.backstory,
      p.goals,
      p.voice_style,
      r.spoiler_policy,
      (r.do_not ?? []).join('; '),
      (n.lore_facts ?? []).length,
      (c.allowed_gestures ?? []).join('; '),
      (c.allowed_actions ?? []).join('; '),
      n.createdAt ?? '',
      n.updatedAt ?? '',
    ].map(escapeCsvCell);
    return cells.join(',');
  });
  return [headers.join(','), ...rows].join('\n');
}
