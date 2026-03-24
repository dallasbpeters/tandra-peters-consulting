import { OAuth2Client } from "google-auth-library";

type EnvSource = Record<string, string | undefined> | NodeJS.ProcessEnv;

export class DashboardAuthError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export type DashboardUser = {
  email: string;
  name?: string;
  picture?: string;
};

const client = new OAuth2Client();

const trim = (value: string | undefined): string => value?.trim() ?? "";

const envValue = (env: EnvSource | undefined, key: string): string =>
  trim(env?.[key] ?? process.env[key]);

const getConfig = (env?: EnvSource) => {
  const clientId =
    envValue(env, "GOOGLE_CLIENT_ID") || envValue(env, "VITE_GOOGLE_CLIENT_ID");
  const allowedEmails = envValue(env, "GOOGLE_ALLOWED_EMAILS")
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);
  const allowedDomain = envValue(env, "GOOGLE_ALLOWED_DOMAIN").toLowerCase();

  return {
    clientId,
    allowedEmails,
    allowedDomain,
  };
};

const extractBearerToken = (authorizationHeader: string | undefined): string => {
  const value = trim(authorizationHeader);
  if (!value.toLowerCase().startsWith("bearer ")) {
    throw new DashboardAuthError(401, "Missing bearer token");
  }
  const token = value.slice(7).trim();
  if (!token) {
    throw new DashboardAuthError(401, "Missing bearer token");
  }
  return token;
};

export const authorizeSeoDashboardRequest = async (
  authorizationHeader: string | undefined,
  env?: EnvSource,
): Promise<DashboardUser> => {
  const config = getConfig(env);

  if (!config.clientId) {
    throw new DashboardAuthError(500, "Missing Google client ID configuration");
  }

  if (config.allowedEmails.length === 0 && !config.allowedDomain) {
    throw new DashboardAuthError(
      500,
      "Missing dashboard allowlist configuration",
    );
  }

  const idToken = extractBearerToken(authorizationHeader);
  const ticket = await client.verifyIdToken({
    idToken,
    audience: config.clientId,
  });
  const payload = ticket.getPayload();

  if (!payload) {
    throw new DashboardAuthError(401, "Invalid Google ID token");
  }

  const email = trim(payload.email).toLowerCase();
  if (!email || payload.email_verified !== true) {
    throw new DashboardAuthError(403, "Google account email is not verified");
  }

  const hostedDomain = trim(payload.hd).toLowerCase();
  const emailAllowed =
    config.allowedEmails.length > 0 && config.allowedEmails.includes(email);
  const domainAllowed =
    Boolean(config.allowedDomain) && hostedDomain === config.allowedDomain;

  if (config.allowedEmails.length > 0 || config.allowedDomain) {
    if (!emailAllowed && !domainAllowed) {
      throw new DashboardAuthError(403, "This Google account is not allowed");
    }
  }

  return {
    email,
    name: trim(typeof payload.name === "string" ? payload.name : undefined) || undefined,
    picture:
      trim(typeof payload.picture === "string" ? payload.picture : undefined) || undefined,
  };
};
