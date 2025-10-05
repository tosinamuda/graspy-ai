import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // Get locale from cookie
  const locale = request.cookies.get('graspy_locale')?.value || 'en';

  // Clone the request headers
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-locale', locale);

  // Return response with the custom header
  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};
