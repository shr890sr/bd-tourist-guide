function createRateLimit({ windowMs = 15 * 60 * 1000, max = 100, message = 'Too many requests. Please try again later.' } = {}) {
  const hits = new Map(); let lastSweep = Date.now();
  return (req, res, next) => {
    const now = Date.now(); if (now - lastSweep > windowMs) { for (const [key, record] of hits) if (record.until <= now) hits.delete(key); lastSweep = now; }
    const key = req.ip; let record = hits.get(key); if (!record || record.until <= now) record = { count: 0, until: now + windowMs };
    record.count++; hits.set(key, record); res.set('RateLimit-Limit', String(max)); res.set('RateLimit-Remaining', String(Math.max(0, max - record.count)));
    if (record.count > max) return res.status(429).json({ error: { code: 'rate_limited', message } }); next();
  };
}
module.exports = { createRateLimit };
