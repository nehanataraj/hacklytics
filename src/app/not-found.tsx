/// <reference types="react" />
import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="text-center py-24 px-4">
      <p className="text-6xl mb-6 opacity-80">🔍</p>
      <h2 className="text-2xl font-bold text-white mb-3">Character not found</h2>
      <p className="text-gray-400 text-base mb-8 max-w-md mx-auto">This NPC may have been deleted or never existed.</p>
      <Link
        href="/"
        className="inline-flex items-center gap-2 text-sm font-medium text-white hover:text-gray-300 border border-gray-700 hover:border-gray-600 px-5 py-2.5 transition-all"
      >
        ← Back to characters
      </Link>
    </div>
  );
}
