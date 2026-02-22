'use client';

import { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import type { NPC } from '@/lib/schema';

// ── Unity Quick Setup panel ─────────────────────────────────────────────────
function UnitySetupPanel() {
  const [open, setOpen]       = useState(false);
  const [path, setPath]       = useState('');
  const [status, setStatus]   = useState<'idle' | 'loading' | 'ok' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const [isLocal, setIsLocal] = useState(false);
  useEffect(() => { setIsLocal(window.location.hostname === 'localhost'); }, []);

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
    <div className="mb-8 border border-gray-800 overflow-hidden shadow-sm">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-5 py-4 bg-black hover:bg-gray-900 transition-colors text-left"
      >
        <div className="flex items-center gap-2.5">
          <span className="text-white text-base">🎮</span>
          <span className="text-sm font-semibold text-gray-300">Unity Quick Setup</span>
          <span className="text-xs text-gray-500 font-normal">— install scripts into any Unity project</span>
        </div>
        <svg
          className={`w-4 h-4 text-gray-500 transition-transform duration-150 ${open ? 'rotate-180' : ''}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="bg-black border-t border-gray-800 p-5 space-y-4">
          {isLocal ? (
            /* ── Local: path installer ── */
            <>
              <p className="text-xs text-gray-400">
                Paste the path to your Unity project root (the folder that contains <code className="text-gray-300">Assets/</code>).
                The server will copy both scripts directly into it.
              </p>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={path}
                  onChange={(e) => { setPath(e.target.value); setStatus('idle'); }}
                  placeholder={`C:\\Users\\you\\Documents\\My Game  or  /Users/you/Documents/My Game`}
                  className="flex-1 bg-black border border-gray-800 px-4 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-white focus:border-transparent font-mono"
                />
                <button
                  type="button"
                  onClick={handleInstall}
                  disabled={!path.trim() || status === 'loading'}
                  className="shrink-0 inline-flex items-center gap-2 bg-white hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed text-black text-sm font-medium px-5 py-2.5 transition-colors"
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
              <p className="text-xs text-gray-400">
                Download both scripts and drop them into your Unity project&apos;s <code className="text-gray-300">Assets/Scripts/</code> folder.
              </p>
              <div className="flex flex-col gap-2">
                <a
                  href="https://raw.githubusercontent.com/RSha70/hackalytics/main/unity/Scripts/NpcBrain.cs"
                  target="_blank" rel="noreferrer"
                  className="inline-flex items-center gap-2 bg-black hover:bg-gray-900 border border-gray-700 text-white text-sm font-medium px-4 py-2.5 transition-colors"
                >
                  <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  Download NpcBrain.cs
                </a>
                <a
                  href="https://raw.githubusercontent.com/RSha70/hackalytics/main/unity/Scripts/NpcInteractionTrigger.cs"
                  target="_blank" rel="noreferrer"
                  className="inline-flex items-center gap-2 bg-black hover:bg-gray-900 border border-gray-700 text-white text-sm font-medium px-4 py-2.5 transition-colors"
                >
                  <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  Download NpcInteractionTrigger.cs
                </a>
              </div>
            </div>
          )}

          {/* Result */}
          {status === 'ok' && (
            <div className="flex items-start gap-2.5 bg-gray-900 border border-gray-700 px-4 py-3">
              <svg className="w-4 h-4 text-white mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              <p className="text-sm text-white">{message}</p>
            </div>
          )}
          {status === 'error' && (
            <div className="flex items-start gap-2.5 bg-gray-900 border border-gray-700 px-4 py-3">
              <svg className="w-4 h-4 text-white mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-sm text-white">{message}</p>
            </div>
          )}

          {/* What happens next */}
          {status === 'ok' && (
            <div className="bg-black border border-gray-800 p-4 space-y-1.5 text-xs text-gray-400">
              <p className="font-semibold text-gray-300 mb-2">Next steps in Unity:</p>
              <p>1. Switch to Unity — scripts will reimport automatically.</p>
              <p>2. Select your character → <strong className="text-white">Add Component → NpcBrain</strong>.</p>
              <p>3. Open any NPC below → <strong className="text-white">🎮 Unity Integration</strong> → copy its ID.</p>
              <p>4. Paste the ID into <code className="text-gray-300">npcId</code> and set <code className="text-gray-300">serverUrl</code> to <code className="text-gray-300">http://localhost:3000</code>.</p>
              <p>5. Check <strong className="text-white">Loop Dialogue</strong> and press Play ▶</p>
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
      <div className="flex items-center gap-4 bg-black border border-gray-800 px-5 py-4 hover:border-gray-600 hover:bg-gray-900 transition-all duration-200">
        
        {/* Left: Name + Role */}
        <div className="min-w-[180px]">
          <h2 className="font-semibold text-white truncate">
            {npc.name}
          </h2>
          <p className="text-gray-400 text-sm truncate">{npc.role}</p>
        </div>

        {/* Middle: Backstory */}
        {npc.persona?.backstory && (
          <p className="text-gray-400 text-sm line-clamp-1 flex-1">
            {npc.persona.backstory}
          </p>
        )}

        {/* Right: Date + arrow */}
        <div className="flex items-center gap-3 shrink-0">
          <span className="text-gray-500 text-xs whitespace-nowrap">
            {formatDate(npc.updatedAt)}
          </span>
          <svg
            className="w-4 h-4 text-gray-500 group-hover:text-gray-300 transition-colors"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </div>
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
      <mark className="bg-gray-600 text-white rounded px-0.5">
        {text.slice(idx, idx + query.length)}
      </mark>
      {text.slice(idx + query.length)}
    </>
  );
}

function NpcSearchCard({ npc, query }: { npc: NPC; query: string }) {
  return (
    <Link href={`/npc/${npc.id}`} className="block group">
      <div className="flex items-center gap-4 bg-black border border-gray-800 px-5 py-4 hover:border-gray-600 hover:bg-gray-900 transition-all duration-200">

        <div className="min-w-[180px]">
          <h2 className="font-semibold text-white truncate">
            {highlight(npc.name, query)}
          </h2>
          <p className="text-gray-400 text-sm truncate">
            {highlight(npc.role, query)}
          </p>
        </div>

        {npc.persona?.backstory && (
          <p className="text-gray-400 text-sm line-clamp-1 flex-1">
            {npc.persona.backstory}
          </p>
        )}

        <div className="flex items-center gap-3 shrink-0">
          <span className="text-gray-500 text-xs whitespace-nowrap">
            {formatDate(npc.updatedAt)}
          </span>
          <svg
            className="w-4 h-4 text-gray-500 group-hover:text-gray-300 transition-colors"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </div>
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
      {/* Title: playable.exe + tagline */}
      <section className="flex flex-col items-center justify-center py-12 md:py-16 mb-10">
        <div className="flex items-center gap-3">
          <span className="text-white text-4xl md:text-5xl drop-shadow-[0_0_12px_rgba(255,255,255,0.5)]" aria-hidden>⚔</span>
          <h2 className="flex items-baseline font-mono text-3xl md:text-4xl tracking-tight">
            <span className="text-amber-400/95 border-b border-amber-400/40 pb-0.5 drop-shadow-[0_0_8px_rgba(251,191,36,0.3)]">playable</span>
            <span className="text-gray-500 ml-0.5">.exe</span>
          </h2>
        </div>
        <p className="text-gray-500 text-sm mt-3 font-mono tracking-wide">
          NPC · MEMORY · EMOTION · LOOP
        </p>
      </section>

      {/* Hero: Description (left) + Video player (right, larger) */}
      <section className="grid grid-cols-1 md:grid-cols-[1fr_1.5fr] gap-6 md:gap-8 mb-10">
        <div className="min-h-[200px] md:min-h-[280px] p-6 flex flex-col justify-center">
          <p className="text-gray-400 text-sm leading-relaxed">
            NPC Studio helps you design game characters in one place—backstory, goals, and voice—then connects them to Unity. Create characters, get a unique ID, and paste it into your game so they come to life with consistent, in-character dialogue.
          </p>
          <p className="text-gray-400 text-sm leading-relaxed mt-3">
            You define who each character is, what they want, and what they are allowed to do. The app generates dialogue that stays in character and supports gestures and actions in your game. Once you save a character, paste their ID into your Unity project and they are ready to use. Great for indie games, prototypes, and any project where you want smart, personality-driven NPCs without the heavy lifting.
          </p>
        </div>
        <div className="min-h-[200px] md:min-h-[280px] aspect-video bg-black border border-gray-800 flex items-center justify-center">
          <p className="text-gray-500 text-sm">Video demonstration</p>
        </div>
      </section>

      <UnitySetupPanel />

      {/* Header row */}
      <div className="flex items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Characters</h1>
          <p className="text-gray-400 text-sm mt-1">
            {npcs.length === 0
              ? 'No NPCs yet — create your first one'
              : isFiltering
              ? `${filtered.length} of ${npcs.length} NPC${npcs.length !== 1 ? 's' : ''}`
              : `${npcs.length} NPC${npcs.length !== 1 ? 's' : ''}`}
          </p>
        </div>
        <Link
          href="/npc/new"
          className="shrink-0 inline-flex items-center gap-2 bg-white hover:bg-gray-200 text-black text-sm font-medium px-5 py-2.5 transition-colors"
        >
          <span className="text-base leading-none">+</span>
          New NPC
        </Link>
      </div>

      {/* Search — only shown when there are NPCs */}
      {npcs.length > 0 && (
        <div className="relative mb-6">
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none"
            fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 115 11a6 6 0 0112 0z" />
          </svg>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name or role…"
            className="w-full bg-black border border-gray-800 pl-10 pr-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-white focus:border-gray-600 transition-colors"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors text-xs"
              aria-label="Clear search"
            >
              ✕
            </button>
          )}
        </div>
      )}

      {/* Empty state */}
      {npcs.length === 0 && (
        <div className="text-center py-24 border border-dashed border-gray-700 bg-black">
          <p className="text-6xl mb-5 opacity-90">🧙</p>
          <p className="text-gray-400 text-lg font-medium mb-2">No characters yet</p>
          <p className="text-gray-500 text-sm mb-6">Build your cast by creating your first NPC.</p>
          <Link
            href="/npc/new"
            className="inline-flex items-center gap-2 bg-white hover:bg-gray-200 text-black text-sm font-medium px-5 py-2.5 transition-colors"
          >
            <span className="text-base leading-none">+</span>
            Create First NPC
          </Link>
        </div>
      )}

      {/* No search results */}
      {npcs.length > 0 && filtered.length === 0 && (
        <div className="text-center py-16 border border-dashed border-gray-700 bg-black">
          <p className="text-3xl mb-3">🔍</p>
          <p className="text-gray-400 font-medium mb-1">No matches for &ldquo;{query}&rdquo;</p>
          <button
            type="button"
            onClick={() => setQuery('')}
            className="text-sm text-gray-400 hover:text-white transition-colors mt-2"
          >
            Clear search
          </button>
        </div>
      )}

      {/* Horizontal strips */}
      {filtered.length > 0 && (
        <div className="divide-y divide-gray-800 border border-gray-800">
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
