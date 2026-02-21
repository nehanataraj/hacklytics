import { listNPCs } from '@/lib/storage';
import NpcList from '@/components/NpcList';

export default async function HomePage() {
  const npcs = await listNPCs();
  return <NpcList npcs={npcs} />;
}
