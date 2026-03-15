import { jwtVerify } from 'jose/jwt/verify';
import type { JWTPayload } from 'jose';
import type { AuthUser } from '../hooks/use-auth';

type SessionRole = 'ADMIN' | 'MANAGER' | 'EMPLOYEE';

export type SessionPayload = JWTPayload & {
  sub: string;
  email: string;
  role: SessionRole;
  employeeId?: string;
  organizationId?: string;
};

const encoder = new TextEncoder();

function getAccessSecret() {
  const secret = process.env.JWT_ACCESS_SECRET;
  if (!secret) {
    return null;
  }
  return encoder.encode(secret);
}

export async function verifySessionToken(token: string): Promise<SessionPayload | null> {
  try {
    const secret = getAccessSecret();
    if (!secret) {
      return null;
    }

    const { payload } = await jwtVerify(token, secret);
    if (typeof payload.sub !== 'string' || typeof payload.email !== 'string' || typeof payload.role !== 'string') {
      return null;
    }

    return payload as SessionPayload;
  } catch {
    return null;
  }
}

function getServerApiBase() {
  const apiUrl = (process.env.NEXT_PUBLIC_API_URL ?? '').trim();
  if (apiUrl) {
    return apiUrl.replace(/\/$/, '');
  }

  const apiBase = (process.env.NEXT_PUBLIC_API_BASE ?? '').trim();
  if (apiBase) {
    return `${apiBase.replace(/\/$/, '')}/api`;
  }

  return 'http://127.0.0.1:4000/api';
}

export async function fetchServerAuthUser(accessToken: string): Promise<AuthUser | null> {
  try {
    const response = await fetch(`${getServerApiBase()}/auth/me`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      cache: 'no-store',
    });

    if (!response.ok) {
      return null;
    }

    return (await response.json()) as AuthUser;
  } catch {
    return null;
  }
}

export function getDefaultRouteForRole(role: SessionRole) {
  return role === 'EMPLOYEE' ? '/my-shifts' : '/dashboard';
}

export function isRoleAllowed(pathname: string, role: SessionRole) {
  if (role === 'ADMIN') {
    return true;
  }

  if (role === 'MANAGER') {
    return !pathname.startsWith('/settings');
  }

  return ['/my-shifts', '/availability', '/leaves', '/profile'].some(
    (path) => pathname === path || pathname.startsWith(`${path}/`),
  );
}