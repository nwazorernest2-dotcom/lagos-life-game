const express = require('express');
const session = require('express-session');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_FILE = path.join(__dirname, 'data.json');
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'admin';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'change-this-admin-password';

app.use(express.json({ limit: '20kb' }));
app.use(session({
  name: 'lagosgame.sid',
  secret: process.env.SESSION_SECRET || 'development-only-change-me-before-deploying',
  resave: false,
  saveUninitialized: false,
  cookie: { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', maxAge: 8 * 60 * 60 * 1000 }
}));
app.use(express.static(path.join(__dirname, 'public')));

function readData() {
  try { return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')); }
  catch { return { users: [], attempts: [] }; }
}
function writeData(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), { mode: 0o600 });
}
function hashPassword(password, salt = crypto.randomBytes(16).toString('hex')) {
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return { salt, hash };
}
function verifyPassword(password, salt, expected) {
  const actual = crypto.scryptSync(password, salt, 64);
  const target = Buffer.from(expected, 'hex');
  return actual.length === target.length && crypto.timingSafeEqual(actual, target);
}
function cleanUsername(value) {
  return typeof value === 'string' ? value.trim().slice(0, 32) : '';
}
function recordAttempt(username, status) {
  const db = readData();
  db.attempts.unshift({ username: username || '(blank)', status, at: new Date().toISOString() });
  db.attempts = db.attempts.slice(0, 500);
  writeData(db);
}
function requireUser(req, res, next) {
  if (!req.session.user) return res.status(401).json({ error: 'Please log in first.' });
  next();
}
function requireAdmin(req, res, next) {
  if (!req.session.admin) return res.status(401).json({ error: 'Admin login required.' });
  next();
}

app.post('/api/register', (req, res) => {
  const username = cleanUsername(req.body.username);
  const password = typeof req.body.password === 'string' ? req.body.password : '';
  if (!/^[a-zA-Z0-9_.-]{3,32}$/.test(username) || password.length < 8 || password.length > 128) {
    return res.status(400).json({ error: 'Use a 3–32 character username and a game password of at least 8 characters.' });
  }
  const db = readData();
  if (db.users.some(u => u.username.toLowerCase() === username.toLowerCase())) {
    recordAttempt(username, 'SIGNUP_REJECTED');
    return res.status(409).json({ error: 'That game username is already taken.' });
  }
  const cred = hashPassword(password);
  db.users.push({ username, salt: cred.salt, passwordHash: cred.hash, balance: 1000000, createdAt: new Date().toISOString() });
  writeData(db);
  recordAttempt(username, 'ACCOUNT_CREATED');
  req.session.user = username;
  res.json({ ok: true, username, balance: 1000000 });
});

app.post('/api/login', (req, res) => {
  const username = cleanUsername(req.body.username);
  const password = typeof req.body.password === 'string' ? req.body.password : '';
  const db = readData();
  const user = db.users.find(u => u.username.toLowerCase() === username.toLowerCase());
  if (!user || !verifyPassword(password, user.salt, user.passwordHash)) {
    recordAttempt(username, 'LOGIN_FAILED');
    return res.status(401).json({ error: 'Login failed. Check your game username and password.' });
  }
  recordAttempt(username, 'LOGIN_SUCCESS');
  req.session.user = user.username;
  res.json({ ok: true, username: user.username, balance: user.balance });
});

app.post('/api/logout', (req, res) => {
  req.session.destroy(() => res.json({ ok: true }));
});
app.get('/api/me', requireUser, (req, res) => {
  const db = readData();
  const user = db.users.find(u => u.username === req.session.user);
  if (!user) return res.status(401).json({ error: 'Account not found.' });
  res.json({ username: user.username, balance: user.balance });
});

app.post('/api/admin/login', (req, res) => {
  const username = typeof req.body.username === 'string' ? req.body.username : '';
  const password = typeof req.body.password === 'string' ? req.body.password : '';
  if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
    req.session.admin = true;
    return res.json({ ok: true });
  }
  res.status(401).json({ error: 'Admin login failed.' });
});
app.get('/api/admin/data', requireAdmin, (req, res) => {
  const db = readData();
  res.json({
    users: db.users.map(u => ({ username: u.username, balance: u.balance, createdAt: u.createdAt })),
    attempts: db.attempts
  });
});
app.post('/api/admin/logout', requireAdmin, (req, res) => {
  req.session.admin = false;
  res.json({ ok: true });
});

app.listen(PORT, () => console.log(`Fictional game running on port ${PORT}`));
