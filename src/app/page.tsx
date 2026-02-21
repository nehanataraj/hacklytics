import { listNPCs } from '@/lib/storage';
import NpcList from '@/components/NpcList';

export default function HomePage() {
  const npcs = listNPCs();
  return <NpcList npcs={npcs} />;
}
