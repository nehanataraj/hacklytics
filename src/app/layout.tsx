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
      <body className="min-h-screen bg-black text-white antialiased selection:bg-white/30">
        <nav className="border-b border-gray-800 bg-black/90 backdrop-blur-md sticky top-0 z-10 shadow-lg shadow-black/20">
          <div className="max-w-5xl mx-auto px-4 h-16 flex items-center gap-3">
            <a href="/" className="flex items-center gap-2.5 hover:opacity-90 transition-opacity group">
              <span className="text-white text-2xl group-hover:scale-105 transition-transform">⚔</span>
              <span className="font-bold text-lg tracking-tight text-white">NPC Studio</span>
            </a>
          </div>
        </nav>
        <main className="max-w-5xl mx-auto px-4 py-10">{children}</main>
      </body>
    </html>
  );
}
