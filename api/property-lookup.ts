/**
 * POST /api/property-lookup
 *
 * Looks up basic property data (stories, total living area) by address so the
 * estimator can skip the "How big is your home?" question and use real numbers.
 *
 * Provider: Estated (https://estated.com) — sign up for a free API token and
 * add it as ESTATED_API_KEY in Vercel environment variables.
 *
 * Returns a PropertyLookupResult or { error } on failure.
 */
import type { VercelRequest, VercelResponse } from "@vercel/node";

import type { PropertyLookupResult } from "../src/lib/propertyLookup.js";

interface EstatedStructure {
  stories: number | null;
  total_area_sq_ft: number | null;
  effective_year_built: number | null;
  year_built: number | null;
}

interface EstatedAddress {
  full_address: string | null;
}

interface EstatedData {
  address: EstatedAddress | null;
  structure: EstatedStructure | null;
}

interface EstatedResponse {
  data: EstatedData | null;
  warnings: unknown[];
  error: { code: string; message: string } | null;
}

const applyCors = (res: VercelResponse): void => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
};

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  applyCors(res);

  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }

  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const address =
    req.body && typeof req.body === "object"
      ? ((req.body as Record<string, unknown>).address as string | undefined)
      : undefined;

  if (!address?.trim()) {
    res.status(400).json({ error: "address is required" });
    return;
  }

  const token = process.env.ESTATED_API_KEY?.trim();
  if (!token) {
    res.status(503).json({ error: "Property lookup is not configured on this server." });
    return;
  }

  const url = new URL("https://apis.estated.com/v4/property");
  url.searchParams.set("token", token);
  url.searchParams.set("combined_address", address.trim());

  let estated: EstatedResponse;
  try {
    const upstream = await fetch(url.toString(), {
      headers: { Accept: "application/json" },
    });
    if (!upstream.ok) {
      res.status(502).json({ error: `Estated returned ${upstream.status}` });
      return;
    }
    estated = (await upstream.json()) as EstatedResponse;
  } catch (err) {
    console.error("[property-lookup]", err);
    res.status(502).json({ error: "Could not reach property data service." });
    return;
  }

  if (estated.error || !estated.data) {
    res.status(404).json({ error: "Property not found." });
    return;
  }

  const structure = estated.data.structure;
  const stories = structure?.stories ?? null;
  const totalAreaSqft = structure?.total_area_sq_ft ?? null;
  const footprintSqft =
    stories && stories > 0 && totalAreaSqft
      ? Math.round(totalAreaSqft / stories)
      : (totalAreaSqft ?? null);

  const result: PropertyLookupResult = {
    stories,
    totalAreaSqft,
    footprintSqft,
    yearBuilt: structure?.effective_year_built ?? structure?.year_built ?? null,
    formattedAddress: estated.data.address?.full_address ?? address.trim(),
  };

  res.status(200).json(result);
}
