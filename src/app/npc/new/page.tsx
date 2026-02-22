'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import NpcForm, { type NpcFormData, type NpcFormHandle } from '@/components/NpcForm';
import { Toast, useToast } from '@/components/Toast';

export default function NewNpcPage() {
  const router = useRouter();
  const [isSaving, setIsSaving] = useState(false);
  const { toast, show: showToast, dismiss } = useToast();
  const formRef = useRef<NpcFormHandle>(null);

  async function handleSave(data: NpcFormData) {
    setIsSaving(true);
    try {
      const res = await fetch('/api/npcs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const body = await res.json();
      if (!res.ok) {
        if (body?.fields) {
          formRef.current?.setErrors(body.fields);
          showToast('Please fix the highlighted fields.', 'error');
        } else {
          const detail = body?.detail ? `: ${body.detail}` : '';
          showToast((body?.error ?? 'Failed to create NPC.') + detail, 'error');
        }
        return;
      }
      window.location.href = `/npc/${body.id}`;
    } catch {
      showToast('Network error — NPC not created.', 'error');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <>
      <div className="flex items-center gap-3 mb-8">
        <Link href="/"
          className="text-gray-400 hover:text-slate-200 text-sm flex items-center gap-1.5 transition-colors font-medium">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Characters
        </Link>
        <span className="text-gray-600">/</span>
        <span className="text-gray-400 text-sm">New NPC</span>
      </div>

      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white tracking-tight">New Character</h1>
        <p className="text-gray-400 text-sm mt-1.5">
          Define your NPC&apos;s identity and personality.
        </p>
      </div>

      <NpcForm ref={formRef} onSave={handleSave} isSaving={isSaving} />

      <Toast toast={toast} onDismiss={dismiss} />
    </>
  );
}
