// Garage paints. Index 0 is each vehicle's own colour; the rest are earned on journeys.
export const PAINTS = {
  rover: ["#C7AB78", "#5F6E52", "#9A4A35", "#E5E0D2", "#384A5A", "#B98A3A", "#6FA0C8"],
  mule: ["#4F8C88", "#C9643B", "#3F5E8C", "#D8B24A", "#7A8F5A", "#C9C1B0"],
};
export const PAINT_NAMES = {
  rover: ["Sand", "Dawn", "Ember", "Chalk", "Slate", "Harvest", "Poppy"],
  mule: ["Teal", "Monsoon", "Harbour", "Saffron", "Moss", "Linen"],
};
/** reward id → [vehicle, paint index] */
const PAINT_REWARDS: Record<string, ["rover" | "mule", number]> = {
  "rover-paint-dawn": ["rover", 1], "rover-paint-ember": ["rover", 2], "rover-paint-poppy": ["rover", 6],
  "mule-paint-monsoon": ["mule", 1], "mule-paint-harbour": ["mule", 2],
};

/** Which paint indices a player owns for a vehicle. */
export function ownedPaints(v: "rover" | "mule", rewards: string[]) {
  const owned = new Set([0]);
  for (const r of rewards) { const p = PAINT_REWARDS[r]; if (p && p[0] === v) owned.add(p[1]); }
  return owned;
}

/** Plain words for a reward, for the end screen. */
export function rewardLine(r: string) {
  const p = PAINT_REWARDS[r];
  if (p) return `${PAINT_NAMES[p[0]][p[1]]}, a paint for the ${p[0] === "rover" ? "Rover" : "Mule"}`;
  if (r === "tortoise") return "the Tortoise, for free roam";
  if (r === "sand-tyres") return "sand tyres, for any vehicle";
  if (r === "loaf") return "the Loaf, for free roam";
  if (r === "sky-kit") return "the Sky Kit for the Mule, in free roam";
  if (r === "snow-tyres") return "snow tyres, for any vehicle";
  if (r === "stamp-passport") return "the stamp passport, in the Journal";
  if (r === "rack-lights") return "rack lights for the Mule";
  if (r === "boat-horn") return "a boat horn for the Rover";
  if (r === "rover-roof-lantern") return "a lantern for the Rover's roof";
  return r;
}
