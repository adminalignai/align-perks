import { cookies } from "next/headers";
import { NextRequest } from "next/server";

const SESSION_DURATION_MS = 1000 * 60 * 60 * 24 * 7; // 7 days
export const SESSION_COOKIE_NAME = "ap_session";

interface SessionPayload {
  userId: string;
  exp: number;
}

const encoder = new TextEncoder();

function getAuthSecret(): string {
  return process.env.AUTH_SECRET ?? "development-secret";
}

function toBase64Url(bytes: Uint8Array): string {
  if (typeof Buffer !== "undefined") {
    return Buffer.from(bytes)
      .toString("base64")
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");
  }

  let binary = "";
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });

  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(value: string): Uint8Array {
  const base64 = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), "=");

  if (typeof Buffer !== "undefined") {
    return new Uint8Array(Buffer.from(padded, "base64"));
  }

  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

async function getHmacKey() {
  return crypto.subtle.importKey(
    "raw",
    encoder.encode(getAuthSecret()),
    {
      name: "HMAC",
      hash: { name: "SHA-256" },
    },
    false,
    ["sign", "verify"],
  );
}

async function signPayload(encodedPayload: string): Promise<Uint8Array> {
  const key = await getHmacKey();
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(encodedPayload));
  return new Uint8Array(signature);
}

async function verifySignature(encodedPayload: string, signature: Uint8Array) {
  const key = await getHmacKey();

  // Make sure the signature is backed by a plain ArrayBuffer (avoids TS/SharedArrayBuffer type issues)
  const sig = Uint8Array.from(signature);

  return crypto.subtle.verify("HMAC", key, sig, encoder.encode(encodedPayload));
}

export async function createSessionToken(userId: string): Promise<string> {
  const payload: SessionPayload = {
    userId,
    exp: Date.now() + SESSION_DURATION_MS,
  };

  const encodedPayload = toBase64Url(encoder.encode(JSON.stringify(payload)));
  const signature = await signPayload(encodedPayload);

  return `${encodedPayload}.${toBase64Url(signature)}`;
}

export async function parseSessionToken(
  token?: string | null,
): Promise<SessionPayload | null> {
  if (!token) return null;

  const [encodedPayload, signaturePart] = token.split(".");
  if (!encodedPayload || !signaturePart) return null;

  const signatureBytes = fromBase64Url(signaturePart);
  const isValid = await verifySignature(encodedPayload, signatureBytes);
  if (!isValid) return null;

  try {
    const payload = JSON.parse(
      new TextDecoder().decode(fromBase64Url(encodedPayload)),
    ) as SessionPayload;

    if (!payload.userId || payload.exp < Date.now()) return null;

    return payload;
  } catch (error) {
    console.error("Failed to parse session token", error);
    return null;
  }
}

export async function setAuthCookie(userId: string): Promise<void> {
  const token = await createSessionToken(userId);
  const cookieStore = cookies();

  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: Math.floor(SESSION_DURATION_MS / 1000),
    path: "/",
  });
}

export function clearAuthCookie(): void {
  const cookieStore = cookies();
  cookieStore.set(SESSION_COOKIE_NAME, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 0,
    path: "/",
  });
}

export async function getSessionFromRequest(
  request: NextRequest,
): Promise<SessionPayload | null> {
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  return parseSessionToken(token);
}

export async function getSessionFromCookies(): Promise<SessionPayload | null> {
  const token = cookies().get(SESSION_COOKIE_NAME)?.value;
  return parseSessionToken(token);
}
