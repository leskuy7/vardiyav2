const STORAGE_KEY = 'vardiya_access_token';

function readStored(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

let accessToken: string | null = readStored();

export function getAccessToken() {
  if (accessToken !== null) return accessToken;
  accessToken = readStored();
  return accessToken;
}

export function setAccessToken(token: string | null) {
  accessToken = token;
  try {
    if (typeof window !== 'undefined') {
      if (token == null) window.localStorage.removeItem(STORAGE_KEY);
      else window.localStorage.setItem(STORAGE_KEY, token);
    }
  } catch {
    // ignore
  }
}
