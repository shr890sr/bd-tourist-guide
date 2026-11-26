const express = require('express');
const { HttpError, asyncRoute } = require('../errors');
const v = require('../validation');
const { hashPassword, verifyPassword, signToken, assertAuthConfigured } = require('../security');
const { publicUser } = require('../services/serializers');
module.exports = (db, auth, rateLimit) => {
  const router = express.Router(); const authLimit = rateLimit({ windowMs: 15 * 60 * 1000, max: 20 });
  router.post('/register', authLimit, asyncRoute(async (req, res) => {
    assertAuthConfigured(); const body = v.object(req.body); const fullName = v.string(body.fullName, 'Full name', { max: 120 }); const email = v.email(body.email);
    if (typeof body.password !== 'string' || body.password.length < 10 || body.password.length > 200) throw new HttpError(400, 'Password must be between 10 and 200 characters.', 'validation_error');
    const phone = v.string(body.phone, 'Phone number', { min: 7, max: 30, optional: true }); const passwordHash = await hashPassword(body.password);
    try { const result = db.prepare('INSERT INTO users(full_name,email,password_hash,phone) VALUES(?,?,?,?)').run(fullName,email,passwordHash,phone); const user = db.prepare('SELECT * FROM users WHERE id=?').get(result.lastInsertRowid); res.status(201).json({ user: publicUser(user), token: signToken(user) }); }
    catch (error) { if (String(error.message).includes('UNIQUE')) throw new HttpError(409, 'An account with this email already exists.', 'email_exists'); throw error; }
  }));
  router.post('/login', authLimit, asyncRoute(async (req,res) => {
    assertAuthConfigured(); const body=v.object(req.body); const email=v.email(body.email); if(typeof body.password!=='string'||body.password.length>200) throw new HttpError(400,'Email and password are required.','validation_error');
    const user=db.prepare('SELECT * FROM users WHERE email=?').get(email); const valid=user&&await verifyPassword(body.password,user.password_hash);
    if(!valid) throw new HttpError(401,'Email or password is incorrect.','invalid_credentials'); if(user.status!=='active') throw new HttpError(403,'This account is not active.','account_inactive');
    res.json({ user:publicUser(user),token:signToken(user) });
  }));
  router.post('/logout', auth.required, (req,res)=>{ db.prepare('UPDATE users SET token_version=token_version+1,updated_at=CURRENT_TIMESTAMP WHERE id=?').run(req.user.id); res.json({ message:'Signed out.' }); });
  router.get('/me', auth.required, (req,res)=>res.json({ user:publicUser(req.user) }));
  router.patch('/me', auth.required, (req,res)=>{
    const body=v.object(req.body); const name=body.fullName===undefined?req.user.full_name:v.string(body.fullName,'Full name',{max:120}); const phone=body.phone===undefined?req.user.phone:v.string(body.phone,'Phone number',{min:7,max:30,optional:true});
    db.prepare('UPDATE users SET full_name=?,phone=?,updated_at=CURRENT_TIMESTAMP WHERE id=?').run(name,phone,req.user.id); res.json({user:publicUser(db.prepare('SELECT * FROM users WHERE id=?').get(req.user.id))});
  });
  return router;
};
