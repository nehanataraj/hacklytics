'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import type { NPC } from '@/lib/schema';

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
