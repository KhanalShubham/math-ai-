/**
 * Local dev convenience only — prints a short-lived admin access token to
 * stdout. Admin accounts have no self-registration path by design (AD-009);
 * this script requires the same JWT_ACCESS_SECRET already in your local
 * .env, so it grants nothing a backend developer couldn't already do, it
 * just saves hand-writing a JWT to bootstrap one School record for the
 * frontend test harness (a teacher can't create their own School).
 *
 * Usage: npm run mint-admin-token
 */
import { randomBytes } from 'node:crypto';
import { signAccessToken } from '../src/modules/auth/token.service';

const token = signAccessToken({ sub: randomBytes(12).toString('hex'), role: 'admin' });
console.log(token);
