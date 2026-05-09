import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const PUBLIC_PATHS = ['/login'];

export async function middleware(request: NextRequest): Promise<NextResponse> {
  const { pathname } = request.nextUrl;

  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  const apiUrl =
    process.env.API_INTERNAL_URL ??
    process.env.NEXT_PUBLIC_API_URL ??
    'http://localhost:3001';

  try {
    const res = await fetch(`${apiUrl}/auth/get-session`, {
      headers: { cookie: request.headers.get('cookie') ?? '' },
    });

    const session = await res.json().catch(() => null) as unknown;

    if (!session || typeof session !== 'object' || !('user' in (session as object))) {
      return NextResponse.redirect(new URL('/login', request.url));
    }
  } catch {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  return NextResponse.next();
}

export const config = {
  // Protect all routes except Next.js internals, static files and login
  matcher: ['/((?!_next/static|_next/image|favicon.ico|login).*)'],
};
