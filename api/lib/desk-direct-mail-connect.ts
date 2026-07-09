/**
 * Provider connection + test-proof helpers for the Desk direct-mail flow.
 *
 * Test-only by design: nothing here sends live, charged mail. Stannp supports a
 * no-charge test proof (`test=true`) that returns a proof PDF; other providers
 * only expose a connection check until a live-send flow is enabled.
 */
const STANNP_BASE = "https://api-us1.stannp.com/v1";
const LOB_BASE = "https://api.lob.com/v1";
const POSTGRID_BASE = "https://api.postgrid.com/print-mail/v1";

const PROVIDER_NAMES: Record<string, string> = {
  click2mail: "Click2Mail",
  lob: "Lob",
  postalytics: "Postalytics",
  postgrid: "PostGrid",
  stannp: "Stannp",
};

export interface ProviderConnection {
  accountLabel?: string;
  configured: boolean;
  message: string;
  ok: boolean;
  provider: string;
  providerKey: string;
}

export interface TestProofResult {
  message: string;
  ok: boolean;
  proofUrl?: string;
  provider: string;
  providerKey: string;
}

export interface TestPostcardInput {
  back?: string;
  front?: string;
  message?: string;
  providerKey: string;
  size?: string;
}

const providerName = (key: string): string => PROVIDER_NAMES[key] ?? key;

const envValue = (key: string): string => process.env[key]?.trim() ?? "";

const stripDataUrl = (value: string): string => {
  const marker = ";base64,";
  const index = value.indexOf(marker);
  return index === -1 ? value : value.slice(index + marker.length);
};

const isHttpUrl = (value: string): boolean => /^https?:\/\//i.test(value);

const asRecord = (value: unknown): Record<string, unknown> =>
  value && typeof value === "object" ? (value as Record<string, unknown>) : {};

const verifyStannp = async (): Promise<ProviderConnection> => {
  const apiKey = envValue("STANNP_API_KEY");
  const base: ProviderConnection = {
    configured: Boolean(apiKey),
    message: "",
    ok: false,
    provider: providerName("stannp"),
    providerKey: "stannp",
  };
  if (!apiKey) {
    return { ...base, message: "Add STANNP_API_KEY to connect Stannp." };
  }
  const response = await fetch(
    `${STANNP_BASE}/accounts/me?api_key=${encodeURIComponent(apiKey)}`,
    { headers: { Accept: "application/json" } }
  );
  const body = asRecord(await response.json().catch(() => ({})));
  if (response.ok && body.success === true) {
    const data = asRecord(body.data);
    const balance =
      typeof data.balance === "number" || typeof data.balance === "string"
        ? String(data.balance)
        : undefined;
    return {
      ...base,
      accountLabel: balance ? `Balance ${balance}` : undefined,
      message: "Connected to Stannp. Ready for a no-charge test proof.",
      ok: true,
    };
  }
  return {
    ...base,
    message:
      typeof body.error === "string"
        ? `Stannp rejected the key: ${body.error}`
        : "Stannp did not accept this API key.",
  };
};

const verifyLob = async (): Promise<ProviderConnection> => {
  const apiKey = envValue("LOB_API_KEY");
  const base: ProviderConnection = {
    configured: Boolean(apiKey),
    message: "",
    ok: false,
    provider: providerName("lob"),
    providerKey: "lob",
  };
  if (!apiKey) {
    return { ...base, message: "Add LOB_API_KEY to connect Lob." };
  }
  const auth = Buffer.from(`${apiKey}:`).toString("base64");
  const response = await fetch(`${LOB_BASE}/postcards?limit=1`, {
    headers: { Accept: "application/json", Authorization: `Basic ${auth}` },
  });
  if (response.ok) {
    const live = apiKey.startsWith("live_");
    return {
      ...base,
      message: live
        ? "Connected to Lob (live key). Send from Lob until live send is enabled here."
        : "Connected to Lob (test key).",
      ok: true,
    };
  }
  return { ...base, message: "Lob did not accept this API key." };
};

const verifyPostgrid = async (): Promise<ProviderConnection> => {
  const apiKey = envValue("POSTGRID_API_KEY");
  const base: ProviderConnection = {
    configured: Boolean(apiKey),
    message: "",
    ok: false,
    provider: providerName("postgrid"),
    providerKey: "postgrid",
  };
  if (!apiKey) {
    return { ...base, message: "Add POSTGRID_API_KEY to connect PostGrid." };
  }
  const response = await fetch(`${POSTGRID_BASE}/postcards?limit=1`, {
    headers: { Accept: "application/json", "x-api-key": apiKey },
  });
  if (response.ok) {
    return { ...base, message: "Connected to PostGrid.", ok: true };
  }
  return { ...base, message: "PostGrid did not accept this API key." };
};

export const verifyProviderConnection = async (
  providerKey: string
): Promise<ProviderConnection> => {
  if (providerKey === "stannp") {
    return await verifyStannp();
  }
  if (providerKey === "lob") {
    return await verifyLob();
  }
  if (providerKey === "postgrid") {
    return await verifyPostgrid();
  }
  return {
    configured: false,
    message: `Connection check for ${providerName(
      providerKey
    )} is not wired yet — verify from their dashboard.`,
    ok: false,
    provider: providerName(providerKey),
    providerKey,
  };
};

const buildBackHtml = (message: string): string =>
  `<html><body style="font-family:sans-serif;padding:24px;font-size:22px;line-height:1.4;">${message}</body></html>`;

const createStannpTestProof = async (
  input: TestPostcardInput
): Promise<TestProofResult> => {
  const apiKey = envValue("STANNP_API_KEY");
  const base: TestProofResult = {
    message: "",
    ok: false,
    provider: providerName("stannp"),
    providerKey: "stannp",
  };
  if (!apiKey) {
    return { ...base, message: "Add STANNP_API_KEY before testing Stannp." };
  }
  if (!input.front) {
    return {
      ...base,
      message: "Select a saved Ad Builder creative for the postcard front.",
    };
  }
  const form = new URLSearchParams();
  form.set("test", "true");
  form.set("size", input.size ?? "6x9");
  form.set(
    "front",
    isHttpUrl(input.front) ? input.front : stripDataUrl(input.front)
  );
  if (input.back) {
    form.set(
      "back",
      isHttpUrl(input.back) ? input.back : stripDataUrl(input.back)
    );
  } else {
    form.set(
      "back",
      stripDataUrl(
        `data:text/html;base64,${Buffer.from(
          buildBackHtml(
            input.message ??
              "Roof age check — text 512-968-3965 for a free look."
          )
        ).toString("base64")}`
      )
    );
  }
  form.set("recipient[firstname]", "Sample");
  form.set("recipient[lastname]", "Resident");
  form.set("recipient[address1]", "123 Test Street");
  form.set("recipient[city]", "Austin");
  form.set("recipient[state]", "TX");
  form.set("recipient[zipcode]", "78701");
  form.set("recipient[country]", "US");

  const response = await fetch(
    `${STANNP_BASE}/postcards/create?api_key=${encodeURIComponent(apiKey)}`,
    {
      body: form.toString(),
      headers: {
        Accept: "application/json",
        "Content-Type": "application/x-www-form-urlencoded",
      },
      method: "POST",
    }
  );
  const body = asRecord(await response.json().catch(() => ({})));
  if (response.ok && body.success === true) {
    const data = asRecord(body.data);
    const pdf = typeof data.pdf === "string" ? data.pdf : undefined;
    return {
      ...base,
      message: "Stannp built a no-charge test proof. Nothing was mailed.",
      ok: true,
      proofUrl: pdf,
    };
  }
  return {
    ...base,
    message:
      typeof body.error === "string"
        ? `Stannp test failed: ${body.error}`
        : "Stannp could not build a test proof from this creative.",
  };
};

export const createTestPostcard = async (
  input: TestPostcardInput
): Promise<TestProofResult> => {
  if (input.providerKey === "stannp") {
    return await createStannpTestProof(input);
  }
  return {
    message: `No-charge test proofs are only wired for Stannp right now. Connect Stannp, or send a test from the ${providerName(
      input.providerKey
    )} dashboard.`,
    ok: false,
    provider: providerName(input.providerKey),
    providerKey: input.providerKey,
  };
};
