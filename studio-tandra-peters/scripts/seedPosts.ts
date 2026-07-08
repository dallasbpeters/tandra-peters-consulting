/** Upsert demo `post` docs and sync home page article references. Needs `SANITY_API_WRITE_TOKEN`. `pnpm seed:posts` */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { createClient } from "@sanity/client";
import { config } from "dotenv";

import { articlePostsSeed, patchHomePageArticleRefs } from "./articlePostsSeed";

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
  const tx = client.transaction();
  for (const doc of articlePostsSeed) {
    tx.createOrReplace(doc);
  }
  await tx.commit();
  console.log(`Seeded ${articlePostsSeed.length} post documents`);

  await patchHomePageArticleRefs(client);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
