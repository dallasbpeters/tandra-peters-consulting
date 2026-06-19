interface GoogleAuthUser {
  email: string;
  hostedDomain?: string;
}

const normalize = (value: string): string => value.trim().toLowerCase();

const decodeJwtPayload = (token: string): Record<string, unknown> | null => {
  const parts = token.split(".");
  if (parts.length < 2 || !parts[1]) {
    return null;
  }

  try {
    const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, "=");
    const json = Buffer.from(padded, "base64").toString("utf8");
    return JSON.parse(json) as Record<string, unknown>;
  } catch {
    return null;
  }
};

export const parseGoogleIdToken = (token: string): GoogleAuthUser | null => {
  const payload = decodeJwtPayload(token);
  if (!payload) {
    return null;
  }

  const email = typeof payload.email === "string" ? payload.email : "";
  const emailVerified = payload.email_verified === true;
  if (!(email && emailVerified)) {
    return null;
  }

  return {
    email,
    hostedDomain: typeof payload.hd === "string" ? payload.hd : undefined,
  };
};

const readAllowlist = () => {
  const env =
    process.env.GOOGLE_ALLOWED_EMAILS ??
    process.env.VITE_GOOGLE_ALLOWED_EMAILS ??
    "";
  const emails = new Set(
    env
      .split(",")
      .map((entry) => normalize(entry))
      .filter(Boolean)
  );

  const domain = normalize(
    process.env.GOOGLE_ALLOWED_DOMAIN ??
      process.env.VITE_GOOGLE_ALLOWED_DOMAIN ??
      ""
  );

  return { emails, domain };
};

export const isAllowedGoogleUser = (user: GoogleAuthUser): boolean => {
  const { emails, domain } = readAllowlist();
  if (emails.size === 0 && !domain) {
    return false;
  }

  const email = normalize(user.email);
  if (emails.size > 0 && emails.has(email)) {
    return true;
  }

  if (domain && normalize(user.hostedDomain ?? "") === domain) {
    return true;
  }

  return false;
};
