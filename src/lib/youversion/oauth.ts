/**
 * YouVersion OAuth PKCE helpers.
 * Handles code verifier generation, auth URL construction, and token exchange.
 */
import { YV_PKCE_KEY, YV_TOKENS_KEY, type YouVersionTokens, type PKCEState } from "./types";

const YV_AUTH_URL = "https://auth.youversion.com/oauth/authorize";
const YV_TOKEN_URL = "https://auth.youversion.com/oauth/token";
const CLIENT_ID = import.meta.env.VITE_YOUVERSION_CLIENT_ID as string | undefined;

/* ── helpers ─────────────────────────────── */

function generateRandomString(length: number): string {
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  return Array.from(array, (b) => b.toString(16).padStart(2, "0")).join("").slice(0, length);
}

async function sha256(plain: string): Promise<ArrayBuffer> {
  const encoder = new TextEncoder();
  return crypto.subtle.digest("SHA-256", encoder.encode(plain));
}

function base64UrlEncode(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  bytes.forEach((b) => (binary += String.fromCharCode(b)));
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/* ── public API ──────────────────────────── */

/** Build the authorization URL and store PKCE state */
export async function startYouVersionAuth(returnTo = "/board"): Promise<string> {
  const codeVerifier = generateRandomString(64);
  const codeChallenge = base64UrlEncode(await sha256(codeVerifier));

  // Persist PKCE state for the callback
  const pkceState: PKCEState = { codeVerifier, returnTo };
  localStorage.setItem(YV_PKCE_KEY, JSON.stringify(pkceState));

  const redirectUri = `${window.location.origin}/auth/youversion/callback`;
  const state = returnTo; // pass through so callback knows where to go

  const params = new URLSearchParams({
    response_type: "code",
    client_id: CLIENT_ID ?? "",
    redirect_uri: redirectUri,
    code_challenge: codeChallenge,
    code_challenge_method: "S256",
    state,
    scope: "bible.read",
  });

  return `${YV_AUTH_URL}?${params.toString()}`;
}

/** Exchange the authorization code for tokens */
export async function exchangeYouVersionCode(code: string): Promise<YouVersionTokens> {
  const raw = localStorage.getItem(YV_PKCE_KEY);
  if (!raw) throw new Error("No PKCE state found — auth flow may have expired.");

  const pkceState: PKCEState = JSON.parse(raw);
  const redirectUri = `${window.location.origin}/auth/youversion/callback`;

  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    redirect_uri: redirectUri,
    client_id: CLIENT_ID ?? "",
    code_verifier: pkceState.codeVerifier,
  });

  const res = await fetch(YV_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Token exchange failed (${res.status}): ${text}`);
  }

  const data = await res.json();

  const tokens: YouVersionTokens = {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresAt: Date.now() + (data.expires_in ?? 3600) * 1000,
  };

  // Persist tokens & clean up PKCE state
  localStorage.setItem(YV_TOKENS_KEY, JSON.stringify(tokens));
  localStorage.removeItem(YV_PKCE_KEY);

  return tokens;
}

/** Retrieve stored tokens (or null if not authenticated) */
export function getStoredTokens(): YouVersionTokens | null {
  const raw = localStorage.getItem(YV_TOKENS_KEY);
  if (!raw) return null;
  try {
    const tokens: YouVersionTokens = JSON.parse(raw);
    if (tokens.expiresAt < Date.now()) {
      localStorage.removeItem(YV_TOKENS_KEY);
      return null;
    }
    return tokens;
  } catch {
    return null;
  }
}

/** Get the returnTo path from stored PKCE state */
export function getPKCEReturnTo(): string {
  const raw = localStorage.getItem(YV_PKCE_KEY);
  if (!raw) return "/board";
  try {
    const state: PKCEState = JSON.parse(raw);
    return state.returnTo || "/board";
  } catch {
    return "/board";
  }
}

/** Clear YouVersion auth */
export function clearYouVersionAuth(): void {
  localStorage.removeItem(YV_TOKENS_KEY);
  localStorage.removeItem(YV_PKCE_KEY);
}
