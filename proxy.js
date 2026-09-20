import { NextResponse } from 'next/server';

export function proxy(request) {
  const { pathname } = request.nextUrl;
  const onboarded = request.cookies.get('bomba-onboarded')?.value === '1';

  if (pathname === '/' && !onboarded) {
    return NextResponse.redirect(new URL('/onboarding', request.url));
  }

  if (pathname === '/onboarding' && onboarded) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|manifest\\.json|sw\\.js|.*\\.(?:png|jpg|jpeg|svg|ico|js|css|woff2?|webmanifest)$).*)'],
};