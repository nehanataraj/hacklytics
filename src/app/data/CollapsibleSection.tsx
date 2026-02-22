"use client";

import { useState } from "react";

type Props = {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
};

export function CollapsibleSection({ title, children, defaultOpen = true }: Props) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <section className="rounded-lg border border-gray-800 bg-gray-900/30 overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full px-4 py-3 flex items-center justify-between gap-2 text-left hover:bg-gray-800/50 transition-colors"
      >
        <h2 className="text-lg font-semibold text-white">{title}</h2>
        <span className="text-gray-400 shrink-0" aria-hidden>
          {open ? "▼" : "▶"}
        </span>
      </button>
      {open && <div className="border-t border-gray-800">{children}</div>}
    </section>
  );
}
