import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Playable.exe',
  description: 'Using AI to make characters more human',
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
            <a href="/" className="flex items-center hover:opacity-90 transition-opacity">
              <img src="/logo.png" alt="Playable.exe" className="h-12" />
            </a>
          </div>
        </nav>
        <main className="max-w-5xl mx-auto px-4 py-10">{children}</main>
      </body>
    </html>
  );
}
