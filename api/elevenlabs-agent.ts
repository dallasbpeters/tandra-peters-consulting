/**
 * POST /api/elevenlabs-agent
 *
 * Creates or retrieves the "Tandra" ElevenLabs Conversational AI agent.
 * Tandra answers roofing questions in real time with voice via the browser widget.
 *
 * Endpoints:
 *   POST /api/elevenlabs-agent         — create the agent (idempotent via name match)
 *   GET  /api/elevenlabs-agent         — return the existing agent_id
 *   POST /api/elevenlabs-agent?action=signed-url — return a signed WebSocket URL
 *                                                   for the browser widget
 *
 * Env:
 *   ELEVENLABS_API_KEY
 *   ELEVENLABS_TANDRA_VOICE_ID  — Tandra's cloned voice ID (required)
 *   ELEVENLABS_AGENT_ID         — cached after first create (optional seed)
 *
 * The agent is configured with:
 *   - Tandra's cloned voice
 *   - Claude Sonnet as the LLM (ElevenLabs supports Anthropic)
 *   - A roofing-specific system prompt
 *   - eleven_v3 model for highest quality
 */
import type { VercelRequest, VercelResponse } from "@vercel/node";

const AGENT_NAME = "Tandra – Birdcreek Roofing Consultant";
const ELEVENLABS_BASE = "https://api.elevenlabs.io/v1";

const TANDRA_SYSTEM_PROMPT = `You are Tandra Peters — a roofing consultant at Birdcreek Roofing in Austin, Texas. You help Austin-area homeowners understand their roof's condition, navigate storm damage, and figure out whether they have an insurance claim worth filing.

Your personality:
- Warm, honest, direct — never pushy or salesy
- You talk like a neighbor giving real advice, not a salesperson
- You're the expert — confident but approachable
- You empathize with how stressful roof damage is

Your knowledge:
- Free roof inspections (no cost, no obligation)
- Storm damage, hail, wind, and heat effects on Texas roofs
- How to document damage and work with insurance adjusters
- Birdcreek Roofing: GAF Master Elite certified, TAMKO Pro, RCAT member
- Service area: Austin, Cedar Park, Round Rock, Georgetown, Pflugerville, Leander, Hutto, Kyle, Buda, San Marcos, New Braunfels, and greater Central Texas
- Phone: 512-968-3965

NEVER:
- Recommend a specific dollar amount without seeing the roof
- Diagnose a roof without a physical inspection
- Make promises about insurance claim outcomes
- Be salesy or pressure the homeowner

ALWAYS:
- Offer a free inspection as the next step
- Speak in short, natural sentences like you're talking, not writing
- Use "I" first-person voice as Tandra
- Keep answers concise — 2-4 sentences max per turn`;

interface ElevenLabsAgentConfig {
  name: string;
  conversation_config: {
    agent: {
      prompt: {
        prompt: string;
        llm: string;
      };
      first_message: string;
      language: string;
    };
    tts: {
      model_id: string;
      voice_id: string;
    };
    asr: {
      quality: string;
      user_input_audio_format: string;
    };
  };
}

const authHeaders = (apiKey: string) => ({
  "Content-Type": "application/json",
  "xi-api-key": apiKey,
});

const getExistingAgentId = async (
  apiKey: string,
  agentName: string
): Promise<string | null> => {
  const res = await fetch(`${ELEVENLABS_BASE}/convai/agents?page_size=100`, {
    headers: authHeaders(apiKey),
    method: "GET",
  });
  if (!res.ok) {
    return null;
  }
  const data = (await res.json()) as {
    agents?: { agent_id: string; name: string }[];
  };
  const match = data.agents?.find((a) => a.name === agentName);
  return match?.agent_id ?? null;
};

const createAgent = async (
  apiKey: string,
  voiceId: string
): Promise<string> => {
  const config: ElevenLabsAgentConfig = {
    conversation_config: {
      agent: {
        first_message:
          "Hey there! I'm Tandra Peters with Birdcreek Roofing. If you've got questions about your roof — storm damage, an inspection, an insurance claim — I'm here to help. What's going on?",
        language: "en",
        prompt: {
          llm: "claude-sonnet-4-5",
          prompt: TANDRA_SYSTEM_PROMPT,
        },
      },
      asr: {
        quality: "high",
        user_input_audio_format: "pcm_16000",
      },
      tts: {
        model_id: "eleven_v3",
        voice_id: voiceId,
      },
    },
    name: AGENT_NAME,
  };

  const res = await fetch(`${ELEVENLABS_BASE}/convai/agents/create`, {
    body: JSON.stringify(config),
    headers: authHeaders(apiKey),
    method: "POST",
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`ElevenLabs agent create failed: ${res.status} ${err}`);
  }

  const data = (await res.json()) as { agent_id: string };
  return data.agent_id;
};

const getSignedUrl = async (
  apiKey: string,
  agentId: string
): Promise<string> => {
  const res = await fetch(
    `${ELEVENLABS_BASE}/convai/conversation/get_signed_url?agent_id=${agentId}`,
    { headers: authHeaders(apiKey), method: "GET" }
  );
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Signed URL fetch failed: ${res.status} ${err}`);
  }
  const data = (await res.json()) as { signed_url: string };
  return data.signed_url;
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }

  const apiKey = process.env.ELEVENLABS_API_KEY?.trim();
  const voiceId = process.env.ELEVENLABS_TANDRA_VOICE_ID?.trim();

  if (!apiKey) {
    res
      .status(500)
      .json({ error: "ELEVENLABS_API_KEY is not configured.", ok: false });
    return;
  }

  try {
    // Resolve agent ID (env seed → search by name → create)
    let agentId = process.env.ELEVENLABS_AGENT_ID?.trim() || null;

    if (!agentId) {
      agentId = await getExistingAgentId(apiKey, AGENT_NAME);
    }

    if (!agentId) {
      if (!voiceId) {
        res.status(400).json({
          error:
            "ELEVENLABS_TANDRA_VOICE_ID is required to create the agent for the first time.",
          ok: false,
        });
        return;
      }
      agentId = await createAgent(apiKey, voiceId);
    }

    const action = req.query.action;

    // Return a signed WebSocket URL for the browser widget
    if (action === "signed-url" || req.method === "POST") {
      const signedUrl = await getSignedUrl(apiKey, agentId);
      res.status(200).json({ agentId, ok: true, signedUrl });
      return;
    }

    // GET — just return the agent ID
    res.status(200).json({ agentId, ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    res.status(500).json({ error: message, ok: false });
  }
}
