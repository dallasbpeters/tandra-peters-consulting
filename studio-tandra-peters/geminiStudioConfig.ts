/** Absolute URL to the site’s Gemini API (Studio runs on a different origin than Vite). */
const configuredGeminiApiEndpoint = process.env.SANITY_STUDIO_GEMINI_API_URL?.replace(/\/$/, '')
const isLocalGeminiApiEndpoint =
  configuredGeminiApiEndpoint?.startsWith('http://localhost') ||
  configuredGeminiApiEndpoint?.startsWith('http://127.0.0.1')

export const geminiStudioApiEndpoint =
  process.env.NODE_ENV === 'production' && isLocalGeminiApiEndpoint
    ? 'https://www.tandra.me/api/gemini/generate-image'
    : configuredGeminiApiEndpoint || 'http://localhost:3001/api/gemini/generate-image'
