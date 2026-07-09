/**
 * Encrypted storage for direct-mail provider API keys.
 *
 * Keys are AES-256-GCM encrypted with DIRECT_MAIL_SECRET_KEY and written to a
 * PRIVATE Sanity draft singleton (`drafts.deskMailSecrets`) via
 * SANITY_WRITE_TOKEN. Drafts are never served by the public CDN/read token, so
 * ciphertext never reaches the browser bundle. Decryption is server-only.
 *
 * A raw key value is NEVER returned to the client — callers get either the
 * decrypted value for a server-side provider request, or a masked status.
 */
import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from "node:crypto";

import { createClient } from "@sanity/client";

import { PROVIDER_ENV_KEYS } from "./desk-direct-mail.js";

const SANITY_PROJECT_ID = "7irm699i";
const SANITY_DATASET = "production";
const SANITY_API_VERSION = "2026-05-29";

// Private, draft-only singleton. Drafts are excluded from the published
// perspective, so the public read token / CDN can never see these ciphertexts.
const SECRETS_DOC_ID = "drafts.deskMailSecrets";
const SECRETS_TYPE = "deskMailSecrets";

const ALGORITHM = "aes-256-gcm";
const IV_BYTES = 12;

export interface MailSecretsOptions {
  sanityWriteToken?: string;
  secretKey?: string;
}

export interface MaskedKeyStatus {
  configured: boolean;
  /** Masked hint only — e.g. "••••1234". Never the raw value. */
  hint: string;
  name: string;
  source: "env" | "missing" | "stored";
}

export interface ProviderKeysStatus {
  keys: MaskedKeyStatus[];
  providerKey: string;
  /** True when DIRECT_MAIL_SECRET_KEY is set so keys can be stored encrypted. */
  secretStoreReady: boolean;
}

export interface SaveKeysResult {
  body: { error?: string; ok: boolean; status?: ProviderKeysStatus };
  status: number;
}

interface StoredSecret {
  cipher: string;
  envName: string;
  updatedAt: string;
}

const secretKeyValue = (options: MailSecretsOptions): string =>
  (options.secretKey ?? process.env.DIRECT_MAIL_SECRET_KEY ?? "").trim();

const writeToken = (options: MailSecretsOptions): string =>
  (
    options.sanityWriteToken ??
    process.env.SANITY_WRITE_TOKEN ??
    process.env.SANITY_API_WRITE_TOKEN ??
    ""
  ).trim();

const envValue = (name: string): string => process.env[name]?.trim() ?? "";

const deriveKey = (secret: string): Buffer =>
  createHash("sha256").update(secret, "utf-8").digest();

const encryptValue = (plain: string, secret: string): string => {
  const key = deriveKey(secret);
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([
    cipher.update(plain, "utf-8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  return [iv, tag, encrypted]
    .map((buffer) => buffer.toString("base64"))
    .join(":");
};

const decryptValue = (payload: string, secret: string): string | null => {
  const parts = payload.split(":");
  if (parts.length !== 3) {
    return null;
  }
  try {
    const [ivPart, tagPart, dataPart] = parts;
    const key = deriveKey(secret);
    const decipher = createDecipheriv(
      ALGORITHM,
      key,
      Buffer.from(ivPart, "base64")
    );
    decipher.setAuthTag(Buffer.from(tagPart, "base64"));
    const decrypted = Buffer.concat([
      decipher.update(Buffer.from(dataPart, "base64")),
      decipher.final(),
    ]);
    return decrypted.toString("utf-8");
  } catch {
    return null;
  }
};

const maskValue = (value: string): string => {
  const trimmed = value.trim();
  if (trimmed.length <= 4) {
    return "••••";
  }
  return `••••${trimmed.slice(-4)}`;
};

const requiredEnvFor = (providerKey: string): readonly string[] =>
  PROVIDER_ENV_KEYS[providerKey] ?? [];

const sanityClient = (token: string) =>
  createClient({
    apiVersion: SANITY_API_VERSION,
    dataset: SANITY_DATASET,
    perspective: "raw",
    projectId: SANITY_PROJECT_ID,
    token,
    useCdn: false,
  });

/** Read the raw stored secrets (still encrypted). Empty when unavailable. */
const readStoredSecrets = async (
  options: MailSecretsOptions
): Promise<StoredSecret[]> => {
  const token = writeToken(options);
  if (!token) {
    return [];
  }
  try {
    const doc = await sanityClient(token).getDocument(SECRETS_DOC_ID);
    const raw =
      doc && typeof doc === "object" && "secrets" in doc
        ? (doc as Record<string, unknown>).secrets
        : null;
    if (!Array.isArray(raw)) {
      return [];
    }
    return raw
      .map((entry) => {
        const record =
          entry && typeof entry === "object"
            ? (entry as Record<string, unknown>)
            : {};
        return {
          cipher: typeof record.cipher === "string" ? record.cipher : "",
          envName: typeof record.envName === "string" ? record.envName : "",
          updatedAt:
            typeof record.updatedAt === "string" ? record.updatedAt : "",
        };
      })
      .filter((entry) => entry.envName && entry.cipher);
  } catch {
    return [];
  }
};

/** Decrypt every stored secret we can into an env-name → value map. */
const decryptStoredMap = async (
  options: MailSecretsOptions
): Promise<Record<string, string>> => {
  const secret = secretKeyValue(options);
  if (!secret) {
    return {};
  }
  const stored = await readStoredSecrets(options);
  const map: Record<string, string> = {};
  for (const entry of stored) {
    const value = decryptValue(entry.cipher, secret);
    if (value) {
      map[entry.envName] = value;
    }
  }
  return map;
};

/**
 * Resolve every required env value for a provider: decrypted store value first,
 * then process.env fallback. Only names with a value are included. Server-only.
 */
export const getProviderSecrets = async (
  providerKey: string,
  options: MailSecretsOptions
): Promise<Record<string, string>> => {
  const names = requiredEnvFor(providerKey);
  if (names.length === 0) {
    return {};
  }
  const stored = await decryptStoredMap(options);
  const resolved: Record<string, string> = {};
  for (const name of names) {
    const value = stored[name]?.trim() || envValue(name);
    if (value) {
      resolved[name] = value;
    }
  }
  return resolved;
};

/** Masked, client-safe view of which provider keys are configured. */
export const providerKeysStatus = async (
  providerKey: string,
  options: MailSecretsOptions
): Promise<ProviderKeysStatus> => {
  const names = requiredEnvFor(providerKey);
  const stored = await decryptStoredMap(options);
  const keys: MaskedKeyStatus[] = names.map((name) => {
    const storedValue = stored[name]?.trim() ?? "";
    if (storedValue) {
      return {
        configured: true,
        hint: maskValue(storedValue),
        name,
        source: "stored",
      };
    }
    const envConfigured = envValue(name);
    if (envConfigured) {
      return {
        configured: true,
        hint: maskValue(envConfigured),
        name,
        source: "env",
      };
    }
    return { configured: false, hint: "", name, source: "missing" };
  });
  return {
    keys,
    providerKey,
    secretStoreReady: Boolean(secretKeyValue(options)),
  };
};

const asStringMap = (value: unknown): Record<string, string> => {
  if (!value || typeof value !== "object") {
    return {};
  }
  const out: Record<string, string> = {};
  for (const [key, raw] of Object.entries(value as Record<string, unknown>)) {
    if (typeof raw === "string" && raw.trim()) {
      out[key] = raw.trim();
    }
  }
  return out;
};

/**
 * Encrypt + persist the provided provider keys into the private singleton.
 * Only the names in the provider's required-env allowlist are accepted; unknown
 * names are ignored. Existing keys for other providers are preserved.
 */
export const saveProviderKeys = async (
  providerKey: string,
  rawValues: unknown,
  options: MailSecretsOptions
): Promise<SaveKeysResult> => {
  const names = requiredEnvFor(providerKey);
  if (names.length === 0) {
    return {
      body: { error: "Unknown provider.", ok: false },
      status: 400,
    };
  }
  const secret = secretKeyValue(options);
  if (!secret) {
    return {
      body: {
        error: "Set DIRECT_MAIL_SECRET_KEY on the server to store keys.",
        ok: false,
      },
      status: 400,
    };
  }
  const token = writeToken(options);
  if (!token) {
    return {
      body: { error: "SANITY_WRITE_TOKEN is not set.", ok: false },
      status: 500,
    };
  }

  const submitted = asStringMap(rawValues);
  const accepted = names.filter((name) => submitted[name]);
  if (accepted.length === 0) {
    return {
      body: {
        error: "Enter at least one key value to save.",
        ok: false,
      },
      status: 400,
    };
  }

  const now = new Date().toISOString();
  const existing = await readStoredSecrets(options);
  const byName = new Map(existing.map((entry) => [entry.envName, entry]));
  for (const name of accepted) {
    byName.set(name, {
      cipher: encryptValue(submitted[name], secret),
      envName: name,
      updatedAt: now,
    });
  }

  const client = sanityClient(token);
  await client.createOrReplace({
    _id: SECRETS_DOC_ID,
    _type: SECRETS_TYPE,
    secrets: [...byName.values()].map((entry) => ({
      _key: entry.envName,
      _type: "mailSecret",
      cipher: entry.cipher,
      envName: entry.envName,
      updatedAt: entry.updatedAt,
    })),
    updatedAt: now,
  });

  const status = await providerKeysStatus(providerKey, options);
  return { body: { ok: true, status }, status: 200 };
};
