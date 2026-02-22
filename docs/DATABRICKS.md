# Databricks API setup

NPC Studio can **fetch data directly from Databricks** using the [SQL Statement Execution API](https://docs.databricks.com/api/workspace/statementexecution). The data page shows a **From Databricks** section when configured, and you can also call the API route to run queries.

**Quick checklist:** Get workspace URL → Create PAT → Get SQL warehouse ID → Set env vars (including `DATABRICKS_SYNC_TABLE` and `DATABRICKS_NPC_QUERY`) → Restart app → Add an NPC (syncs to Databricks) → Open `/data` (graphs use Databricks).

**Auto-sync:** When `DATABRICKS_SYNC_TABLE` is set (e.g. `main.default.npcs`), every **create**, **update**, or **delete** of an NPC in the app pushes the full roster to that table. The NPC Studio Data page then uses that table (via `DATABRICKS_NPC_QUERY`) to drive the summary, role distribution, and per-NPC table — so graphs stay in sync with Databricks.

---

## Quick start: create table + sync graphs

1. **Copy env template:** `cp .env.example .env.local`
2. **In `.env.local`**, set only these (table and query are already in `.env.example`):
   - `DATABRICKS_HOST` — your workspace URL (e.g. `https://xxx.cloud.databricks.com`)
   - `DATABRICKS_ACCESS_TOKEN` — PAT from Databricks (Settings → Developer → Access tokens)
   - `DATABRICKS_WAREHOUSE_ID` — from SQL → your warehouse → HTTP path / ID
   - Keep `DATABRICKS_SYNC_TABLE=main.default.npcs` and `DATABRICKS_NPC_QUERY=SELECT * FROM main.default.npcs`
3. **Restart the app:** `npm run dev`
4. **Trigger first sync:** Add or edit any NPC and save. The app creates `main.default.npcs` in Databricks and writes all NPCs.
5. **Open** [http://localhost:3000/data](http://localhost:3000/data) — graphs and table use the synced Databricks data.

No manual table creation needed; the app creates the table on first sync.

---

## Integration breakdown (step-by-step)

### Step 1: Get your Databricks workspace URL

1. Log in to [Databricks](https://databricks.com) and open your workspace.
2. Look at the browser address bar. The URL is something like:
   - `https://abc-123456789-0a1b.cloud.databricks.com` (AWS)
   - `https://adb-xxxxx.12.azuredatabricks.net` (Azure)
3. **Copy that URL** — no path, no trailing slash. This is `DATABRICKS_HOST`.

---

### Step 2: Create a personal access token (PAT)

1. In Databricks, click your **username** (bottom-left) or open **Settings** (gear icon).
2. Go to **Developer** → **Access tokens** (or **User Settings** → **Access tokens**).
3. Click **Generate new token**.
4. Give it a name (e.g. `NPC Studio`), leave expiration as you prefer, and generate.
5. **Copy the token immediately** (it’s shown only once). This is `DATABRICKS_ACCESS_TOKEN`.

---

### Step 3: Get your SQL warehouse ID

1. In the left sidebar, open **SQL** (or **Compute** → **SQL Warehouses**).
2. Click your **SQL warehouse** (or create one: **Create SQL warehouse**).
3. In the warehouse details you’ll see:
   - **Server hostname** (you already have the full host from Step 1), and
   - **HTTP path** or **Warehouse ID** — e.g. `sql/protocolv1/o/123456789/abc-def-123`.
4. The **warehouse ID** is often the last segment of the HTTP path (e.g. `abc-def-123`) or a hex string. Copy it. This is `DATABRICKS_WAREHOUSE_ID`.

   *If you only see “HTTP path”: use the full path in some setups, or copy the ID from the warehouse URL when you open it.*

---

### Step 4: Table for sync and query

If you use **auto-sync** (recommended), the app will **create the table for you** on first sync. Use the same table for both sync and query.

- Set `DATABRICKS_SYNC_TABLE=main.default.npcs` (or `your_catalog.your_schema.npcs`). When you add or edit an NPC, the app runs `CREATE TABLE IF NOT EXISTS ...`, then `DELETE` + `INSERT` for each row. No manual table creation needed.
- Set `DATABRICKS_NPC_QUERY=SELECT * FROM main.default.npcs` (same table). The NPC Studio Data page uses this query to drive the graphs.

If you prefer **not** to use sync and only want to read from an existing table:

**Option A — Upload CSV and create a table (good for NPC export):**

1. Export NPCs from NPC Studio: open `http://localhost:3000/api/export/npcs?format=csv` in the browser and **Save as** `npcs.csv`.
2. In Databricks, go to **Data** (or **Catalog**) → choose a **catalog** and **schema** (or create one).
3. **Create** → **Table** → **Upload file** (or use **Create table from file**). Upload `npcs.csv`.
4. Name the table (e.g. `npcs`) and create it. Note the full name: `catalog.schema.npcs` (e.g. `main.default.npcs`).

**Option B — Create a table from a notebook (if you already have data in a notebook):**

1. In a Databricks notebook, load your data (e.g. from a file you uploaded to the workspace).
2. Run something like:
   ```python
   df = spark.read.option("header", "true").csv("/path/to/npcs.csv")
   df.write.saveAsTable("main.default.npcs")
   ```
3. Your table name is e.g. `main.default.npcs`.

**Option C — Test without NPC data (quick check):**

- You can skip real data and use a simple query that always returns rows, e.g. `SELECT 1 AS id, 'hello' AS message`. That’s enough to verify the API and the “From Databricks” section.

---

### Step 5: Set environment variables in NPC Studio

1. In your NPC Studio project (e.g. `hacklytics`), create or edit **`.env.local`** in the project root (same level as `package.json`).
2. Add (replace with your real values):

```bash
DATABRICKS_HOST=https://your-workspace.cloud.databricks.com
DATABRICKS_ACCESS_TOKEN=dapi1234567890abcdef...
DATABRICKS_WAREHOUSE_ID=your-warehouse-id
# Table the app writes to on every NPC create/update/delete (use catalog.schema.table)
DATABRICKS_SYNC_TABLE=main.default.npcs
# Query used by the NPC Studio Data page for graphs (use the same table)
DATABRICKS_NPC_QUERY=SELECT * FROM main.default.npcs
```

- Use your **exact** workspace URL, token, and warehouse ID from Steps 1–3.
- **DATABRICKS_SYNC_TABLE**: The app will create this table if it doesn’t exist and overwrite it on every sync. Use a dedicated table (e.g. `main.default.npcs`).
- **DATABRICKS_NPC_QUERY**: Set to `SELECT * FROM <same table as DATABRICKS_SYNC_TABLE>`. The Data page uses this to show summary, role distribution, and per-NPC table from Databricks.

3. **Save the file.** Do **not** commit `.env.local` to git (it should be in `.gitignore`).

---

### Step 6: Restart the app and verify

1. Stop the Next.js dev server (Ctrl+C) and start it again: `npm run dev`.
2. **Trigger a sync:** Add a new NPC (or edit one) from the main app. The app will push the full roster to `DATABRICKS_SYNC_TABLE`.
3. Open **http://localhost:3000/data**.
4. You should see:
   - A green note: **“Graphs and table below: Databricks (synced when you add or edit NPCs)”** when the query returns the synced table.
   - Summary cards, role distribution, and per-NPC table built from Databricks data.
5. If you see **“Set DATABRICKS_HOST…”** → env vars are missing or the app wasn’t restarted.
6. If the table is empty → add or edit an NPC first so the app runs a sync.

---

### Step 7: (Optional) Run a custom query from code

- **GET** `http://localhost:3000/api/databricks/query` runs the default `DATABRICKS_NPC_QUERY` and returns `{ rows }`.
- **POST** `http://localhost:3000/api/databricks/query` with body `{ "statement": "SELECT role, COUNT(*) AS n FROM main.default.npcs GROUP BY role" }` runs that SQL and returns `{ rows }`. Use this from scripts or other apps to fetch Databricks data.

---

## 1. Get credentials and warehouse ID (reference)

1. **Workspace URL**  
   In Databricks: open your workspace URL (e.g. `https://adb-xxxx.azuredatabricks.com` or `https://xxx.cloud.databricks.com`). That is `DATABRICKS_HOST`.

2. **Personal access token (PAT)**  
   In Databricks: **Settings → Developer → Access tokens**. Create a token and copy it. That is `DATABRICKS_ACCESS_TOKEN`.

3. **SQL warehouse ID**  
   In Databricks: **SQL Warehouses** (or **Compute → SQL Warehouses**). Open your warehouse; the **HTTP path** or **ID** is the warehouse id (e.g. `abc123def456`). That is `DATABRICKS_WAREHOUSE_ID`.

## 2. Create a table or view (optional)

To show NPC data from Databricks, you need a query that returns rows. For example:

- Upload your NPC export (from `GET /api/export/npcs?format=csv`) as a table, e.g. `npc_studio.npcs`.
- Or create a view that summarizes metrics, e.g.:

```sql
CREATE OR REPLACE VIEW npc_summary AS
SELECT
  role,
  COUNT(*) AS npc_count,
  SUM(lore_facts_count) AS total_lore
FROM npc_studio.npcs
GROUP BY role;
```

Then set `DATABRICKS_NPC_QUERY` to e.g. `SELECT * FROM npc_summary` or `SELECT * FROM npc_studio.npcs LIMIT 100`.

## 3. Environment variables

Add to `.env.local` (never commit this file):

```bash
# Databricks SQL Statement Execution API
DATABRICKS_HOST=https://your-workspace.cloud.databricks.com
DATABRICKS_ACCESS_TOKEN=dapi...
DATABRICKS_WAREHOUSE_ID=your-warehouse-id

# SQL statement to run for the "From Databricks" section and GET /api/databricks/query
DATABRICKS_NPC_QUERY=SELECT * FROM your_catalog.your_schema.your_table LIMIT 100
```

Restart the Next.js dev server after changing env.

## 4. Where it’s used

- **NPC Studio Data page** (`/data`)  
  If all four env vars are set, the page runs `DATABRICKS_NPC_QUERY` and shows the result in a **From Databricks** table.

- **API route**  
  - `GET /api/databricks/query` — runs `DATABRICKS_NPC_QUERY` and returns `{ rows: [...] }`.
  - `POST /api/databricks/query` — body: `{ "statement": "SELECT ..." }`. Runs that statement and returns `{ rows: [...] }`. Useful for ad‑hoc queries from your own code.

## 5. Troubleshooting

- **`fetch failed` / `getaddrinfo ENOTFOUND your-workspace.cloud.databricks.com`**  
  You still have the **placeholder** host in `.env.local`. Replace `DATABRICKS_HOST` with your **real** workspace URL from the browser (e.g. `https://adb-xxxxx.12.azuredatabricks.net` or `https://xxx-123456789.cloud.databricks.com`). The value must start with `https://`.

- **502 or “query failed”**  
  Check server logs. Verify host (no trailing slash), token, and warehouse ID. Ensure the SQL warehouse is running and the token has permission to use it.

- **No “From Databricks” section**  
  Ensure all four env vars are set and the app was restarted.

- **Empty or wrong columns**  
  The table is built from the query result; column names come from Databricks. Adjust `DATABRICKS_NPC_QUERY` to return the columns you want.
