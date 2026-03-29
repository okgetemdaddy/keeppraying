/**
 * Headless YouVersion client — uses @youversion/platform-core only.
 * No React 19 dependency. Safe for React 18.
 */
import { ApiClient, BibleClient } from "@youversion/platform-core";

const appKey = import.meta.env.VITE_YOUVERSION_APP_KEY as string | undefined;

/** Lazily-created singleton so the app boots even without a key */
let _apiClient: ApiClient | null = null;
let _bibleClient: BibleClient | null = null;

export function getApiClient(): ApiClient {
  if (!_apiClient) {
    if (!appKey) {
      throw new Error("VITE_YOUVERSION_APP_KEY is not configured");
    }
    _apiClient = new ApiClient({ appKey });
  }
  return _apiClient;
}

export function getBibleClient(): BibleClient {
  if (!_bibleClient) {
    _bibleClient = new BibleClient(getApiClient());
  }
  return _bibleClient;
}

/** Check if the YouVersion integration is configured */
export function isYouVersionConfigured(): boolean {
  return !!appKey;
}
