import { NextResponse } from 'next/server';
import {
  ADMIN_SESSION_COOKIE,
  adminSessionCookieValue,
  adminSessionMaxAge,
  isAdminAuthConfigured,
  verifyAdminToken,
} from '@/lib/admin-auth';

export const dynamic = 'force-dynamic';

function redirectTo(req: Request, path: string) {
  return NextResponse.redirect(new URL(path, req.url), { status: 303 });
}

export async function POST(req: Request) {
  const form = await req.formData().catch(() => null);
  const action = String(form?.get('action') || 'login');

  if (action === 'logout') {
    const res = redirectTo(req, '/admin/login');
    res.cookies.set(ADMIN_SESSION_COOKIE, '', {
      httpOnly: true,
      sameSite: 'strict',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: 0,
    });
    return res;
  }

  if (!isAdminAuthConfigured()) {
    return redirectTo(req, '/admin/login?error=not-configured');
  }

  const token = String(form?.get('token') || '');
  if (!verifyAdminToken(token)) {
    return redirectTo(req, '/admin/login?error=invalid');
  }

  const value = adminSessionCookieValue();
  if (!value) return redirectTo(req, '/admin/login?error=not-configured');

  const res = redirectTo(req, '/admin/experiences');
  res.cookies.set(ADMIN_SESSION_COOKIE, value, {
    httpOnly: true,
    sameSite: 'strict',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: adminSessionMaxAge(),
  });
  return res;
}
