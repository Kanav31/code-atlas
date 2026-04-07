import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const PUBLIC_PATHS = [
  '/',              // marketing landing page
  '/login',
  '/signup',
  '/forgot-password',
  '/reset-password',
  '/verify-email',
  '/auth/callback',
  '/auth/verified',
  '/unsubscribed',
  '/opengraph-image',
];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get('logged_in')?.value;

  const isPublic = PUBLIC_PATHS.some((p) =>
    p === '/'
      ? pathname === '/'
      : pathname === p || pathname.startsWith(p + '/') || pathname.startsWith(p + '?'),
  );

  if (!token && !isPublic) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('next', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // For the landing page (/), the server component itself does the redirect;
  // for other public pages (login, signup, etc.), redirect authenticated users away.
  if (token && isPublic && pathname !== '/' && !pathname.startsWith('/auth/callback')) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)'],
};
