# Next Steps Decision Guide

**Project scope (per workspace rules):** This app is Part 1 — localhost NPC Studio with **file-based storage** (`data/npcs.json`) and **no auth, no database**. The guide below describes hackathon-track options and possible directions; anything that requires auth or a database is marked as **out of current scope** and only for use if you explicitly change the project scope later.

---

## Easiest first: Export API (done)

**What it is:** A single API that returns your NPC list as JSON or CSV. No new dependencies, no external services, no auth or database.

**APIs/features:**


| Item         | Details                                                                                                                                                                                           |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Endpoint** | `GET /api/export/npcs`                                                                                                                                                                            |
| **Query**    | `?format=json` (default) or `?format=csv`                                                                                                                                                         |
| **Response** | JSON array of NPCs, or CSV with flattened columns (name, role, backstory, goals, voice_style, spoiler_policy, do_not, lore_facts_count, allowed_gestures, allowed_actions, createdAt, updatedAt). |
| **Headers**  | `Content-Disposition: attachment; filename="npcs.json"` or `npcs.csv` so the browser can download.                                                                                                |


**Steps already taken:**

1. Added `src/app/api/export/npcs/route.ts` that calls existing `listNPCs()` from `@/lib/storage`.
2. JSON: returns the same data as `GET /api/npcs` with a download filename.
3. CSV: flattens persona, rules, capabilities into columns and escapes commas/quotes/newlines.

**How to use it:**

- **JSON:** Open or fetch `http://localhost:3000/api/export/npcs` (or `?format=json`). Use for Sphinx (save as `npcs.json`), Databricks (upload or paste), or Figma Make (if they accept JSON).
- **CSV:** `http://localhost:3000/api/export/npcs?format=csv`. Download and use in Databricks, Sphinx, or Figma Make (datasets under 5MB).

**What this unblocks:** Sphinx (load the export in a notebook), Databricks raffle (upload to a notebook), Figma Make (use as the dataset for the viz). No further backend work required for those tracks beyond this export.

---

## 1. Login + user/character history (out of current scope)

**Current scope:** No login. All NPCs live in `data/npcs.json`; there are no users or per-user data. Do not add auth or a database for Part 1.

The following is for **reference only** if you later decide to expand scope (e.g. a separate “Part 2” or a fork):

- **Auth** would imply: a login page, identifying users (e.g. NextAuth with credentials or OAuth), and storing which NPCs belong to whom.
- **Per-user / per-character data** would require a database (e.g. `users`, `npcs` with `user_id`, `conversations` or `chat_turns` tables) and API changes to scope reads/writes by user. That contradicts the current “file-based, no database” rule.

**In-scope alternatives (no auth, no DB):**

- Keep a single `data/npcs.json`; no user ownership.
- **Optional:** Add a second file (e.g. `data/conversation_log.json`) to append recent chat turns for analytics/export only, without user accounts or a DB. The chat API stays stateless; logging is best-effort and not required for the core app.

---

## 2. Actian VectorAI DB (vector search)

### What you get

- **Vector search:** Store embeddings of lore, persona, or other text; at chat time retrieve relevant chunks and feed them to Gemini (RAG).
- **Better NPC grounding:** Responses can be grounded in stored knowledge (e.g. lore, persona) in addition to the static prompt.

### What you need

- **Actian VectorAI DB:** Run via Docker (e.g. [beta repo](https://github.com/hackmamba-io/actian-vectorAI-db-beta) — `docker compose up`). Listens on `localhost:50051` (gRPC).
- **Embeddings:** Actian does **not** include an embedding model. You need your own (e.g. Gemini embedding API, or a small Python service with something like `sentence-transformers`).
- **Next.js ↔ Actian:** The beta provides a **Python** client. Easiest approach: a small Python HTTP service that creates collections, upserts vectors (from text you send), and runs search; Next.js calls it from `/api/npc/chat/route.ts`. Alternatively, use a Node embedding library and check if a Node client for Actian exists.
- **Data to vectorize:** From **current file-based NPCs** — for each NPC, chunk and embed `lore_facts`, persona (backstory, goals, voice_style), and optionally rules. No database required; read from `data/npcs.json` (and your existing storage layer).

### Effort

- **~1–2 days:** Run Actian in Docker, implement embed + upsert and embed query + search (Python service or Node), then in the chat route call that, get top-k chunks, and add them to `buildPrompt()`.

### Recommendation

- Use one collection per NPC (or one collection with `npc_id` in the payload and filter). At chat time: embed `playerText`, search that NPC’s vectors, inject results into the prompt as “Relevant context.” All without adding auth or a database; NPC data stays in `npcs.json`.

---

## 3. Sphinx track – what it provides and what you need

### What Sphinx actually is

- Sphinx is an **AI assistant for data science inside your editor** (VS Code, Cursor): it works with **Jupyter notebooks**, runs Python, and reasons over data. It does **not** expose a REST API your app calls. The “output” is **insights, code, and notebooks** you run and read.

### What “output” you’d have for the track

- **Output = artifact produced with Sphinx:** e.g. a **notebook** where Sphinx loads a dataset you export from NPC Studio, reasons over it (e.g. “Which NPCs have the most lore_facts?”, “Summarize persona patterns”), and generates code and visualizations.

### What you need (in scope)

1. **Data export:** From current file-based storage: export `data/npcs.json` (or a CSV/JSON derived from it) so Sphinx can load it — e.g. a simple `GET /api/export/npcs` that returns the NPC list, or a script that writes a file.
2. **Sphinx:** Use Sphinx in Cursor (or VS Code) in a Jupyter notebook; load the exported file and ask Sphinx to reason over it.
3. **Submission:** The notebook + a short description of the insight and how Sphinx helped.

### Effort

- **~0.5 day** for an export endpoint or script; **1–2 hours** in a notebook with Sphinx. No auth or database required.

---

## 4. Small Databricks inclusion (raffle)

### What the raffle wants

- Use Databricks for **any** track; submit a **short video** showing how you used it. It’s a raffle, not judged on depth.

### Minimal way (in scope)

1. **Sign up:** Databricks free tier / trial.
2. **Export from current app:** Use your file-based NPC data — e.g. export `npcs.json` or a CSV (via an export endpoint or manual copy).
3. **Notebook:** Create a Databricks notebook that loads the exported file (e.g. upload `npcs.json` or CSV), runs a few cells (e.g. “number of NPCs per role,” simple plot). Use Databricks Assistant to generate the code if you like.
4. **Video:** 1–2 minutes showing the notebook and the result. No auth or database in the main app required.

### Effort

- **~2–4 hours:** account, notebook, export, video.

---

## 5. Figma Make – how easy/difficult

### What the track wants

- Build an **interactive data visualization** in Figma Make from a dataset; dataset under 5MB; clear insight, product-like viz.

### What you’d do (in scope)

- **Export from current app:** Add an export (e.g. `GET /api/export/npcs-stats` or a CSV/JSON download) from your existing `npcs.json` (e.g. NPC name, role, persona summary, capabilities). No user data or DB needed.
- **Figma Make:** In [Figma Make](https://figma.com/make), create a viz from that dataset (e.g. NPC roster by role, or a simple dashboard). Record a 1-minute demos video.

### Ease / difficulty

- **Backend:** Easy — one export endpoint or static export from `npcs.json`.
- **Design:** Medium — prompting and iterating in Figma Make (~1–3 hours).

### Effort

- **~0.5 day** export + **2–4 hours** Figma + video.

---

## Suggested order (within current scope)


| Priority | Item                                                         | Why                                                                           |
| -------- | ------------------------------------------------------------ | ----------------------------------------------------------------------------- |
| 1        | **Actian VectorAI** (RAG over lore/persona from `npcs.json`) | Clear hackathon integration; improves NPC quality; uses only file-based data. |
| 2        | **Export API** for NPCs (e.g. `/api/export/npcs` or CSV)     | Unblocks Sphinx, Databricks, and Figma Make with no auth or DB.               |
| 3        | **Databricks raffle**                                        | Notebook + export + short video; minimal, separate.                           |
| 4        | **Sphinx**                                                   | Export + one notebook in Cursor; good for “unique use” narrative.             |
| 5        | **Figma Make**                                               | Export + Figma Make file + 1-min video; independent of backend.               |


**Optional (still in scope):** If you want conversation logging for analytics/export only, add a simple file (e.g. `data/conversation_log.json`) and append turns in the chat route — no user accounts, no database. That can later feed Sphinx/Databricks/Figma if you export it.

**Out of scope for Part 1:** Auth, login page, and any database (users, NPCs, conversations). If you later expand scope, you can revisit section 1 as a reference for what that would involve.