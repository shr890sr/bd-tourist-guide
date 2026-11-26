const { readToken } = require('../security');
const { HttpError } = require('../errors');
function createAuth(database) {
  function optional(req, _res, next) {
    const header = req.get('authorization'); if (!header) { req.user = null; return next(); }
    try { const [kind, token] = header.split(' '); if (kind !== 'Bearer' || !token) throw new HttpError(401, 'Use a Bearer authentication token.', 'invalid_token');
      const claims = readToken(token); const user = database.prepare('SELECT id, full_name, email, phone, role, status, token_version FROM users WHERE id = ?').get(claims.sub);
      if (!user || user.status !== 'active' || user.token_version !== claims.ver) throw new HttpError(401, 'Invalid or expired authentication token.', 'invalid_token'); req.user = user; next();
    } catch (error) { next(error); }
  }
  function required(req, _res, next) { optional(req, _res, error => { if (error) return next(error); if (!req.user) return next(new HttpError(401, 'Sign in to access this resource.', 'authentication_required')); next(); }); }
  function roles(...allowed) { return (req, _res, next) => { if (!req.user) return next(new HttpError(401, 'Sign in to access this resource.', 'authentication_required')); if (!allowed.includes(req.user.role)) return next(new HttpError(403, 'You do not have permission to perform this action.', 'forbidden')); next(); }; }
  return { optional, required, roles };
}
module.exports = { createAuth };
