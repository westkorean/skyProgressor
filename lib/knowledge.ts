import foraging from "@/knowledge/foraging.json";
import mining from "@/knowledge/mining.json";
import combat from "@/knowledge/combat.json";
import farming from "@/knowledge/farming.json";
import dungeons from "@/knowledge/dungeons.json";
import slayers from "@/knowledge/slayers.json";

export const knowledgeBase = [
  ...foraging,
  ...mining,
  ...combat,
  ...farming,
  ...dungeons,
  ...slayers
];