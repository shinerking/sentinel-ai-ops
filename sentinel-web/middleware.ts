// File: src/middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // Ambil cookie 'sentinel_token'
  const token = request.cookies.get('sentinel_token');

  // Jika user mau masuk Dashboard (/) TAPI tidak punya token...
  if (request.nextUrl.pathname === '/') {
    if (!token) {
      // ...TENDANG ke halaman login!
      return NextResponse.redirect(new URL('/login', request.url));
    }
  }

  // Jika user sudah punya token TAPI mau buka halaman login...
  if (request.nextUrl.pathname === '/login') {
    if (token) {
      // ...Balikin ke Dashboard (ngapain login lagi?)
      return NextResponse.redirect(new URL('/', request.url));
    }
  }

  return NextResponse.next();
}

// Tentukan halaman mana saja yang dijaga
export const config = {
  matcher: ['/', '/login'],
};