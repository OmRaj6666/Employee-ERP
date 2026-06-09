const express = require('express');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { Pool } = require('pg');
const fs = require('fs');
const http = require('http');
const https = require('https');
const crypto = require('crypto');

const app = express();
app.disable('x-powered-by');

// ---------- Environment config ----------
const PORT = Number(process.env.PORT || 3000);
const HOST = '0.0.0.0';

const FORCE_HTTPS = process.env.FORCE_HTTPS === 'true';
const COOKIE_SECURE = process.env.COOKIE_SECURE === 'true' || FORCE_HTTPS;

const APP_ORIGIN =
  process.env.APP_ORIGIN ||
  `http://localhost:${PORT}`;

const ADMIN_USER = process.env.ADMIN_USER || 'admin';
const ADMIN_PASS = process.env.ADMIN_PASS || 'admin123';
const SESSION_TTL_MINUTES = Number(process.env.SESSION_TTL_MINUTES || 30);
const SESSION_TTL_MS = 1000 * 60 * SESSION_TTL_MINUTES;
const sessions = new Map();

// ---------- Security middleware ----------
app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
  })
);

app.use(express.static('public'));
app.use(express.json({ limit: '16kb' }));

const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
});

const authLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
});

const mutateLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
});

app.use(globalLimiter);

if (FORCE_HTTPS) {
  app.use((req, res, next) => {
    const proto = req.headers['x-forwarded-proto'];
    if (proto && proto !== 'https') {
      return res.redirect(301, `https://${req.headers.host}${req.url}`);
    }
    return next();
  });
}

// ---------- DB setup ----------
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

let useInMemory = false;
const memoryStore = { employees: [], nextId: 1 };

async function initDb() {
  try {
    const client = await pool.connect();
    client.release();
    console.log('Postgres connection OK — running with Postgres');
  } catch (err) {
    useInMemory = true;
    console.error('Postgres unavailable — using in-memory fallback:', err.message || err);
    memoryStore.employees.push({
      emp_id: memoryStore.nextId++,
      fname: 'Demo',
      lname: 'User',
      email: 'demo@example.com',
      dept: 'Engineering',
      salary: 60000,
      created_at: new Date(),
    });
  }
}

// ---------- Utility helpers ----------
function parseCookies(req) {
  const header = req.headers.cookie;
  if (!header) return {};
  const out = {};
  header.split(';').forEach((pair) => {
    const idx = pair.indexOf('=');
    if (idx === -1) return;
    const k = pair.slice(0, idx).trim();
    const v = decodeURIComponent(pair.slice(idx + 1).trim());
    out[k] = v;
  });
  return out;
}

function issueSession(res) {
  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = Date.now() + SESSION_TTL_MS;
  sessions.set(token, expiresAt);

  const cookieParts = [
    `rc_session=${encodeURIComponent(token)}`,
    'HttpOnly',
    'Path=/',
    'SameSite=Strict',
    `Max-Age=${Math.floor(SESSION_TTL_MS / 1000)}`,
  ];
  if (COOKIE_SECURE) cookieParts.push('Secure');
  res.setHeader('Set-Cookie', cookieParts.join('; '));
}

function clearSession(res) {
  const cookieParts = [
    'rc_session=',
    'HttpOnly',
    'Path=/',
    'SameSite=Strict',
    'Max-Age=0',
  ];
  if (COOKIE_SECURE) cookieParts.push('Secure');
  res.setHeader('Set-Cookie', cookieParts.join('; '));
}

function sanitizeText(v, max = 100) {
  if (typeof v !== 'string') return null;
  const t = v.trim();
  if (!t) return null;
  return t.slice(0, max);
}

function isAllowedOrigin(req) {
  const origin = req.headers.origin;
  if (!origin) return true; // curl / same-origin non-browser clients
  return origin === APP_ORIGIN;
}

function requireAuth(req, res, next) {
  const cookies = parseCookies(req);
  const token = cookies.rc_session;
  if (!token) return res.status(401).json({ error: 'Unauthorized' });

  const exp = sessions.get(token);
  if (!exp || exp < Date.now()) {
    sessions.delete(token);
    return res.status(401).json({ error: 'Session expired' });
  }

  // Sliding session
  sessions.set(token, Date.now() + SESSION_TTL_MS);
  return next();
}

function requireAllowedOrigin(req, res, next) {
  if (!isAllowedOrigin(req)) {
    return res.status(403).json({ error: 'Forbidden origin' });
  }
  return next();
}

// ---------- Auth routes ----------
app.post('/auth/login', authLimiter, requireAllowedOrigin, (req, res) => {
  const user = sanitizeText(req.body?.username, 64);
  const pass = typeof req.body?.password === 'string' ? req.body.password : '';

  const userMatch = user === ADMIN_USER;
  const passMatch = pass === ADMIN_PASS;

  // Constant-time-ish compare usage on hashes
  const userHash = crypto.createHash('sha256').update(user || '').digest();
  const expectedUserHash = crypto.createHash('sha256').update(ADMIN_USER).digest();
  const passHash = crypto.createHash('sha256').update(pass).digest();
  const expectedPassHash = crypto.createHash('sha256').update(ADMIN_PASS).digest();

  const secureUserMatch = crypto.timingSafeEqual(userHash, expectedUserHash);
  const securePassMatch = crypto.timingSafeEqual(passHash, expectedPassHash);

  if (!(userMatch && passMatch && secureUserMatch && securePassMatch)) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  issueSession(res);
  return res.json({ success: true });
});

app.post('/auth/logout', requireAuth, (req, res) => {
  const cookies = parseCookies(req);
  if (cookies.rc_session) sessions.delete(cookies.rc_session);
  clearSession(res);
  return res.json({ success: true });
});

app.get('/auth/me', (req, res) => {
  const cookies = parseCookies(req);
  const token = cookies.rc_session;
  const exp = token ? sessions.get(token) : null;
  const authenticated = Boolean(exp && exp > Date.now());
  return res.json({ authenticated });
});

// ---------- Employees routes ----------
app.get('/employees', requireAuth, async (req, res) => {
  try {
    if (!useInMemory) {
      const result = await pool.query('SELECT * FROM employees ORDER BY emp_id');
      return res.json(result.rows);
    }

    return res.json(memoryStore.employees.slice().sort((a, b) => a.emp_id - b.emp_id));
  } catch (err) {
    console.error(err);
    return res.status(500).send('Internal server error');
  }
});

app.post('/employees', mutateLimiter, requireAuth, requireAllowedOrigin, async (req, res) => {
  try {
    const fname = sanitizeText(req.body?.fname, 80);
    const lname = sanitizeText(req.body?.lname, 80);
    const email = sanitizeText(req.body?.email, 120);
    const dept = sanitizeText(req.body?.dept, 80);
    const salaryRaw = sanitizeText(String(req.body?.salary ?? ''), 20);

    if (!fname || !lname) {
      return res.status(400).json({ error: 'fname and lname are required' });
    }

    let salary = null;
    if (salaryRaw) {
      if (!/^\d+(\.\d{1,2})?$/.test(salaryRaw)) {
        return res.status(400).json({ error: 'salary must be a valid number' });
      }
      salary = Number(salaryRaw);
    }

    if (!useInMemory) {
      const result = await pool.query(
        'INSERT INTO employees (fname, lname, email, dept, salary) VALUES ($1,$2,$3,$4,$5) RETURNING *',
        [fname, lname, email || null, dept || null, salary]
      );
      return res.status(201).json(result.rows[0]);
    }

    const row = {
      emp_id: memoryStore.nextId++,
      fname,
      lname,
      email: email || null,
      dept: dept || null,
      salary,
      created_at: new Date(),
    };
    memoryStore.employees.push(row);
    return res.status(201).json(row);
  } catch (err) {
    console.error(err);
    return res.status(500).send('Internal server error');
  }
});

app.delete('/employees/:id', mutateLimiter, requireAuth, requireAllowedOrigin, async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ error: 'invalid id' });
    }

    if (!useInMemory) {
      const result = await pool.query('DELETE FROM employees WHERE emp_id = $1', [id]);
      if (result.rowCount === 0) return res.status(404).json({ error: 'Not found' });
      return res.json({ success: true });
    }

    const idx = memoryStore.employees.findIndex((e) => Number(e.emp_id) === id);
    if (idx === -1) return res.status(404).json({ error: 'Not found' });
    memoryStore.employees.splice(idx, 1);
    return res.json({ success: true });
  } catch (err) {
    console.error(err);
    return res.status(500).send('Internal server error');
  }
});

// ---------- Startup ----------
async function start() {
  await initDb();

  const keyPath = process.env.HTTPS_KEY_PATH;
  const certPath = process.env.HTTPS_CERT_PATH;

  if (keyPath && certPath) {
    const key = fs.readFileSync(keyPath);
    const cert = fs.readFileSync(certPath);
    https.createServer({ key, cert }, app).listen(PORT, HOST, () => {
      console.log(`Secure server running on https://${HOST}:${PORT}`);
    });
    return;
  }

  http.createServer(app).listen(PORT, HOST, () => {
    console.log(`Server running on http://${HOST}:${PORT}`);
    console.log('Tip: set HTTPS_KEY_PATH and HTTPS_CERT_PATH for TLS');
  });
}

start().catch((err) => {
  console.error('Fatal startup error:', err);
  process.exit(1);
});
