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
  const npc = await getNPC(id);
  if (!npc) notFound();
  return <NpcEditor npc={npc} />;
}
