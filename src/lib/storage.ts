import { v4 as uuidv4 } from 'uuid';
import { NPCSchema } from './schema';
import type { NPC, NPCCreate, NPCUpdate } from './schema';

// ── Backend detection ──────────────────────────────────────────────────────
// On Vercel: BLOB_READ_WRITE_TOKEN is injected automatically after you add
// Vercel Blob storage in the dashboard.
// Locally: falls back to data/npcs.json (no token needed).
const useBlob = !!process.env.BLOB_READ_WRITE_TOKEN;
const BLOB_PATHNAME = 'npcs.json';

// ── Blob helpers (Vercel production) ──────────────────────────────────────

async function blobReadAll(): Promise<NPC[]> {
  const { list, getDownloadUrl } = await import('@vercel/blob');
  const { blobs } = await list({ prefix: BLOB_PATHNAME });
  if (blobs.length === 0) return [];
  const downloadUrl = await getDownloadUrl(blobs[0].url);
  const res = await fetch(downloadUrl, { cache: 'no-store' });
  if (!res.ok) return [];
  const records = (await res.json()) as unknown[];
  return records.map((r) => {
    const result = NPCSchema.safeParse(r);
    return result.success ? result.data : (r as NPC);
  });
}

async function blobWriteAll(npcs: NPC[]): Promise<void> {
  const { put } = await import('@vercel/blob');
  await put(BLOB_PATHNAME, JSON.stringify(npcs, null, 2), {
    access: 'private',
    addRandomSuffix: false,
    contentType: 'application/json',
  });
}

// ── File helpers (local development) ──────────────────────────────────────

function fileReadAll(): NPC[] {
  const fs   = require('fs')   as typeof import('fs');
  const path = require('path') as typeof import('path');
  const dataDir  = path.join(process.cwd(), 'data');
  const dataFile = path.join(dataDir, 'npcs.json');
  if (!fs.existsSync(dataDir))  fs.mkdirSync(dataDir, { recursive: true });
  if (!fs.existsSync(dataFile)) fs.writeFileSync(dataFile, '[]', 'utf-8');
  const records = JSON.parse(fs.readFileSync(dataFile, 'utf-8')) as unknown[];
  return records.map((r) => {
    const result = NPCSchema.safeParse(r);
    return result.success ? result.data : (r as NPC);
  });
}

function fileWriteAll(npcs: NPC[]): void {
  const fs   = require('fs')   as typeof import('fs');
  const path = require('path') as typeof import('path');
  const dataDir  = path.join(process.cwd(), 'data');
  const dataFile = path.join(dataDir, 'npcs.json');
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
  fs.writeFileSync(dataFile, JSON.stringify(npcs, null, 2), 'utf-8');
}

// ── Unified read/write ─────────────────────────────────────────────────────

async function readAll(): Promise<NPC[]> {
  return useBlob ? blobReadAll() : fileReadAll();
}

async function writeAll(npcs: NPC[]): Promise<void> {
  if (useBlob) await blobWriteAll(npcs);
  else fileWriteAll(npcs);
}

// ── Public API ─────────────────────────────────────────────────────────────

export async function listNPCs(): Promise<NPC[]> {
  return readAll();
}

export async function getNPC(id: string): Promise<NPC | null> {
  const npcs = await readAll();
  return npcs.find((n) => n.id === id) ?? null;
}

export async function createNPC(data: NPCCreate): Promise<NPC> {
  const npcs = await readAll();
  const now  = new Date().toISOString();
  const npc: NPC = {
    id: uuidv4(),
    name: data.name,
    role: data.role,
    persona: data.persona ?? { backstory: '', goals: '', voice_style: '' },
    rules: data.rules ?? { do_not: [], spoiler_policy: '' },
    capabilities: data.capabilities ?? { allowed_gestures: ['none'], allowed_actions: ['none'] },
    lore_facts: data.lore_facts ?? [],
    createdAt: now,
    updatedAt: now,
  };
  npcs.push(npc);
  await writeAll(npcs);
  return npc;
}

export async function updateNPC(id: string, data: NPCUpdate): Promise<NPC | null> {
  const npcs = await readAll();
  const idx  = npcs.findIndex((n) => n.id === id);
  if (idx === -1) return null;
  const existing = npcs[idx];
  const updated: NPC = {
    ...existing,
    ...data,
    persona:      data.persona      ? { ...existing.persona,      ...data.persona      } : existing.persona,
    rules:        data.rules        ? { ...existing.rules,        ...data.rules        } : existing.rules,
    capabilities: data.capabilities ? { ...existing.capabilities, ...data.capabilities } : existing.capabilities,
    updatedAt: new Date().toISOString(),
  };
  npcs[idx] = updated;
  await writeAll(npcs);
  return updated;
}

export async function deleteNPC(id: string): Promise<boolean> {
  const npcs = await readAll();
  const idx  = npcs.findIndex((n) => n.id === id);
  if (idx === -1) return false;
  npcs.splice(idx, 1);
  await writeAll(npcs);
  return true;
}
