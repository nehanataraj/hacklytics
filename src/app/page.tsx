import { listNPCs } from "@/lib/storage";
import NpcList from "@/components/NpcList";
import type { NPC } from "@/lib/schema";

export default async function HomePage() {
  let npcs: NPC[] = [];
  try {
    npcs = await listNPCs();
  } catch (error) {
    console.error("Failed to load NPCs:", error);
    npcs = [];
  }
  return <NpcList npcs={npcs} />;
}
