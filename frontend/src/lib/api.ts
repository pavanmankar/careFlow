export class ApiClientError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = 'ApiClientError';
  }
}

type ApiSuccess<T> = { data: T };
type ApiFailure = { code: string; message: string };

const TOKEN_KEY = 'careflow_access_token';
const LEGACY_TOKEN_KEY = 'ubp_access_token';
const LOCATION_KEY = 'careflow_active_location_id';

function migrateLegacyToken(storage: Storage) {
  const legacy = storage.getItem(LEGACY_TOKEN_KEY);
  if (!legacy) {
    return null;
  }
  storage.setItem(TOKEN_KEY, legacy);
  storage.removeItem(LEGACY_TOKEN_KEY);
  return legacy;
}

export function getAccessToken() {
  if (typeof window === 'undefined') {
    return null;
  }
  const session = window.sessionStorage.getItem(TOKEN_KEY);
  if (session) {
    return session;
  }
  const migratedSession = migrateLegacyToken(window.sessionStorage);
  if (migratedSession) {
    return migratedSession;
  }
  const legacyLocal = window.localStorage.getItem(LEGACY_TOKEN_KEY);
  if (legacyLocal) {
    window.sessionStorage.setItem(TOKEN_KEY, legacyLocal);
    window.localStorage.removeItem(LEGACY_TOKEN_KEY);
    return legacyLocal;
  }
  return null;
}

export function setAccessToken(token: string | null) {
  if (typeof window === 'undefined') {
    return;
  }
  if (token) {
    window.sessionStorage.setItem(TOKEN_KEY, token);
  } else {
    window.sessionStorage.removeItem(TOKEN_KEY);
    clearActiveLocationId();
  }
  window.sessionStorage.removeItem(LEGACY_TOKEN_KEY);
  window.localStorage.removeItem(LEGACY_TOKEN_KEY);
}

export function getActiveLocationId() {
  if (typeof window === 'undefined') {
    return null;
  }
  return window.sessionStorage.getItem(LOCATION_KEY);
}

export function setActiveLocationId(id: string | null) {
  if (typeof window === 'undefined') {
    return;
  }
  if (id) {
    window.sessionStorage.setItem(LOCATION_KEY, id);
  } else {
    window.sessionStorage.removeItem(LOCATION_KEY);
  }
}

export function clearActiveLocationId() {
  if (typeof window === 'undefined') {
    return;
  }
  window.sessionStorage.removeItem(LOCATION_KEY);
}

async function parse<T>(response: Response): Promise<T> {
  const payload = (await response.json()) as ApiSuccess<T> & ApiFailure;
  if (!response.ok) {
    throw new ApiClientError(payload.code ?? 'ERROR', payload.message ?? 'Request failed', response.status);
  }
  return payload.data;
}

let inflight = 0;
let holds = 0;
let holdMessage = 'Loading';
const progressListeners = new Set<(state: { active: boolean; blocking: boolean; message: string }) => void>();

function progressState() {
  return {
    active: inflight + holds > 0,
    blocking: holds > 0,
    message: holdMessage,
  };
}

function notifyProgress() {
  const state = progressState();
  progressListeners.forEach((listener) => listener(state));
}

export function subscribeApiProgress(listener: (state: { active: boolean; blocking: boolean; message: string }) => void) {
  progressListeners.add(listener);
  listener(progressState());
  return () => {
    progressListeners.delete(listener);
  };
}

export function setApiBusy(busy: boolean, message = 'Loading') {
  if (busy) {
    holds += 1;
    holdMessage = message;
  } else {
    holds = Math.max(0, holds - 1);
    if (holds === 0) {
      holdMessage = 'Loading';
    }
  }
  notifyProgress();
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set('Content-Type', 'application/json');
  const token = getAccessToken();
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  const locationId = getActiveLocationId();
  if (locationId) {
    headers.set('X-Location-Id', locationId);
  }
  const baseUrl = (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001').replace(/\/$/, '');
  inflight += 1;
  notifyProgress();
  try {
    const response = await fetch(`${baseUrl}${path}`, {
      ...init,
      headers,
      credentials: 'include',
    });
    if (response.status === 401 && typeof window !== 'undefined' && !window.location.pathname.startsWith('/login')) {
      setAccessToken(null);
      window.location.href = '/login';
    }
    return await parse<T>(response);
  } catch (err) {
    if (err instanceof ApiClientError) {
      throw err;
    }
    const target = baseUrl || 'this origin';
    throw new ApiClientError(
      'NETWORK_ERROR',
      `Cannot reach the API at ${target}. Confirm the backend is running and NEXT_PUBLIC_API_URL is set for this environment.`,
      0,
    );
  } finally {
    inflight = Math.max(0, inflight - 1);
    notifyProgress();
  }
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: 'POST', body: body ? JSON.stringify(body) : undefined }),
  patch: <T>(path: string, body?: unknown) => request<T>(path, { method: 'PATCH', body: JSON.stringify(body) }),
  put: <T>(path: string, body?: unknown) => request<T>(path, { method: 'PUT', body: JSON.stringify(body) }),
  del: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
};
