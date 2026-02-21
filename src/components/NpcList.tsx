'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import type { NPC } from '@/lib/schema';

// ── Unity Quick Setup panel ─────────────────────────────────────────────────
function UnitySetupPanel() {
  const [open, setOpen]       = useState(false);
  const [path, setPath]       = useState('');
  const [status, setStatus]   = useState<'idle' | 'loading' | 'ok' | 'error'>('idle');
  const [message, setMessage] = useState('');

  async function handleInstall() {
    if (!path.trim()) return;
    setStatus('loading');
    setMessage('');
    try {
      const res  = await fetch('/api/unity/install', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectPath: path.trim() }),
      });
      const body = await res.json();
      if (!res.ok) {
        setStatus('error');
        setMessage(body.error ?? 'Something went wrong.');
      } else {
        setStatus('ok');
        setMessage(body.message);
      }
    } catch {
      setStatus('error');
      setMessage('Could not reach the server.');
    }
  }

  return (
    <div className="mb-8 border border-slate-800 rounded-xl overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-5 py-4 bg-slate-900 hover:bg-slate-800/70 transition-colors text-left"
      >
        <div className="flex items-center gap-2.5">
          <span className="text-blue-400 text-base">🎮</span>
          <span className="text-sm font-semibold text-slate-300">Unity Quick Setup</span>
          <span className="text-xs text-slate-500 font-normal">— install scripts into any Unity project</span>
        </div>
        <svg
          className={`w-4 h-4 text-slate-500 transition-transform duration-150 ${open ? 'rotate-180' : ''}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="bg-slate-950 border-t border-slate-800 p-5 space-y-4">
          {isLocal ? (
            /* ── Local: path installer ── */
            <>
              <p className="text-xs text-slate-400">
                Paste the path to your Unity project root (the folder that contains <code className="text-blue-300">Assets/</code>).
                The server will copy both scripts directly into it.
              </p>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={path}
                  onChange={(e) => { setPath(e.target.value); setStatus('idle'); }}
                  placeholder={`C:\\Users\\you\\Documents\\My Game  or  /Users/you/Documents/My Game`}
                  className="flex-1 bg-slate-900 border border-slate-800 rounded-lg px-4 py-2.5 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono"
                />
                <button
                  type="button"
                  onClick={handleInstall}
                  disabled={!path.trim() || status === 'loading'}
                  className="shrink-0 inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium px-5 py-2.5 rounded-lg transition-colors"
                >
                  {status === 'loading' ? (
                    <>
                      <svg className="animate-spin h-3.5 w-3.5" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                      </svg>
                      Installing…
                    </>
                  ) : 'Install Scripts'}
                </button>
              </div>
            </>
          ) : (
            /* ── Deployed: direct downloads ── */
            <div className="space-y-3">
              <p className="text-xs text-slate-400">
                Download both scripts and drop them into your Unity project&apos;s <code className="text-yellow-300">Assets/Scripts/</code> folder.
              </p>
              <div className="flex flex-col gap-2">
                <a
                  href="https://raw.githubusercontent.com/RSha70/hackalytics/main/unity/Scripts/NpcBrain.cs"
                  target="_blank" rel="noreferrer"
                  className="inline-flex items-center gap-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-sm font-medium px-4 py-2.5 rounded-lg transition-colors"
                >
                  <svg className="w-4 h-4 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  Download NpcBrain.cs
                </a>
                <a
                  href="https://raw.githubusercontent.com/RSha70/hackalytics/main/unity/Scripts/NpcInteractionTrigger.cs"
                  target="_blank" rel="noreferrer"
                  className="inline-flex items-center gap-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-sm font-medium px-4 py-2.5 rounded-lg transition-colors"
                >
                  <svg className="w-4 h-4 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  Download NpcInteractionTrigger.cs
                </a>
              </div>
            </div>
          )}

          {/* Result */}
          {status === 'ok' && (
            <div className="flex items-start gap-2.5 bg-emerald-950/50 border border-emerald-800/50 rounded-lg px-4 py-3">
              <svg className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              <p className="text-sm text-emerald-300">{message}</p>
            </div>
          )}
          {status === 'error' && (
            <div className="flex items-start gap-2.5 bg-red-950/50 border border-red-800/50 rounded-lg px-4 py-3">
              <svg className="w-4 h-4 text-red-400 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-sm text-red-300">{message}</p>
            </div>
          )}

          {/* What happens next */}
          {status === 'ok' && (
            <div className="bg-slate-900 border border-slate-800 rounded-lg p-4 space-y-1.5 text-xs text-slate-400">
              <p className="font-semibold text-slate-300 mb-2">Next steps in Unity:</p>
              <p>1. Switch to Unity — scripts will reimport automatically.</p>
              <p>2. Select your character → <strong className="text-slate-200">Add Component → NpcBrain</strong>.</p>
              <p>3. Open any NPC below → <strong className="text-slate-200">🎮 Unity Integration</strong> → copy its ID.</p>
              <p>4. Paste the ID into <code className="text-yellow-300">npcId</code> and set <code className="text-blue-300">serverUrl</code> to <code className="text-blue-300">http://localhost:3000</code>.</p>
              <p>5. Check <strong className="text-slate-200">Loop Dialogue</strong> and press Play ▶</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function NpcCard({ npc }: { npc: NPC }) {
  return (
    <Link href={`/npc/${npc.id}`} className="block group">
      <div className="h-full bg-slate-900 border border-slate-800 rounded-xl p-5 hover:border-indigo-500/60 hover:bg-slate-800/70 transition-all duration-150">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="font-semibold text-slate-100 text-lg truncate group-hover:text-indigo-300 transition-colors">
              {npc.name}
            </h2>
            <p className="text-indigo-400 text-sm font-medium mt-0.5 truncate">{npc.role}</p>
          </div>
          <svg className="w-4 h-4 text-slate-600 group-hover:text-indigo-400 transition-colors mt-1 shrink-0"
            fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </div>
        {npc.persona?.backstory && (
          <p className="text-slate-400 text-sm mt-3 line-clamp-2 leading-relaxed">
            {npc.persona.backstory}
          </p>
        )}
        <p className="text-slate-600 text-xs mt-4">Updated {formatDate(npc.updatedAt)}</p>
      </div>
    </Link>
  );
}

function highlight(text: string, query: string): React.ReactNode {
  if (!query) return text;
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return text;
  return (
    <>
      {text.slice(0, idx)}
      <mark className="bg-indigo-500/30 text-indigo-200 rounded px-0.5">
        {text.slice(idx, idx + query.length)}
      </mark>
      {text.slice(idx + query.length)}
    </>
  );
}

function NpcSearchCard({ npc, query }: { npc: NPC; query: string }) {
  return (
    <Link href={`/npc/${npc.id}`} className="block group">
      <div className="h-full bg-slate-900 border border-slate-800 rounded-xl p-5 hover:border-indigo-500/60 hover:bg-slate-800/70 transition-all duration-150">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="font-semibold text-slate-100 text-lg truncate group-hover:text-indigo-300 transition-colors">
              {highlight(npc.name, query)}
            </h2>
            <p className="text-indigo-400 text-sm font-medium mt-0.5 truncate">
              {highlight(npc.role, query)}
            </p>
          </div>
          <svg className="w-4 h-4 text-slate-600 group-hover:text-indigo-400 transition-colors mt-1 shrink-0"
            fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </div>
        {npc.persona?.backstory && (
          <p className="text-slate-400 text-sm mt-3 line-clamp-2 leading-relaxed">
            {npc.persona.backstory}
          </p>
        )}
        <p className="text-slate-600 text-xs mt-4">Updated {formatDate(npc.updatedAt)}</p>
      </div>
    </Link>
  );
}

export default function NpcList({ npcs }: { npcs: NPC[] }) {
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return npcs;
    return npcs.filter(
      (n) =>
        n.name.toLowerCase().includes(q) ||
        n.role.toLowerCase().includes(q),
    );
  }, [npcs, query]);

  const isFiltering = query.trim().length > 0;

  return (
    <>
      <UnitySetupPanel />

      {/* Header row */}
      <div className="flex items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Characters</h1>
          <p className="text-slate-400 text-sm mt-1">
            {npcs.length === 0
              ? 'No NPCs yet — create your first one'
              : isFiltering
              ? `${filtered.length} of ${npcs.length} NPC${npcs.length !== 1 ? 's' : ''}`
              : `${npcs.length} NPC${npcs.length !== 1 ? 's' : ''}`}
          </p>
        </div>
        <Link
          href="/npc/new"
          className="shrink-0 inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
        >
          <span className="text-base leading-none">+</span>
          New NPC
        </Link>
      </div>

      {/* Search — only shown when there are NPCs */}
      {npcs.length > 0 && (
        <div className="relative mb-6">
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none"
            fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 115 11a6 6 0 0112 0z" />
          </svg>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name or role…"
            className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-colors"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors text-xs"
              aria-label="Clear search"
            >
              ✕
            </button>
          )}
        </div>
      )}

      {/* Empty state */}
      {npcs.length === 0 && (
        <div className="text-center py-24 border border-dashed border-slate-800 rounded-2xl">
          <p className="text-5xl mb-4">🧙</p>
          <p className="text-slate-400 text-lg font-medium mb-2">No characters yet</p>
          <p className="text-slate-600 text-sm mb-6">Build your cast by creating your first NPC.</p>
          <Link
            href="/npc/new"
            className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium px-5 py-2.5 rounded-lg transition-colors"
          >
            <span className="text-base leading-none">+</span>
            Create First NPC
          </Link>
        </div>
      )}

      {/* No search results */}
      {npcs.length > 0 && filtered.length === 0 && (
        <div className="text-center py-16 border border-dashed border-slate-800 rounded-2xl">
          <p className="text-3xl mb-3">🔍</p>
          <p className="text-slate-400 font-medium mb-1">No matches for &ldquo;{query}&rdquo;</p>
          <button
            type="button"
            onClick={() => setQuery('')}
            className="text-sm text-indigo-400 hover:text-indigo-300 transition-colors mt-2"
          >
            Clear search
          </button>
        </div>
      )}

      {/* Grid */}
      {filtered.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((npc) =>
            isFiltering ? (
              <NpcSearchCard key={npc.id} npc={npc} query={query.trim()} />
            ) : (
              <NpcCard key={npc.id} npc={npc} />
            ),
          )}
        </div>
      )}
    </>
  );
}
