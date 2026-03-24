import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getSeoDashboard } from "./dashboardService";
import { DashboardAuthError, authorizeSeoDashboardRequest } from "./googleAuth";

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
    const payload = await getSeoDashboard();
    res.setHeader("Cache-Control", "s-maxage=300, stale-while-revalidate=600");
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
