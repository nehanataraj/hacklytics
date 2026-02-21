'use client';

import { useState, useId, useImperativeHandle, forwardRef } from 'react';
import { GESTURE_VALUES, ACTION_VALUES, NPCCreateSchema } from '@/lib/schema';
import type { NPC, Gesture, Action } from '@/lib/schema';

// ── Public types ───────────────────────────────────────────────────────────
export type NpcFormData = {
  name: string;
  role: string;
  persona: { backstory: string; goals: string; voice_style: string };
  rules: { do_not: string[]; spoiler_policy: string };
  capabilities: { allowed_gestures: Gesture[]; allowed_actions: Action[] };
  lore_facts: string[];
};

/** Flat error map: keys are dot-joined field paths, e.g. 'persona.voice_style'. */
export type FieldErrors = Record<string, string>;

/** Ref handle so parents can inject server-side field errors after an API 400. */
export type NpcFormHandle = {
  setErrors: (errs: FieldErrors) => void;
};

// ── Defaults & migration ───────────────────────────────────────────────────
const EMPTY_FORM: NpcFormData = {
  name: '',
  role: '',
  persona: { backstory: '', goals: '', voice_style: '' },
  rules: { do_not: [], spoiler_policy: '' },
  capabilities: { allowed_gestures: ['none'], allowed_actions: ['none'] },
  lore_facts: [],
};

function fromNpc(npc: NPC): NpcFormData {
  return {
    name: npc.name,
    role: npc.role,
    persona: {
      backstory: npc.persona?.backstory || npc.backstory || '',
      goals: npc.persona?.goals || npc.goals || '',
      voice_style: npc.persona?.voice_style || '',
    },
    rules: {
      do_not: npc.rules?.do_not ?? [],
      spoiler_policy: npc.rules?.spoiler_policy ?? '',
    },
    capabilities: {
      allowed_gestures: npc.capabilities?.allowed_gestures ?? ['none'],
      allowed_actions: npc.capabilities?.allowed_actions ?? ['none'],
    },
    lore_facts: npc.lore_facts ?? [],
  };
}

// ── Props ──────────────────────────────────────────────────────────────────
type Props = {
  initialData?: NPC;
  onSave: (data: NpcFormData) => Promise<void>;
  onDelete?: () => Promise<void>;
  onExport?: () => void;
  isSaving?: boolean;
  isDeleting?: boolean;
};

// ── Helpers ────────────────────────────────────────────────────────────────
function zodToFieldErrors(formData: NpcFormData): FieldErrors | null {
  const result = NPCCreateSchema.safeParse(formData);
  if (result.success) return null;
  const errs: FieldErrors = {};
  for (const issue of result.error.issues) {
    const key = issue.path.join('.') || '_';
    if (!errs[key]) errs[key] = issue.message;
  }
  return errs;
}

const inputCls =
  'w-full bg-black border border-gray-700 px-3 py-2.5 text-white placeholder-gray-500 text-sm focus:outline-none focus:ring-2 focus:ring-white focus:border-transparent transition-colors resize-none';

const errorCls = 'text-gray-400 text-xs mt-1.5 flex items-center gap-1';

// ── Sub-components ─────────────────────────────────────────────────────────
function FieldError({ msg }: { msg?: string }) {
  if (!msg) return null;
  return (
    <p className={errorCls}>
      <svg className="w-3 h-3 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4m0 4h.01" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
      </svg>
      {msg}
    </p>
  );
}

function Field({
  label, id, value, onChange, required, placeholder, multiline, rows, hint, error,
}: {
  label: string; id: string; value: string; onChange: (v: string) => void;
  required?: boolean; placeholder?: string; multiline?: boolean; rows?: number;
  hint?: string; error?: string;
}) {
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-gray-300 mb-1.5">
        {label}
        {required && <span className="text-white ml-1">*</span>}
        {hint && <span className="ml-2 text-gray-500 font-normal text-xs">{hint}</span>}
      </label>
      {multiline ? (
        <textarea
          id={id} rows={rows ?? 4} value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={`${inputCls} ${error ? 'border-gray-500 focus:ring-gray-500' : ''}`}
        />
      ) : (
        <input
          id={id} type="text" value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder} required={required}
          className={`${inputCls} ${error ? 'border-gray-500 focus:ring-gray-500' : ''}`}
        />
      )}
      <FieldError msg={error} />
    </div>
  );
}

function ListEditor({
  label, hint, items, onChange, placeholder, error,
}: {
  label: string; hint?: string; items: string[]; onChange: (next: string[]) => void;
  placeholder?: string; error?: string;
}) {
  const uid = useId();
  const [draft, setDraft] = useState('');

  function add() {
    const t = draft.trim();
    if (!t || items.includes(t)) return;
    onChange([...items, t]);
    setDraft('');
  }

  return (
    <div>
      <p className="text-sm font-medium text-gray-300 mb-1.5">
        {label}
        {hint && <span className="ml-2 text-gray-500 font-normal text-xs">{hint}</span>}
      </p>
      <div className="space-y-2">
        {items.map((item, i) => (
          <div key={i} className="flex items-center gap-2 bg-black border border-gray-700 px-3 py-2">
            <span className="text-sm text-white flex-1 break-all">{item}</span>
            <button type="button" onClick={() => onChange(items.filter((_, idx) => idx !== i))}
              className="shrink-0 text-gray-500 hover:text-gray-400 transition-colors" aria-label="Remove">
              ✕
            </button>
          </div>
        ))}
        <div className="flex gap-2">
          <input
            id={uid} type="text" value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), add())}
            placeholder={placeholder ?? 'Type and press Enter or Add…'}
            className="flex-1 bg-black border border-gray-700 px-3 py-2 text-white placeholder-gray-500 text-sm focus:outline-none focus:ring-2 focus:ring-white focus:border-transparent transition-colors"
          />
          <button type="button" onClick={add}
            className="px-3 py-2 bg-gray-800 hover:bg-gray-700 text-white text-sm rounded-lg transition-colors shrink-0">
            Add
          </button>
        </div>
      </div>
      <FieldError msg={error} />
    </div>
  );
}

function CheckboxGroup<T extends string>({
  label, hint, options, selected, onChange, error,
}: {
  label: string; hint?: string; options: readonly T[];
  selected: T[]; onChange: (next: T[]) => void; error?: string;
}) {
  function toggle(val: T) {
    onChange(selected.includes(val) ? selected.filter((v) => v !== val) : [...selected, val]);
  }
  return (
    <div>
      <p className="text-sm font-medium text-gray-300 mb-2">
        {label}
        {hint && <span className="ml-2 text-gray-500 font-normal text-xs">{hint}</span>}
      </p>
      <div className="flex flex-wrap gap-2">
        {options.map((opt) => {
          const active = selected.includes(opt);
          return (
            <button key={opt} type="button" onClick={() => toggle(opt)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                active
                  ? 'bg-white border-gray-600 text-black'
                  : 'bg-black border-gray-700 text-gray-400 hover:border-gray-600 hover:text-white'
              }`}>
              {opt.replace(/_/g, ' ')}
            </button>
          );
        })}
      </div>
      <FieldError msg={error} />
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="bg-black border border-gray-800 p-6 space-y-5 shadow-sm">
      <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">{title}</h2>
      {children}
    </section>
  );
}

// ── Main form (forwardRef so parents can call setErrors) ───────────────────
const NpcForm = forwardRef<NpcFormHandle, Props>(function NpcForm(
  { initialData, onSave, onDelete, onExport, isSaving, isDeleting },
  ref,
) {
  const [form, setForm] = useState<NpcFormData>(initialData ? fromNpc(initialData) : EMPTY_FORM);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [confirmDelete, setConfirmDelete] = useState(false);

  // Expose setErrors to the parent for server-side error injection.
  useImperativeHandle(ref, () => ({ setErrors }), []);

  // ── Setters ──────────────────────────────────────────────────────────
  function clearError(key: string) {
    if (errors[key]) setErrors((e) => { const n = { ...e }; delete n[key]; return n; });
  }
  function setTop<K extends 'name' | 'role'>(k: K, v: string) {
    setForm((f) => ({ ...f, [k]: v }));
    clearError(k);
  }
  function setPersona(k: keyof NpcFormData['persona'], v: string) {
    setForm((f) => ({ ...f, persona: { ...f.persona, [k]: v } }));
    clearError(`persona.${k}`);
  }
  function setRules(k: keyof NpcFormData['rules'], v: string | string[]) {
    setForm((f) => ({ ...f, rules: { ...f.rules, [k]: v } }));
    clearError(`rules.${k}`);
  }
  function setCaps(k: keyof NpcFormData['capabilities'], v: Gesture[] | Action[]) {
    setForm((f) => ({ ...f, capabilities: { ...f.capabilities, [k]: v } }));
    clearError(`capabilities.${k}`);
  }

  // ── Validation & submit ──────────────────────────────────────────────
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const fieldErrors = zodToFieldErrors(form);
    if (fieldErrors) {
      setErrors(fieldErrors);
      // Scroll to first error field
      const firstKey = Object.keys(fieldErrors)[0];
      document.getElementById(firstKey.replace('.', '-'))?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    setErrors({});
    await onSave(form);
  }

  const isEditing = !!initialData;

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-5">

      {/* Identity */}
      <Section title="Identity">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Name" id="name" value={form.name} onChange={(v) => setTop('name', v)}
            required placeholder="e.g. Aldric Vane" error={errors['name']} />
          <Field label="Role" id="role" value={form.role} onChange={(v) => setTop('role', v)}
            required placeholder="e.g. Merchant, Guard Captain" error={errors['role']} />
        </div>
      </Section>

      {/* Persona */}
      <Section title="Persona">
        <Field label="Backstory" id="persona-backstory" value={form.persona.backstory}
          onChange={(v) => setPersona('backstory', v)} multiline rows={4}
          placeholder="Where did they come from? What shaped them?"
          error={errors['persona.backstory']} />
        <Field label="Goals" id="persona-goals" value={form.persona.goals}
          onChange={(v) => setPersona('goals', v)} multiline rows={3}
          placeholder="What do they want? What motivates them?"
          error={errors['persona.goals']} />
        <Field label="Voice Style" id="persona-voice_style" value={form.persona.voice_style}
          onChange={(v) => setPersona('voice_style', v)}
          placeholder="e.g. Formal and cryptic, Cheerful and blunt"
          hint="short descriptor fed to the model"
          error={errors['persona.voice_style']} />
      </Section>

      {/* Rules */}
      <Section title="Rules">
        <ListEditor label="Do-Not List" hint="things the NPC must never do or say"
          items={form.rules.do_not} onChange={(v) => setRules('do_not', v)}
          placeholder="e.g. Never reveal the king's location…"
          error={errors['rules.do_not']} />
        <Field label="Spoiler Policy" id="rules-spoiler_policy" value={form.rules.spoiler_policy}
          onChange={(v) => setRules('spoiler_policy', v)} multiline rows={2}
          placeholder="e.g. Do not reveal quest endings; hint only after Act 2."
          error={errors['rules.spoiler_policy']} />
      </Section>

      {/* Capabilities */}
      <Section title="Capabilities">
        <CheckboxGroup<Gesture> label="Allowed Gestures"
          hint="select which gestures this NPC may output"
          options={GESTURE_VALUES} selected={form.capabilities.allowed_gestures}
          onChange={(v) => setCaps('allowed_gestures', v)}
          error={errors['capabilities.allowed_gestures']} />
        <CheckboxGroup<Action> label="Allowed Actions"
          hint="select which actions this NPC may trigger"
          options={ACTION_VALUES} selected={form.capabilities.allowed_actions}
          onChange={(v) => setCaps('allowed_actions', v)}
          error={errors['capabilities.allowed_actions']} />
      </Section>

      {/* Lore Facts */}
      <Section title="Lore Facts">
        <ListEditor label="Facts" hint="world knowledge this NPC can reference in dialogue"
          items={form.lore_facts} onChange={(v) => setForm((f) => ({ ...f, lore_facts: v }))}
          placeholder="e.g. The old bridge was destroyed in 842…"
          error={errors['lore_facts']} />
      </Section>

      {/* Action bar */}
      <div className="flex flex-wrap items-center gap-3 pt-1">
        <button type="submit" disabled={isSaving || isDeleting}
          className="inline-flex items-center gap-2 bg-white hover:bg-gray-200 text-black disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium px-5 py-2.5 transition-colors">
          {isSaving ? (
            <>
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
              Saving…
            </>
          ) : isEditing ? 'Save Changes' : 'Create NPC'}
        </button>

        {isEditing && onExport && (
          <button type="button" onClick={onExport} disabled={isDeleting}
            className="inline-flex items-center gap-2 bg-black hover:bg-gray-900 border border-gray-700 text-white text-sm font-medium px-4 py-2.5 rounded-lg transition-colors disabled:opacity-50">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Export JSON
          </button>
        )}

        {isEditing && onDelete && (
          <div className="ml-auto flex items-center gap-2">
            {confirmDelete ? (
              <>
                <span className="text-sm text-gray-400">Are you sure?</span>
                <button type="button" onClick={onDelete} disabled={isDeleting}
                  className="inline-flex items-center gap-1.5 bg-white hover:bg-gray-200 text-black disabled:opacity-50 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors">
                  {isDeleting ? 'Deleting…' : 'Yes, Delete'}
                </button>
                <button type="button" onClick={() => setConfirmDelete(false)}
                  className="text-sm text-gray-400 hover:text-white px-3 py-2 rounded-lg transition-colors">
                  Cancel
                </button>
              </>
            ) : (
              <button type="button" onClick={() => setConfirmDelete(true)} disabled={isDeleting}
                className="inline-flex items-center gap-1.5 text-white hover:text-gray-200 hover:bg-gray-900 text-sm font-medium px-4 py-2 rounded-lg transition-colors border border-gray-700">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                Delete
              </button>
            )}
          </div>
        )}
      </div>
    </form>
  );
});

export default NpcForm;
