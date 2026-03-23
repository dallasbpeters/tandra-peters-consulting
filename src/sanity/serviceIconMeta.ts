/**
 * Curated Iconoir icons for service cards — single source for Sanity `list` + frontend map.
 * Keep keys aligned with `src/icons/serviceIconMap.tsx`.
 */
export const SERVICE_ICON_OPTIONS = [
  { value: "search", title: "Search — inspection, assessment" },
  { value: "page", title: "Page — documents, insurance forms" },
  { value: "shieldCheck", title: "Shield check — protection, warranty" },
  { value: "hammer", title: "Hammer — construction, repair" },
  { value: "wrench", title: "Wrench — maintenance, service" },
  { value: "ruler", title: "Ruler — measurement, precision" },
  { value: "truck", title: "Truck — delivery, on-site" },
  { value: "umbrella", title: "Umbrella — coverage, weather" },
  { value: "home", title: "Home — residential" },
  { value: "homeUser", title: "Home user — residential, family" },
  { value: "eye", title: "Eye — inspection, review" },
  { value: "clipboardCheck", title: "Clipboard check — checklist, approval" },
  { value: "tools", title: "Tools — trade, workmanship" },
  { value: "warningTriangle", title: "Warning — damage, urgency" },
  { value: "shield", title: "Shield — security, trust" },
  { value: "chatLines", title: "Chat — consultation, support" },
  { value: "phone", title: "Phone — call, contact" },
  { value: "mail", title: "Mail — email" },
  { value: "calendar", title: "Calendar — scheduling" },
  { value: "clock", title: "Clock — timeline, availability" },
  { value: "user", title: "User — personal, advisor" },
  { value: "group", title: "Group — team, crew" },
  { value: "lightBulb", title: "Light bulb — guidance, ideas" },
  { value: "leaf", title: "Leaf — sustainability, materials" },
  { value: "fireFlame", title: "Fire / heat — climate, UV" },
  { value: "snow", title: "Snow / cold — weather exposure" },
  { value: "cloudSunny", title: "Cloud & sun — weather, climate" },
  { value: "mapPin", title: "Map pin — location, service area" },
  { value: "sparks", title: "Sparks — quality, standout" },
  { value: "heart", title: "Heart — care, values" },
  { value: "helpCircle", title: "Help — FAQ, explain" },
  { value: "checkCircle", title: "Check circle — complete, verified" },
  { value: "badgeCheck", title: "Badge check — certified, trusted" },
] as const;

export type ServiceIconKey = (typeof SERVICE_ICON_OPTIONS)[number]["value"];

/** Legacy Sanity values from Lucide-era schema */
export const LEGACY_SERVICE_ICON_ALIASES: Record<string, ServiceIconKey> = {
  fileText: "page",
};
