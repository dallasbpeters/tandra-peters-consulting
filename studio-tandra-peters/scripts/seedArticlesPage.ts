/** Upsert only the `articlesPage` singleton. Does not touch posts, home, or site settings. `pnpm seed:articles-page` */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { createClient } from "@sanity/client";
import { config } from "dotenv";

import { articlesPageSeed } from "./seedDefaults";

const studioRoot = resolve(import.meta.dirname, "..");

config({ path: resolve(studioRoot, ".env"), quiet: true });
config({
  override: true,
  path: resolve(studioRoot, ".env.local"),
  quiet: true,
});

const token = process.env.SANITY_API_WRITE_TOKEN?.trim();
if (!token) {
  console.error(
    "Missing SANITY_API_WRITE_TOKEN. Add it to studio-tandra-peters/.env.local or export it in the shell."
  );
  process.exit(1);
}

const client = createClient({
  apiVersion: "2026-05-29",
  dataset: "production",
  projectId: "7irm699i",
  token,
  useCdn: false,
});

async function main() {
  await client.createOrReplace(articlesPageSeed);
  console.log("Seeded articlesPage only (_id: articlesPage)");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
