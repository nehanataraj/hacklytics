import { notFound } from 'next/navigation';
import { getNPC } from '@/lib/storage';
import NpcEditor from '@/components/NpcEditor';

export const dynamic = 'force-dynamic';

export default async function NpcPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  let npc = await getNPC(id);
  if (!npc) {
    await new Promise((r) => setTimeout(r, 1500));
    npc = await getNPC(id);
  }
  if (!npc) notFound();
  return <NpcEditor npc={npc} />;
}
