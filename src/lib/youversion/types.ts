/** Shared types for the headless YouVersion integration */

export interface VerseOfTheDayData {
  reference: string;       // e.g. "John 3:16"
  usfm: string;            // e.g. "JHN.3.16"
  html: string;            // formatted HTML from BibleClient
  copyright: string;       // version copyright text
  versionName: string;     // e.g. "NIV"
  imageUrl?: string;       // optional VOTD image
}

export interface PassageData {
  reference: string;
  usfm: string;
  html: string;
  copyright: string;
  versionName: string;
}

export interface YouVersionTokens {
  accessToken: string;
  refreshToken?: string;
  expiresAt: number;        // epoch ms
}

/** PKCE state stored before redirect */
export interface PKCEState {
  codeVerifier: string;
  returnTo: string;
}

/** Default Bible version — NIV */
export const DEFAULT_VERSION_ID = 111;

/** Local storage keys */
export const YV_TOKENS_KEY = "yv_tokens";
export const YV_PKCE_KEY = "yv_pkce_state";
