import { z } from 'zod';

// ── Enum constants (exported so the form can iterate them) ─────────────────
export const GESTURE_VALUES = [
  'none', 'nod', 'wave', 'point', 'shrug', 'angry',
] as const;

export const ACTION_VALUES = [
  'none', 'go_to', 'pickup', 'equip', 'start_quest', 'give_item', 'set_flag',
] as const;

export type Gesture = (typeof GESTURE_VALUES)[number];
export type Action = (typeof ACTION_VALUES)[number];

// ── Sub-schemas ────────────────────────────────────────────────────────────
const GestureEnum = z.enum(GESTURE_VALUES);
const ActionEnum = z.enum(ACTION_VALUES);

const PersonaSchema = z.object({
  backstory: z.string().default(''),
  goals: z.string().default(''),
  voice_style: z.string().default(''),
});

const RulesSchema = z.object({
  do_not: z.array(z.string()).default([]),
  spoiler_policy: z.string().default(''),
});

const CapabilitiesSchema = z.object({
  allowed_gestures: z.array(GestureEnum).default(['none']),
  allowed_actions: z.array(ActionEnum).default(['none']),
});

// ── Full NPC record (what is stored) ──────────────────────────────────────
export const NPCSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1, 'Name is required'),
  role: z.string().min(1, 'Role is required'),
  persona: PersonaSchema.default({ backstory: '', goals: '', voice_style: '' }),
  rules: RulesSchema.default({ do_not: [], spoiler_policy: '' }),
  capabilities: CapabilitiesSchema.default({
    allowed_gestures: ['none'],
    allowed_actions: ['none'],
  }),
  lore_facts: z.array(z.string()).default([]),
  // Legacy flat fields kept so existing saved NPCs continue to parse without error.
  // The form migrates them into the nested structure on first load.
  description: z.string().optional(),
  backstory: z.string().optional(),
  personality: z.string().optional(),
  goals: z.string().optional(),
  quirks: z.string().optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

// ── API input schemas ──────────────────────────────────────────────────────
export const NPCCreateSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  role: z.string().min(1, 'Role is required'),
  persona: PersonaSchema.optional().default({ backstory: '', goals: '', voice_style: '' }),
  rules: RulesSchema.optional().default({ do_not: [], spoiler_policy: '' }),
  capabilities: CapabilitiesSchema.optional().default({
    allowed_gestures: ['none'],
    allowed_actions: ['none'],
  }),
  lore_facts: z.array(z.string()).optional().default([]),
});

export const NPCUpdateSchema = NPCCreateSchema.partial();

// ── Inferred types ─────────────────────────────────────────────────────────
export type NPC = z.infer<typeof NPCSchema>;
export type NPCCreate = z.infer<typeof NPCCreateSchema>;
export type NPCUpdate = z.infer<typeof NPCUpdateSchema>;
