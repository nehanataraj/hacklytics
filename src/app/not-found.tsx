import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="text-center py-24">
      <p className="text-5xl mb-4">🔍</p>
      <h2 className="text-xl font-semibold text-slate-200 mb-2">Character not found</h2>
      <p className="text-slate-500 text-sm mb-6">This NPC may have been deleted or never existed.</p>
      <Link
        href="/"
        className="inline-flex items-center gap-2 text-sm text-indigo-400 hover:text-indigo-300 transition-colors"
      >
        ← Back to characters
      </Link>
    </div>
  );
}
