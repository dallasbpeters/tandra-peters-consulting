import { createClient } from "@sanity/client";
import { readFileSync } from "fs";

// Load token from .env.local
const envRaw = readFileSync(new URL("../.env.local", import.meta.url), "utf8");
const tokenMatch = envRaw.match(/SANITY_API_READ_TOKEN="([^"]+)"/);
if (!tokenMatch)
  throw new Error("SANITY_API_READ_TOKEN not found in .env.local");

const client = createClient({
  projectId: "7irm699i",
  dataset: "production",
  apiVersion: "2024-01-01",
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
    _key: "bexar",
    countyKey: "bexar",
    displayName: "Bexar County",
    clientCount: 247,
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
    _key: "tarrant",
    countyKey: "tarrant",
    displayName: "Tarrant County",
    clientCount: 174,
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
    _key: "comal",
    countyKey: "comal",
    displayName: "Comal County",
    clientCount: 128,
  },
  {
    _type: "serviceArea",
    _key: "guadalupe",
    countyKey: "guadalupe",
    displayName: "Guadalupe County",
    clientCount: 119,
  },
  {
    _type: "serviceArea",
    _key: "kendall",
    countyKey: "kendall",
    displayName: "Kendall County",
    clientCount: 104,
  },
  {
    _type: "serviceArea",
    _key: "bell",
    countyKey: "bell",
    displayName: "Bell County",
    clientCount: 96,
  },
  {
    _type: "serviceArea",
    _key: "mclennan",
    countyKey: "mclennan",
    displayName: "McLennan County",
    clientCount: 88,
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
    _key: "kerr",
    countyKey: "kerr",
    displayName: "Kerr County",
    clientCount: 54,
  },
  {
    _type: "serviceArea",
    _key: "gillespie",
    countyKey: "gillespie",
    displayName: "Gillespie County",
    clientCount: 47,
  },
  {
    _type: "serviceArea",
    _key: "blanco",
    countyKey: "blanco",
    displayName: "Blanco County",
    clientCount: 39,
  },
  {
    _type: "serviceArea",
    _key: "potter",
    countyKey: "potter",
    displayName: "Potter County",
    clientCount: 35,
  },
  {
    _type: "serviceArea",
    _key: "randall",
    countyKey: "randall",
    displayName: "Randall County",
    clientCount: 31,
  },
  {
    _type: "serviceArea",
    _key: "lubbock",
    countyKey: "lubbock",
    displayName: "Lubbock County",
    clientCount: 28,
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
        "Serving homeowners across Central Texas — from the Austin metro and San Antonio to Fort Worth, Waco, Kerrville, and the Panhandle.",
      areas,
    },
  })
  .commit();

console.log(`✓ Patched document: ${result._id}`);
console.log(`✓ Seeded ${areas.length} service areas`);
