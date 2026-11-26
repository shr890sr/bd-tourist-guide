const crypto = require('node:crypto');
const { promisify } = require('node:util');
const { HttpError } = require('./errors');
const scrypt = promisify(crypto.scrypt);
function secret() { const value = process.env.AUTH_SECRET; if (!value || value.length < 32) throw new HttpError(503, 'Authentication is not configured. Set AUTH_SECRET to a random value of at least 32 characters.', 'auth_not_configured'); return value; }
function assertAuthConfigured() { secret(); }
async function hashPassword(password) { const salt = crypto.randomBytes(16); const derived = await scrypt(password, salt, 64); return `scrypt$${salt.toString('hex')}$${derived.toString('hex')}`; }
async function verifyPassword(password, encoded) {
  const [scheme, saltHex, hashHex] = String(encoded).split('$'); if (scheme !== 'scrypt' || !saltHex || !hashHex) return false;
  const derived = await scrypt(password, Buffer.from(saltHex, 'hex'), 64); const expected = Buffer.from(hashHex, 'hex'); return expected.length === derived.length && crypto.timingSafeEqual(expected, derived);
}
function signToken(user) {
  const key = secret(); const now = Math.floor(Date.now() / 1000);
  const payload = Buffer.from(JSON.stringify({ sub: user.id, role: user.role, ver: user.token_version, iat: now, exp: now + 60 * 60 * 12 })).toString('base64url');
  const sig = crypto.createHmac('sha256', key).update(payload).digest('base64url'); return `${payload}.${sig}`;
}
function readToken(token) {
  const [payload, signature, extra] = String(token).split('.'); if (!payload || !signature || extra) throw new HttpError(401, 'Invalid or expired authentication token.', 'invalid_token');
  const expected = crypto.createHmac('sha256', secret()).update(payload).digest(); let actual;
  try { actual = Buffer.from(signature, 'base64url'); } catch { throw new HttpError(401, 'Invalid or expired authentication token.', 'invalid_token'); }
  if (expected.length !== actual.length || !crypto.timingSafeEqual(expected, actual)) throw new HttpError(401, 'Invalid or expired authentication token.', 'invalid_token');
  let claims; try { claims = JSON.parse(Buffer.from(payload, 'base64url').toString()); } catch { throw new HttpError(401, 'Invalid or expired authentication token.', 'invalid_token'); }
  if (!Number.isSafeInteger(claims.sub) || !Number.isInteger(claims.exp) || claims.exp <= Date.now() / 1000) throw new HttpError(401, 'Invalid or expired authentication token.', 'invalid_token');
  return claims;
}
module.exports = { hashPassword, verifyPassword, signToken, readToken, assertAuthConfigured };
