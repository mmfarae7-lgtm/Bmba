import { NextResponse } from 'next/server';
import { exchangeCode, findOrCreateSocialUser } from '../../../../../lib/social-auth';
const { generateToken } = require('../../../../../lib/auth');

export async function GET(req) {
  try {
    const abs = (path) => new URL(path, req.url).toString();
    const { searchParams } = new URL(req.url);
    const code = searchParams.get('code');
    const error = searchParams.get('error');
    if (error) {
      return NextResponse.redirect(abs('/login?error=google'));
    }
    if (!code) {
      return NextResponse.redirect(abs('/login?error=google'));
    }

    const profile = await exchangeCode('google', code);
    const user = await findOrCreateSocialUser('google', profile);
    if (user.blocked) {
      return NextResponse.redirect(abs('/login?error=blocked'));
    }

    const token = generateToken(user);
    const res = NextResponse.redirect(abs('/'));
    res.cookies.set('token', token, { httpOnly: true, maxAge: 60 * 60 * 24 * 7, path: '/' });
    res.cookies.set('bomba-onboarded', '1', { maxAge: 60 * 60 * 24 * 365, path: '/' });
    return res;
  } catch (e) {
    return NextResponse.redirect(new URL('/login?error=oauth', req.url).toString());
  }
}