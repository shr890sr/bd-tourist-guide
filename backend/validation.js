const { HttpError } = require('./errors');
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
function object(value) { if (!value || typeof value !== 'object' || Array.isArray(value)) throw new HttpError(400, 'A JSON object is required.', 'invalid_body'); return value; }
function string(value, name, { min = 1, max = 2000, optional = false } = {}) {
  if (optional && (value === undefined || value === null || value === '')) return null;
  if (typeof value !== 'string' || value.trim().length < min || value.trim().length > max) throw new HttpError(400, `${name} must be between ${min} and ${max} characters.`, 'validation_error');
  return value.trim();
}
function email(value) { const result = string(value, 'Email', { max: 254 }).toLowerCase(); if (!emailPattern.test(result)) throw new HttpError(400, 'Enter a valid email address.', 'validation_error'); return result; }
function integer(value, name, { min = 1, max = Number.MAX_SAFE_INTEGER } = {}) { const n = Number(value); if (!Number.isSafeInteger(n) || n < min || n > max) throw new HttpError(400, `${name} must be a valid integer.`, 'validation_error'); return n; }
function list(value, name, max = 12) { if (!Array.isArray(value) || value.length > max || value.some(v => typeof v !== 'string' || !v.trim() || v.length > 60)) throw new HttpError(400, `${name} must be a list of up to ${max} text values.`, 'validation_error'); return [...new Set(value.map(v => v.trim()))]; }
function date(value, name) { const result = string(value, name, { max: 10 }); if (!/^\d{4}-\d{2}-\d{2}$/.test(result) || new Date(`${result}T00:00:00Z`).toISOString().slice(0, 10) !== result) throw new HttpError(400, `${name} must be a valid date in YYYY-MM-DD format.`, 'validation_error'); return result; }
module.exports = { object, string, email, integer, list, date };
