const IP_MAX = 64;
const USER_AGENT_MAX = 512;

function asSingleString(value: string | string[] | undefined | null): string | null {
  if (value == null) {
    return null;
  }
  const raw = Array.isArray(value) ? value.join(', ') : value;
  const trimmed = raw.trim();
  return trimmed ? trimmed : null;
}

export function clipIp(ip: string | string[] | undefined | null): string | null {
  const raw = asSingleString(ip);
  return raw ? raw.slice(0, IP_MAX) : null;
}

export function clipUserAgent(userAgent: string | string[] | undefined | null): string | null {
  const raw = asSingleString(userAgent);
  return raw ? raw.slice(0, USER_AGENT_MAX) : null;
}

export function clipRequestMeta(meta: { ip?: string | string[] | null; userAgent?: string | string[] | null }) {
  return {
    ip: clipIp(meta.ip),
    userAgent: clipUserAgent(meta.userAgent),
  };
}
