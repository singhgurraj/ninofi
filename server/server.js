const express = require('express');
const cors = require('cors');
const crypto = require('crypto');
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3001;
const SALT_ROUNDS = 10;
const UPLOAD_DIR = path.join(__dirname, 'uploads');
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

// Structured logging helpers so we reliably see payloads in Railway/console
const logInfo = (tag, payload) => {
  try {
    console.log(`[${tag}]`, JSON.stringify(payload));
  } catch (e) {
    console.log(`[${tag}]`, payload);
  }
};

const logError = (tag, payload, error) => {
  try {
    console.error(`[${tag}]`, JSON.stringify(payload), error);
  } catch (e) {
    console.error(`[${tag}]`, payload, error);
  }
};

app.use(cors());
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));
fs.mkdirSync(UPLOAD_DIR, { recursive: true });
app.use('/uploads', express.static(UPLOAD_DIR));

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

  await pool.query(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_attribute
        WHERE attrelid = 'users'::regclass AND attname = 'profile_photo_url'
      ) THEN
        ALTER TABLE users ADD COLUMN profile_photo_url TEXT;
      END IF;
      IF NOT EXISTS (
        SELECT 1 FROM pg_attribute
        WHERE attrelid = 'users'::regclass AND attname = 'rating'
      ) THEN
        ALTER TABLE users ADD COLUMN rating NUMERIC;
      END IF;
    END
    $$;
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS projects (
      id UUID PRIMARY KEY,
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      project_type TEXT,
      description TEXT,
      estimated_budget NUMERIC,
      timeline TEXT,
      address TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS milestones (
      id UUID PRIMARY KEY,
      project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      amount NUMERIC,
      description TEXT,
      position INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  await pool.query('CREATE INDEX IF NOT EXISTS projects_user_id_idx ON projects (user_id)');
  await pool.query('CREATE INDEX IF NOT EXISTS milestones_project_id_idx ON milestones (project_id, position)');

  await pool.query(`
    CREATE TABLE IF NOT EXISTS project_media (
      id UUID PRIMARY KEY,
      project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      url TEXT NOT NULL,
      label TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  await pool.query(
    'CREATE INDEX IF NOT EXISTS project_media_project_id_idx ON project_media (project_id)'
  );

  await pool.query(`
    CREATE TABLE IF NOT EXISTS project_applications (
      id UUID PRIMARY KEY,
      project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      contractor_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      status TEXT NOT NULL DEFAULT 'pending',
      message TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  await pool.query(
    'CREATE UNIQUE INDEX IF NOT EXISTS project_applications_unique ON project_applications (project_id, contractor_id)'
  );
  await pool.query(
    'CREATE INDEX IF NOT EXISTS project_applications_project_id_idx ON project_applications (project_id)'
  );
  await pool.query(
    'CREATE INDEX IF NOT EXISTS project_applications_contractor_id_idx ON project_applications (contractor_id)'
  );

  await pool.query(`
    CREATE TABLE IF NOT EXISTS notifications (
      id UUID PRIMARY KEY,
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      body TEXT NOT NULL,
      data JSONB,
      read BOOLEAN NOT NULL DEFAULT false,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  await pool.query(
    'CREATE INDEX IF NOT EXISTS notifications_user_id_idx ON notifications (user_id, created_at DESC)'
  );
  await pool.query(
    'CREATE INDEX IF NOT EXISTS notifications_project_idx ON notifications ((data->>\'projectId\'))'
  );

  await pool.query(`
    CREATE TABLE IF NOT EXISTS expenses (
      id SERIAL PRIMARY KEY,
      project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      contractor_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      category TEXT NOT NULL,
      amount NUMERIC NOT NULL CHECK (amount > 0),
      description TEXT,
      receipt_url TEXT,
      date TIMESTAMPTZ NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  await pool.query('CREATE INDEX IF NOT EXISTS expenses_project_id_idx ON expenses (project_id)');
  await pool.query(
    'CREATE INDEX IF NOT EXISTS expenses_contractor_id_idx ON expenses (contractor_id)'
  );

  await pool.query(`
    CREATE TABLE IF NOT EXISTS work_hours (
      id SERIAL PRIMARY KEY,
      project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      contractor_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      hours NUMERIC NOT NULL CHECK (hours > 0),
      hourly_rate NUMERIC NOT NULL CHECK (hourly_rate >= 0),
      description TEXT,
      date DATE NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  await pool.query('CREATE INDEX IF NOT EXISTS work_hours_project_id_idx ON work_hours (project_id)');
  await pool.query(
    'CREATE INDEX IF NOT EXISTS work_hours_contractor_id_idx ON work_hours (contractor_id)'
  );
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
  profilePhotoUrl: row.profile_photo_url || '',
  rating: row.rating !== null && row.rating !== undefined ? Number(row.rating) : null,
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

const getUserById = async (userId) => {
  await assertDbReady();
  const result = await pool.query('SELECT * FROM users WHERE id = $1 LIMIT 1', [userId]);
  return result.rows[0] || null;
};

const mapMilestoneRow = (row = {}) => ({
  id: row.id,
  name: row.name,
  amount: row.amount !== null && row.amount !== undefined ? Number(row.amount) : null,
  description: row.description || '',
  position: typeof row.position === 'number' ? row.position : 0,
});

const mapProjectRow = (row = {}, milestones = [], media = []) => ({
  id: row.id,
  userId: row.user_id,
  title: row.title,
  projectType: row.project_type || '',
  description: row.description || '',
  estimatedBudget:
    row.estimated_budget !== null && row.estimated_budget !== undefined
      ? Number(row.estimated_budget)
      : null,
  timeline: row.timeline || '',
  address: row.address || '',
  createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : row.created_at,
  milestones,
  media,
  owner: row.owner_id
    ? {
        id: row.owner_id,
        fullName: row.owner_full_name,
        email: row.owner_email,
        phone: row.owner_phone,
        profilePhotoUrl: row.owner_profile_photo_url || '',
        rating:
          row.owner_rating !== null && row.owner_rating !== undefined
            ? Number(row.owner_rating)
            : null,
      }
    : undefined,
});

const mapMediaRow = (row = {}) => ({
  id: row.id,
  url: row.url,
  label: row.label || '',
});

const validateMilestones = (milestones = []) => {
  if (!Array.isArray(milestones)) return [];
  return milestones
    .map((m, idx) => {
      if (!m || !m.name) return null;
      const amountNum =
        m.amount === undefined || m.amount === null || m.amount === ''
          ? null
          : Number(m.amount);
      return {
        name: m.name,
        amount: Number.isFinite(amountNum) ? amountNum : null,
        description: m.description || '',
        position: Number.isInteger(m.position) ? m.position : idx,
      };
    })
    .filter(Boolean);
};

const validateMedia = (media = []) => {
  if (!Array.isArray(media)) return [];
  return media
    .map((item) => {
      if (!item || !item.url) return null;
      return {
        url: item.url,
        label: item.label || '',
      };
    })
    .filter(Boolean);
};

const mapApplicationRow = (row = {}) => ({
  id: row.id,
  projectId: row.project_id,
  contractorId: row.contractor_id,
  status: row.status,
  message: row.message || '',
  createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : row.created_at,
  contractor: row.contractor_id
    ? {
        id: row.contractor_id,
        fullName: row.contractor_full_name,
        email: row.contractor_email,
        phone: row.contractor_phone,
        role: row.contractor_role,
      }
    : null,
  projectTitle: row.project_title,
  projectAddress: row.project_address,
  estimatedBudget:
    row.estimated_budget !== null && row.estimated_budget !== undefined
      ? Number(row.estimated_budget)
      : null,
  owner: row.owner_id
    ? {
        id: row.owner_id,
        fullName: row.owner_full_name,
        email: row.owner_email,
        phone: row.owner_phone,
      }
    : null,
});

const mapNotificationRow = (row = {}) => ({
  id: row.id,
  userId: row.user_id,
  title: row.title,
  body: row.body,
  data: row.data || {},
  read: !!row.read,
  createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : row.created_at,
});

const getProjectById = async (projectId) => {
  if (!projectId) return null;
  await assertDbReady();
  const result = await pool.query('SELECT * FROM projects WHERE id = $1 LIMIT 1', [projectId]);
  return result.rows[0] || null;
};

const EXPENSE_CATEGORIES = new Set(['materials', 'gas', 'tools', 'other']);

const mapExpenseRow = (row = {}) => ({
  id: row.id,
  projectId: row.project_id,
  contractorId: row.contractor_id,
  category: row.category,
  amount: row.amount !== null && row.amount !== undefined ? Number(row.amount) : null,
  description: row.description || '',
  receiptUrl: row.receipt_url || '',
  date: row.date instanceof Date ? row.date.toISOString() : row.date,
  createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : row.created_at,
  contractor: row.contractor_id
    ? {
        id: row.contractor_id,
        fullName: row.contractor_full_name,
        email: row.contractor_email,
        phone: row.contractor_phone,
      }
    : undefined,
});

const mapWorkHourRow = (row = {}) => ({
  id: row.id,
  projectId: row.project_id,
  contractorId: row.contractor_id,
  hours: row.hours !== null && row.hours !== undefined ? Number(row.hours) : null,
  hourlyRate: row.hourly_rate !== null && row.hourly_rate !== undefined ? Number(row.hourly_rate) : null,
  description: row.description || '',
  date:
    row.date instanceof Date
      ? row.date.toISOString().split('T')[0]
      : row.date,
  createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : row.created_at,
  contractor: row.contractor_id
    ? {
        id: row.contractor_id,
        fullName: row.contractor_full_name,
        email: row.contractor_email,
        phone: row.contractor_phone,
      }
    : undefined,
});

const isPositiveNumber = (value) => {
  const num = Number(value);
  return Number.isFinite(num) && num > 0 ? num : null;
};

const parseDateValue = (value, { fallbackToNow = true, asDateOnly = false } = {}) => {
  if (!value && !fallbackToNow) {
    return null;
  }
  const source = value ? new Date(value) : new Date();
  if (Number.isNaN(source.getTime())) {
    return null;
  }
  if (asDateOnly) {
    return new Date(source.toISOString().split('T')[0]);
  }
  return source;
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

const isDataUri = (value = '') => /^data:/i.test(value);

const persistMedia = async (projectId, mediaItems = []) => {
  const saved = [];
  for (const item of mediaItems) {
    if (!item.url) continue;
    if (!isDataUri(item.url)) {
      saved.push({ url: item.url, label: item.label || '' });
      continue;
    }

    try {
      const [meta, base64Data] = item.url.split(',');
      const mimeMatch = /data:(.*?);base64/.exec(meta || '');
      const mimeType = mimeMatch?.[1] || 'image/jpeg';
      const extension = mimeType.split('/')[1] || 'jpg';
      const filename = `${Date.now()}-${crypto.randomBytes(6).toString('hex')}.${extension}`;
      const projectDir = path.join(UPLOAD_DIR, projectId);
      await fs.promises.mkdir(projectDir, { recursive: true });
      const filePath = path.join(projectDir, filename);
      await fs.promises.writeFile(filePath, base64Data || '', 'base64');
      const relativePath = path.relative(__dirname, filePath);
      saved.push({ url: `/${relativePath}`, label: item.label || '' });
    } catch (err) {
      console.error('Error saving media file:', err);
    }
  }
  return saved;
};

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

app.post('/api/projects/:projectId/apply', async (req, res) => {
  const client = await pool.connect();
  try {
    const { projectId } = req.params;
    const { contractorId, message } = req.body || {};
    if (!projectId || !contractorId) {
      return res.status(400).json({ message: 'projectId and contractorId are required' });
    }

    await assertDbReady();
    const projectResult = await client.query('SELECT * FROM projects WHERE id = $1', [projectId]);
    if (!projectResult.rows.length) {
      return res.status(404).json({ message: 'Project not found' });
    }
    const contractor = await getUserById(contractorId);
    if (!contractor) {
      return res.status(404).json({ message: 'Contractor not found' });
    }

    await client.query('BEGIN');

    const existingApp = await client.query(
      'SELECT * FROM project_applications WHERE project_id = $1 AND contractor_id = $2',
      [projectId, contractorId]
    );
    if (existingApp.rows.length) {
      const status = existingApp.rows[0].status;
      if (status === 'pending' || status === 'accepted') {
        await client.query('ROLLBACK');
        return res.status(409).json({ message: 'Application already exists' });
      }
      await client.query(
        'DELETE FROM project_applications WHERE project_id = $1 AND contractor_id = $2',
        [projectId, contractorId]
      );
    }

    const appId = crypto.randomUUID?.() || crypto.randomBytes(16).toString('hex');
    const application = await client.query(
      `
        INSERT INTO project_applications (id, project_id, contractor_id, status, message)
        VALUES ($1, $2, $3, 'pending', $4)
        RETURNING *
      `,
      [appId, projectId, contractorId, message || '']
    );

    const notificationId = crypto.randomUUID?.() || crypto.randomBytes(16).toString('hex');
    const notifData = {
      contractorId,
      contractorName: contractor.full_name,
      contractorEmail: contractor.email,
      contractorPhone: contractor.phone,
      profilePhotoUrl: contractor.profile_photo_url || '',
      projectId,
      projectTitle: projectResult.rows[0].title,
      applicationId: appId,
    };
    await client.query(
      `
        INSERT INTO notifications (id, user_id, title, body, data)
        VALUES ($1, $2, $3, $4, $5)
      `,
      [
        notificationId,
        projectResult.rows[0].user_id,
        `${contractor.full_name || 'Contractor'} is interested in ${projectResult.rows[0].title}`,
        message || 'New contractor application',
        JSON.stringify(notifData),
      ]
    );

    await client.query('COMMIT');

    return res.status(201).json(
      mapApplicationRow({
        ...application.rows[0],
        contractor_full_name: contractor.full_name,
        contractor_email: contractor.email,
        contractor_phone: contractor.phone,
        contractor_role: contractor.role,
      })
    );
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('Error applying to project:', error);
    const message = pool
      ? 'Failed to apply to project'
      : 'Database is not configured (set DATABASE_URL)';
    return res.status(500).json({ message });
  } finally {
    client.release();
  }
});

app.get('/api/notifications/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    if (!userId) {
      return res.status(400).json({ message: 'userId is required' });
    }
    await assertDbReady();
    // Clean notifications for deleted projects
    await pool.query(
      `
        DELETE FROM notifications n
        WHERE n.user_id = $1
          AND n.data->>'projectId' IS NOT NULL
          AND NOT EXISTS (
            SELECT 1 FROM projects p WHERE p.id::text = n.data->>'projectId'
          )
      `,
      [userId]
    );
    // Clean notifications for withdrawn/denied applications
    await pool.query(
      `
        DELETE FROM notifications n
        WHERE n.user_id = $1
          AND n.data->>'applicationId' IS NOT NULL
          AND NOT EXISTS (
            SELECT 1 FROM project_applications pa
            WHERE pa.id::text = n.data->>'applicationId'
              AND pa.status = 'pending'
          )
      `,
      [userId]
    );
    const result = await pool.query(
      'SELECT * FROM notifications WHERE user_id = $1 ORDER BY created_at DESC',
      [userId]
    );
    res.json(result.rows.map(mapNotificationRow));
  } catch (error) {
    console.error('Error fetching notifications:', error);
    const message = pool
      ? 'Failed to fetch notifications'
      : 'Database is not configured (set DATABASE_URL)';
    res.status(500).json({ message });
  }
});

app.post('/api/applications/:applicationId/:action', async (req, res) => {
  const client = await pool.connect();
  try {
    const { applicationId, action } = req.params;
    const { ownerId } = req.body || {};
    logInfo('applications:update:request', {
      path: req.originalUrl,
      method: req.method,
      applicationId,
      action,
      ownerId: ownerId || null,
    });
    if (!applicationId || !action) {
      return res.status(400).json({ message: 'applicationId and action are required' });
    }

    await assertDbReady();
    const appResult = await client.query(
      `
        SELECT pa.*, p.user_id AS owner_id, p.title AS project_title, u.full_name AS contractor_name, u.email AS contractor_email, u.phone AS contractor_phone
        FROM project_applications pa
        JOIN projects p ON p.id = pa.project_id
        JOIN users u ON u.id = pa.contractor_id
        WHERE pa.id::text = $1
      `,
      [applicationId]
    );
    if (!appResult.rows.length) {
      return res.status(404).json({ message: 'Application not found' });
    }

    const appRow = appResult.rows[0];
    if (ownerId && ownerId !== appRow.owner_id) {
      return res.status(403).json({ message: 'Not authorized to modify this application' });
    }

    if (appRow.status && appRow.status !== 'pending') {
      logInfo('applications:update:skip-nonpending', {
        applicationId,
        currentStatus: appRow.status,
      });
      return res.status(409).json({ message: 'Application is no longer pending' });
    }

    const newStatus = action === 'accept' ? 'accepted' : action === 'deny' ? 'denied' : null;
    if (!newStatus) {
      return res.status(400).json({ message: 'Action must be accept or deny' });
    }

    await client.query('BEGIN');
    logInfo('applications:update:start', {
      applicationId,
      action,
      ownerId: ownerId || null,
      projectId: appRow.project_id,
      contractorId: appRow.contractor_id,
      currentStatus: appRow.status,
    });
    const updateResult = await client.query(
      'UPDATE project_applications SET status = $1 WHERE id::text = $2 RETURNING *',
      [newStatus, applicationId]
    );

    if (!updateResult.rowCount) {
      throw new Error('Update failed (no rows)');
    }

    const notificationId = crypto.randomUUID?.() || crypto.randomBytes(16).toString('hex');
    await client.query(
      `
        INSERT INTO notifications (id, user_id, title, body, data)
        VALUES ($1, $2, $3, $4, $5)
      `,
      [
        notificationId,
        appRow.contractor_id,
        `Your application was ${newStatus}`,
        `${appRow.project_title} has been ${newStatus}`,
        JSON.stringify({
          projectId: appRow.project_id,
          projectTitle: appRow.project_title,
          applicationId,
          status: newStatus,
        }),
      ]
    );

    await client.query('COMMIT');
    logInfo('applications:update:success', { applicationId, newStatus });
    return res.json({ status: newStatus });
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    logError('applications:update:error', { applicationId }, error);
    const message = pool
      ? 'Failed to update application'
      : 'Database is not configured (set DATABASE_URL)';
    res.status(500).json({ message });
  } finally {
    client.release();
  }
});

app.post('/api/applications/decide', async (req, res) => {
  const client = await pool.connect();
  try {
    const { projectId, contractorId, ownerId, action } = req.body || {};
    logInfo('applications:decide:request', {
      path: req.originalUrl,
      method: req.method,
      projectId,
      contractorId,
      ownerId: ownerId || null,
      action,
    });
    if (!projectId || !contractorId || !action) {
      return res
        .status(400)
        .json({ message: 'projectId, contractorId, and action are required' });
    }
    const newStatus = action === 'accept' ? 'accepted' : action === 'deny' ? 'denied' : null;
    if (!newStatus) {
      return res.status(400).json({ message: 'Action must be accept or deny' });
    }

    await assertDbReady();
    const appResult = await client.query(
      `
        SELECT pa.*, p.user_id AS owner_id, p.title AS project_title, u.full_name AS contractor_name, u.email AS contractor_email, u.phone AS contractor_phone
        FROM project_applications pa
        JOIN projects p ON p.id = pa.project_id
        JOIN users u ON u.id = pa.contractor_id
        WHERE pa.project_id = $1 AND pa.contractor_id = $2
      `,
      [projectId, contractorId]
    );
    if (!appResult.rows.length) {
      return res.status(404).json({ message: 'Application not found' });
    }

    const appRow = appResult.rows[0];
    if (ownerId && ownerId !== appRow.owner_id) {
      return res.status(403).json({ message: 'Not authorized to modify this application' });
    }

    await client.query('BEGIN');
    logInfo('applications:decide:start', {
      projectId,
      contractorId,
      ownerId: ownerId || null,
      action,
      newStatus,
      currentStatus: appRow.status,
    });
    const updateResult = await client.query(
      'UPDATE project_applications SET status = $1 WHERE project_id = $2 AND contractor_id = $3 RETURNING *',
      [newStatus, projectId, contractorId]
    );

    if (!updateResult.rowCount) {
      throw new Error('Update failed (no rows)');
    }

    const notificationId = crypto.randomUUID?.() || crypto.randomBytes(16).toString('hex');
    await client.query(
      `
        INSERT INTO notifications (id, user_id, title, body, data)
        VALUES ($1, $2, $3, $4, $5)
      `,
      [
        notificationId,
        appRow.contractor_id,
        `Your application was ${newStatus}`,
        `${appRow.project_title} has been ${newStatus}`,
        JSON.stringify({
          projectId: appRow.project_id,
          projectTitle: appRow.project_title,
          applicationId: appRow.id,
          status: newStatus,
        }),
      ]
    );

    await client.query('COMMIT');
    logInfo('applications:decide:success', { projectId, contractorId, newStatus });
    return res.json({ status: newStatus });
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    logError(
      'applications:decide:error',
      { projectId: req.body?.projectId, contractorId: req.body?.contractorId },
      error
    );
    const message = pool
      ? 'Failed to update application'
      : 'Database is not configured (set DATABASE_URL)';
    res.status(500).json({ message });
  } finally {
    client.release();
  }
});

app.get('/api/applications/contractor/:contractorId', async (req, res) => {
  try {
    const { contractorId } = req.params;
    if (!contractorId) {
      return res.status(400).json({ message: 'contractorId is required' });
    }
    await assertDbReady();
    const result = await pool.query(
      `
        SELECT
          pa.*,
          p.title AS project_title,
          p.address AS project_address,
          p.estimated_budget,
          p.user_id AS owner_id,
          u.full_name AS owner_full_name,
          u.email AS owner_email,
          u.phone AS owner_phone
        FROM project_applications pa
        JOIN projects p ON p.id = pa.project_id
        JOIN users u ON u.id = p.user_id
        WHERE pa.contractor_id = $1
        ORDER BY pa.created_at DESC
      `,
      [contractorId]
    );
    res.json(result.rows.map(mapApplicationRow));
  } catch (error) {
    console.error('Error fetching contractor applications:', error);
    const message = pool
      ? 'Failed to fetch applications'
      : 'Database is not configured (set DATABASE_URL)';
    res.status(500).json({ message });
  }
});

app.get('/api/projects/contractor/:contractorId', async (req, res) => {
  try {
    const { contractorId } = req.params;
    if (!contractorId) {
      return res.status(400).json({ message: 'contractorId is required' });
    }
    await assertDbReady();
    const result = await pool.query(
      `
        SELECT
          p.*,
          u.id AS owner_id,
          u.full_name AS owner_full_name,
          u.email AS owner_email,
          u.phone AS owner_phone,
          u.profile_photo_url AS owner_profile_photo_url,
          u.rating AS owner_rating,
          m.id AS milestone_id,
          m.name AS milestone_name,
          m.amount AS milestone_amount,
          m.description AS milestone_description,
          m.position AS milestone_position,
          m.created_at AS milestone_created_at,
          pm.id AS media_id,
          pm.url AS media_url,
          pm.label AS media_label,
          pm.created_at AS media_created_at
        FROM project_applications pa
        JOIN projects p ON p.id = pa.project_id
        JOIN users u ON u.id = p.user_id
        LEFT JOIN milestones m ON m.project_id = p.id
        LEFT JOIN project_media pm ON pm.project_id = p.id
        WHERE pa.contractor_id = $1 AND pa.status = 'accepted'
        ORDER BY p.created_at DESC, m.position ASC, m.created_at ASC, pm.created_at ASC
      `,
      [contractorId]
    );

    const grouped = new Map();
    for (const row of result.rows) {
      if (!grouped.has(row.id)) {
        grouped.set(row.id, {
          project: row,
          milestones: [],
          media: [],
        });
      }
      if (row.milestone_id) {
        grouped.get(row.id).milestones.push(
          mapMilestoneRow({
            id: row.milestone_id,
            name: row.milestone_name,
            amount: row.milestone_amount,
            description: row.milestone_description,
            position: row.milestone_position,
            created_at: row.milestone_created_at,
          })
        );
      }
      if (row.media_id) {
        grouped.get(row.id).media.push(
          mapMediaRow({
            id: row.media_id,
            url: row.media_url,
            label: row.media_label,
            created_at: row.media_created_at,
          })
        );
      }
    }

    const projects = Array.from(grouped.values()).map(({ project, milestones, media }) =>
      mapProjectRow(project, milestones, media)
    );

    return res.json(projects);
  } catch (error) {
    console.error('Error fetching contractor projects:', error);
    const message = pool
      ? 'Failed to fetch projects'
      : 'Database is not configured (set DATABASE_URL)';
    return res.status(500).json({ message });
  }
});

app.delete('/api/applications/:applicationId', async (req, res) => {
  const client = await pool.connect();
  try {
    const { applicationId } = req.params;
    const { contractorId } = req.body || {};
    if (!applicationId) {
      return res.status(400).json({ message: 'applicationId is required' });
    }
    await assertDbReady();

    const existing = await client.query(
      'SELECT * FROM project_applications WHERE id = $1',
      [applicationId]
    );
    if (!existing.rows.length) {
      return res.status(404).json({ message: 'Application not found' });
    }
    if (contractorId && existing.rows[0].contractor_id !== contractorId) {
      return res.status(403).json({ message: 'Not authorized to delete this application' });
    }

    const projectId = existing.rows[0].project_id;
    await client.query('DELETE FROM project_applications WHERE id = $1', [applicationId]);
    return res.status(200).json({ projectId });
  } catch (error) {
    console.error('Error deleting application:', error);
    const message = pool
      ? 'Failed to delete application'
      : 'Database is not configured (set DATABASE_URL)';
    res.status(500).json({ message });
  } finally {
    client.release();
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

app.post('/api/projects', async (req, res) => {
  const client = await pool.connect();
  try {
    const {
      userId,
      title,
      projectType,
      description,
      estimatedBudget,
      timeline,
      address,
      milestones,
      media,
    } = req.body || {};

    if (!userId || !title) {
      return res.status(400).json({ message: 'userId and title are required' });
    }

    await assertDbReady();
    const user = await getUserById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const projectId =
      crypto.randomUUID?.() || crypto.randomBytes(16).toString('hex');
    const normalizedMilestones = validateMilestones(milestones);
    const normalizedMedia = validateMedia(media);
    const budgetNumber =
      estimatedBudget === undefined || estimatedBudget === null || estimatedBudget === ''
        ? null
        : Number(estimatedBudget);

    await client.query('BEGIN');
    const projectResult = await client.query(
      `
        INSERT INTO projects (id, user_id, title, project_type, description, estimated_budget, timeline, address)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *
      `,
      [
        projectId,
        userId,
        title,
        projectType || '',
        description || '',
        Number.isFinite(budgetNumber) ? budgetNumber : null,
        timeline || '',
        address || '',
      ]
    );

    const milestoneResults = [];
    for (const m of normalizedMilestones) {
      const milestoneId =
        crypto.randomUUID?.() || crypto.randomBytes(16).toString('hex');
      const result = await client.query(
        `
          INSERT INTO milestones (id, project_id, name, amount, description, position)
          VALUES ($1, $2, $3, $4, $5, $6)
          RETURNING *
        `,
        [
          milestoneId,
          projectId,
          m.name,
          Number.isFinite(m.amount) ? m.amount : null,
          m.description || '',
          m.position || 0,
        ]
      );
      milestoneResults.push(result.rows[0]);
    }

    const persistedMedia = await persistMedia(projectId, normalizedMedia);
    const mediaResults = [];
    for (const item of persistedMedia) {
      const mediaId = crypto.randomUUID?.() || crypto.randomBytes(16).toString('hex');
      const result = await client.query(
        `
          INSERT INTO project_media (id, project_id, url, label)
          VALUES ($1, $2, $3, $4)
          RETURNING *
        `,
        [mediaId, projectId, item.url, item.label || '']
      );
      mediaResults.push(result.rows[0]);
    }

    await client.query('COMMIT');

    return res
      .status(201)
      .json(mapProjectRow(projectResult.rows[0], milestoneResults.map(mapMilestoneRow), mediaResults.map(mapMediaRow)));
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('Error creating project:', error);
    const message = pool
      ? 'Failed to create project'
      : 'Database is not configured (set DATABASE_URL)';
    return res.status(500).json({ message });
  } finally {
    client.release();
  }
});

app.put('/api/projects/:projectId', async (req, res) => {
  const client = await pool.connect();
  try {
    const { projectId } = req.params;
    const {
      userId,
      title,
      projectType,
      description,
      estimatedBudget,
      timeline,
      address,
      milestones,
      media,
    } = req.body || {};

    if (!projectId || !userId || !title) {
      return res.status(400).json({ message: 'projectId, userId, and title are required' });
    }

    await assertDbReady();

    const existing = await client.query(
      'SELECT * FROM projects WHERE id = $1 AND user_id = $2 LIMIT 1',
      [projectId, userId]
    );
    if (!existing.rows.length) {
      return res.status(404).json({ message: 'Project not found for this user' });
    }

    const normalizedMilestones = validateMilestones(milestones);
    const normalizedMedia = validateMedia(media);
    const budgetNumber =
      estimatedBudget === undefined || estimatedBudget === null || estimatedBudget === ''
        ? null
        : Number(estimatedBudget);

    await client.query('BEGIN');
    const updatedProject = await client.query(
      `
        UPDATE projects
        SET title = $1,
            project_type = $2,
            description = $3,
            estimated_budget = $4,
            timeline = $5,
            address = $6
        WHERE id = $7
        RETURNING *
      `,
      [
        title,
        projectType || '',
        description || '',
        Number.isFinite(budgetNumber) ? budgetNumber : null,
        timeline || '',
        address || '',
        projectId,
      ]
    );

    await client.query('DELETE FROM milestones WHERE project_id = $1', [projectId]);
    await client.query('DELETE FROM project_media WHERE project_id = $1', [projectId]);

    const milestoneResults = [];
    for (const m of normalizedMilestones) {
      const milestoneId =
        crypto.randomUUID?.() || crypto.randomBytes(16).toString('hex');
      const result = await client.query(
        `
          INSERT INTO milestones (id, project_id, name, amount, description, position)
          VALUES ($1, $2, $3, $4, $5, $6)
          RETURNING *
        `,
        [
          milestoneId,
          projectId,
          m.name,
          Number.isFinite(m.amount) ? m.amount : null,
          m.description || '',
          m.position || 0,
        ]
      );
      milestoneResults.push(result.rows[0]);
    }

    const persistedMedia = await persistMedia(projectId, normalizedMedia);
    const mediaResults = [];
    for (const item of persistedMedia) {
      const mediaId = crypto.randomUUID?.() || crypto.randomBytes(16).toString('hex');
      const result = await client.query(
        `
          INSERT INTO project_media (id, project_id, url, label)
          VALUES ($1, $2, $3, $4)
          RETURNING *
        `,
        [mediaId, projectId, item.url, item.label || '']
      );
      mediaResults.push(result.rows[0]);
    }

    await client.query('COMMIT');

    return res.json(
      mapProjectRow(
        updatedProject.rows[0],
        milestoneResults.map(mapMilestoneRow),
        mediaResults.map(mapMediaRow)
      )
    );
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('Error updating project:', error);
    const message = pool
      ? 'Failed to update project'
      : 'Database is not configured (set DATABASE_URL)';
    return res.status(500).json({ message });
  } finally {
    client.release();
  }
});

app.delete('/api/projects/:projectId', async (req, res) => {
  const client = await pool.connect();
  try {
    const { projectId } = req.params;
    const { userId } = req.body || {};

    if (!projectId) {
      return res.status(400).json({ message: 'projectId is required' });
    }

    await assertDbReady();

    if (userId) {
      const existing = await client.query(
        'SELECT 1 FROM projects WHERE id = $1 AND user_id = $2 LIMIT 1',
        [projectId, userId]
      );
      if (!existing.rows.length) {
        return res.status(404).json({ message: 'Project not found for this user' });
      }
    }

    await client.query('BEGIN');
    // milestones are deleted via ON DELETE CASCADE
    await client.query('DELETE FROM projects WHERE id = $1', [projectId]);
    await client.query('DELETE FROM notifications WHERE data->>\'projectId\' = $1', [projectId]);
    await client.query('COMMIT');

    return res.status(204).send();
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('Error deleting project:', error);
    const message = pool
      ? 'Failed to delete project'
      : 'Database is not configured (set DATABASE_URL)';
    return res.status(500).json({ message });
  } finally {
    client.release();
  }
});

app.get('/api/projects/user/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    if (!userId) {
      return res.status(400).json({ message: 'userId is required' });
    }

    await assertDbReady();
    const user = await getUserById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const result = await pool.query(
      `
        SELECT
          p.*,
          u.id AS owner_id,
          u.full_name AS owner_full_name,
          u.email AS owner_email,
          u.phone AS owner_phone,
          u.profile_photo_url AS owner_profile_photo_url,
          u.rating AS owner_rating,
          m.id AS milestone_id,
          m.name AS milestone_name,
          m.amount AS milestone_amount,
          m.description AS milestone_description,
          m.position AS milestone_position,
          m.created_at AS milestone_created_at,
          pm.id AS media_id,
          pm.url AS media_url,
          pm.label AS media_label,
          pm.created_at AS media_created_at
        FROM projects p
        LEFT JOIN users u ON u.id = p.user_id
        LEFT JOIN milestones m ON m.project_id = p.id
        LEFT JOIN project_media pm ON pm.project_id = p.id
        WHERE p.user_id = $1
        ORDER BY p.created_at DESC, m.position ASC, m.created_at ASC, pm.created_at ASC
      `,
      [userId]
    );

    const grouped = new Map();
    for (const row of result.rows) {
      if (!grouped.has(row.id)) {
        grouped.set(row.id, {
          project: row,
          milestones: [],
          media: [],
        });
      }
      if (row.milestone_id) {
        grouped.get(row.id).milestones.push(
          mapMilestoneRow({
            id: row.milestone_id,
            name: row.milestone_name,
            amount: row.milestone_amount,
            description: row.milestone_description,
            position: row.milestone_position,
            created_at: row.milestone_created_at,
          })
        );
      }
      if (row.media_id) {
        grouped.get(row.id).media.push(
          mapMediaRow({
            id: row.media_id,
            url: row.media_url,
            label: row.media_label,
            created_at: row.media_created_at,
          })
        );
      }
    }

    const projects = Array.from(grouped.values()).map(({ project, milestones, media }) =>
      mapProjectRow(project, milestones, media)
    );

    return res.json(projects);
  } catch (error) {
    console.error('Error fetching projects:', error);
    const message = pool
      ? 'Failed to fetch projects'
      : 'Database is not configured (set DATABASE_URL)';
    return res.status(500).json({ message });
  }
});

app.get('/api/projects/open', async (_req, res) => {
  try {
    const contractorId = _req.query.contractorId || null;
    await assertDbReady();
    const result = await pool.query(
      `
      SELECT
        p.*,
        u.id AS owner_id,
        u.full_name AS owner_full_name,
        u.email AS owner_email,
        u.phone AS owner_phone,
        u.profile_photo_url AS owner_profile_photo_url,
        u.rating AS owner_rating,
        m.id AS milestone_id,
        m.name AS milestone_name,
        m.amount AS milestone_amount,
        m.description AS milestone_description,
        m.position AS milestone_position,
        m.created_at AS milestone_created_at,
        pm.id AS media_id,
        pm.url AS media_url,
        pm.label AS media_label,
        pm.created_at AS media_created_at,
        pa.id AS app_id,
        pa.status AS app_status,
        pa.contractor_id AS app_contractor_id
      FROM projects p
      LEFT JOIN users u ON u.id = p.user_id
      LEFT JOIN milestones m ON m.project_id = p.id
      LEFT JOIN project_media pm ON pm.project_id = p.id
      LEFT JOIN project_applications pa ON pa.project_id = p.id AND pa.contractor_id = $1
      WHERE ($1::uuid IS NULL OR pa.id IS NULL OR pa.status NOT IN ('pending','accepted'))
      ORDER BY p.created_at DESC, m.position ASC, m.created_at ASC, pm.created_at ASC
    `,
      [contractorId]
    );

    const grouped = new Map();
    for (const row of result.rows) {
      if (!grouped.has(row.id)) {
        grouped.set(row.id, {
          project: row,
          milestones: [],
          media: [],
        });
      }
      if (row.milestone_id) {
        grouped.get(row.id).milestones.push(
          mapMilestoneRow({
            id: row.milestone_id,
            name: row.milestone_name,
            amount: row.milestone_amount,
            description: row.milestone_description,
            position: row.milestone_position,
            created_at: row.milestone_created_at,
          })
        );
      }
      if (row.media_id) {
        grouped.get(row.id).media.push(
          mapMediaRow({
            id: row.media_id,
            url: row.media_url,
            label: row.media_label,
            created_at: row.media_created_at,
          })
        );
      }
    }

    const projects = Array.from(grouped.values()).map(({ project, milestones, media }) =>
      mapProjectRow(project, milestones, media)
    );

    return res.json(projects);
  } catch (error) {
    console.error('Error fetching open projects:', error);
    const message = pool
      ? 'Failed to fetch projects'
      : 'Database is not configured (set DATABASE_URL)';
    return res.status(500).json({ message });
  }
});

app.post('/api/expenses', async (req, res) => {
  try {
    const { projectId, contractorId, category, amount, description, receiptUrl, date } = req.body || {};
    if (!projectId || !contractorId || !category || amount === undefined || amount === null) {
      return res
        .status(400)
        .json({ message: 'projectId, contractorId, category, and amount are required' });
    }

    await assertDbReady();
    const project = await getProjectById(projectId);
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    const contractor = await getUserById(contractorId);
    if (!contractor) {
      return res.status(404).json({ message: 'Contractor not found' });
    }
    if (normalizeRole(contractor.role) !== 'contractor') {
      return res.status(403).json({ message: 'Only contractors can log expenses' });
    }

    const normalizedCategory = String(category || '').toLowerCase();
    if (!EXPENSE_CATEGORIES.has(normalizedCategory)) {
      return res.status(400).json({ message: 'Invalid expense category' });
    }

    const amountNumber = isPositiveNumber(amount);
    if (amountNumber === null) {
      return res.status(400).json({ message: 'Amount must be a positive number' });
    }

    const expenseDate = parseDateValue(date);
    if (!expenseDate) {
      return res.status(400).json({ message: 'Invalid expense date' });
    }

    const result = await pool.query(
      `
        INSERT INTO expenses (project_id, contractor_id, category, amount, description, receipt_url, date)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *
      `,
      [projectId, contractorId, normalizedCategory, amountNumber, description || '', receiptUrl || '', expenseDate]
    );

    const payload = mapExpenseRow({
      ...result.rows[0],
      contractor_full_name: contractor.full_name,
      contractor_email: contractor.email,
      contractor_phone: contractor.phone,
    });
    return res.status(201).json(payload);
  } catch (error) {
    logError('expenses:create:error', { body: req.body }, error);
    const message = pool
      ? 'Failed to log expense'
      : 'Database is not configured (set DATABASE_URL)';
    return res.status(500).json({ message });
  }
});

app.get('/api/expenses/project/:projectId', async (req, res) => {
  try {
    const { projectId } = req.params;
    if (!projectId) {
      return res.status(400).json({ message: 'projectId is required' });
    }
    await assertDbReady();
    const result = await pool.query(
      `
        SELECT e.*, u.full_name AS contractor_full_name, u.email AS contractor_email, u.phone AS contractor_phone
        FROM expenses e
        LEFT JOIN users u ON u.id = e.contractor_id
        WHERE e.project_id = $1
        ORDER BY e.date DESC, e.created_at DESC
      `,
      [projectId]
    );
    return res.json(result.rows.map(mapExpenseRow));
  } catch (error) {
    logError('expenses:project:list:error', { projectId: req.params?.projectId }, error);
    const message = pool
      ? 'Failed to fetch expenses'
      : 'Database is not configured (set DATABASE_URL)';
    return res.status(500).json({ message });
  }
});

app.get('/api/expenses/contractor/:contractorId', async (req, res) => {
  try {
    const { contractorId } = req.params;
    if (!contractorId) {
      return res.status(400).json({ message: 'contractorId is required' });
    }
    await assertDbReady();
    const result = await pool.query(
      `
        SELECT e.*, u.full_name AS contractor_full_name, u.email AS contractor_email, u.phone AS contractor_phone
        FROM expenses e
        LEFT JOIN users u ON u.id = e.contractor_id
        WHERE e.contractor_id = $1
        ORDER BY e.date DESC, e.created_at DESC
      `,
      [contractorId]
    );
    return res.json(result.rows.map(mapExpenseRow));
  } catch (error) {
    logError('expenses:contractor:list:error', { contractorId: req.params?.contractorId }, error);
    const message = pool
      ? 'Failed to fetch expenses'
      : 'Database is not configured (set DATABASE_URL)';
    return res.status(500).json({ message });
  }
});

app.delete('/api/expenses/:expenseId', async (req, res) => {
  try {
    const { expenseId } = req.params;
    const { contractorId } = req.body || {};
    if (!expenseId) {
      return res.status(400).json({ message: 'expenseId is required' });
    }
    await assertDbReady();
    const existing = await pool.query('SELECT * FROM expenses WHERE id = $1', [expenseId]);
    if (!existing.rows.length) {
      return res.status(404).json({ message: 'Expense not found' });
    }
    if (contractorId && existing.rows[0].contractor_id !== contractorId) {
      return res.status(403).json({ message: 'Not authorized to delete this expense' });
    }
    await pool.query('DELETE FROM expenses WHERE id = $1', [expenseId]);
    return res.status(204).send();
  } catch (error) {
    logError('expenses:delete:error', { expenseId: req.params?.expenseId }, error);
    const message = pool
      ? 'Failed to delete expense'
      : 'Database is not configured (set DATABASE_URL)';
    return res.status(500).json({ message });
  }
});

app.get('/api/expenses/project/:projectId/summary', async (req, res) => {
  try {
    const { projectId } = req.params;
    if (!projectId) {
      return res.status(400).json({ message: 'projectId is required' });
    }
    await assertDbReady();
    const result = await pool.query(
      `
        SELECT category, COALESCE(SUM(amount), 0) AS total
        FROM expenses
        WHERE project_id = $1
        GROUP BY category
        ORDER BY category ASC
      `,
      [projectId]
    );
    return res.json(result.rows.map((row) => ({ category: row.category, total: Number(row.total) })));
  } catch (error) {
    logError('expenses:summary:error', { projectId: req.params?.projectId }, error);
    const message = pool
      ? 'Failed to summarize expenses'
      : 'Database is not configured (set DATABASE_URL)';
    return res.status(500).json({ message });
  }
});

app.post('/api/work-hours', async (req, res) => {
  try {
    const { projectId, contractorId, hours, hourlyRate, description, date } = req.body || {};
    if (!projectId || !contractorId || hours === undefined || hours === null) {
      return res.status(400).json({ message: 'projectId, contractorId, and hours are required' });
    }

    await assertDbReady();
    const project = await getProjectById(projectId);
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    const contractor = await getUserById(contractorId);
    if (!contractor) {
      return res.status(404).json({ message: 'Contractor not found' });
    }
    if (normalizeRole(contractor.role) !== 'contractor') {
      return res.status(403).json({ message: 'Only contractors can log work hours' });
    }

    const hoursNumber = isPositiveNumber(hours);
    if (hoursNumber === null) {
      return res.status(400).json({ message: 'Hours must be a positive number' });
    }

    const rateNumber = Number(hourlyRate ?? 0);
    if (!Number.isFinite(rateNumber) || rateNumber < 0) {
      return res.status(400).json({ message: 'Hourly rate must be zero or a positive number' });
    }

    const workDate = parseDateValue(date, { fallbackToNow: true, asDateOnly: true });
    if (!workDate) {
      return res.status(400).json({ message: 'Invalid work date' });
    }

    const result = await pool.query(
      `
        INSERT INTO work_hours (project_id, contractor_id, hours, hourly_rate, description, date)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *
      `,
      [projectId, contractorId, hoursNumber, rateNumber, description || '', workDate]
    );

    const payload = mapWorkHourRow({
      ...result.rows[0],
      contractor_full_name: contractor.full_name,
      contractor_email: contractor.email,
      contractor_phone: contractor.phone,
    });
    return res.status(201).json(payload);
  } catch (error) {
    logError('work-hours:create:error', { body: req.body }, error);
    const message = pool
      ? 'Failed to log work hours'
      : 'Database is not configured (set DATABASE_URL)';
    return res.status(500).json({ message });
  }
});

app.get('/api/work-hours/project/:projectId', async (req, res) => {
  try {
    const { projectId } = req.params;
    if (!projectId) {
      return res.status(400).json({ message: 'projectId is required' });
    }
    await assertDbReady();
    const result = await pool.query(
      `
        SELECT wh.*, u.full_name AS contractor_full_name, u.email AS contractor_email, u.phone AS contractor_phone
        FROM work_hours wh
        LEFT JOIN users u ON u.id = wh.contractor_id
        WHERE wh.project_id = $1
        ORDER BY wh.date DESC, wh.created_at DESC
      `,
      [projectId]
    );
    return res.json(result.rows.map(mapWorkHourRow));
  } catch (error) {
    logError('work-hours:project:list:error', { projectId: req.params?.projectId }, error);
    const message = pool
      ? 'Failed to fetch work hours'
      : 'Database is not configured (set DATABASE_URL)';
    return res.status(500).json({ message });
  }
});

app.get('/api/work-hours/contractor/:contractorId', async (req, res) => {
  try {
    const { contractorId } = req.params;
    if (!contractorId) {
      return res.status(400).json({ message: 'contractorId is required' });
    }
    await assertDbReady();
    const result = await pool.query(
      `
        SELECT wh.*, u.full_name AS contractor_full_name, u.email AS contractor_email, u.phone AS contractor_phone
        FROM work_hours wh
        LEFT JOIN users u ON u.id = wh.contractor_id
        WHERE wh.contractor_id = $1
        ORDER BY wh.date DESC, wh.created_at DESC
      `,
      [contractorId]
    );
    return res.json(result.rows.map(mapWorkHourRow));
  } catch (error) {
    logError('work-hours:contractor:list:error', { contractorId: req.params?.contractorId }, error);
    const message = pool
      ? 'Failed to fetch work hours'
      : 'Database is not configured (set DATABASE_URL)';
    return res.status(500).json({ message });
  }
});

app.delete('/api/work-hours/:entryId', async (req, res) => {
  try {
    const { entryId } = req.params;
    const { contractorId } = req.body || {};
    if (!entryId) {
      return res.status(400).json({ message: 'entryId is required' });
    }
    await assertDbReady();
    const existing = await pool.query('SELECT * FROM work_hours WHERE id = $1', [entryId]);
    if (!existing.rows.length) {
      return res.status(404).json({ message: 'Work hour entry not found' });
    }
    if (contractorId && existing.rows[0].contractor_id !== contractorId) {
      return res.status(403).json({ message: 'Not authorized to delete this entry' });
    }
    await pool.query('DELETE FROM work_hours WHERE id = $1', [entryId]);
    return res.status(204).send();
  } catch (error) {
    logError('work-hours:delete:error', { entryId: req.params?.entryId }, error);
    const message = pool
      ? 'Failed to delete work hour entry'
      : 'Database is not configured (set DATABASE_URL)';
    return res.status(500).json({ message });
  }
});

app.get('/api/work-hours/project/:projectId/summary', async (req, res) => {
  try {
    const { projectId } = req.params;
    if (!projectId) {
      return res.status(400).json({ message: 'projectId is required' });
    }
    await assertDbReady();
    const result = await pool.query(
      `
        SELECT COALESCE(SUM(hours), 0) AS total_hours, COALESCE(SUM(hours * hourly_rate), 0) AS total_cost
        FROM work_hours
        WHERE project_id = $1
      `,
      [projectId]
    );
    const row = result.rows[0] || { total_hours: 0, total_cost: 0 };
    return res.json({
      totalHours: Number(row.total_hours) || 0,
      totalCost: Number(row.total_cost) || 0,
    });
  } catch (error) {
    logError('work-hours:summary:error', { projectId: req.params?.projectId }, error);
    const message = pool
      ? 'Failed to summarize work hours'
      : 'Database is not configured (set DATABASE_URL)';
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
