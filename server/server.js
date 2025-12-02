const express = require('express');
const cors = require('cors');
const crypto = require('crypto');
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const app = express();
const PORT = process.env.PORT || 3001;
const SALT_ROUNDS = 10;
const ENV_VARIABLES = [
  { key: 'PORT', label: 'Server port' },
  { key: 'NODE_ENV', label: 'Node environment' },
  { key: 'JWT_SECRET', label: 'JWT signing secret' },
  { key: 'JWT_EXPIRES_IN', label: 'JWT expiration (e.g., 7d, 1h)' },
  { key: 'DATABASE_URL', label: 'PostgreSQL connection URL (Railway)' },
  { key: 'DATABASE_SSL', label: 'Force Postgres SSL (true/false)' },
  { key: 'PGSSLMODE', label: 'Postgres SSL mode (require/disable)' },
  { key: 'PGHOST', label: 'Postgres host' },
  { key: 'PGPORT', label: 'Postgres port' },
  { key: 'PGUSER', label: 'Postgres user' },
  { key: 'PGPASSWORD', label: 'Postgres password' },
  { key: 'PGDATABASE', label: 'Postgres database' },
  { key: 'REDIS_URL', label: 'Redis connection URL (Railway)' },
  { key: 'REDIS_HOST', label: 'Redis host' },
  { key: 'REDIS_PORT', label: 'Redis port' },
  { key: 'REDIS_PASSWORD', label: 'Redis password' },
  { key: 'RAILWAY_ENVIRONMENT', label: 'Railway environment id' },
  { key: 'RAILWAY_ENVIRONMENT_NAME', label: 'Railway environment name' },
  { key: 'RAILWAY_PROJECT_ID', label: 'Railway project id' },
  { key: 'RAILWAY_SERVICE_NAME', label: 'Railway service name' },
  { key: 'RAILWAY_STATIC_URL', label: 'Railway static URL' },
];

app.use(cors());
app.use(express.json());

const normalizeRole = (role) => (role || 'unknown').toLowerCase();

const buildSslConfig = () => {
  const sslFlag = (process.env.PGSSLMODE || process.env.DATABASE_SSL || '').toLowerCase();
  if (['disable', 'off', 'false', '0'].includes(sslFlag)) return false;
  if (['require', 'true', '1', 'on'].includes(sslFlag)) return { rejectUnauthorized: false };
  if (process.env.DATABASE_URL && /railway/i.test(process.env.DATABASE_URL)) {
    return { rejectUnauthorized: false };
  }
  return false;
};

const connectionString = process.env.DATABASE_URL;
const pool = connectionString
  ? new Pool({
      connectionString,
      ssl: buildSslConfig(),
    })
  : null;

const initDb = async () => {
  if (!pool) {
    throw new Error('DATABASE_URL env var is not set');
  }

  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id UUID PRIMARY KEY,
      full_name TEXT NOT NULL,
      email TEXT NOT NULL,
      phone TEXT,
      role TEXT NOT NULL,
      password_hash TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  await pool.query(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_attribute
        WHERE attrelid = 'users'::regclass AND attname = 'email_normalized'
      ) THEN
        ALTER TABLE users ADD COLUMN email_normalized TEXT GENERATED ALWAYS AS (lower(email)) STORED;
      END IF;
    END
    $$;
  `);

  await pool.query(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'users_email_normalized_key'
      ) THEN
        ALTER TABLE users ADD CONSTRAINT users_email_normalized_key UNIQUE (email_normalized);
      END IF;
    END
    $$;
  `);

  await pool.query('CREATE INDEX IF NOT EXISTS users_role_idx ON users (role)');
  await pool.query('CREATE INDEX IF NOT EXISTS users_created_at_idx ON users (created_at DESC)');
};

const dbReady = (async () => {
  if (!pool) {
    console.warn('DATABASE_URL not set; API auth endpoints will fail until it is provided.');
    return;
  }
  await initDb();
})().catch((error) => {
  console.error('Database initialization failed:', error);
  throw error;
});

const assertDbReady = async () => {
  if (!pool) {
    throw new Error('DATABASE_URL env var is not set');
  }
  return dbReady;
};

const mapDbUser = (row = {}) => ({
  id: row.id,
  fullName: row.full_name,
  email: row.email,
  phone: row.phone || '',
  role: row.role,
  createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : row.created_at,
});

const getUserByEmail = async (email) => {
  await assertDbReady();
  const result = await pool.query(
    'SELECT * FROM users WHERE email_normalized = lower($1) LIMIT 1',
    [email || '']
  );
  return result.rows[0] || null;
};

const getJwtSecret = () => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET env var is not set');
  }
  return secret;
};

const signJwt = (userId) => {
  const secret = getJwtSecret();
  const expiresIn = process.env.JWT_EXPIRES_IN || '7d';
  return jwt.sign({ sub: userId }, secret, { expiresIn });
};

const redactValue = (value = '') => {
  const normalized = value.trim();
  if (!normalized) return '';
  if (normalized.length <= 8) {
    return '*'.repeat(normalized.length || 4);
  }
  return `${normalized.slice(0, 4)}…${normalized.slice(-4)}`;
};

const escapeHtml = (value = '') =>
  String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const escapeAttribute = (value = '') =>
  String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

app.get('/', (req, res) => {
  res.send(`
    <h1>Ninofi API Server</h1>
    <p>Available endpoints:</p>
    <ul>
      <li>POST /api/auth/register - Register a new user (Postgres)</li>
      <li>POST /api/auth/login - Login with existing user (Postgres)</li>
      <li>POST /api/users - (Legacy) Save raw user data to Postgres</li>
      <li>GET /api/users/:role - Fetch users for a role (Postgres)</li>
      <li>GET /env - View environment variables (Railway, Postgres, Redis)</li>
    </ul>
  `);
});

app.get('/api/health', async (_req, res) => {
  const dbStatus = pool ? 'configured' : 'missing DATABASE_URL';
  res.json({ status: 'ok', db: dbStatus, timestamp: new Date().toISOString() });
});

app.get('/env', (_req, res) => {
  const envVars = ENV_VARIABLES.map(({ key, label }) => {
    const rawValue = process.env[key] || '';
    const hasValue = Boolean(rawValue);
    const redacted = hasValue ? redactValue(rawValue) : 'not set';
    return {
      key,
      label,
      rawValue,
      hasValue,
      redacted,
    };
  });

  const tableRows = envVars
    .map(
      ({ key, label, rawValue, hasValue, redacted }) => `
      <tr>
        <td>
          <div class="label">${escapeHtml(label || 'Environment variable')}</div>
          <div class="key">${escapeHtml(key)}</div>
        </td>
        <td>
          <code
            class="env-value${hasValue ? '' : ' empty'}"
            data-full="${escapeAttribute(rawValue)}"
            data-redacted="${escapeAttribute(redacted)}"
            data-has-value="${hasValue}"
          >
            ${escapeHtml(redacted)}
          </code>
        </td>
      </tr>`
    )
    .join('');

  res.send(`<!doctype html>
  <html lang="en">
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <title>Ninofi Env Vars</title>
      <style>
        :root {
          color-scheme: light;
          font-family: "SFMono-Regular", Menlo, Consolas, "Liberation Mono", monospace;
        }
        body {
          margin: 0;
          padding: 32px;
          background: #0f172a;
          color: #e2e8f0;
        }
        .page {
          max-width: 900px;
          margin: 0 auto;
        }
        h1 {
          margin: 0 0 12px;
          font-size: 28px;
          letter-spacing: -0.02em;
        }
        p.lead {
          margin: 0 0 20px;
          color: #cbd5e1;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          background: #0b1224;
          border: 1px solid #1f2937;
          border-radius: 12px;
          overflow: hidden;
        }
        th, td {
          padding: 14px 16px;
          text-align: left;
          border-bottom: 1px solid #1f2937;
        }
        th {
          background: #11182d;
          color: #94a3b8;
          font-size: 12px;
          letter-spacing: 0.08em;
          text-transform: uppercase;
        }
        tr:last-child td {
          border-bottom: none;
        }
        .label {
          font-weight: 600;
          color: #e2e8f0;
        }
        .key {
          color: #94a3b8;
          font-size: 12px;
          margin-top: 4px;
        }
        code {
          display: inline-block;
          padding: 6px 8px;
          background: #0f172a;
          border-radius: 8px;
          color: #cbd5e1;
          border: 1px solid #1e293b;
          min-width: 220px;
        }
        code.empty {
          color: #94a3b8;
        }
        .actions {
          margin: 0 0 16px;
          display: flex;
          gap: 10px;
        }
        button {
          border: 1px solid #1d4ed8;
          background: #1d4ed8;
          color: white;
          padding: 10px 14px;
          border-radius: 10px;
          font-weight: 600;
          cursor: pointer;
        }
        button:hover {
          background: #1e3fa3;
        }
        .hint {
          color: #94a3b8;
          font-size: 12px;
          margin-top: 6px;
        }
      </style>
    </head>
    <body>
      <div class="page">
        <h1>Environment variables</h1>
        <p class="lead">Railway stack (server, Postgres, Redis) env vars that this service can read.</p>
        <div class="actions">
          <button id="toggle-values">Show full values</button>
        </div>
        <table>
          <thead>
            <tr>
              <th>Variable</th>
              <th>Value</th>
            </tr>
          </thead>
          <tbody>
            ${tableRows}
          </tbody>
        </table>
        <p class="hint">Values are redacted by default; click the button to reveal.</p>
      </div>
      <script>
        (function() {
          const toggle = document.getElementById('toggle-values');
          const values = Array.from(document.querySelectorAll('.env-value'));
          let showFull = false;

          const render = () => {
            values.forEach((el) => {
              const hasValue = el.dataset.hasValue === 'true';
              if (!hasValue) return;
              el.textContent = showFull ? (el.dataset.full || '') : (el.dataset.redacted || '');
            });
            toggle.textContent = showFull ? 'Hide values' : 'Show full values';
          };

          toggle?.addEventListener('click', () => {
            showFull = !showFull;
            render();
          });

          render();
        })();
      </script>
    </body>
  </html>`);
});

app.post('/api/auth/register', async (req, res) => {
  try {
    const { fullName, email, password, role, phone } = req.body || {};

    if (!fullName || !email || !password || !role) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    const normalizedRole = normalizeRole(role);
    await assertDbReady();

    const existingUser = await getUserByEmail(email);
    if (existingUser) {
      return res.status(409).json({ message: 'User already exists' });
    }

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
    const userId =
      crypto.randomUUID?.() || crypto.randomBytes(16).toString('hex');
    const result = await pool.query(
      `
        INSERT INTO users (id, full_name, email, phone, role, password_hash)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *
      `,
      [userId, fullName, email, phone || '', normalizedRole, passwordHash]
    );

    return res.status(201).json({
      user: mapDbUser(result.rows[0]),
      token: signJwt(userId),
    });
  } catch (error) {
    console.error('Error registering user:', error);
    const message = !pool
      ? 'Database is not configured (set DATABASE_URL)'
      : error?.message?.includes('JWT_SECRET')
      ? 'JWT secret is not configured (set JWT_SECRET)'
      : 'Failed to register user';
    return res.status(500).json({ message });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body || {};

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    await assertDbReady();
    const user = await getUserByEmail(email);
    if (!user || !user.password_hash) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    const passwordMatches = await bcrypt.compare(password, user.password_hash);
    if (!passwordMatches) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    return res.json({
      user: mapDbUser(user),
      token: signJwt(user.id),
    });
  } catch (error) {
    console.error('Error logging in:', error);
    const message = !pool
      ? 'Database is not configured (set DATABASE_URL)'
      : error?.message?.includes('JWT_SECRET')
      ? 'JWT secret is not configured (set JWT_SECRET)'
      : 'Failed to login';
    return res.status(500).json({ message });
  }
});

// Legacy endpoints retained for compatibility
app.post('/api/users', async (req, res) => {
  try {
    const userData = req.body || {};
    const { email, role } = userData;

    if (!email || !role) {
      return res.status(400).json({ success: false, message: 'Email and role are required' });
    }

    await assertDbReady();

    const existingUser = await getUserByEmail(email);
    if (existingUser) {
      return res.status(409).json({ success: false, message: 'User already exists' });
    }

    const passwordHash = userData.password
      ? await bcrypt.hash(userData.password, SALT_ROUNDS)
      : null;
    const userId =
      crypto.randomUUID?.() || crypto.randomBytes(16).toString('hex');

    const result = await pool.query(
      `
        INSERT INTO users (id, full_name, email, phone, role, password_hash)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *
      `,
      [
        userId,
        userData.fullName || userData.name || 'Unnamed',
        email,
        userData.phone || '',
        normalizeRole(role),
        passwordHash,
      ]
    );

    res.status(201).json({ success: true, user: mapDbUser(result.rows[0]) });
  } catch (error) {
    console.error('Error saving user data:', error);
    const errorMessage = pool
      ? 'Failed to save user data'
      : 'Database is not configured (set DATABASE_URL)';
    res.status(500).json({ success: false, error: errorMessage });
  }
});

app.get('/api/users/:role', async (req, res) => {
  try {
    const { role } = req.params;
    await assertDbReady();
    const result = await pool.query(
      'SELECT * FROM users WHERE role = $1 ORDER BY created_at DESC',
      [normalizeRole(role)]
    );
    res.json(result.rows.map(mapDbUser));
  } catch (error) {
    console.error('Error fetching users:', error);
    const errorMessage = pool
      ? 'Failed to fetch users'
      : 'Database is not configured (set DATABASE_URL)';
    res.status(500).json({ error: errorMessage });
  }
});

if (require.main === module) {
  (async () => {
    try {
      await dbReady;
      app.listen(PORT, () => {
        console.log(`Server running on http://localhost:${PORT}`);
      });
    } catch (error) {
      console.error('Server failed to start:', error);
      process.exit(1);
    }
  })();
}

module.exports = app;
