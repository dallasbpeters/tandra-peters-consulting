import { createClient } from "@sanity/client";
import { readFileSync } from "fs";

// Load token from .env.local
const envRaw = readFileSync(new URL("../.env.local", import.meta.url), "utf8");
const tokenMatch = envRaw.match(/SANITY_API_READ_TOKEN="([^"]+)"/);
if (!tokenMatch) throw new Error("SANITY_API_READ_TOKEN not found in .env.local");

const client = createClient({
  projectId: "7irm699i",
  dataset: "production",
  apiVersion: "2026-05-29",
  useCdn: false,
  token: tokenMatch[1],
});

const areas = [
  {
    _type: "serviceArea",
    _key: "travis",
    countyKey: "travis",
    displayName: "Travis County",
    clientCount: 312,
  },
  {
    _type: "serviceArea",
    _key: "williamson",
    countyKey: "williamson",
    displayName: "Williamson County",
    clientCount: 198,
  },
  {
    _type: "serviceArea",
    _key: "hays",
    countyKey: "hays",
    displayName: "Hays County",
    clientCount: 143,
  },
  {
    _type: "serviceArea",
    _key: "bastrop",
    countyKey: "bastrop",
    displayName: "Bastrop County",
    clientCount: 76,
  },
  {
    _type: "serviceArea",
    _key: "caldwell",
    countyKey: "caldwell",
    displayName: "Caldwell County",
    clientCount: 61,
  },
  {
    _type: "serviceArea",
    _key: "lubbock",
    countyKey: "lubbock",
    displayName: "Lubbock County",
    clientCount: 28,
  },
  {
    _type: "serviceArea",
    _key: "potter",
    countyKey: "potter",
    displayName: "Potter County (Amarillo)",
    clientCount: 35,
  },
];

const result = await client
  .patch("homePage")
  .set({
    serviceAreaMap: {
      _type: "serviceAreaMap",
      eyebrow: "Service Area",
      title: "Where We Work",
      description:
        "Serving homeowners across the Austin metro, Lubbock, and Amarillo — Travis, Williamson, Hays, Bastrop, and Caldwell counties plus the Panhandle.",
      areas,
    },
  })
  .commit();

console.log(`✓ Patched document: ${result._id}`);
console.log(`✓ Seeded ${areas.length} service areas`);
