'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import NpcForm, { type NpcFormData, type NpcFormHandle } from './NpcForm';
import { Toast, useToast } from './Toast';
import type { NPC } from '@/lib/schema';

// ── Brain Output Schema preview ────────────────────────────────────────────
const BRAIN_OUTPUT_SCHEMA = `{
  "dialogue": "string  — the NPC's spoken response",
  "mood":     "string  — current emotional state, e.g. \\"neutral\\" | \\"suspicious\\" | \\"excited\\"",
  "gesture":  "\\"none\\" | \\"nod\\" | \\"wave\\" | \\"point\\" | \\"shrug\\" | \\"angry\\"",
  "intent":   "string  — internal motivation driving this response",
  "plan": [
    "\\"none\\" | \\"go_to\\" | \\"pickup\\" | \\"equip\\" | \\"start_quest\\" | \\"give_item\\" | \\"set_flag\\""
  ]
}`;

function BrainOutputPreview({ npc }: { npc: NPC }) {
  const [open, setOpen] = useState(false);
  const gestures = npc.capabilities?.allowed_gestures ?? ['none'];
  const actions = npc.capabilities?.allowed_actions ?? ['none'];

  const liveSchema = `{
  "dialogue": "string  — the NPC's spoken response",
  "mood":     "string  — current emotional state",
  "gesture":  ${gestures.map((g) => `"${g}"`).join(' | ')},
  "intent":   "string  — internal motivation driving this response",
  "plan": [
    ${actions.map((a) => `"${a}"`).join(' | ')}
  ]
}`;

  return (
    <div className="mt-6 border border-slate-800 rounded-xl overflow-hidden">
      <button type="button" onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-5 py-4 bg-slate-900 hover:bg-slate-800/70 transition-colors text-left">
        <div className="flex items-center gap-2.5">
          <span className="text-violet-400 text-base">🧠</span>
          <span className="text-sm font-semibold text-slate-300">Preview Brain Output Schema</span>
          <span className="text-xs text-slate-500 font-normal">— JSON shape the model must return</span>
        </div>
        <svg className={`w-4 h-4 text-slate-500 transition-transform duration-150 ${open ? 'rotate-180' : ''}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="bg-slate-950 border-t border-slate-800 p-5 space-y-5">
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
              Narrowed to this NPC&apos;s capabilities
            </p>
            <pre className="bg-slate-900 border border-slate-800 rounded-lg p-4 text-sm text-emerald-300 font-mono overflow-x-auto leading-relaxed whitespace-pre">
              {liveSchema}
            </pre>
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
              Full schema (all possible values)
            </p>
            <pre className="bg-slate-900 border border-slate-800 rounded-lg p-4 text-sm text-sky-300 font-mono overflow-x-auto leading-relaxed whitespace-pre">
              {BRAIN_OUTPUT_SCHEMA}
            </pre>
          </div>
          <p className="text-xs text-slate-500 leading-relaxed">
            The model will receive this NPC&apos;s full record as its system prompt and must return
            a JSON object matching the schema above.{' '}
            <code className="text-slate-400 bg-slate-800 px-1 py-0.5 rounded">gesture</code> and{' '}
            <code className="text-slate-400 bg-slate-800 px-1 py-0.5 rounded">plan</code> are
            constrained to this NPC&apos;s allowed capabilities.
          </p>
        </div>
      )}
    </div>
  );
}

// ── Main editor ────────────────────────────────────────────────────────────
export default function NpcEditor({ npc: initialNpc }: { npc: NPC }) {
  const router = useRouter();
  const [npc, setNpc] = useState<NPC>(initialNpc);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDuplicating, setIsDuplicating] = useState(false);
  const { toast, show: showToast, dismiss } = useToast();
  const formRef = useRef<NpcFormHandle>(null);

  async function handleSave(data: NpcFormData) {
    setIsSaving(true);
    try {
      const res = await fetch(`/api/npcs/${npc.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const body = await res.json();
      if (!res.ok) {
        // Surface per-field errors back into the form if the API returned them.
        if (body?.fields) {
          formRef.current?.setErrors(body.fields);
          showToast('Please fix the highlighted fields.', 'error');
        } else {
          showToast(body?.error ?? 'Failed to save changes.', 'error');
        }
        return;
      }
      setNpc(body as NPC);
      showToast('Changes saved!', 'success');
    } catch {
      showToast('Network error — changes not saved.', 'error');
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete() {
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/npcs/${npc.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete');
      router.push('/');
      router.refresh();
    } catch {
      showToast('Failed to delete NPC.', 'error');
      setIsDeleting(false);
    }
  }

  async function handleDuplicate() {
    setIsDuplicating(true);
    try {
      const payload = {
        name: `${npc.name} (copy)`,
        role: npc.role,
        persona: npc.persona,
        rules: npc.rules,
        capabilities: npc.capabilities,
        lore_facts: npc.lore_facts,
      };
      const res = await fetch('/api/npcs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error('Failed to duplicate');
      const copy: NPC = await res.json();
      showToast(`Duplicated as "${copy.name}"`, 'success');
      // Brief delay so the toast is visible before navigating.
      await new Promise((r) => setTimeout(r, 600));
      router.push(`/npc/${copy.id}`);
    } catch {
      showToast('Failed to duplicate NPC.', 'error');
    } finally {
      setIsDuplicating(false);
    }
  }

  function handleExport() {
    const json = JSON.stringify(npc, null, 2);
    navigator.clipboard.writeText(json).catch(() => {});
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${npc.name.replace(/\s+/g, '-').toLowerCase()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('JSON copied to clipboard and downloaded.', 'success');
  }

  return (
    <>
      {/* Breadcrumb */}
      <div className="flex items-center gap-3 mb-8">
        <Link href="/"
          className="text-slate-400 hover:text-slate-200 text-sm flex items-center gap-1.5 transition-colors">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Characters
        </Link>
        <span className="text-slate-700">/</span>
        <span className="text-slate-400 text-sm truncate max-w-xs">{npc.name}</span>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-8">
        <div>
          <div className="flex items-baseline gap-3 flex-wrap">
            <h1 className="text-2xl font-bold text-slate-100">{npc.name}</h1>
            <span className="text-indigo-400 font-medium text-sm">{npc.role}</span>
          </div>
          <p className="text-slate-600 text-xs mt-1.5">
            Created{' '}
            {new Date(npc.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            {' · '}Last updated{' '}
            {new Date(npc.updatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
          </p>
        </div>

        {/* Duplicate button */}
        <button
          type="button"
          onClick={handleDuplicate}
          disabled={isDuplicating || isDeleting}
          className="shrink-0 inline-flex items-center gap-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 text-sm font-medium px-4 py-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isDuplicating ? (
            <>
              <svg className="animate-spin h-3.5 w-3.5" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
              Duplicating…
            </>
          ) : (
            <>
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              Duplicate
            </>
          )}
        </button>
      </div>

      <NpcForm
        ref={formRef}
        initialData={npc}
        onSave={handleSave}
        onDelete={handleDelete}
        onExport={handleExport}
        isSaving={isSaving}
        isDeleting={isDeleting}
      />

      <BrainOutputPreview npc={npc} />

      <Toast toast={toast} onDismiss={dismiss} />
    </>
  );
}
