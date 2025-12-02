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

    const newStatus = action === 'accept' ? 'accepted' : action === 'deny' ? 'denied' : null;
    if (!newStatus) {
      return res.status(400).json({ message: 'Action must be accept or deny' });
    }

    await client.query('BEGIN');
    await client.query(
      'UPDATE project_applications SET status = $1 WHERE id::text = $2',
      [newStatus, applicationId]
    );

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
    return res.json({ status: newStatus });
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('Error updating application:', error);
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
    await client.query(
      'UPDATE project_applications SET status = $1 WHERE project_id = $2 AND contractor_id = $3',
      [newStatus, projectId, contractorId]
    );

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
    return res.json({ status: newStatus });
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('Error updating application (by project/contractor):', error);
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
          u.full_name AS owner_full_name
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

    await client.query('DELETE FROM project_applications WHERE id = $1', [applicationId]);
    return res.status(204).send();
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
