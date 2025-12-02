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

    const mediaResults = [];
    for (const item of normalizedMedia) {
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

    const mediaResults = [];
    for (const item of normalizedMedia) {
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
    await assertDbReady();
    const result = await pool.query(`
      SELECT
        p.*,
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
      LEFT JOIN milestones m ON m.project_id = p.id
      LEFT JOIN project_media pm ON pm.project_id = p.id
      ORDER BY p.created_at DESC, m.position ASC, m.created_at ASC, pm.created_at ASC
    `);

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
