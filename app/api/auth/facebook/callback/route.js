import { NextResponse } from 'next/server';
import { exchangeCode, findOrCreateSocialUser } from '../../../../../lib/social-auth';
const { generateToken } = require('../../../../../lib/auth');

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const code = searchParams.get('code');
    const error = searchParams.get('error');
    if (error) {
      return NextResponse.redirect('/login?error=facebook');
    }
    if (!code) {
      return NextResponse.redirect('/login?error=facebook');
    }

    const profile = await exchangeCode('facebook', code);
    const user = await findOrCreateSocialUser('facebook', profile);
    if (user.blocked) {
      return NextResponse.redirect('/login?error=blocked');
    }

    const token = generateToken(user);
    const res = NextResponse.redirect('/');
    res.cookies.set('token', token, { httpOnly: true, maxAge: 60 * 60 * 24 * 7, path: '/' });
    res.cookies.set('bomba-onboarded', '1', { maxAge: 60 * 60 * 24 * 365, path: '/' });
    return res;
  } catch (e) {
    return NextResponse.redirect('/login?error=oauth');
  }
}