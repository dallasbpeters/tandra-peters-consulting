import { readFileSync } from "node:fs";

import { createClient } from "@sanity/client";

// Load token from .env.local
const envRaw = readFileSync(new URL("../.env.local", import.meta.url), "utf-8");
const tokenMatch = envRaw.match(/SANITY_API_READ_TOKEN="([^"]+)"/);
if (!tokenMatch) {
  throw new Error("SANITY_API_READ_TOKEN not found in .env.local");
}

const client = createClient({
  apiVersion: "2026-05-29",
  dataset: "production",
  projectId: "7irm699i",
  token: tokenMatch[1],
  useCdn: false,
});

const areas = [
  {
    _key: "travis",
    _type: "serviceArea",
    clientCount: 312,
    countyKey: "travis",
    displayName: "Travis County",
  },
  {
    _key: "williamson",
    _type: "serviceArea",
    clientCount: 198,
    countyKey: "williamson",
    displayName: "Williamson County",
  },
  {
    _key: "hays",
    _type: "serviceArea",
    clientCount: 143,
    countyKey: "hays",
    displayName: "Hays County",
  },
  {
    _key: "bastrop",
    _type: "serviceArea",
    clientCount: 76,
    countyKey: "bastrop",
    displayName: "Bastrop County",
  },
  {
    _key: "caldwell",
    _type: "serviceArea",
    clientCount: 61,
    countyKey: "caldwell",
    displayName: "Caldwell County",
  },
  {
    _key: "lubbock",
    _type: "serviceArea",
    clientCount: 28,
    countyKey: "lubbock",
    displayName: "Lubbock County",
  },
  {
    _key: "potter",
    _type: "serviceArea",
    clientCount: 35,
    countyKey: "potter",
    displayName: "Potter County (Amarillo)",
  },
];

const result = await client
  .patch("homePage")
  .set({
    serviceAreaMap: {
      _type: "serviceAreaMap",
      areas,
      description:
        "Serving homeowners across the Austin metro, Lubbock, and Amarillo — Travis, Williamson, Hays, Bastrop, and Caldwell counties plus the Panhandle.",
      eyebrow: "Service Area",
      title: "Where We Work",
    },
  })
  .commit();

console.log(`✓ Patched document: ${result._id}`);
console.log(`✓ Seeded ${areas.length} service areas`);
