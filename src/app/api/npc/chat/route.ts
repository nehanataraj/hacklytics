import { NextResponse } from "next/server";
import { z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";
import { GoogleGenAI } from "@google/genai";
import Langfuse from "langfuse";
import { getNPC } from "@/lib/storage";
import type { NPC } from "@/lib/schema";

// ── CORS helpers ────────────────────────────────────────────────────────────
const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 200, headers: CORS_HEADERS });
}

// ── Constants ──────────────────────────────────────────────────────────────
// Ordered by preference; the loop moves on if a model is rate-limited (429/404).
const MODELS = [
  "gemini-2.0-flash",
  "gemini-2.0-flash-lite",
  "gemini-1.5-flash-latest",
  "gemini-1.5-pro-latest",
];
const MODEL = MODELS[0];

// ── Request schema & types ─────────────────────────────────────────────────
const Vec3Schema = z.object({
  x: z.number().optional(),
  y: z.number().optional(),
  z: z.number().optional(),
});

const ChatReqSchema = z.object({
  npcId: z.string().min(1),
  playerText: z.string().min(1),
  mode: z.enum(["chat", "ambient"]).optional().default("chat"),
  lastDialogue: z.string().optional(),
  world: z
    .object({
      playerPos: Vec3Schema.optional(),
      npcPos: Vec3Schema.optional(),
    })
    .optional(),
});

type ChatReq = z.infer<typeof ChatReqSchema>;

// ── Dynamic BrainResponse schema (gesture enum from NPC caps) ──────────────
function buildBrainSchema(allowedGestures: string[]) {
  const gestures = (
    allowedGestures.length > 0 ? allowedGestures : ["none"]
  ) as [string, ...string[]];

  return z.object({
    dialogue: z.string().describe("1–2 sentences spoken by the NPC"),
    mood: z.enum(["neutral", "happy", "angry", "sad", "focused"]),
    gesture: z.enum(gestures),
    intent: z.enum(["answer", "ask_question", "give_quest", "refuse"]),
    move: z
      .object({
        mode: z.enum(["none", "wander"]),
        radius: z.number().optional(),
        seconds: z.number().optional(),
      })
      .optional(),
  });
}

type BrainResponse = ReturnType<typeof buildBrainSchema>["_output"];

// ── Convert Zod schema → Gemini-compatible JSON Schema ─────────────────────
// We use openApi3 target because Gemini's responseSchema follows OpenAPI 3 conventions
// (nullable, etc.) rather than JSON Schema 7's anyOf-null pattern.
function toGeminiSchema(schema: z.ZodTypeAny): object {
  const js = zodToJsonSchema(schema, {
    $refStrategy: "none",
    target: "openApi3",
  }) as Record<string, unknown>;
  // Remove top-level $schema key which Gemini rejects.
  const { $schema: _dropped, ...rest } = js;
  return rest;
}

// ── Prompt builder ─────────────────────────────────────────────────────────
function buildPrompt(
  npc: NPC,
  playerText: string,
  world?: ChatReq["world"],
  mode: "chat" | "ambient" = "chat",
  lastDialogue?: string,
): string {
  const persona = npc.persona ?? { backstory: "", goals: "", voice_style: "" };
  const rules = npc.rules ?? { do_not: [], spoiler_policy: "" };
  const caps = npc.capabilities ?? {
    allowed_gestures: ["none"],
    allowed_actions: ["none"],
  };
  const loreFacts: string[] = npc.lore_facts ?? [];

  const lines: string[] = [
    `You are ${npc.name}, a ${npc.role} in a game world.`,
    `Stay fully in character. Return ONLY valid JSON that matches the response schema provided.`,
    `IMPORTANT: Vary your gestures and mood each response. Do NOT always use "none" for gesture — actively use nod, wave, angry, and other available gestures to bring the character to life. Alternate between different moods naturally.`,
    `Each line of dialogue must be fresh and unique — never repeat previous lines.`,
    "",
    "## Persona",
    persona.backstory ? `Backstory: ${persona.backstory}` : "",
    persona.goals ? `Goals: ${persona.goals}` : "",
    persona.voice_style ? `Voice style: ${persona.voice_style}` : "",
    "",
    "## Rules",
    rules.do_not.length > 0 ? `Never do: ${rules.do_not.join("; ")}` : "",
    rules.spoiler_policy ? `Spoiler policy: ${rules.spoiler_policy}` : "",
    "",
    loreFacts.length > 0
      ? `## Lore Facts\n${loreFacts.map((f) => `- ${f}`).join("\n")}`
      : "",
    "",
    "## Capabilities",
    `Allowed gestures: ${caps.allowed_gestures.join(", ")}`,
    `Allowed actions: ${caps.allowed_actions.join(", ")}`,
  ];

  if (mode === "ambient") {
    lines.push(
      "",
      "## Task",
      "You are thinking aloud, muttering to yourself, or reacting to your surroundings.",
      "Generate a short, in-character line of ambient dialogue (1–2 sentences max).",
      "Be creative — comment on the weather, your goals, a memory, something you see, or a passing thought.",
      "Use a different gesture and mood than last time.",
      lastDialogue
        ? `Your previous line was: "${lastDialogue}" — say something COMPLETELY different this time.`
        : "This is your first line — introduce yourself or react to your environment.",
    );
  } else {
    lines.push(
      "",
      "## Situation",
      `Player says: "${playerText}"`,
    );
  }

  if (world?.playerPos) {
    lines.push(`Player position: (${world.playerPos.x ?? 0}, ${world.playerPos.y ?? 0}, ${world.playerPos.z ?? 0})`);
  }
  if (world?.npcPos) {
    lines.push(`Your position: (${world.npcPos.x ?? 0}, ${world.npcPos.y ?? 0}, ${world.npcPos.z ?? 0})`);
  }

  return lines.filter((l) => l !== "").join("\n");
}

// ── Langfuse factory (returns null when keys are absent) ───────────────────
function makeLangfuse(): Langfuse | null {
  const secretKey = process.env.LANGFUSE_SECRET_KEY;
  const publicKey = process.env.LANGFUSE_PUBLIC_KEY;
  if (!secretKey || !publicKey) return null;
  return new Langfuse({
    secretKey,
    publicKey,
    baseUrl: process.env.LANGFUSE_BASE_URL ?? "https://cloud.langfuse.com",
    // flushAt=1 ensures each event is flushed immediately — important in
    // serverless environments where the process may not stay alive.
    flushAt: 1,
    flushInterval: 0,
  });
}

// ── Stub fallback (no API key or Gemini error) ─────────────────────────────
function buildStub(npc: NPC, _playerText: string): BrainResponse {
  const gestures = npc.capabilities?.allowed_gestures ?? ["none"];
  const moods = ["neutral", "happy", "focused", "sad", "angry"] as const;
  const randomGesture = gestures[Math.floor(Math.random() * gestures.length)] ?? "none";
  const randomMood = moods[Math.floor(Math.random() * moods.length)];

  const lines = [
    `Hmm, let me think about that for a moment...`,
    `*looks around curiously* This place never gets old.`,
    `You know, I've been meaning to tell you something interesting.`,
    `*stretches* What a beautiful day it is!`,
    `I wonder what adventures await us today.`,
    `*nods thoughtfully* There's more to this world than meets the eye.`,
    `Ha! You should have seen what happened earlier.`,
    `*waves enthusiastically* Oh, it's so good to see a friendly face!`,
    `I've traveled far and wide, but this spot is special.`,
    `*crosses arms* Something doesn't feel quite right today...`,
  ];
  const line = lines[Math.floor(Math.random() * lines.length)];

  return {
    dialogue: line,
    mood: randomMood,
    gesture: randomGesture as BrainResponse["gesture"],
    intent: "answer",
  };
}

// ── Route handler ──────────────────────────────────────────────────────────
export async function POST(req: Request) {
  // 1. Validate request body
  const rawBody = await req.json();
  const parsed = ChatReqSchema.safeParse(rawBody);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request", fields: parsed.error.flatten().fieldErrors },
      { status: 400, headers: CORS_HEADERS },
    );
  }
  const { npcId, playerText, mode, lastDialogue, world } = parsed.data;

  // 2. Load NPC from file storage
  const npc = await getNPC(npcId);
  if (!npc) {
    return NextResponse.json({ error: "NPC not found" }, { status: 404, headers: CORS_HEADERS });
  }

  // 3. Set up Langfuse trace (no-op when keys are absent)
  const lf = makeLangfuse();
  const trace = lf?.trace({
    name: "npc.chat",
    input: { npcId, playerText, mode, npcName: npc.name, npcRole: npc.role },
  });

  // 4. Build dynamic schema and prompt
  const allowedGestures = npc.capabilities?.allowed_gestures ?? ["none"];
  const BrainResponseSchema = buildBrainSchema(allowedGestures as string[]);
  const prompt = buildPrompt(npc, playerText, world, mode, lastDialogue);

  // 5. If no Gemini API key, return stub
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    const stub = buildStub(npc, playerText);
    trace?.update({ output: stub, metadata: { stubbed: true } });
    await lf?.flushAsync();
    return NextResponse.json(stub, { headers: CORS_HEADERS });
  }

  // 6. Call Gemini with structured output
  const generation = trace?.generation({
    name: "gemini.generateContent",
    model: MODEL,
    input: [{ role: "user", content: prompt }],
    modelParameters: { responseMimeType: "application/json" },
  });

  const t0 = Date.now();

  try {
    const ai = new GoogleGenAI({ apiKey });
    const geminiSchema = toGeminiSchema(BrainResponseSchema);

    // Try each model in order; move on if one is rate-limited (429).
    let result: Awaited<ReturnType<typeof ai.models.generateContent>> | null = null;
    let usedModel = MODEL;
    for (const candidate of MODELS) {
      try {
        result = await ai.models.generateContent({
          model: candidate,
          contents: prompt,
          config: {
            responseMimeType: "application/json",
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            responseSchema: geminiSchema as any,
          },
        });
        usedModel = candidate;
        break;
      } catch (modelErr) {
        const msg = modelErr instanceof Error ? modelErr.message : String(modelErr);
        if (msg.includes("429") || msg.includes("RESOURCE_EXHAUSTED") || msg.includes("NOT_FOUND") || msg.includes("404")) {
          console.warn(`[npc/chat] ${candidate} rate-limited, trying next model…`);
          continue;
        }
        throw modelErr; // non-quota error — rethrow immediately
      }
    }

    if (!result) {
      // All models quota-exhausted — fall back to stub so the app stays usable.
      console.warn("[npc/chat] All Gemini models rate-limited; returning stub.");
      const stub = buildStub(npc, playerText);
      trace?.update({ output: stub, metadata: { stubbed: true, reason: "quota_exhausted" } });
      await lf?.flushAsync();
      return NextResponse.json(stub, { headers: CORS_HEADERS });
    }

    const latencyMs = Date.now() - t0;
    const rawText = result.text ?? "{}";
    console.log(`[npc/chat] Used model: ${usedModel}`);

    // Validate model output against our schema
    const validated = BrainResponseSchema.parse(JSON.parse(rawText));

    generation?.end({
      output: validated,
      metadata: { latencyMs, model: usedModel, promptChars: prompt.length },
    });
    trace?.update({ output: validated });
    await lf?.flushAsync();

    return NextResponse.json(validated, { headers: CORS_HEADERS });
  } catch (err) {
    const latencyMs = Date.now() - t0;
    const errMsg = err instanceof Error ? err.message : String(err);
    console.error("[npc/chat] Gemini error:", errMsg);

    generation?.end({
      output: null,
      metadata: { latencyMs, error: errMsg },
      level: "ERROR",
    });
    trace?.update({ metadata: { error: errMsg } });
    await lf?.flushAsync();

    // Return 502 so callers know it's an upstream failure, not a client error
    return NextResponse.json(
      { error: "Brain generation failed", detail: errMsg },
      { status: 502, headers: CORS_HEADERS },
    );
  }
}
