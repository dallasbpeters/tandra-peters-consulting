import type { VercelRequest, VercelResponse } from "@vercel/node";
import {
  getSeoDashboard,
  regenerateSeoDashboard,
} from "../../server/seo/dashboardService.js";
import {
  DashboardAuthError,
  authorizeSeoDashboardRequest,
} from "../../server/seo/googleAuth.js";

const applyCors = (res: VercelResponse) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
};

export default async function seoDashboard(
  req: VercelRequest,
  res: VercelResponse,
) {
  applyCors(res);

  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }

  if (req.method !== "GET") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  try {
    await authorizeSeoDashboardRequest(req.headers.authorization);
    const regenerate =
      req.query.regenerate === "1" ||
      req.query.regenerate === "true" ||
      req.query.refresh === "1" ||
      req.query.refresh === "true";
    const payload = regenerate
      ? await regenerateSeoDashboard()
      : await getSeoDashboard();
    res.setHeader("Cache-Control", "no-store");
    res.status(200).json(payload);
  } catch (error) {
    if (error instanceof DashboardAuthError) {
      res.status(error.status).json({
        error: error.message,
      });
      return;
    }
    const message = error instanceof Error ? error.message : "Unknown error";
    res.status(500).json({
      error: "Could not build SEO dashboard",
      detail: message,
    });
  }
}
