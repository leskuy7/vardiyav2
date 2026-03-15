import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { getDefaultRouteForRole, isRoleAllowed, verifySessionToken } from './lib/server-auth';

const PUBLIC_PATHS = ['/', '/login', '/bootstrap-admin', '/aydinlatma-metni'];

function isPublicPath(pathname: string) {
  return PUBLIC_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`));
}

export async function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const accessToken = request.cookies.get('access_token')?.value;
  const refreshToken = request.cookies.get('refresh_token')?.value;
  const session = accessToken ? await verifySessionToken(accessToken) : null;
  const isPublic = isPublicPath(pathname);

  if (isPublic && session) {
    return NextResponse.redirect(new URL(getDefaultRouteForRole(session.role), request.url));
  }

  if (isPublic) {
    return NextResponse.next();
  }

  if (!session && !refreshToken) {
    const loginUrl = new URL('/login', request.url);
    if (pathname !== '/login') {
      loginUrl.searchParams.set('next', `${pathname}${search}`);
    }
    return NextResponse.redirect(loginUrl);
  }

  if (session && !isRoleAllowed(pathname, session.role)) {
    return NextResponse.redirect(new URL(getDefaultRouteForRole(session.role), request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|icon.svg|icons|manifest.json|manifest.webmanifest).*)'],
};