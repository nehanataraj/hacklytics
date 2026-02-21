import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'NPC Studio',
  description: 'Create and manage NPCs for your story or game',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-950 text-slate-100 antialiased">
        <nav className="border-b border-slate-800 bg-slate-900/80 backdrop-blur-sm sticky top-0 z-10">
          <div className="max-w-5xl mx-auto px-4 h-14 flex items-center gap-2">
            <a href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
              <span className="text-indigo-400 text-xl">⚔</span>
              <span className="font-bold text-lg tracking-tight text-slate-100">NPC Studio</span>
            </a>
          </div>
        </nav>
        <main className="max-w-5xl mx-auto px-4 py-8">{children}</main>
      </body>
    </html>
  );
}
