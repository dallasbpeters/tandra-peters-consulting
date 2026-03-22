/** Absolute URL to the site’s Gemini API (Studio runs on a different origin than Vite). */
export const geminiStudioApiEndpoint =
  process.env.SANITY_STUDIO_GEMINI_API_URL?.replace(/\/$/, '') ||
  'http://localhost:3000/api/gemini/generate-image'
