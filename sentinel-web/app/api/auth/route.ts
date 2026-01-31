import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { username, password } = body;

    // --- HARDCODED CREDENTIALS ---
    const ADMIN_USER = "admin";
    const ADMIN_PASS = "sentinel2026";

    if (username === ADMIN_USER && password === ADMIN_PASS) {
      // 1. Buat Response Sukses dulu
      const response = NextResponse.json({ success: true });
      
      // 2. Tempelkan Cookie ke Response tersebut (Cara Paling Aman di Next.js 15)
      response.cookies.set('sentinel_token', 'access_granted_secure_hash', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        maxAge: 60 * 60 * 24, // 1 hari
        path: '/',
      });

      // 3. Kirim Response yang sudah ada cookienya
      return response;
    }

    return NextResponse.json({ success: false }, { status: 401 });

  } catch (e) {
    return NextResponse.json({ error: 'Server Error' }, { status: 500 });
  }
}