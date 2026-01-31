// File: src/app/api/auth/logout/route.ts
import { NextResponse } from 'next/server';

export async function POST() {
  const response = NextResponse.json({ success: true });

  // Hapus Cookie dengan cara menimpanya dan set kadaluarsa sekarang juga
  response.cookies.set('sentinel_token', '', { 
    expires: new Date(0), 
    path: '/' 
  });

  return response;
}