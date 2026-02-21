import { listNPCs } from "@/lib/storage";
import NpcList from "@/components/NpcList";

export default async function HomePage() {
  let npcs = [];
  try {
    npcs = await listNPCs();
  } catch (error) {
    console.error("Failed to load NPCs:", error);
    npcs = [];
  }
  return <NpcList npcs={npcs} />;
}
