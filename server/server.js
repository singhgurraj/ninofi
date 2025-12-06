const express = require('express');
const cors = require('cors');
const crypto = require('crypto');
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');
const { runGeminiPrompt } = require('./geminiClient');
require('dotenv').config();
const asyncHandler = require('./utils/asyncHandler');
const { ensureUuid } = require('./utils/validation');
const {
  buildCenteredNameLine,
  applySignature,
  renderSignaturesSection,
  SIGNATURE_SECTION_LINE_COUNT,
} = require('./utils/signatures');

const app = express();
console.log('[server] Starting server...');
console.log('[server] NODE_ENV =', process.env.NODE_ENV);
const PORT = process.env.PORT || 8081;
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

const SERVER_START_TIME = Date.now();
let requestCount = 0;
let errorCount = 0;
let totalResponseTimeMs = 0;
// Basic UUID validator to guard DB queries from bad input
const isUuid = (val) => typeof val === 'string' && /^[0-9a-fA-F-]{36}$/.test(val);

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

app.use((req, res, next) => {
  const start = process.hrtime.bigint();
  requestCount += 1;
  res.on('finish', () => {
    const end = process.hrtime.bigint();
    const durationMs = Number(end - start) / 1e6;
    totalResponseTimeMs += durationMs;
    if (res.statusCode >= 500) {
      errorCount += 1;
    }
    const timestamp = new Date().toISOString();
    console.log(
      `[${timestamp}] ${req.method} ${req.originalUrl} - ${res.statusCode} (${durationMs.toFixed(2)} ms)`
    );
  });
  next();
});

// Auto-wrap all route handlers in async error catcher
const wrapAsync = (fn) =>
  typeof fn === 'function' ? (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next) : fn;
['get', 'post', 'put', 'delete', 'patch'].forEach((method) => {
  const orig = app[method];
  app[method] = (path, ...handlers) => orig.call(app, path, ...handlers.map(wrapAsync));
});

const normalizeRole = (role) => (role || 'unknown').toLowerCase();
const normalizeFeatureName = (name = '') => name.trim().toLowerCase();
const getUptimeSeconds = () => Math.round((Date.now() - SERVER_START_TIME) / 1000);

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
let pool = null;
try {
  if (connectionString) {
    console.log('[server] Connecting to Postgres...');
    pool = new Pool({
      connectionString,
      ssl: buildSslConfig(),
    });
    console.log('[server] Postgres connection initialized');
  }
} catch (err) {
  console.error('[server] Fatal Postgres startup error:', err);
}

const DEFAULT_FEATURE_FLAGS = [
  {
    featureName: 'expense_tracking',
    enabled: true,
    description: 'Allows contractors to log expenses for projects.',
  },
  {
    featureName: 'payroll_tracking',
    enabled: true,
    description: 'Enables tracking of contractor work hours and payroll.',
  },
  {
    featureName: 'digital_contracts',
    enabled: true,
    description: 'Allows homeowners and contractors to manage digital contracts.',
  },
  {
    featureName: 'gps_checkin',
    enabled: false,
    description: 'Requires GPS check-ins at job sites.',
  },
  {
    featureName: 'contractor_verification',
    enabled: false,
    description: 'Enforces contractor verification workflows.',
  },
  {
    featureName: 'invoice_generation',
    enabled: false,
    description: 'Generates invoices automatically for projects.',
  },
];

// Simple payment provider abstraction; replace StubPaymentProvider with a real adapter when available.
class PaymentProvider {
  async createCustomer(_user) {
    throw new Error('Not implemented');
  }
  async createEscrowDeposit(_projectId, _amount, _currency) {
    throw new Error('Not implemented');
  }
  async createPayout(_contractorId, _amount, _currency) {
    throw new Error('Not implemented');
  }
  async refundDeposit(_transactionId) {
    throw new Error('Not implemented');
  }
}

class StubPaymentProvider extends PaymentProvider {
  constructor() {
    super();
    this.provider = 'stub';
  }

  async createCustomer(user) {
    return { id: `stub_cust_${user?.id || crypto.randomUUID?.() || Date.now()}`, status: 'succeeded' };
  }

  async createEscrowDeposit(projectId, amount, currency = 'USD') {
    return {
      id: `stub_dep_${projectId}_${Date.now()}`,
      status: 'succeeded',
      currency,
      amount,
    };
  }

  async createPayout(contractorId, amount, currency = 'USD') {
    return {
      id: `stub_payout_${contractorId}_${Date.now()}`,
      status: 'succeeded',
      currency,
      amount,
    };
  }

  async refundDeposit(transactionId) {
    return { id: `stub_ref_${transactionId}`, status: 'succeeded' };
  }
}

const paymentProvider = new StubPaymentProvider();

// Simple storage abstraction (stub) to be replaced with S3/GCS adapter if available.
class StorageService {
  async uploadFile(_key, _base64, _mimeType) {
    throw new Error('Not implemented');
  }
  async getSignedUrl(_key, _expiresInSeconds = 900) {
    throw new Error('Not implemented');
  }
  async deleteFile(_key) {
    throw new Error('Not implemented');
  }
}

class StubStorageService extends StorageService {
  constructor() {
    super();
    this.provider = 'stub-storage';
  }

  async uploadFile(key, base64, mimeType = 'application/octet-stream') {
    if (!key || !base64) {
      throw new Error('Missing key or file data');
    }
    return {
      key,
      url: `https://example.com/${encodeURIComponent(key)}`,
      mimeType,
    };
  }

  async getSignedUrl(key, expiresInSeconds = 900) {
    return {
      key,
      url: `https://example.com/${encodeURIComponent(key)}?expires_in=${expiresInSeconds}`,
      expiresIn: expiresInSeconds,
    };
  }

  async deleteFile(_key) {
    return { success: true };
  }
}

const storageService = new StubStorageService();

// Accounting integration (stub for QuickBooks/Xero)
class AccountingIntegration {
  async connectProvider(_contractorId, provider, _authCode) {
    if (!provider) throw new Error('provider required');
    return { provider, status: 'connected', expiresAt: new Date(Date.now() + 3600 * 1000).toISOString() };
  }

  async syncPayoutTransaction(_transactionId, provider) {
    return { provider, synced: true };
  }

  buildAuthUrl(provider, contractorId) {
    const base = provider === 'XERO' ? 'https://login.xero.com/identity/connect/authorize' : 'https://appcenter.intuit.com/connect/oauth2';
    // Stub query params; replace with real client/redirect scopes when wiring provider SDK
    return `${base}?state=${encodeURIComponent(contractorId || '')}`;
  }
}

const accountingIntegration = new AccountingIntegration();

// ID verification provider (stub)
class IdVerificationProvider {
  constructor() {
    this.provider = 'stub-idp';
  }

  async startSession(user) {
    const sessionId = `verify_${user?.id || crypto.randomUUID?.() || Date.now()}`;
    return {
      externalSessionId: sessionId,
      clientToken: `token_${sessionId}`,
      url: `https://verify.example.com/start?session=${sessionId}`,
    };
  }

  async parseWebhook(payload) {
    // Expect payload: { externalSessionId, status }
    return {
      externalSessionId: payload.externalSessionId || payload.id,
      status: (payload.status || '').toUpperCase(),
    };
  }
}

const idVerificationProvider = new IdVerificationProvider();

// E-signature provider (stub)
class ESignatureProvider {
  constructor() {
    this.provider = 'stub-esign';
  }

  async createSignatureRequest(contract, participants = []) {
    const externalId = `esign_${contract.id}_${Date.now()}`;
    return {
      externalId,
      signingUrls: participants.reduce((acc, p) => ({ ...acc, [p.role]: `https://esign.example.com/sign/${externalId}?user=${p.id}` }), {}),
    };
  }

  async parseWebhook(payload) {
    return {
      externalId: payload.externalId || payload.id,
      status: (payload.status || '').toLowerCase(),
      fileBase64: payload.fileBase64,
      fileName: payload.fileName || 'contract.pdf',
      mimeType: payload.mimeType || 'application/pdf',
    };
  }
}

const eSignatureProvider = new ESignatureProvider();

const ensureDefaultFeatureFlags = async () => {
  if (!pool) return;
  for (const flag of DEFAULT_FEATURE_FLAGS) {
    const featureName = normalizeFeatureName(flag.featureName);
    await pool.query(
      `
        INSERT INTO feature_flags (feature_name, enabled, description)
        VALUES ($1, $2, $3)
        ON CONFLICT (feature_name) DO NOTHING
      `,
      [featureName, flag.enabled, flag.description]
    );
  }
};

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
      is_verified BOOLEAN NOT NULL DEFAULT false,
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
      IF NOT EXISTS (
        SELECT 1 FROM pg_attribute
        WHERE attrelid = 'users'::regclass AND attname = 'is_verified'
      ) THEN
        ALTER TABLE users ADD COLUMN is_verified BOOLEAN NOT NULL DEFAULT false;
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
      status TEXT NOT NULL DEFAULT 'pending_funding',
      submitted_at TIMESTAMPTZ,
      approved_at TIMESTAMPTZ,
      paid_at TIMESTAMPTZ,
      submitted_by UUID REFERENCES users(id) ON DELETE SET NULL,
      approved_by UUID REFERENCES users(id) ON DELETE SET NULL,
      notes TEXT,
      evidence JSONB DEFAULT '[]'::jsonb,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  await pool.query(
    "ALTER TABLE milestones ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'pending_funding'"
  );
  await pool.query("ALTER TABLE milestones ALTER COLUMN status SET DEFAULT 'pending_funding'");
  await pool.query("ALTER TABLE milestones ADD COLUMN IF NOT EXISTS evidence JSONB DEFAULT '[]'::jsonb");
  await pool.query("ALTER TABLE milestones ALTER COLUMN evidence SET DEFAULT '[]'::jsonb");
  await pool.query("ALTER TABLE milestones ADD COLUMN IF NOT EXISTS notes TEXT");
  await pool.query("ALTER TABLE milestones ADD COLUMN IF NOT EXISTS submitted_at TIMESTAMPTZ");
  await pool.query("ALTER TABLE milestones ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ");
  await pool.query("ALTER TABLE milestones ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ");
  await pool.query("ALTER TABLE milestones ADD COLUMN IF NOT EXISTS submitted_by UUID");
  await pool.query("ALTER TABLE milestones ADD COLUMN IF NOT EXISTS approved_by UUID");

  await pool.query('CREATE INDEX IF NOT EXISTS projects_user_id_idx ON projects (user_id)');
  await pool.query('CREATE INDEX IF NOT EXISTS milestones_project_id_idx ON milestones (project_id, position)');
  await pool.query('CREATE INDEX IF NOT EXISTS milestones_status_idx ON milestones (status)');

  await pool.query(`
    CREATE TABLE IF NOT EXISTS escrow_accounts (
      id UUID PRIMARY KEY,
      project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      total_deposited NUMERIC NOT NULL DEFAULT 0,
      total_released NUMERIC NOT NULL DEFAULT 0,
      available_balance NUMERIC NOT NULL DEFAULT 0,
      currency TEXT NOT NULL DEFAULT 'USD',
      status TEXT NOT NULL DEFAULT 'open',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  await pool.query('CREATE UNIQUE INDEX IF NOT EXISTS escrow_accounts_project_idx ON escrow_accounts (project_id)');

  await pool.query(`
    CREATE TABLE IF NOT EXISTS payment_transactions (
      id UUID PRIMARY KEY,
      project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      milestone_id UUID REFERENCES milestones(id) ON DELETE SET NULL,
      payer_id UUID REFERENCES users(id) ON DELETE SET NULL,
      payee_id UUID REFERENCES users(id) ON DELETE SET NULL,
      type TEXT NOT NULL CHECK (type IN (\'DEPOSIT\', \'PAYOUT\', \'REFUND\')),
      amount NUMERIC NOT NULL CHECK (amount > 0),
      status TEXT NOT NULL DEFAULT 'completed',
      reference TEXT,
      provider TEXT,
      external_id TEXT,
      failure_reason TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  await pool.query('CREATE INDEX IF NOT EXISTS payment_transactions_project_idx ON payment_transactions (project_id)');
  await pool.query('CREATE INDEX IF NOT EXISTS payment_transactions_milestone_idx ON payment_transactions (milestone_id)');
  await pool.query("ALTER TABLE payment_transactions ADD COLUMN IF NOT EXISTS provider TEXT");
  await pool.query("ALTER TABLE payment_transactions ADD COLUMN IF NOT EXISTS external_id TEXT");
  await pool.query("ALTER TABLE payment_transactions ADD COLUMN IF NOT EXISTS failure_reason TEXT");

  await pool.query(`
    CREATE TABLE IF NOT EXISTS invoices (
      id UUID PRIMARY KEY,
      invoice_number TEXT NOT NULL,
      project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      milestone_id UUID REFERENCES milestones(id) ON DELETE SET NULL,
      contractor_id UUID REFERENCES users(id) ON DELETE SET NULL,
      homeowner_id UUID REFERENCES users(id) ON DELETE SET NULL,
      amount NUMERIC NOT NULL,
      currency TEXT NOT NULL DEFAULT 'USD',
      issue_date TIMESTAMPTZ NOT NULL,
      due_date TIMESTAMPTZ,
      status TEXT NOT NULL DEFAULT 'DRAFT',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  await pool.query("ALTER TABLE invoices ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'DRAFT'");
  await pool.query("ALTER TABLE invoices ALTER COLUMN status SET DEFAULT 'DRAFT'");
  await pool.query('CREATE UNIQUE INDEX IF NOT EXISTS invoices_milestone_idx ON invoices (milestone_id)');
  await pool.query('CREATE INDEX IF NOT EXISTS invoices_project_idx ON invoices (project_id)');
  await pool.query('CREATE INDEX IF NOT EXISTS invoices_status_idx ON invoices (status)');

  await pool.query(`
    CREATE TABLE IF NOT EXISTS contractor_accounting_connections (
      contractor_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      provider TEXT NOT NULL CHECK (provider IN ('QUICKBOOKS', 'XERO')),
      access_token TEXT,
      refresh_token TEXT,
      expires_at TIMESTAMPTZ,
      last_synced_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      PRIMARY KEY (contractor_id, provider)
    )
  `);
  await pool.query('CREATE INDEX IF NOT EXISTS accounting_connections_contractor_idx ON contractor_accounting_connections (contractor_id)');

  await pool.query(`
    CREATE TABLE IF NOT EXISTS milestone_attachments (
      id UUID PRIMARY KEY,
      milestone_id UUID NOT NULL REFERENCES milestones(id) ON DELETE CASCADE,
      uploader_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      storage_key TEXT NOT NULL,
      file_name TEXT NOT NULL,
      mime_type TEXT NOT NULL,
      file_size BIGINT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  await pool.query('CREATE INDEX IF NOT EXISTS milestone_attachments_milestone_idx ON milestone_attachments (milestone_id)');

  await pool.query(`
    CREATE TABLE IF NOT EXISTS verification_sessions (
      id UUID PRIMARY KEY,
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      provider TEXT NOT NULL,
      external_session_id TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'PENDING',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  await pool.query('CREATE INDEX IF NOT EXISTS verification_sessions_user_idx ON verification_sessions (user_id)');

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
    "ALTER TABLE project_applications ADD COLUMN IF NOT EXISTS is_worker_post BOOLEAN NOT NULL DEFAULT false"
  );
  await pool.query('ALTER TABLE project_applications ADD COLUMN IF NOT EXISTS work_date DATE');
  await pool.query('ALTER TABLE project_applications ADD COLUMN IF NOT EXISTS pay NUMERIC');
  await pool.query('ALTER TABLE project_applications ADD COLUMN IF NOT EXISTS tags TEXT[]');
  await pool.query('ALTER TABLE project_applications ADD COLUMN IF NOT EXISTS worker_post_id UUID');
  await pool.query(
    'CREATE INDEX IF NOT EXISTS project_applications_worker_post_idx ON project_applications (worker_post_id)'
  );
  await pool.query(
    'CREATE INDEX IF NOT EXISTS project_applications_project_id_idx ON project_applications (project_id)'
  );
  await pool.query(
    'CREATE INDEX IF NOT EXISTS project_applications_contractor_id_idx ON project_applications (contractor_id)'
  );
  // Drop old global unique index if present
  await pool.query('DROP INDEX IF EXISTS project_applications_unique');
  // Clean duplicate non-worker applications before creating partial unique index
  await pool.query(`
    DELETE FROM project_applications pa
    WHERE pa.is_worker_post IS NOT TRUE
      AND pa.ctid NOT IN (
        SELECT ctid FROM (
          SELECT ctid, ROW_NUMBER() OVER (PARTITION BY project_id, contractor_id ORDER BY created_at DESC) AS rn
          FROM project_applications
          WHERE is_worker_post IS NOT TRUE
        ) d
        WHERE d.rn = 1
      )
  `);
  // Clean duplicate worker applications per gig
  await pool.query(`
    DELETE FROM project_applications pa
    WHERE pa.worker_post_id IS NOT NULL
      AND pa.ctid NOT IN (
        SELECT ctid FROM (
          SELECT ctid, ROW_NUMBER() OVER (PARTITION BY worker_post_id, contractor_id ORDER BY created_at DESC) AS rn
          FROM project_applications
          WHERE worker_post_id IS NOT NULL
        ) d
        WHERE d.rn = 1
      )
  `);
  await pool.query(
    "CREATE UNIQUE INDEX IF NOT EXISTS project_apps_unique_nonworker ON project_applications (project_id, contractor_id) WHERE is_worker_post = false"
  );
  await pool.query(
    "CREATE UNIQUE INDEX IF NOT EXISTS project_apps_worker_apply_idx ON project_applications (worker_post_id, contractor_id) WHERE worker_post_id IS NOT NULL"
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

  await pool.query(`
    CREATE TABLE IF NOT EXISTS contracts (
      id UUID PRIMARY KEY,
      project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      terms TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  await pool.query('CREATE INDEX IF NOT EXISTS contracts_project_id_idx ON contracts (project_id)');
  await pool.query('CREATE INDEX IF NOT EXISTS contracts_created_by_idx ON contracts (created_by)');
  await pool.query("ALTER TABLE contracts ADD COLUMN IF NOT EXISTS pdf_url TEXT");
  await pool.query("ALTER TABLE contracts ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 1");
  await pool.query("ALTER TABLE contracts ADD COLUMN IF NOT EXISTS provider TEXT");
  await pool.query("ALTER TABLE contracts ADD COLUMN IF NOT EXISTS external_id TEXT");
  await pool.query("ALTER TABLE contracts ADD COLUMN IF NOT EXISTS signed_file_key TEXT");
  await pool.query("ALTER TABLE contracts ADD COLUMN IF NOT EXISTS signed_at TIMESTAMPTZ");

  await pool.query(`
    CREATE TABLE IF NOT EXISTS contract_signatures (
      id SERIAL PRIMARY KEY,
      contract_id UUID NOT NULL REFERENCES contracts(id) ON DELETE CASCADE,
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      signature_data TEXT NOT NULL,
      signed_at TIMESTAMPTZ NOT NULL,
      ip_address TEXT
    )
  `);
  await pool.query(
    'CREATE UNIQUE INDEX IF NOT EXISTS contract_signatures_unique ON contract_signatures (contract_id, user_id)'
  );

  await pool.query(`
    CREATE TABLE IF NOT EXISTS project_personnel (
      id SERIAL PRIMARY KEY,
      project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      personnel_role TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  await pool.query(
    'CREATE UNIQUE INDEX IF NOT EXISTS project_personnel_unique ON project_personnel (project_id, user_id)'
  );
  await pool.query('CREATE INDEX IF NOT EXISTS project_personnel_project_idx ON project_personnel (project_id)');

  await pool.query(`
    CREATE TABLE IF NOT EXISTS project_messages (
      id UUID PRIMARY KEY,
      project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      receiver_id UUID REFERENCES users(id) ON DELETE SET NULL,
      body TEXT NOT NULL,
      is_deleted BOOLEAN NOT NULL DEFAULT false,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ,
      deleted_at TIMESTAMPTZ
    )
  `);
  await pool.query(
    'CREATE INDEX IF NOT EXISTS project_messages_project_id_idx ON project_messages (project_id, created_at)'
  );
  await pool.query(
    'CREATE INDEX IF NOT EXISTS project_messages_sender_idx ON project_messages (sender_id)'
  );

  await pool.query(`
    CREATE TABLE IF NOT EXISTS portfolios (
      id UUID PRIMARY KEY,
      contractor_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      title TEXT,
      bio TEXT,
      specialties TEXT[],
      hourly_rate NUMERIC,
      service_area TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  await pool.query(
    'CREATE INDEX IF NOT EXISTS portfolios_contractor_id_idx ON portfolios (contractor_id)'
  );

  await pool.query(`
    CREATE TABLE IF NOT EXISTS portfolio_media (
      id UUID PRIMARY KEY,
      portfolio_id UUID NOT NULL REFERENCES portfolios(id) ON DELETE CASCADE,
      type TEXT,
      url TEXT NOT NULL,
      caption TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  await pool.query(
    'CREATE INDEX IF NOT EXISTS portfolio_media_portfolio_idx ON portfolio_media (portfolio_id)'
  );

  await pool.query(`
    CREATE TABLE IF NOT EXISTS reviews (
      id UUID PRIMARY KEY,
      contractor_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      project_id UUID,
      reviewer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      rating_overall INTEGER,
      rating_quality INTEGER,
      rating_timeliness INTEGER,
      rating_communication INTEGER,
      rating_budget INTEGER,
      comment TEXT,
      photos JSONB DEFAULT '[]'::jsonb,
      status TEXT NOT NULL DEFAULT 'pending',
      response_text TEXT,
      response_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  await pool.query(
    'CREATE INDEX IF NOT EXISTS reviews_contractor_idx ON reviews (contractor_id, created_at DESC)'
  );

  await pool.query(`
    CREATE TABLE IF NOT EXISTS audit_logs (
      id UUID PRIMARY KEY,
      actor_id UUID,
      actor_role TEXT,
      action TEXT NOT NULL,
      entity_type TEXT,
      entity_id TEXT,
      metadata JSONB,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  await pool.query('CREATE INDEX IF NOT EXISTS audit_actor_idx ON audit_logs (actor_id, created_at DESC)');
  await pool.query('CREATE INDEX IF NOT EXISTS audit_entity_idx ON audit_logs (entity_type, entity_id, created_at DESC)');

  await pool.query(`
    CREATE TABLE IF NOT EXISTS compliance_documents (
      id UUID PRIMARY KEY,
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      type TEXT NOT NULL,
      url TEXT NOT NULL,
      expires_at TIMESTAMPTZ,
      status TEXT NOT NULL DEFAULT 'active',
      notes TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  await pool.query("ALTER TABLE compliance_documents ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active'");
  await pool.query("ALTER TABLE compliance_documents ALTER COLUMN status SET DEFAULT 'active'");
  await pool.query('CREATE INDEX IF NOT EXISTS compliance_user_idx ON compliance_documents (user_id, status, expires_at)');

  await pool.query(`
    CREATE TABLE IF NOT EXISTS disputes (
      id UUID PRIMARY KEY,
      project_id UUID,
      milestone_id UUID,
      raised_by UUID,
      against_user_id UUID,
      description TEXT,
      status TEXT NOT NULL DEFAULT 'open',
      priority TEXT,
      resolution_notes TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  await pool.query("ALTER TABLE disputes ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'open'");
  await pool.query("ALTER TABLE disputes ALTER COLUMN status SET DEFAULT 'open'");
  await pool.query('CREATE INDEX IF NOT EXISTS disputes_status_idx ON disputes (status, priority)');

  await pool.query(`
    CREATE TABLE IF NOT EXISTS generated_contracts (
      id UUID PRIMARY KEY,
      project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      description TEXT NOT NULL,
      total_budget NUMERIC NOT NULL,
      currency TEXT NOT NULL,
      contract_text TEXT NOT NULL,
      created_by_user_id UUID,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  await pool.query(
    'CREATE INDEX IF NOT EXISTS generated_contracts_project_idx ON generated_contracts (project_id, created_at DESC)'
  );
  await pool.query("ALTER TABLE generated_contracts ADD COLUMN IF NOT EXISTS homeowner_signed BOOLEAN NOT NULL DEFAULT false");
  await pool.query("ALTER TABLE generated_contracts ADD COLUMN IF NOT EXISTS contractor_signed BOOLEAN NOT NULL DEFAULT false");

  await pool.query(`
    CREATE TABLE IF NOT EXISTS generated_contract_signatures (
      id UUID PRIMARY KEY,
      contract_id UUID NOT NULL REFERENCES generated_contracts(id) ON DELETE CASCADE,
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      signature_data TEXT NOT NULL,
      signer_role TEXT,
      signed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  await pool.query(
    'CREATE UNIQUE INDEX IF NOT EXISTS gen_contract_signatures_unique ON generated_contract_signatures (contract_id, user_id)'
  );

  await pool.query(`
    CREATE TABLE IF NOT EXISTS flags (
      id UUID PRIMARY KEY,
      entity_type TEXT NOT NULL,
      entity_id TEXT NOT NULL,
      reason TEXT,
      status TEXT NOT NULL DEFAULT 'open',
      moderator_id UUID,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS feature_flags (
      id SERIAL PRIMARY KEY,
      feature_name TEXT UNIQUE NOT NULL,
      enabled BOOLEAN NOT NULL DEFAULT false,
      description TEXT,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_by UUID
    )
  `);

  await ensureDefaultFeatureFlags();
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
  status: (row.status || 'pending_funding').toLowerCase(),
  submittedAt:
    row.submitted_at instanceof Date ? row.submitted_at.toISOString() : row.submitted_at || null,
  approvedAt:
    row.approved_at instanceof Date ? row.approved_at.toISOString() : row.approved_at || null,
  paidAt: row.paid_at instanceof Date ? row.paid_at.toISOString() : row.paid_at || null,
  submittedBy: row.submitted_by || null,
  approvedBy: row.approved_by || null,
  notes: row.notes || '',
  evidence: Array.isArray(row.evidence) ? row.evidence : [],
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
  assignedContractor: row.accepted_contractor_id
    ? {
        id: row.accepted_contractor_id,
        fullName: row.accepted_contractor_full_name,
        email: row.accepted_contractor_email,
        phone: row.accepted_contractor_phone,
        profilePhotoUrl: row.accepted_contractor_profile_photo_url || '',
        rating:
          row.accepted_contractor_rating !== null && row.accepted_contractor_rating !== undefined
            ? Number(row.accepted_contractor_rating)
            : null,
      }
    : undefined,
  acceptedApplicationId: row.accepted_app_id,
});

const mapMediaRow = (row = {}) => ({
  id: row.id,
  url: row.url,
  label: row.label || '',
});

const mapInvoiceRow = (row = {}) => ({
  id: row.id,
  invoiceNumber: row.invoice_number,
  projectId: row.project_id,
  milestoneId: row.milestone_id,
  contractorId: row.contractor_id,
  homeownerId: row.homeowner_id,
  amount: row.amount !== null && row.amount !== undefined ? Number(row.amount) : 0,
  currency: row.currency || 'USD',
  issueDate: row.issue_date instanceof Date ? row.issue_date.toISOString() : row.issue_date,
  dueDate: row.due_date instanceof Date ? row.due_date.toISOString() : row.due_date,
  status: (row.status || 'DRAFT').toUpperCase(),
  createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : row.created_at,
  updatedAt: row.updated_at instanceof Date ? row.updated_at.toISOString() : row.updated_at,
});

const mapTransactionWithContext = (row = {}) => {
  const invoice = row.invoice_id
    ? {
        id: row.invoice_id,
        invoiceNumber: row.invoice_number,
        status: (row.invoice_status || 'DRAFT').toUpperCase(),
        amount: row.invoice_amount !== null && row.invoice_amount !== undefined ? Number(row.invoice_amount) : null,
        currency: row.invoice_currency || 'USD',
        issueDate: row.invoice_issue_date instanceof Date
          ? row.invoice_issue_date.toISOString()
          : row.invoice_issue_date,
        dueDate: row.invoice_due_date instanceof Date
          ? row.invoice_due_date.toISOString()
          : row.invoice_due_date,
      }
    : null;

  const milestone = row.milestone_id
    ? {
        id: row.milestone_id,
        name: row.milestone_name,
        status: (row.milestone_status || '').toLowerCase(),
        amount: row.milestone_amount !== null && row.milestone_amount !== undefined ? Number(row.milestone_amount) : null,
      }
    : null;

  return {
    id: row.id,
    projectId: row.project_id,
    milestoneId: row.milestone_id || null,
    type: row.type,
    status: row.status,
    amount: row.amount !== null && row.amount !== undefined ? Number(row.amount) : null,
    currency: invoice?.currency || 'USD',
    reference: row.reference || null,
    provider: row.provider || null,
    externalId: row.external_id || null,
    failureReason: row.failure_reason || null,
    createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : row.created_at,
    milestone,
    invoice,
  };
};

const mapAttachmentRow = (row = {}) => ({
  id: row.id,
  milestoneId: row.milestone_id,
  uploaderId: row.uploader_id,
  storageKey: row.storage_key,
  fileName: row.file_name,
  mimeType: row.mime_type,
  fileSize: row.file_size !== null && row.file_size !== undefined ? Number(row.file_size) : null,
  createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : row.created_at,
});

const mapVerificationSessionRow = (row = {}) => ({
  id: row.id,
  userId: row.user_id,
  provider: row.provider,
  externalSessionId: row.external_session_id,
  status: (row.status || 'PENDING').toUpperCase(),
  createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : row.created_at,
  updatedAt: row.updated_at instanceof Date ? row.updated_at.toISOString() : row.updated_at,
});

const mapContractRow = (row = {}, signatures = []) => ({
  id: row.id,
  projectId: row.project_id,
  createdBy: row.created_by,
  ownerId: row.owner_id,
  title: row.title || '',
  terms: row.terms || '',
  status: row.status || 'pending',
  provider: row.provider || null,
  externalId: row.external_id || null,
  signedFileKey: row.signed_file_key || null,
  signedAt: row.signed_at instanceof Date ? row.signed_at.toISOString() : row.signed_at,
  createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : row.created_at,
  updatedAt: row.updated_at instanceof Date ? row.updated_at.toISOString() : row.updated_at,
  version: typeof row.version === 'number' ? row.version : row.version ? Number(row.version) : 1,
  pdfUrl: row.pdf_url || '',
  signatureCount: Number(row.signature_count ?? row.signatures_count ?? signatures.length ?? 0),
  signatures,
});

const mapEscrowRow = (row = {}) => ({
  id: row.id,
  projectId: row.project_id,
  ownerId: row.owner_id,
  totalDeposited:
    row.total_deposited !== null && row.total_deposited !== undefined
      ? Number(row.total_deposited)
      : 0,
  totalReleased:
    row.total_released !== null && row.total_released !== undefined
      ? Number(row.total_released)
      : 0,
  availableBalance:
    row.available_balance !== null && row.available_balance !== undefined
      ? Number(row.available_balance)
      : 0,
  currency: row.currency || 'USD',
  status: row.status || 'open',
  updatedAt: row.updated_at instanceof Date ? row.updated_at.toISOString() : row.updated_at,
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

const mapFeatureFlagRow = (row = {}) => ({
  featureName: row.feature_name,
  enabled: !!row.enabled,
  description: row.description || '',
  updatedAt: row.updated_at instanceof Date ? row.updated_at.toISOString() : row.updated_at,
  updatedBy: row.updated_by || null,
});

const getProjectById = async (projectId) => {
  if (!projectId) return null;
  await assertDbReady();
  const result = await pool.query('SELECT * FROM projects WHERE id = $1 LIMIT 1', [projectId]);
  return result.rows[0] || null;
};

const getAssignedContractorId = async (projectId, client = pool) => {
  const result = await client.query(
    "SELECT contractor_id FROM project_applications WHERE project_id = $1 AND status = 'accepted' ORDER BY created_at DESC LIMIT 1",
    [projectId]
  );
  return result.rows[0]?.contractor_id || null;
};

const ensureEscrowAccount = async (client, projectRow) => {
  const escrowExisting = await client.query(
    'SELECT * FROM escrow_accounts WHERE project_id = $1 FOR UPDATE',
    [projectRow.id]
  );
  if (escrowExisting.rows.length) {
    return escrowExisting.rows[0];
  }
  const escrowId = crypto.randomUUID?.() || crypto.randomBytes(16).toString('hex');
  const inserted = await client.query(
    `
      INSERT INTO escrow_accounts (id, project_id, owner_id)
      VALUES ($1, $2, $3)
      RETURNING *
    `,
    [escrowId, projectRow.id, projectRow.user_id]
  );
  return inserted.rows[0];
};

const refreshFundedMilestones = async (client, projectId, totalDeposited) => {
  const milestoneRows = await client.query(
    'SELECT id, amount, status, position FROM milestones WHERE project_id = $1 ORDER BY position ASC',
    [projectId]
  );

  let runningTotal = 0;
  const fundableIds = [];
  for (const row of milestoneRows.rows) {
    const amountNum = row.amount !== null && row.amount !== undefined ? Number(row.amount) : 0;
    runningTotal += amountNum;
    if (row.status === 'pending_funding' && amountNum && runningTotal <= totalDeposited) {
      fundableIds.push(row.id);
    }
  }

  if (fundableIds.length) {
    await client.query(
      `UPDATE milestones SET status = 'funded' WHERE id = ANY($1::uuid[])`,
      [fundableIds]
    );
  }
};

const buildInvoiceNumber = (projectId) => {
  const datePart = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const rand = Math.floor(Math.random() * 9000) + 1000;
  return `INV-${datePart}-${projectId?.slice(0, 6) || 'PROJ'}-${rand}`;
};

const buildContractTerms = (projectRow, milestones = []) => {
  const milestoneLines = milestones
    .map((m, idx) => `  ${idx + 1}. ${m.name} - $${Number(m.amount || 0).toFixed(2)}`)
    .join('\n');
  return `Project: ${projectRow.title}\nAddress: ${projectRow.address || 'N/A'}\n\nScope & Milestones:\n${milestoneLines}\n\nPayment Terms: Funds held in escrow and released per approved milestone.`;
};

const ensureProjectContract = async (client, projectRow, milestones = []) => {
  const existing = await client.query('SELECT * FROM contracts WHERE project_id = $1 ORDER BY created_at DESC LIMIT 1', [projectRow.id]);
  if (existing.rows.length) return existing.rows[0];
  const contractId = crypto.randomUUID?.() || crypto.randomBytes(16).toString('hex');
  const terms = buildContractTerms(projectRow, milestones);
  const inserted = await client.query(
    `
      INSERT INTO contracts (id, project_id, created_by, title, terms, status)
      VALUES ($1, $2, $3, $4, $5, 'pending')
      RETURNING *
    `,
    [contractId, projectRow.id, projectRow.user_id, 'Milestone Agreement', terms]
  );
  return inserted.rows[0];
};

const generateInvoiceForMilestone = async (client, milestoneId, { createStatus = 'SENT', markPaid = false } = {}) => {
  if (!milestoneId) return null;
  const milestoneRes = await client.query(
    `
      SELECT m.*, p.user_id AS homeowner_id
      FROM milestones m
      JOIN projects p ON p.id = m.project_id
      WHERE m.id = $1
      LIMIT 1
    `,
    [milestoneId]
  );
  if (!milestoneRes.rows.length) return null;

  const milestoneRow = milestoneRes.rows[0];
  const contractorId = await getAssignedContractorId(milestoneRow.project_id, client);
  const amountNum = milestoneRow.amount !== null && milestoneRow.amount !== undefined ? Number(milestoneRow.amount) : 0;
  const issueDate = new Date();
  const dueDate = new Date(issueDate.getTime() + 14 * 24 * 60 * 60 * 1000);

  const existing = await client.query('SELECT * FROM invoices WHERE milestone_id = $1 LIMIT 1', [milestoneId]);

  if (!existing.rows.length) {
    const invoiceId = crypto.randomUUID?.() || crypto.randomBytes(16).toString('hex');
    const status = markPaid ? 'PAID' : (createStatus || 'SENT').toUpperCase();
    const inserted = await client.query(
      `
        INSERT INTO invoices (id, invoice_number, project_id, milestone_id, contractor_id, homeowner_id, amount, currency, issue_date, due_date, status)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        RETURNING *
      `,
      [
        invoiceId,
        buildInvoiceNumber(milestoneRow.project_id),
        milestoneRow.project_id,
        milestoneId,
        contractorId,
        milestoneRow.homeowner_id,
        amountNum,
        'USD',
        issueDate.toISOString(),
        dueDate.toISOString(),
        status,
      ]
    );
    return inserted.rows[0];
  }

  if (markPaid && (existing.rows[0].status || '').toUpperCase() !== 'PAID') {
    const updated = await client.query(
      `
        UPDATE invoices
        SET status = 'PAID', updated_at = NOW()
        WHERE id = $1
        RETURNING *
      `,
      [existing.rows[0].id]
    );
    return updated.rows[0];
  }

  return existing.rows[0];
};

const getProjectParticipants = async (projectId) => {
  if (!projectId) return null;
  await assertDbReady();
  const result = await pool.query(
    `
      SELECT
        p.user_id AS owner_id,
        owner.full_name AS owner_full_name,
        acc.contractor_id AS contractor_id,
        acc.contractor_full_name
      FROM projects p
      LEFT JOIN users owner ON owner.id = p.user_id
      LEFT JOIN LATERAL (
        SELECT
          pa.contractor_id,
          uc.full_name AS contractor_full_name
        FROM project_applications pa
        JOIN users uc ON uc.id = pa.contractor_id
        WHERE pa.project_id = p.id AND pa.status = 'accepted'
        ORDER BY pa.created_at DESC
        LIMIT 1
      ) acc ON TRUE
      WHERE p.id = $1
      LIMIT 1
    `,
    [projectId]
  );
  if (!result.rows.length) return null;
  const row = result.rows[0];
  return {
    ownerId: row.owner_id,
    ownerName: row.owner_full_name,
    contractorId: row.contractor_id,
    contractorName: row.contractor_full_name,
  };
};

const getProjectIdForMilestone = async (milestoneId) => {
  if (!milestoneId) return null;
  await assertDbReady();
  const res = await pool.query('SELECT project_id FROM milestones WHERE id = $1 LIMIT 1', [milestoneId]);
  return res.rows[0]?.project_id || null;
};

const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'video/mp4',
  'application/pdf',
];

const isAllowedMime = (mime) => ALLOWED_MIME_TYPES.includes((mime || '').toLowerCase());

const webhookSecret = process.env.PAYMENT_WEBHOOK_SECRET || 'stub-secret';
const esignWebhookSecret = process.env.ESIGN_WEBHOOK_SECRET || 'stub-esign';

const validatePaymentSignature = (headers, payloadString = '') => {
  // Stub: replace with provider HMAC validation. For now, compare header to secret.
  const signature = headers['x-provider-signature'] || headers['x-signature'] || '';
  return signature === webhookSecret || webhookSecret === 'stub-secret';
};

const validateEsignSignature = (headers) => {
  const signature = headers['x-esign-signature'] || headers['x-signature'] || '';
  return signature === esignWebhookSecret || esignWebhookSecret === 'stub-esign';
};

const markInvoicePaid = async (client, milestoneId) => {
  if (!milestoneId) return null;
  const invoiceRes = await client.query('SELECT * FROM invoices WHERE milestone_id = $1 LIMIT 1', [milestoneId]);
  if (!invoiceRes.rows.length) return null;
  if ((invoiceRes.rows[0].status || '').toUpperCase() === 'PAID') return invoiceRes.rows[0];
  const updated = await client.query(
    `
      UPDATE invoices
      SET status = 'PAID', updated_at = NOW()
      WHERE id = $1
      RETURNING *
    `,
    [invoiceRes.rows[0].id]
  );
  return updated.rows[0];
};

const getAccountingConnection = async (contractorId, provider) => {
  if (!contractorId) return null;
  await assertDbReady();
  const params = [contractorId];
  let where = 'contractor_id = $1';
  if (provider) {
    params.push(provider);
    where += ` AND provider = $${params.length}`;
  }
  const res = await pool.query(
    `SELECT * FROM contractor_accounting_connections WHERE ${where} ORDER BY updated_at DESC LIMIT 1`,
    params
  );
  return res.rows[0] || null;
};

const isUserVerified = async (userId) => {
  if (!userId) return false;
  await assertDbReady();
  const res = await pool.query('SELECT is_verified FROM users WHERE id = $1 LIMIT 1', [userId]);
  return !!res.rows[0]?.is_verified;
};

const isProjectParticipant = (participants, userId) => {
  if (!participants || !userId) return false;
  return (
    participants.ownerId === userId ||
    (!!participants.contractorId && participants.contractorId === userId)
  );
};

const fetchMessageWithUsers = async (messageId) => {
  if (!messageId) return null;
  const result = await pool.query(
    `
      SELECT
        pm.*,
        sender.full_name AS sender_full_name,
        sender.email AS sender_email,
        sender.role AS sender_role,
        receiver.full_name AS receiver_full_name,
        receiver.email AS receiver_email,
        receiver.role AS receiver_role
      FROM project_messages pm
      LEFT JOIN users sender ON sender.id = pm.sender_id
      LEFT JOIN users receiver ON receiver.id = pm.receiver_id
      WHERE pm.id = $1
      LIMIT 1
    `,
    [messageId]
  );
  return result.rows[0] || null;
};

const fetchProjectPersonnel = async (projectId) => {
  if (!projectId) return [];
  await assertDbReady();
  const result = await pool.query(
    `
      SELECT
        pp.*,
        u.full_name,
        u.email,
        u.phone,
        u.profile_photo_url,
        u.role
      FROM project_personnel pp
      JOIN users u ON u.id = pp.user_id
      WHERE pp.project_id = $1
      ORDER BY pp.created_at ASC
    `,
    [projectId]
  );
  return result.rows;
};

const upsertPersonnel = async (client, projectId, userId, role = null) => {
  if (!projectId || !userId) return;
  await client.query(
    `
      INSERT INTO project_personnel (project_id, user_id, personnel_role)
      VALUES ($1, $2, $3)
      ON CONFLICT (project_id, user_id) DO NOTHING
    `,
    [projectId, userId, role]
  );
};

const buildProjectMemberSet = async (projectId) => {
  const participants = await getProjectParticipants(projectId);
  const personnelRows = await fetchProjectPersonnel(projectId);
  const memberIds = new Set();
  if (participants?.ownerId) memberIds.add(participants.ownerId);
  if (participants?.contractorId) memberIds.add(participants.contractorId);
  for (const row of personnelRows) {
    if (row.user_id) memberIds.add(row.user_id);
  }
  return { participants, memberIds };
};

const getProjectContractorIds = async (projectId) => {
  const participants = await getProjectParticipants(projectId);
  const personnelRows = await fetchProjectPersonnel(projectId);
  const contractorIds = new Set();
  if (participants?.contractorId) contractorIds.add(participants.contractorId);
  for (const row of personnelRows) {
    const role = normalizeRole(row.personnel_role || row.role || '');
    if (role.includes('contractor')) {
      contractorIds.add(row.user_id);
    }
  }
  return contractorIds;
};

const isNonLaborContractorRole = (role = '') => {
  const r = normalizeRole(role);
  if (!r || r === 'laborer' || r === 'worker') return false;
  return (
    r.includes('contractor') ||
    r.includes('subcontractor') ||
    r.includes('foreman') ||
    r.includes('manager') ||
    r.includes('supervisor') ||
    r.includes('lead')
  );
};

const resolveMessageReceiver = (participants, memberIds, senderId, requestedReceiverId) => {
  if (!participants || !memberIds || !senderId) return null;
  if (requestedReceiverId && memberIds.has(requestedReceiverId)) {
    return requestedReceiverId;
  }
  if (participants.ownerId && participants.ownerId !== senderId) {
    return participants.ownerId;
  }
  if (participants.contractorId && participants.contractorId !== senderId) {
    return participants.contractorId;
  }
  return null;
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

const mapMessageRow = (row = {}) => ({
  id: row.id,
  projectId: row.project_id,
  senderId: row.sender_id,
  receiverId: row.receiver_id,
  body: row.body || '',
  isDeleted: !!row.is_deleted,
  createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : row.created_at,
  updatedAt: row.updated_at instanceof Date ? row.updated_at.toISOString() : row.updated_at,
  deletedAt: row.deleted_at instanceof Date ? row.deleted_at.toISOString() : row.deleted_at,
  sender: row.sender_id
    ? {
        id: row.sender_id,
        fullName: row.sender_full_name,
        email: row.sender_email,
        role: row.sender_role,
      }
    : undefined,
  receiver: row.receiver_id
    ? {
        id: row.receiver_id,
        fullName: row.receiver_full_name,
        email: row.receiver_email,
        role: row.receiver_role,
      }
    : undefined,
});

const mapProjectPersonnelRow = (row = {}) => ({
  id: row.id,
  projectId: row.project_id,
  userId: row.user_id,
  role: row.personnel_role || row.role || '',
  addedAt: row.created_at instanceof Date ? row.created_at.toISOString() : row.created_at,
  user: row.user_id
    ? {
        id: row.user_id,
        fullName: row.full_name,
        email: row.email,
        phone: row.phone,
        profilePhotoUrl: row.profile_photo_url || '',
        role: row.role,
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

const CONTRACT_STATUSES = new Set(['pending', 'signed', 'rejected']);

const mapSignatureRow = (row = {}) => ({
  id: row.id,
  contractId: row.contract_id,
  userId: row.user_id,
  signatureData: row.signature_data || '',
  signedAt: row.signed_at instanceof Date ? row.signed_at.toISOString() : row.signed_at,
  ipAddress: row.ip_address || '',
  user: row.user_id
    ? {
        id: row.user_id,
        fullName: row.user_full_name,
        email: row.user_email,
        role: row.user_role,
      }
    : undefined,
});

const mapPortfolioRow = (row = {}, media = []) => ({
  id: row.id,
  contractorId: row.contractor_id,
  title: row.title || '',
  bio: row.bio || '',
  specialties: row.specialties || [],
  hourlyRate:
    row.hourly_rate !== null && row.hourly_rate !== undefined ? Number(row.hourly_rate) : null,
  serviceArea: row.service_area || '',
  media,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

const mapReviewRow = (row = {}) => ({
  id: row.id,
  contractorId: row.contractor_id,
  projectId: row.project_id,
  reviewerId: row.reviewer_id,
  ratingOverall: row.rating_overall,
  ratingQuality: row.rating_quality,
  ratingTimeliness: row.rating_timeliness,
  ratingCommunication: row.rating_communication,
  ratingBudget: row.rating_budget,
  comment: row.comment || '',
  photos: Array.isArray(row.photos) ? row.photos : [],
  status: row.status,
  responseText: row.response_text || '',
  responseAt: row.response_at,
  createdAt: row.created_at,
});

const mapAuditRow = (row = {}) => ({
  id: row.id,
  actorId: row.actor_id,
  actorRole: row.actor_role,
  action: row.action,
  entityType: row.entity_type,
  entityId: row.entity_id,
  metadata: row.metadata || {},
  createdAt: row.created_at,
});

const mapComplianceRow = (row = {}) => ({
  id: row.id,
  userId: row.user_id,
  type: row.type,
  url: row.url,
  expiresAt: row.expires_at,
  status: row.status || 'active',
  notes: row.notes || '',
  createdAt: row.created_at,
});

const mapGeneratedContractRow = (row = {}, signatures = []) => ({
  id: row.id,
  projectId: row.project_id,
  description: row.description || '',
  totalBudget:
    row.total_budget !== null && row.total_budget !== undefined ? Number(row.total_budget) : null,
  currency: row.currency || '',
  contractText: row.contract_text || '',
  createdByUserId: row.created_by_user_id || null,
  createdAt: row.created_at,
  signatures: signatures.map((sig) => ({
    id: sig.id,
    userId: sig.user_id,
    signerRole: sig.signer_role || null,
    signatureData: sig.signature_data,
    signedAt: sig.signed_at instanceof Date ? sig.signed_at.toISOString() : sig.signed_at,
  })),
});

const fetchContractWithProject = async (contractId) => {
  if (!contractId) return null;
  await assertDbReady();
  const result = await pool.query(
    `
      SELECT c.*, p.user_id AS owner_id
      FROM contracts c
      JOIN projects p ON p.id = c.project_id
      WHERE c.id = $1
    `,
    [contractId]
  );
  return result.rows[0] || null;
};

const isValidBase64 = (value = '') => {
  if (typeof value !== 'string') return false;
  const trimmed = value.trim();
  if (!trimmed) return false;
  const payload = trimmed.includes(',') ? trimmed.split(',').pop() : trimmed;
  try {
    const normalized = payload.replace(/\s+/g, '');
    if (!normalized) return false;
    const reconstructed = Buffer.from(normalized, 'base64').toString('base64');
    return reconstructed.replace(/=+$/, '') === normalized.replace(/=+$/, '');
  } catch (error) {
    return false;
  }
};

const refreshContractStatus = async (contractId) => {
  const contractRow = await fetchContractWithProject(contractId);
  if (!contractRow || contractRow.status === 'rejected') {
    return;
  }

  const signatures = await pool.query(
    `
      SELECT cs.user_id, u.role
      FROM contract_signatures cs
      JOIN users u ON u.id = cs.user_id
      WHERE cs.contract_id = $1
    `,
    [contractId]
  );

  let ownerSigned = false;
  let contractorSigned = false;
  for (const row of signatures.rows) {
    if (row.user_id === contractRow.owner_id) {
      ownerSigned = true;
    }
    if (normalizeRole(row.role) === 'contractor') {
      contractorSigned = true;
    }
  }

  const derivedStatus = ownerSigned && contractorSigned ? 'signed' : 'pending';
  if (contractRow.status === 'signed' && derivedStatus !== 'signed') {
    return;
  }
  if (derivedStatus !== contractRow.status) {
    await pool.query('UPDATE contracts SET status = $1 WHERE id = $2', [derivedStatus, contractId]);
  }
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

const sanitizeFileName = (value = '') => value.replace(/[^\w.-]/g, '_');

const inferExtension = (fileName = '', mimeType = '') => {
  const ext = path.extname(fileName || '').replace('.', '');
  if (ext) return ext;
  if (mimeType && mimeType.includes('/')) {
    return mimeType.split('/')[1] || 'bin';
  }
  return 'bin';
};

const extractBase64Payload = (raw = '') => {
  if (!raw) return '';
  if (!isDataUri(raw)) return raw;
  const [, data] = raw.split(',');
  return data || '';
};

// Remove only the existing signatures block (header until next markdown header), preserving surrounding content.
const stripExistingSignaturesSection = (text = '') => {
  if (!text) return '';
  const lines = text.split('\n');
  const isSignatureHeader = (line = '') => /\*\*[^*]*signatures[^*]*\*\*:*/i.test(line);
  const headerIndex = lines.findIndex((line) => isSignatureHeader(line));
  if (headerIndex === -1) return text.trimEnd();

  // Find the next markdown header after the signatures header
  let endIndex = lines.length;
  for (let i = headerIndex + 1; i < lines.length; i += 1) {
    if (/^\s*\*\*.+\*\*/.test(lines[i])) {
      endIndex = i;
      break;
    }
  }

  const before = lines.slice(0, headerIndex).join('\n').trimEnd();
  const after = lines.slice(endIndex).join('\n').trimStart();
  if (before && after) return `${before}\n\n${after}`.trimEnd();
  return (before || after).trimEnd();
};

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

const persistPortfolioMedia = async (portfolioId, mediaItems = []) => {
  const saved = [];
  for (const item of mediaItems) {
    if (!item.url) continue;
    if (!isDataUri(item.url)) {
      saved.push({ url: item.url, caption: item.caption || '', type: item.type || 'general' });
      continue;
    }
    try {
      const [meta, base64Data] = item.url.split(',');
      const mimeMatch = /data:(.*?);base64/.exec(meta || '');
      const mimeType = mimeMatch?.[1] || 'image/jpeg';
      const extension = mimeType.split('/')[1] || 'jpg';
      const filename = `${Date.now()}-${crypto.randomBytes(6).toString('hex')}.${extension}`;
      const dir = path.join(UPLOAD_DIR, 'portfolio', portfolioId);
      await fs.promises.mkdir(dir, { recursive: true });
      const filePath = path.join(dir, filename);
      await fs.promises.writeFile(filePath, base64Data || '', 'base64');
      const relativePath = path.relative(__dirname, filePath);
      saved.push({ url: `/${relativePath}`, caption: item.caption || '', type: item.type || 'general' });
    } catch (err) {
      console.error('Error saving portfolio media:', err);
    }
  }
  return saved;
};

const persistComplianceFile = async (userId, type, fileName, mimeType, base64Data) => {
  const extension = inferExtension(fileName, mimeType);
  const safeName = sanitizeFileName(fileName || `${type}-${Date.now()}.${extension}`);
  const finalName = `${Date.now()}-${crypto.randomBytes(6).toString('hex')}.${extension}`;
  const dir = path.join(UPLOAD_DIR, 'compliance', userId || 'misc');
  await fs.promises.mkdir(dir, { recursive: true });
  const filePath = path.join(dir, finalName);
  await fs.promises.writeFile(filePath, extractBase64Payload(base64Data || ''), 'base64');
  const relativePath = path.relative(__dirname, filePath);
  return { url: `/${relativePath}`, fileName: safeName, mimeType: mimeType || 'application/octet-stream' };
};

const generateContractPdf = async ({ contract, project, signatures = [] }) => {
  if (!contract?.id) return null;
  const dir = path.join(UPLOAD_DIR, 'contracts', contract.id);
  await fs.promises.mkdir(dir, { recursive: true });
  const filename = `${contract.id}-v${contract.version || 1}.pdf`;
  const filePath = path.join(dir, filename);

  const doc = new PDFDocument({ margin: 50 });
  const stream = fs.createWriteStream(filePath);
  doc.pipe(stream);

  doc.fontSize(20).text(contract.title || 'Contract', { align: 'center' }).moveDown(1);
  doc.fontSize(12).text(`Project: ${project?.title || ''}`);
  doc.text(`Address: ${project?.address || ''}`);
  doc.text(`Timeline: ${project?.timeline || ''}`);
  doc.text(`Budget: $${Number(project?.estimated_budget || 0).toLocaleString()}`);
  doc.moveDown();
  doc.fontSize(14).text('Terms & Deliverables', { underline: true }).moveDown(0.5);
  doc.fontSize(12).text(contract.terms || '', { align: 'left' });
  doc.moveDown();
  doc.fontSize(14).text('Signatures', { underline: true }).moveDown(0.5);
  signatures.forEach((sig, idx) => {
    doc.fontSize(12).text(
      `${idx + 1}. ${sig.user?.fullName || sig.userId} (${sig.user?.role || ''}) at ${
        sig.signedAt || ''
      }`
    );
  });

  doc.end();

  await new Promise((resolve, reject) => {
    stream.on('finish', resolve);
    stream.on('error', reject);
  });

  const relativePath = path.relative(__dirname, filePath);
  return {
    pdfUrl: `/${relativePath}`,
    fileName: filename,
    mimeType: 'application/pdf',
  };
};

const appendAudit = async ({
  actorId = null,
  actorRole = null,
  action = '',
  entityType = null,
  entityId = null,
  metadata = {},
}) => {
  if (!action) return;
  if (!pool) return;
  try {
    const id = crypto.randomUUID?.() || crypto.randomBytes(16).toString('hex');
    await pool.query(
      `
        INSERT INTO audit_logs (id, actor_id, actor_role, action, entity_type, entity_id, metadata)
        VALUES ($1,$2,$3,$4,$5,$6,$7)
      `,
      [id, actorId, actorRole, action, entityType, entityId, metadata ? metadata : {}]
    );
  } catch (err) {
    console.error('appendAudit error', err);
  }
};

const isAdminRequest = (req) => {
  const key = req.headers['x-admin-key'] || req.body?.adminKey || req.query?.adminKey;
  if (process.env.ADMIN_KEY && key && key === process.env.ADMIN_KEY) return true;
  return false;
};

const requireAdmin = (req, res) => {
  if (!isAdminRequest(req)) {
    res.status(403).json({ message: 'Admin access required' });
    return false;
  }
  return true;
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
    const { contractorId, message, workDate, pay, workerPostId } = req.body || {};
    if (!isUuid(projectId) || !isUuid(contractorId)) {
      return res.status(400).json({ message: 'Invalid projectId or contractorId' });
    }
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
        INSERT INTO project_applications (id, project_id, contractor_id, status, message, work_date, pay, worker_post_id)
        VALUES ($1, $2, $3, 'pending', $4, $5, $6, $7)
        RETURNING *
      `,
      [appId, projectId, contractorId, message || '', workDate || null, pay || null, workerPostId || null]
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

// Contractor posts work for workers to apply
app.post('/api/projects/:projectId/gigs', async (req, res) => {
  const client = await pool.connect();
  try {
    const { projectId } = req.params;
    const { contractorId, title, description, workDate, pay, tags = [] } = req.body || {};
    logInfo('gigs:create:request', {
      projectId,
      contractorId,
      hasTitle: !!title,
      hasDescription: !!description,
      workDate,
      pay,
      tags,
    });
    if (!isUuid(projectId) || !isUuid(contractorId)) {
      return res.status(400).json({ message: 'Invalid projectId or contractorId' });
    }
    await assertDbReady();
    const project = await getProjectById(projectId);
    if (!project) return res.status(404).json({ message: 'Project not found' });
    const participants = await getProjectParticipants(projectId);
    const allowed =
      !!participants &&
      (participants.contractorId === contractorId || participants.ownerId === contractorId);
    if (!allowed) {
      logInfo('gigs:create:forbidden', { projectId, contractorId, participants });
      return res
        .status(403)
        .json({ message: 'Only the contractor on this project can post work' });
    }
    await client.query('BEGIN');
    const gigId = crypto.randomUUID?.() || crypto.randomBytes(16).toString('hex');
    const inserted = await client.query(
      `
        INSERT INTO project_applications (id, project_id, contractor_id, status, message, is_worker_post, work_date, pay, tags)
        VALUES ($1, $2, $3, 'pending', $4, true, $5, $6, $7)
        RETURNING *
      `,
      [gigId, projectId, contractorId, description || title || '', workDate || null, pay || null, tags]
    );
    await client.query('COMMIT');
    return res.status(201).json(inserted.rows[0]);
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('gigs:create:error', error);
    const message = pool ? 'Failed to post work' : 'Database is not configured (set DATABASE_URL)';
    return res.status(500).json({ message });
  } finally {
    client.release();
  }
});

// Worker applies to a posted gig
app.post('/api/gigs/:gigId/apply', async (req, res) => {
  const client = await pool.connect();
  try {
    const { gigId } = req.params;
    const { workerId, message } = req.body || {};
    if (!isUuid(gigId) || !isUuid(workerId)) {
      return res.status(400).json({ message: 'Invalid ids' });
    }
    await assertDbReady();
    const gigRes = await client.query(
      'SELECT * FROM project_applications WHERE id = $1 AND is_worker_post = true AND status = $2',
      [gigId, 'pending']
    );
    if (!gigRes.rows.length) {
      return res.status(404).json({ message: 'Gig not found or unavailable' });
    }
    const gigRow = gigRes.rows[0];

    // Simple date conflict check
    if (gigRow.work_date) {
      const conflict = await client.query(
        `SELECT 1 FROM project_applications
         WHERE contractor_id = $1 AND status = 'accepted' AND work_date = $2
         LIMIT 1`,
        [workerId, gigRow.work_date]
      );
      if (conflict.rows.length) {
        return res.status(409).json({ message: 'Date conflicts with another gig' });
      }
    }

    const existing = await client.query(
      `
        SELECT 1 FROM project_applications
        WHERE worker_post_id = $1 AND contractor_id = $2
          AND status IN ('pending','accepted')
        LIMIT 1
      `,
      [gigId, workerId]
    );
    if (existing.rows.length) {
      return res.status(409).json({ message: 'You already applied to this gig' });
    }

    const appId = crypto.randomUUID?.() || crypto.randomBytes(16).toString('hex');
    const inserted = await client.query(
      `
        INSERT INTO project_applications (id, project_id, contractor_id, status, message, work_date, pay, worker_post_id)
        VALUES ($1, $2, $3, 'pending', $4, $5, $6, $7)
        RETURNING *
      `,
      [appId, gigRow.project_id, workerId, message || '', gigRow.work_date || null, gigRow.pay || null, gigId]
    );

    const notifId = crypto.randomUUID?.() || crypto.randomBytes(16).toString('hex');
    await client.query(
      `
        INSERT INTO notifications (id, user_id, title, body, data)
        VALUES ($1, $2, $3, $4, $5)
      `,
      [
        notifId,
        gigRow.contractor_id,
        'New worker application',
        'A worker applied to your posted work',
        JSON.stringify({
          applicationId: appId,
          projectId: gigRow.project_id,
          gigId,
        }),
      ]
    );

    return res.status(201).json(inserted.rows[0]);
  } catch (error) {
    console.error('gigs:apply:error', error);
    const message = pool ? 'Failed to apply to gig' : 'Database is not configured (set DATABASE_URL)';
    return res.status(500).json({ message });
  } finally {
    client.release();
  }
});

// Worker-facing gigs list
app.get('/api/gigs/open', async (_req, res) => {
  try {
    const workerId = _req.query?.workerId;
    const params = [];
    let extraFilter = '';
    if (workerId && isUuid(workerId)) {
      params.push(workerId);
      extraFilter = `
        AND NOT EXISTS (
          SELECT 1 FROM project_applications pa2
          WHERE pa2.worker_post_id = pa.id
            AND pa2.contractor_id = $1
            AND pa2.status IN ('pending','accepted')
        )
      `;
    }
    await assertDbReady();
    const result = await pool.query(
      `
        SELECT pa.*, p.title AS project_title, p.description AS project_description
        FROM project_applications pa
        JOIN projects p ON p.id = pa.project_id
        WHERE pa.is_worker_post = true
          AND pa.status = 'pending'
          AND NOT EXISTS (
            SELECT 1 FROM project_applications pa2
            WHERE pa2.worker_post_id = pa.id AND pa2.status = 'accepted'
          )
          ${extraFilter}
        ORDER BY pa.created_at DESC
      `,
      params
    );
    return res.json(result.rows);
  } catch (error) {
    console.error('gigs:list:error', error);
    const message = pool ? 'Failed to load gigs' : 'Database is not configured (set DATABASE_URL)';
    return res.status(500).json({ message });
  }
});

// Worker gig applications list
app.get('/api/gigs/applications', async (req, res) => {
  try {
    const { workerId } = req.query || {};
    if (!workerId || !isUuid(workerId)) {
      return res.status(400).json({ message: 'workerId is required' });
    }
    await assertDbReady();
    const result = await pool.query(
      `
        SELECT pa.*, p.title AS project_title
        FROM project_applications pa
        JOIN projects p ON p.id = pa.project_id
        WHERE pa.contractor_id = $1
          AND pa.worker_post_id IS NOT NULL
        ORDER BY pa.created_at DESC
      `,
      [workerId]
    );
    return res.json(result.rows);
  } catch (error) {
    console.error('gigs:applications:list:error', error);
    const message = pool ? 'Failed to load applications' : 'Database is not configured (set DATABASE_URL)';
    return res.status(500).json({ message });
  }
});

// Worker withdraws gig application
app.delete('/api/gigs/applications/:applicationId', async (req, res) => {
  try {
    const { applicationId } = req.params;
    const { workerId } = req.body || {};
    if (!isUuid(applicationId) || !isUuid(workerId)) {
      return res.status(400).json({ message: 'applicationId and workerId are required' });
    }
    await assertDbReady();
    const result = await pool.query(
      `
        UPDATE project_applications
        SET status = 'withdrawn'
        WHERE id::text = $1 AND contractor_id = $2 AND worker_post_id IS NOT NULL AND status = 'pending'
        RETURNING *
      `,
      [applicationId, workerId]
    );
    if (!result.rows.length) {
      return res.status(404).json({ message: 'Application not found or not withdrawable' });
    }
    return res.json({ success: true });
  } catch (error) {
    console.error('gigs:applications:withdraw:error', error);
    const message = pool ? 'Failed to withdraw application' : 'Database is not configured (set DATABASE_URL)';
    return res.status(500).json({ message });
  }
});

app.get('/api/notifications/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    if (!userId) {
      return res.status(400).json({ message: 'userId is required' });
    }
    if (!isUuid(userId)) {
      return res.status(400).json({ message: 'Invalid userId' });
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

app.post('/api/notifications/mark-read', async (req, res) => {
  try {
    const { userId, notificationIds } = req.body || {};
    await assertDbReady();

    if (Array.isArray(notificationIds) && notificationIds.length) {
      const validIds = notificationIds.filter((id) => isUuid(id));
      if (!validIds.length) {
        return res.status(400).json({ message: 'notificationIds must be valid UUIDs' });
      }
      const result = await pool.query(
        'UPDATE notifications SET read = true WHERE id = ANY($1::uuid[])',
        [validIds]
      );
      return res.json({ updated: result.rowCount });
    }

    if (!userId || !isUuid(userId)) {
      return res.status(400).json({ message: 'Valid userId is required' });
    }

    const result = await pool.query(
      'UPDATE notifications SET read = true WHERE user_id = $1 AND read = false',
      [userId]
    );
    return res.json({ updated: result.rowCount });
  } catch (error) {
    console.error('Error marking notifications read:', error);
    const message = pool
      ? 'Failed to mark notifications read'
      : 'Database is not configured (set DATABASE_URL)';
    return res.status(500).json({ message });
  }
});

app.post('/api/applications/:applicationId/:action', async (req, res) => {
  const client = await pool.connect();
  try {
    const { applicationId, action } = req.params;
    const { ownerId } = req.body || {};
    if (!isUuid(applicationId)) {
      return res.status(400).json({ message: 'Invalid applicationId' });
    }
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
        SELECT
          pa.*,
          p.user_id AS owner_id,
          p.title AS project_title,
          u.full_name AS contractor_name,
          u.email AS contractor_email,
          u.phone AS contractor_phone,
          owner.full_name AS owner_full_name,
          gig.contractor_id AS gig_contractor_id
        FROM project_applications pa
        JOIN projects p ON p.id = pa.project_id
        JOIN users u ON u.id = pa.contractor_id
        LEFT JOIN users owner ON owner.id = p.user_id
        LEFT JOIN project_applications gig ON gig.id = pa.worker_post_id
        WHERE pa.id::text = $1
      `,
      [applicationId]
    );
    if (!appResult.rows.length) {
      return res.status(404).json({ message: 'Application not found' });
    }

    const appRow = appResult.rows[0];
    const isWorkerApplication = !!appRow.worker_post_id;
    if (ownerId) {
      const ownerAllowed =
        ownerId === appRow.owner_id || (isWorkerApplication && ownerId === appRow.gig_contractor_id);
      if (!ownerAllowed) {
        return res.status(403).json({ message: 'Not authorized to modify this application' });
      }
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
    const ownerName = appRow.owner_full_name || 'Owner';
    const senderName = isWorkerApplication
      ? (ownerId && ownerId === appRow.gig_contractor_id ? 'Contractor' : ownerName)
      : ownerName;
    const notifTitle =
      newStatus === 'accepted'
        ? `${senderName} accepted your application`
        : `${senderName} responded to your application`;
    const notifBody =
      newStatus === 'accepted'
        ? `${senderName} accepted your application for ${appRow.project_title}`
        : `${appRow.project_title} has been ${newStatus}`;
    await client.query(
      `
        INSERT INTO notifications (id, user_id, title, body, data)
        VALUES ($1, $2, $3, $4, $5)
      `,
      [
        notificationId,
        appRow.contractor_id,
        notifTitle,
        notifBody,
        JSON.stringify({
          projectId: appRow.project_id,
          projectTitle: appRow.project_title,
          applicationId,
          status: newStatus,
          ownerName: senderName,
        }),
      ]
    );

    if (newStatus === 'accepted' && appRow.worker_post_id) {
      await client.query('UPDATE project_applications SET status = $1 WHERE id = $2', [
        'accepted',
        appRow.worker_post_id,
      ]);
      await client.query(
        `
          INSERT INTO project_personnel (project_id, user_id, personnel_role)
          VALUES ($1, $2, 'worker')
          ON CONFLICT (project_id, user_id) DO NOTHING
        `,
        [appRow.project_id, appRow.contractor_id]
      );
      const workerNotifId = crypto.randomUUID?.() || crypto.randomBytes(16).toString('hex');
      await client.query(
        `
          INSERT INTO notifications (id, user_id, title, body, data)
          VALUES ($1, $2, $3, $4, $5)
        `,
        [
          workerNotifId,
          appRow.contractor_id,
          'Added to project',
          `${ownerName} accepted you for ${appRow.project_title}`,
          JSON.stringify({
            type: 'worker-added',
            projectId: appRow.project_id,
            projectTitle: appRow.project_title,
          }),
        ]
      );
    }

    // Add accepted contractor/worker to personnel for visibility
    try {
      const role = appRow.worker_post_id ? 'worker' : 'contractor';
      await upsertPersonnel(client, appRow.project_id, appRow.contractor_id, role);
    } catch (err) {
      logError('applications:update:personnel:error', { applicationId, projectId: appRow.project_id }, err);
    }

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
    if (!isUuid(projectId) || !isUuid(contractorId)) {
      return res.status(400).json({ message: 'Invalid projectId or contractorId' });
    }
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
        SELECT
          pa.*,
          p.user_id AS owner_id,
          p.title AS project_title,
          u.full_name AS contractor_name,
          u.email AS contractor_email,
          u.phone AS contractor_phone,
          owner.full_name AS owner_full_name
        FROM project_applications pa
        JOIN projects p ON p.id = pa.project_id
        JOIN users u ON u.id = pa.contractor_id
        LEFT JOIN users owner ON owner.id = p.user_id
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
    const ownerName = appRow.owner_full_name || 'Homeowner';
    const notifTitle =
      newStatus === 'accepted'
        ? `${ownerName} accepted your application`
        : `${ownerName} responded to your application`;
    const notifBody =
      newStatus === 'accepted'
        ? `${ownerName} accepted your application for ${appRow.project_title}`
        : `${appRow.project_title} has been ${newStatus}`;
    await client.query(
      `
        INSERT INTO notifications (id, user_id, title, body, data)
        VALUES ($1, $2, $3, $4, $5)
      `,
      [
        notificationId,
        appRow.contractor_id,
        notifTitle,
        notifBody,
        JSON.stringify({
          projectId: appRow.project_id,
          projectTitle: appRow.project_title,
          applicationId: appRow.id,
          status: newStatus,
          ownerName,
        }),
      ]
    );

    if (newStatus === 'accepted') {
      try {
        await upsertPersonnel(client, projectId, contractorId, 'contractor');
      } catch (err) {
        logError('applications:decide:personnel:error', { projectId, contractorId }, err);
      }
    }

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
    if (!isUuid(contractorId)) {
      return res.status(400).json({ message: 'Invalid contractorId' });
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
          pa.id AS accepted_app_id,
          pa.contractor_id AS accepted_contractor_id,
          uc.full_name AS accepted_contractor_full_name,
          uc.email AS accepted_contractor_email,
          uc.phone AS accepted_contractor_phone,
          uc.profile_photo_url AS accepted_contractor_profile_photo_url,
          uc.rating AS accepted_contractor_rating,
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
        JOIN users uc ON uc.id = pa.contractor_id
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

app.post('/api/projects/:projectId/leave', async (req, res) => {
  const client = await pool.connect();
  try {
    const { projectId } = req.params;
    const { contractorId, workerId } = req.body || {};
    if (!isUuid(projectId)) {
      return res.status(400).json({ message: 'Invalid projectId' });
    }
    await assertDbReady();

    if (workerId) {
      if (!isUuid(workerId)) {
        return res.status(400).json({ message: 'Invalid workerId' });
      }
      const project = await getProjectById(projectId);
      if (!project) return res.status(404).json({ message: 'Project not found' });
      const worker = await getUserById(workerId);
      const participants = await getProjectParticipants(projectId);
      const personnelRow = await client.query(
        'SELECT * FROM project_personnel WHERE project_id = $1 AND user_id = $2 LIMIT 1',
        [projectId, workerId]
      );
      const gigApplications = await client.query(
        `
          SELECT pa.id, pa.worker_post_id, gig.status AS gig_status
          FROM project_applications pa
          LEFT JOIN project_applications gig ON gig.id = pa.worker_post_id
          WHERE pa.project_id = $1
            AND pa.contractor_id = $2
            AND pa.worker_post_id IS NOT NULL
            AND pa.status IN ('pending','accepted')
        `,
        [projectId, workerId]
      );
      if (!personnelRow.rows.length && !gigApplications.rows.length) {
        return res.status(404).json({ message: 'Worker not found on project' });
      }
      await client.query('BEGIN');
      if (personnelRow.rows.length) {
        await client.query('DELETE FROM project_personnel WHERE project_id = $1 AND user_id = $2', [
          projectId,
          workerId,
        ]);
      }
      if (gigApplications.rows.length) {
        const appIds = gigApplications.rows.map((r) => r.id);
        await client.query(
          `UPDATE project_applications SET status = 'withdrawn' WHERE id = ANY($1::uuid[])`,
          [appIds]
        );
        const gigIds = Array.from(
          new Set(gigApplications.rows.map((r) => r.worker_post_id).filter(Boolean))
        );
        if (gigIds.length) {
          await client.query(
            `UPDATE project_applications SET status = 'pending' WHERE id = ANY($1::uuid[])`,
            [gigIds]
          );
        }
      }
      const notifyIds = [];
      if (participants?.ownerId) notifyIds.push(participants.ownerId);
      if (participants?.contractorId && participants.contractorId !== participants.ownerId) {
        notifyIds.push(participants.contractorId);
      }
      for (const uid of notifyIds) {
        const notifId = crypto.randomUUID?.() || crypto.randomBytes(16).toString('hex');
        await client.query(
          `
            INSERT INTO notifications (id, user_id, title, body, data)
            VALUES ($1, $2, $3, $4, $5)
          `,
          [
            notifId,
            uid,
            `${worker?.full_name || 'Worker'} left ${project.title || 'project'}`,
            `${worker?.full_name || 'Worker'} has left ${project.title || 'the project'}.`,
            JSON.stringify({ projectId, workerId, type: 'worker-left' }),
          ]
        );
      }
      await client.query('COMMIT');
      return res.json({ status: 'left', projectId, workerId });
    }

    if (!contractorId || !isUuid(contractorId)) {
      return res.status(400).json({ message: 'Invalid projectId or contractorId' });
    }

    const appResult = await client.query(
      `
        SELECT
          pa.*,
          p.title AS project_title,
          p.user_id AS owner_id,
          owner.full_name AS owner_full_name,
          contractor.full_name AS contractor_full_name
        FROM project_applications pa
        JOIN projects p ON p.id = pa.project_id
        JOIN users owner ON owner.id = p.user_id
        JOIN users contractor ON contractor.id = pa.contractor_id
        WHERE pa.project_id = $1 AND pa.contractor_id = $2 AND pa.status = 'accepted'
        LIMIT 1
      `,
      [projectId, contractorId]
    );

    if (!appResult.rows.length) {
      return res.status(404).json({ message: 'No accepted application found for this project' });
    }

    const appRow = appResult.rows[0];

    await client.query('BEGIN');
    await client.query('UPDATE project_applications SET status = $1 WHERE id = $2', [
      'withdrawn',
      appRow.id,
    ]);
    // Remove contractor-invited personnel (retain owner only)
    await client.query('DELETE FROM project_personnel WHERE project_id = $1 AND user_id <> $2', [
      projectId,
      appRow.owner_id,
    ]);

    const notificationId = crypto.randomUUID?.() || crypto.randomBytes(16).toString('hex');
    await client.query(
      `
        INSERT INTO notifications (id, user_id, title, body, data)
        VALUES ($1, $2, $3, $4, $5)
      `,
      [
        notificationId,
        appRow.owner_id,
        `${appRow.contractor_full_name || 'Contractor'} has left ${appRow.project_title}`,
        `${appRow.contractor_full_name || 'Contractor'} has left ${appRow.project_title}.`,
        JSON.stringify({
          contractorId,
          projectId,
          applicationId: appRow.id,
          status: 'withdrawn',
        }),
      ]
    );

    await client.query('COMMIT');
    return res.json({ status: 'withdrawn', projectId, applicationId: appRow.id });
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('Error leaving project:', error);
    const message = pool
      ? 'Failed to leave project'
      : 'Database is not configured (set DATABASE_URL)';
    return res.status(500).json({ message });
  } finally {
    client.release();
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
    if (!isUuid(applicationId)) {
      return res.status(400).json({ message: 'Invalid applicationId' });
    }
    if (contractorId && !isUuid(contractorId)) {
      return res.status(400).json({ message: 'Invalid contractorId' });
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
      const milestoneId = crypto.randomUUID?.() || crypto.randomBytes(16).toString('hex');
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

    // Ensure a draft contract exists for this project, but do not block creation if it fails
    try {
      await client.query('SAVEPOINT project_contract');
      await ensureProjectContract(client, projectResult.rows[0], milestoneResults);
      await client.query('RELEASE SAVEPOINT project_contract');
    } catch (contractErr) {
      await client.query('ROLLBACK TO SAVEPOINT project_contract').catch(() => {});
      logError('project:create:ensure-contract:error', { projectId }, contractErr);
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

    // Ensure the owner shows up in personnel lists
    try {
      await upsertPersonnel(client, projectId, userId, 'owner');
    } catch (personnelErr) {
      logError('project:create:personnel:error', { projectId, userId }, personnelErr);
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

    const projectRes = await client.query('SELECT * FROM projects WHERE id = $1 LIMIT 1', [projectId]);
    if (!projectRes.rows.length) {
      return res.status(404).json({ message: 'Project not found' });
    }

    if (userId) {
      if (projectRes.rows[0].user_id !== userId) {
        return res.status(403).json({ message: 'Only the project owner can delete this project' });
      }
    }

    // Collect participants to notify before deletion
    const participants = new Set();
    participants.add(projectRes.rows[0].user_id);

    const contractorRes = await client.query(
      `
        SELECT contractor_id
        FROM project_applications
        WHERE project_id = $1 AND status = 'accepted' AND (is_worker_post IS NOT TRUE OR is_worker_post = false)
      `,
      [projectId]
    );
    contractorRes.rows.forEach((r) => r.contractor_id && participants.add(r.contractor_id));

    const personnelRes = await client.query(
      'SELECT user_id FROM project_personnel WHERE project_id = $1',
      [projectId]
    );
    personnelRes.rows.forEach((r) => r.user_id && participants.add(r.user_id));

    // Include any contract signers
    const contractSignerRes = await client.query(
      `
        SELECT DISTINCT gcs.user_id
        FROM generated_contract_signatures gcs
        JOIN generated_contracts gc ON gc.id = gcs.contract_id
        WHERE gc.project_id = $1
      `,
      [projectId]
    );
    contractSignerRes.rows.forEach((r) => r.user_id && participants.add(r.user_id));

    const gigApplicantsRes = await client.query(
      `
        SELECT contractor_id
        FROM project_applications
        WHERE project_id = $1
          AND worker_post_id IS NOT NULL
          AND status IN ('pending','accepted')
      `,
      [projectId]
    );
    gigApplicantsRes.rows.forEach((r) => r.contractor_id && participants.add(r.contractor_id));

    await client.query('BEGIN');
    // Remove old notifications tied to this project
    await client.query('DELETE FROM notifications WHERE data->>\'projectId\' = $1', [projectId]);
    // Delete project (dependent tables assumed ON DELETE CASCADE)
    await client.query('DELETE FROM projects WHERE id = $1', [projectId]);

    // Notify everyone involved (except the actor)
    if (participants.has(userId)) {
      participants.delete(userId);
    }
    for (const uid of participants) {
      if (!uid) continue;
      const notifId = crypto.randomUUID?.() || crypto.randomBytes(16).toString('hex');
      await client.query(
        `
          INSERT INTO notifications (id, user_id, title, body, data)
          VALUES ($1, $2, $3, $4, $5)
        `,
        [
          notifId,
          uid,
          'Project deleted',
          `${projectRes.rows[0].title || 'A project'} has been deleted by a team member.`,
          JSON.stringify({ type: 'project-deleted', projectId }),
        ]
      );
    }

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
    if (!isUuid(userId)) {
      return res.status(400).json({ message: 'Invalid userId' });
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
          m.status AS milestone_status,
          m.submitted_at AS milestone_submitted_at,
          m.approved_at AS milestone_approved_at,
          m.paid_at AS milestone_paid_at,
          m.submitted_by AS milestone_submitted_by,
          m.approved_by AS milestone_approved_by,
          m.notes AS milestone_notes,
          m.evidence AS milestone_evidence,
          m.created_at AS milestone_created_at,
          pm.id AS media_id,
          pm.url AS media_url,
          pm.label AS media_label,
          pm.created_at AS media_created_at,
          acc.accepted_app_id,
          acc.accepted_contractor_id,
          acc.accepted_contractor_full_name,
          acc.accepted_contractor_email,
          acc.accepted_contractor_phone,
          acc.accepted_contractor_profile_photo_url,
          acc.accepted_contractor_rating
        FROM projects p
        LEFT JOIN users u ON u.id = p.user_id
        LEFT JOIN milestones m ON m.project_id = p.id
        LEFT JOIN project_media pm ON pm.project_id = p.id
        LEFT JOIN LATERAL (
          SELECT
            pa.id AS accepted_app_id,
            pa.contractor_id AS accepted_contractor_id,
            uc.full_name AS accepted_contractor_full_name,
            uc.email AS accepted_contractor_email,
            uc.phone AS accepted_contractor_phone,
            uc.profile_photo_url AS accepted_contractor_profile_photo_url,
            uc.rating AS accepted_contractor_rating
          FROM project_applications pa
          JOIN users uc ON uc.id = pa.contractor_id
          WHERE pa.project_id = p.id AND pa.status = 'accepted'
          ORDER BY pa.created_at DESC
          LIMIT 1
        ) acc ON TRUE
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
            status: row.milestone_status,
            submitted_at: row.milestone_submitted_at,
            approved_at: row.milestone_approved_at,
            paid_at: row.milestone_paid_at,
            submitted_by: row.milestone_submitted_by,
            approved_by: row.milestone_approved_by,
            notes: row.milestone_notes,
            evidence: row.milestone_evidence,
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

app.get('/api/projects/:projectId/details', async (req, res) => {
  try {
    const { projectId } = req.params;
    if (!projectId || !isUuid(projectId)) {
      return res.status(400).json({ message: 'Invalid projectId' });
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
          pm.created_at AS media_created_at,
          acc.accepted_app_id,
          acc.accepted_contractor_id,
          acc.accepted_contractor_full_name,
          acc.accepted_contractor_email,
          acc.accepted_contractor_phone,
          acc.accepted_contractor_profile_photo_url,
          acc.accepted_contractor_rating
        FROM projects p
        LEFT JOIN users u ON u.id = p.user_id
        LEFT JOIN milestones m ON m.project_id = p.id
        LEFT JOIN project_media pm ON pm.project_id = p.id
        LEFT JOIN LATERAL (
          SELECT
            pa.id AS accepted_app_id,
            pa.contractor_id AS accepted_contractor_id,
            uc.full_name AS accepted_contractor_full_name,
            uc.email AS accepted_contractor_email,
            uc.phone AS accepted_contractor_phone,
            uc.profile_photo_url AS accepted_contractor_profile_photo_url,
            uc.rating AS accepted_contractor_rating
          FROM project_applications pa
          JOIN users uc ON uc.id = pa.contractor_id
          WHERE pa.project_id = p.id AND pa.status = 'accepted'
          ORDER BY pa.created_at DESC
          LIMIT 1
        ) acc ON TRUE
        WHERE p.id = $1
        ORDER BY m.position ASC, m.created_at ASC, pm.created_at ASC
      `,
      [projectId]
    );

    if (!result.rows.length) {
      return res.status(404).json({ message: 'Project not found' });
    }

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

    const payload = Array.from(grouped.values()).map(({ project, milestones, media }) =>
      mapProjectRow(project, milestones, media)
    )[0];

    return res.json(payload);
  } catch (error) {
    console.error('Error fetching project details:', error);
    const message = pool
      ? 'Failed to fetch project'
      : 'Database is not configured (set DATABASE_URL)';
    return res.status(500).json({ message });
  }
});

// Fund escrow for a project (homeowner deposit)
app.post('/api/projects/:projectId/escrow/deposit', async (req, res) => {
  const client = await pool.connect();
  try {
    const { projectId } = req.params;
    const { userId, amount, fundRemaining } = req.body || {};

    if (!projectId || !userId) {
      return res.status(400).json({ message: 'projectId and userId are required' });
    }

    await assertDbReady();
    const projectRow = await getProjectById(projectId);
    if (!projectRow) {
      return res.status(404).json({ message: 'Project not found' });
    }
    if (projectRow.user_id !== userId) {
      return res.status(403).json({ message: 'Only the project owner can fund escrow' });
    }

    const contractSigned = await pool.query(
      "SELECT status FROM contracts WHERE project_id = $1 ORDER BY created_at DESC LIMIT 1",
      [projectId]
    );
    const latestContractStatus = (contractSigned.rows[0]?.status || '').toLowerCase();
    if (latestContractStatus !== 'signed') {
      return res.status(403).json({ message: 'Contract must be fully signed before funding' });
    }

    const milestoneRows = await pool.query(
      'SELECT id, amount FROM milestones WHERE project_id = $1',
      [projectId]
    );
    const totalMilestones = milestoneRows.rows.reduce(
      (sum, m) => sum + (m.amount !== null && m.amount !== undefined ? Number(m.amount) : 0),
      0
    );
    await client.query('BEGIN');
    const escrowRow = await ensureEscrowAccount(client, projectRow);
    const alreadyDeposited = escrowRow.total_deposited !== null && escrowRow.total_deposited !== undefined
      ? Number(escrowRow.total_deposited)
      : 0;

    let depositAmount = Number(amount);
    if (fundRemaining) {
      depositAmount = Math.max(totalMilestones - alreadyDeposited, 0);
    }

    if (!Number.isFinite(depositAmount) || depositAmount <= 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ message: 'Deposit amount must be greater than zero' });
    }

    let providerResp;
    try {
      providerResp = await paymentProvider.createEscrowDeposit(projectId, depositAmount, escrowRow.currency || 'USD');
    } catch (providerError) {
      const failTxId = crypto.randomUUID?.() || crypto.randomBytes(16).toString('hex');
      await client.query(
        `
          INSERT INTO payment_transactions (id, project_id, milestone_id, payer_id, payee_id, type, amount, status, reference, provider, external_id, failure_reason)
          VALUES ($1, $2, NULL, $3, NULL, 'DEPOSIT', $4, 'failed', $5, $6, $7, $8)
        `,
        [
          failTxId,
          projectId,
          userId,
          depositAmount,
          fundRemaining ? 'fund_remaining' : 'deposit',
          paymentProvider.provider || 'provider',
          null,
          providerError?.message || 'Provider error',
        ]
      );
      await client.query('COMMIT');
      return res.status(502).json({ message: 'Payment provider error' });
    }

    const providerStatus = (providerResp?.status || '').toLowerCase();
    const providerId = providerResp?.id || null;

    if (providerStatus !== 'succeeded') {
      const failTxId = crypto.randomUUID?.() || crypto.randomBytes(16).toString('hex');
      await client.query(
        `
          INSERT INTO payment_transactions (id, project_id, milestone_id, payer_id, payee_id, type, amount, status, reference, provider, external_id, failure_reason)
          VALUES ($1, $2, NULL, $3, NULL, 'DEPOSIT', $4, 'failed', $5, $6, $7, $8)
        `,
        [
          failTxId,
          projectId,
          userId,
          depositAmount,
          fundRemaining ? 'fund_remaining' : 'deposit',
          paymentProvider.provider || 'provider',
          providerId,
          providerResp?.error || providerResp?.message || 'Payment failed',
        ]
      );
      await client.query('COMMIT');
      return res.status(502).json({ message: 'Payment could not be completed' });
    }

    const txId = crypto.randomUUID?.() || crypto.randomBytes(16).toString('hex');
    await client.query(
      `
        INSERT INTO payment_transactions (id, project_id, milestone_id, payer_id, payee_id, type, amount, status, reference, provider, external_id)
        VALUES ($1, $2, NULL, $3, NULL, 'DEPOSIT', $4, 'completed', $5, $6, $7)
      `,
      [
        txId,
        projectId,
        userId,
        depositAmount,
        fundRemaining ? 'fund_remaining' : 'deposit',
        paymentProvider.provider || 'provider',
        providerId,
      ]
    );

    const updatedEscrow = await client.query(
      `
        UPDATE escrow_accounts
        SET total_deposited = total_deposited + $1,
            available_balance = available_balance + $1,
            updated_at = NOW()
        WHERE project_id = $2
        RETURNING *
      `,
      [depositAmount, projectId]
    );

    await refreshFundedMilestones(client, projectId, Number(updatedEscrow.rows[0].total_deposited || 0));
    await client.query('COMMIT');

    return res.json({ success: true, escrow: mapEscrowRow(updatedEscrow.rows[0]) });
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('escrow:deposit:error', error);
    const message = pool ? 'Failed to fund escrow' : 'Database is not configured (set DATABASE_URL)';
    return res.status(500).json({ message });
  } finally {
    client.release();
  }
});

// Contractor submits milestone evidence
app.post('/api/projects/:projectId/milestones/:milestoneId/submit', async (req, res) => {
  const client = await pool.connect();
  try {
    const { projectId, milestoneId } = req.params;
    const { contractorId, evidence, notes } = req.body || {};

    if (!projectId || !milestoneId || !contractorId) {
      return res
        .status(400)
        .json({ message: 'projectId, milestoneId, and contractorId are required' });
    }

    await assertDbReady();
    const projectRow = await getProjectById(projectId);
    if (!projectRow) {
      return res.status(404).json({ message: 'Project not found' });
    }

    const contractRes = await pool.query(
      'SELECT status FROM contracts WHERE project_id = $1 ORDER BY created_at DESC LIMIT 1',
      [projectId]
    );
    const contractStatus = (contractRes.rows[0]?.status || '').toLowerCase();
    if (contractStatus !== 'signed') {
      return res.status(403).json({ message: 'Contract must be signed before submitting work' });
    }

    const assignedContractorId = await getAssignedContractorId(projectId, client);
    if (!assignedContractorId || assignedContractorId !== contractorId) {
      return res.status(403).json({ message: 'Contractor is not assigned to this project' });
    }

    await client.query('BEGIN');
    const milestoneRes = await client.query(
      'SELECT * FROM milestones WHERE id = $1 AND project_id = $2 FOR UPDATE',
      [milestoneId, projectId]
    );
    if (!milestoneRes.rows.length) {
      await client.query('ROLLBACK');
      return res.status(404).json({ message: 'Milestone not found' });
    }

    const currentStatus = (milestoneRes.rows[0].status || '').toLowerCase();
    if (['approved', 'paid'].includes(currentStatus)) {
      await client.query('ROLLBACK');
      return res.status(409).json({ message: 'Milestone already approved/paid' });
    }

    const updated = await client.query(
      `
        UPDATE milestones
        SET status = 'submitted',
            submitted_at = NOW(),
            submitted_by = $1,
            notes = COALESCE($2, notes),
            evidence = COALESCE($3, evidence)
        WHERE id = $4
        RETURNING *
      `,
      [contractorId, notes || '', Array.isArray(evidence) ? evidence : [], milestoneId]
    );

    await generateInvoiceForMilestone(client, milestoneId, { createStatus: 'SENT' });

    await client.query('COMMIT');
    return res.json({ success: true, milestone: mapMilestoneRow(updated.rows[0]) });
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('milestones:submit:error', error);
    const message = pool ? 'Failed to submit milestone' : 'Database is not configured (set DATABASE_URL)';
    return res.status(500).json({ message });
  } finally {
    client.release();
  }
});

// Homeowner approves milestone and releases escrow funds
app.post('/api/projects/:projectId/milestones/:milestoneId/approve', async (req, res) => {
  const client = await pool.connect();
  try {
    const { projectId, milestoneId } = req.params;
    const { homeownerId, contractorId } = req.body || {};

    if (!projectId || !milestoneId || !homeownerId) {
      return res
        .status(400)
        .json({ message: 'projectId, milestoneId, and homeownerId are required' });
    }

    await assertDbReady();
    const projectRow = await getProjectById(projectId);
    if (!projectRow) {
      return res.status(404).json({ message: 'Project not found' });
    }
    if (projectRow.user_id !== homeownerId) {
      return res.status(403).json({ message: 'Only the homeowner can approve milestones' });
    }

    const assignedContractorId = await getAssignedContractorId(projectId, client);
    if (contractorId && contractorId !== assignedContractorId) {
      return res.status(400).json({ message: 'contractorId does not match assigned contractor' });
    }

    const verified = await isUserVerified(contractorId || assignedContractorId);
    if (!verified) {
      return res.status(403).json({ message: 'Contractor is not verified' });
    }

    await client.query('BEGIN');
    const milestoneRes = await client.query(
      'SELECT * FROM milestones WHERE id = $1 AND project_id = $2 FOR UPDATE',
      [milestoneId, projectId]
    );
    if (!milestoneRes.rows.length) {
      await client.query('ROLLBACK');
      return res.status(404).json({ message: 'Milestone not found' });
    }

    const milestoneRow = milestoneRes.rows[0];
    const milestoneAmount = milestoneRow.amount !== null && milestoneRow.amount !== undefined
      ? Number(milestoneRow.amount)
      : 0;
    if (!milestoneAmount || milestoneAmount <= 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ message: 'Milestone has no payable amount' });
    }
    if ((milestoneRow.status || '').toLowerCase() !== 'submitted') {
      await client.query('ROLLBACK');
      return res.status(409).json({ message: 'Milestone is not submitted' });
    }

    const escrowRow = await ensureEscrowAccount(client, projectRow);
    const available = escrowRow.available_balance !== null && escrowRow.available_balance !== undefined
      ? Number(escrowRow.available_balance)
      : 0;
    if (available < milestoneAmount) {
      await client.query('ROLLBACK');
      return res.status(409).json({ message: 'Insufficient escrow balance' });
    }

    const contractRes = await client.query(
      'SELECT status FROM contracts WHERE project_id = $1 ORDER BY created_at DESC LIMIT 1',
      [projectId]
    );
    const contractStatus = (contractRes.rows[0]?.status || '').toLowerCase();
    if (contractStatus !== 'signed') {
      await client.query('ROLLBACK');
      return res.status(403).json({ message: 'Contract must be signed before payout' });
    }

    const contractorToPay = contractorId || assignedContractorId;
    let providerResp;
    try {
      providerResp = await paymentProvider.createPayout(contractorToPay, milestoneAmount, escrowRow.currency || 'USD');
    } catch (providerError) {
      const failTxId = crypto.randomUUID?.() || crypto.randomBytes(16).toString('hex');
      await client.query(
        `
          INSERT INTO payment_transactions (id, project_id, milestone_id, payer_id, payee_id, type, amount, status, reference, provider, external_id, failure_reason)
          VALUES ($1, $2, $3, $4, $5, 'PAYOUT', $6, 'failed', 'milestone_payout', $7, $8, $9)
        `,
        [
          failTxId,
          projectId,
          milestoneId,
          homeownerId,
          contractorToPay,
          milestoneAmount,
          paymentProvider.provider || 'provider',
          null,
          providerError?.message || 'Provider error',
        ]
      );
      await client.query('COMMIT');
      return res.status(502).json({ message: 'Payment provider error' });
    }

    if ((providerResp?.status || '').toLowerCase() !== 'succeeded') {
      const failTxId = crypto.randomUUID?.() || crypto.randomBytes(16).toString('hex');
      await client.query(
        `
          INSERT INTO payment_transactions (id, project_id, milestone_id, payer_id, payee_id, type, amount, status, reference, provider, external_id, failure_reason)
          VALUES ($1, $2, $3, $4, $5, 'PAYOUT', $6, 'failed', 'milestone_payout', $7, $8, $9)
        `,
        [
          failTxId,
          projectId,
          milestoneId,
          homeownerId,
          contractorToPay,
          milestoneAmount,
          paymentProvider.provider || 'provider',
          providerResp?.id || null,
          providerResp?.error || providerResp?.message || 'Payment failed',
        ]
      );
      await client.query('COMMIT');
      return res.status(502).json({ message: 'Payment could not be completed' });
    }

    const approved = await client.query(
      `
        UPDATE milestones
        SET status = 'approved', approved_at = NOW(), approved_by = $1
        WHERE id = $2
        RETURNING *
      `,
      [homeownerId, milestoneId]
    );

    const payoutTxId = crypto.randomUUID?.() || crypto.randomBytes(16).toString('hex');
    await client.query(
      `
        INSERT INTO payment_transactions (id, project_id, milestone_id, payer_id, payee_id, type, amount, status, reference, provider, external_id)
        VALUES ($1, $2, $3, $4, $5, 'PAYOUT', $6, 'completed', 'milestone_payout', $7, $8)
      `,
      [
        payoutTxId,
        projectId,
        milestoneId,
        homeownerId,
        contractorToPay,
        milestoneAmount,
        paymentProvider.provider || 'provider',
        providerResp?.id || null,
      ]
    );

    const updatedEscrow = await client.query(
      `
        UPDATE escrow_accounts
        SET available_balance = available_balance - $1,
            total_released = total_released + $1,
            updated_at = NOW()
        WHERE project_id = $2
        RETURNING *
      `,
      [milestoneAmount, projectId]
    );

    const paid = await client.query(
      `
        UPDATE milestones
        SET status = 'paid', paid_at = NOW()
        WHERE id = $1
        RETURNING *
      `,
      [milestoneId]
    );

    await generateInvoiceForMilestone(client, milestoneId, { markPaid: true, createStatus: 'PAID' });

    await client.query('COMMIT');

    // Fire-and-forget accounting sync
    try {
      const connection = await getAccountingConnection(contractorToPay);
      if (connection) {
        accountingIntegration
          .syncPayoutTransaction(payoutTxId, connection.provider)
          .catch((err) => console.error('accounting:sync:error', err));
        await pool.query(
          'UPDATE contractor_accounting_connections SET last_synced_at = NOW() WHERE contractor_id = $1 AND provider = $2',
          [contractorToPay, connection.provider]
        ).catch(() => {});
      }
    } catch (syncErr) {
      console.error('accounting:sync:dispatch:error', syncErr);
    }

    return res.json({
      success: true,
      milestone: mapMilestoneRow(paid.rows[0] || approved.rows[0]),
      escrow: mapEscrowRow(updatedEscrow.rows[0]),
    });
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('milestones:approve:error', error);
    const message = pool ? 'Failed to approve milestone' : 'Database is not configured (set DATABASE_URL)';
    return res.status(500).json({ message });
  } finally {
    client.release();
  }
});

// Connect contractor accounting provider (OAuth callback exchange stub)
app.post('/api/accounting/connect', async (req, res) => {
  const client = await pool.connect();
  try {
    const { contractorId, provider, authCode } = req.body || {};
    if (!contractorId || !provider || !authCode) {
      return res.status(400).json({ message: 'contractorId, provider, and authCode are required' });
    }

    await assertDbReady();
    const providerUpper = provider.toUpperCase();
    if (!['QUICKBOOKS', 'XERO'].includes(providerUpper)) {
      return res.status(400).json({ message: 'Invalid provider' });
    }

    let integrationResp;
    try {
      integrationResp = await accountingIntegration.connectProvider(contractorId, providerUpper, authCode);
    } catch (err) {
      console.error('accounting:connect:provider:error', err);
      return res.status(502).json({ message: 'Provider connection failed' });
    }

    await client.query('BEGIN');
    await client.query(
      `
        INSERT INTO contractor_accounting_connections (contractor_id, provider, access_token, refresh_token, expires_at, last_synced_at)
        VALUES ($1, $2, $3, $4, $5, NULL)
        ON CONFLICT (contractor_id, provider)
        DO UPDATE SET
          access_token = EXCLUDED.access_token,
          refresh_token = EXCLUDED.refresh_token,
          expires_at = EXCLUDED.expires_at,
          updated_at = NOW()
      `,
      [
        contractorId,
        providerUpper,
        integrationResp?.accessToken || null,
        integrationResp?.refreshToken || null,
        integrationResp?.expiresAt || null,
      ]
    );
    await client.query('COMMIT');

    return res.json({ success: true, connection: { provider: providerUpper, status: 'connected' } });
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('accounting:connect:error', error);
    const message = pool ? 'Failed to connect accounting provider' : 'Database is not configured (set DATABASE_URL)';
    return res.status(500).json({ message });
  } finally {
    client.release();
  }
});

// Contractor self: get current accounting connection
app.get('/api/me/accounting', async (req, res) => {
  try {
    const { contractorId } = req.query || {};
    if (!contractorId) {
      return res.status(400).json({ message: 'contractorId is required' });
    }
    await assertDbReady();
    const connection = await getAccountingConnection(contractorId);
    if (!connection) {
      return res.json({ connected: false });
    }
    return res.json({
      connected: true,
      provider: connection.provider,
      expiresAt: connection.expires_at,
      lastSyncedAt: connection.last_synced_at,
    });
  } catch (error) {
    console.error('accounting:self:get:error', error);
    const message = pool ? 'Failed to load accounting connection' : 'Database is not configured (set DATABASE_URL)';
    return res.status(500).json({ message });
  }
});

// Contractor self: initiate OAuth (returns auth URL)
app.post('/api/me/accounting/connect', async (req, res) => {
  try {
    const { contractorId, provider } = req.body || {};
    if (!contractorId || !provider) {
      return res.status(400).json({ message: 'contractorId and provider are required' });
    }
    const providerUpper = provider.toUpperCase();
    if (!['QUICKBOOKS', 'XERO'].includes(providerUpper)) {
      return res.status(400).json({ message: 'Invalid provider' });
    }
    const authUrl = accountingIntegration.buildAuthUrl(providerUpper, contractorId);
    return res.json({ provider: providerUpper, authUrl });
  } catch (error) {
    console.error('accounting:self:connect:error', error);
    const message = pool ? 'Failed to start accounting connection' : 'Database is not configured (set DATABASE_URL)';
    return res.status(500).json({ message });
  }
});

// OAuth callback to finalize connection
app.post('/api/accounting/callback', async (req, res) => {
  const client = await pool.connect();
  try {
    const { contractorId, provider, authCode } = req.body || {};
    if (!contractorId || !provider || !authCode) {
      return res.status(400).json({ message: 'contractorId, provider, and authCode are required' });
    }
    await assertDbReady();
    const providerUpper = provider.toUpperCase();
    if (!['QUICKBOOKS', 'XERO'].includes(providerUpper)) {
      return res.status(400).json({ message: 'Invalid provider' });
    }

    let integrationResp;
    try {
      integrationResp = await accountingIntegration.connectProvider(contractorId, providerUpper, authCode);
    } catch (err) {
      console.error('accounting:callback:provider:error', err);
      return res.status(502).json({ message: 'Provider connection failed' });
    }

    await client.query('BEGIN');
    await client.query(
      `
        INSERT INTO contractor_accounting_connections (contractor_id, provider, access_token, refresh_token, expires_at, last_synced_at)
        VALUES ($1, $2, $3, $4, $5, NULL)
        ON CONFLICT (contractor_id, provider)
        DO UPDATE SET
          access_token = EXCLUDED.access_token,
          refresh_token = EXCLUDED.refresh_token,
          expires_at = EXCLUDED.expires_at,
          updated_at = NOW()
      `,
      [
        contractorId,
        providerUpper,
        integrationResp?.accessToken || null,
        integrationResp?.refreshToken || null,
        integrationResp?.expiresAt || null,
      ]
    );
    await client.query('COMMIT');

    return res.json({ success: true, provider: providerUpper });
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('accounting:callback:error', error);
    const message = pool ? 'Failed to complete accounting connection' : 'Database is not configured (set DATABASE_URL)';
    return res.status(500).json({ message });
  } finally {
    client.release();
  }
});

// Start ID verification session
app.post('/api/verification/start', async (req, res) => {
  const client = await pool.connect();
  try {
    const { userId, provider } = req.body || {};
    if (!userId) {
      return res.status(400).json({ message: 'userId is required' });
    }
    await assertDbReady();
    const user = await getUserById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const providerName = (provider || idVerificationProvider.provider || 'stub-idp').toUpperCase();
    const session = await idVerificationProvider.startSession(user);
    await client.query('BEGIN');
    const sessionId = crypto.randomUUID?.() || crypto.randomBytes(16).toString('hex');
    const inserted = await client.query(
      `
        INSERT INTO verification_sessions (id, user_id, provider, external_session_id, status)
        VALUES ($1, $2, $3, $4, 'PENDING')
        RETURNING *
      `,
      [sessionId, userId, providerName, session.externalSessionId]
    );
    await client.query('COMMIT');

    return res.json({
      success: true,
      session: mapVerificationSessionRow(inserted.rows[0]),
      clientToken: session.clientToken,
      url: session.url,
    });
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('verification:start:error', error);
    const message = pool ? 'Failed to start verification' : 'Database is not configured (set DATABASE_URL)';
    return res.status(500).json({ message });
  } finally {
    client.release();
  }
});

// Verification provider webhook/callback
app.post('/webhooks/verification', async (req, res) => {
  const client = await pool.connect();
  try {
    const parsed = await idVerificationProvider.parseWebhook(req.body || {});
    const externalSessionId = parsed.externalSessionId;
    const status = (parsed.status || '').toUpperCase();

    if (!externalSessionId) {
      await client.query('ROLLBACK').catch(() => {});
      return res.status(400).json({ message: 'externalSessionId is required' });
    }

    await assertDbReady();
    await client.query('BEGIN');
    const sessionRes = await client.query(
      'SELECT * FROM verification_sessions WHERE external_session_id = $1 FOR UPDATE',
      [externalSessionId]
    );
    if (!sessionRes.rows.length) {
      await client.query('ROLLBACK');
      return res.status(404).json({ message: 'Verification session not found' });
    }

    const sessionRow = sessionRes.rows[0];
    const finalStatus = ['APPROVED', 'DENIED'].includes(status) ? status : 'PENDING';

    const updatedSession = await client.query(
      `
        UPDATE verification_sessions
        SET status = $1, updated_at = NOW()
        WHERE id = $2
        RETURNING *
      `,
      [finalStatus, sessionRow.id]
    );

    if (finalStatus === 'APPROVED') {
      await client.query(
        'UPDATE users SET is_verified = TRUE WHERE id = $1',
        [sessionRow.user_id]
      );
    }

    await client.query('COMMIT');
    return res.json({ success: true, session: mapVerificationSessionRow(updatedSession.rows[0]) });
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('verification:webhook:error', error);
    const message = pool ? 'Failed to process verification webhook' : 'Database is not configured (set DATABASE_URL)';
    return res.status(500).json({ message });
  } finally {
    client.release();
  }
});

// Payment provider webhook handler
app.post('/webhooks/payments', async (req, res) => {
  const rawPayload = JSON.stringify(req.body || {});
  if (!validatePaymentSignature(req.headers, rawPayload)) {
    return res.status(401).json({ message: 'Invalid signature' });
  }

  const event = req.body || {};
  const eventType = (event.type || '').toLowerCase();
  const txnId = event.transactionId || event.id || null;
  const externalId = event.externalId || event.providerId || null;
  const status = (event.status || '').toLowerCase();

  if (!txnId) {
    return res.status(400).json({ message: 'transactionId is required' });
  }

  const client = await pool.connect();
  try {
    await assertDbReady();
    await client.query('BEGIN');

    const txRes = await client.query('SELECT * FROM payment_transactions WHERE id = $1 FOR UPDATE', [txnId]);
    if (!txRes.rows.length) {
      await client.query('ROLLBACK');
      return res.status(404).json({ message: 'Transaction not found' });
    }

    const txRow = txRes.rows[0];
    const isPayout = (txRow.type || '').toUpperCase() === 'PAYOUT';
    const isDeposit = (txRow.type || '').toUpperCase() === 'DEPOSIT';

    if (status === 'failed') {
      await client.query(
        `
          UPDATE payment_transactions
          SET status = 'failed', external_id = COALESCE($1, external_id), failure_reason = COALESCE($2, failure_reason)
          WHERE id = $3
        `,
        [externalId, event.error || event.reason || 'Provider reported failure', txnId]
      );
      await client.query('COMMIT');
      return res.json({ received: true });
    }

    const succeededEvent = status === 'succeeded' || status === 'completed' || eventType.includes('succeeded');
    if (!succeededEvent) {
      await client.query('ROLLBACK');
      return res.json({ received: true });
    }

    if (txRow.status === 'completed') {
      await client.query('ROLLBACK');
      return res.json({ received: true });
    }

    // Mark transaction complete
    const updatedTx = await client.query(
      `
        UPDATE payment_transactions
        SET status = 'completed', external_id = COALESCE($1, external_id), failure_reason = NULL, provider = COALESCE(provider, $2)
        WHERE id = $3
        RETURNING *
      `,
      [externalId, event.provider || txRow.provider || null, txnId]
    );

    // On payout success, mark milestone paid and adjust escrow if this was previously pending
    if (isPayout) {
      const milestoneId = txRow.milestone_id;
      if (milestoneId) {
        await client.query(
          `
            UPDATE milestones
            SET status = 'paid', paid_at = COALESCE(paid_at, NOW())
            WHERE id = $1
          `,
          [milestoneId]
        );
        await markInvoicePaid(client, milestoneId);
        await client.query(
          `UPDATE contracts SET status = 'signed', signed_at = COALESCE(signed_at, NOW()) WHERE project_id = $1 AND status <> 'signed'`,
          [txRow.project_id]
        );
      }

      // Adjust escrow only if this was not already completed
      const escrowRow = await ensureEscrowAccount(client, { id: txRow.project_id, user_id: null });
      const amountNum = txRow.amount !== null && txRow.amount !== undefined ? Number(txRow.amount) : 0;
      if (amountNum && txRow.status !== 'completed') {
        await client.query(
          `
            UPDATE escrow_accounts
            SET available_balance = GREATEST(0, available_balance - $1),
                total_released = total_released + $1,
                updated_at = NOW()
            WHERE project_id = $2
          `,
          [amountNum, txRow.project_id]
        );
      }
    }

    if (isDeposit) {
      // Ensure deposit totals are reflected if previously pending
      const amountNum = txRow.amount !== null && txRow.amount !== undefined ? Number(txRow.amount) : 0;
      if (amountNum && txRow.status !== 'completed') {
        await client.query(
          `
            UPDATE escrow_accounts
            SET total_deposited = total_deposited + $1,
                available_balance = available_balance + $1,
                updated_at = NOW()
            WHERE project_id = $2
          `,
          [amountNum, txRow.project_id]
        );
      }
    }

    await client.query('COMMIT');
    return res.json({ received: true, transaction: updatedTx.rows[0] });
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('webhooks:payments:error', error);
    const message = pool ? 'Failed to process webhook' : 'Database is not configured (set DATABASE_URL)';
    return res.status(500).json({ message });
  } finally {
    client.release();
  }
});

// E-signature webhook handler
app.post('/webhooks/esign', async (req, res) => {
  const rawHeaders = req.headers || {};
  if (!validateEsignSignature(rawHeaders)) {
    return res.status(401).json({ message: 'Invalid signature' });
  }

  const client = await pool.connect();
  try {
    const parsed = await eSignatureProvider.parseWebhook(req.body || {});
    const externalId = parsed.externalId;
    if (!externalId) {
      await client.query('ROLLBACK').catch(() => {});
      return res.status(400).json({ message: 'externalId is required' });
    }

    await assertDbReady();
    await client.query('BEGIN');
    const contractRes = await client.query('SELECT * FROM contracts WHERE external_id = $1 FOR UPDATE', [externalId]);
    if (!contractRes.rows.length) {
      await client.query('ROLLBACK');
      return res.status(404).json({ message: 'Contract not found' });
    }

    let signedFileKey = null;
    if (parsed.fileBase64) {
      const key = `contracts/${contractRes.rows[0].id}/${parsed.fileName || 'signed.pdf'}`;
      try {
        await storageService.uploadFile(key, parsed.fileBase64, parsed.mimeType || 'application/pdf');
        signedFileKey = key;
      } catch (uploadErr) {
        console.error('esign:webhook:upload:error', uploadErr);
      }
    }

    const finalStatus = parsed.status === 'completed' || parsed.status === 'signed' ? 'signed' : 'pending';
    const updated = await client.query(
      `
        UPDATE contracts
        SET status = $1,
            signed_file_key = COALESCE($2, signed_file_key),
            signed_at = CASE WHEN $1 = 'signed' THEN NOW() ELSE signed_at END,
            updated_at = NOW()
        WHERE id = $3
        RETURNING *
      `,
      [finalStatus, signedFileKey, contractRes.rows[0].id]
    );

    await client.query('COMMIT');
    return res.json({ success: true, contract: mapContractRow(updated.rows[0]) });
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('esign:webhook:error', error);
    const message = pool ? 'Failed to process e-sign webhook' : 'Database is not configured (set DATABASE_URL)';
    return res.status(500).json({ message });
  } finally {
    client.release();
  }
});

// Homeowner: list project payment transactions + invoices
app.get('/api/projects/:projectId/payments', async (req, res) => {
  try {
    const { projectId } = req.params;
    const { homeownerId, page = 1, pageSize = 20 } = req.query || {};

    if (!projectId || !homeownerId) {
      return res.status(400).json({ message: 'projectId and homeownerId are required' });
    }

    await assertDbReady();
    const projectRow = await getProjectById(projectId);
    if (!projectRow) {
      return res.status(404).json({ message: 'Project not found' });
    }
    if (projectRow.user_id !== homeownerId) {
      return res.status(403).json({ message: 'Not authorized to view this project' });
    }

    const pageNum = Math.max(Number(page) || 1, 1);
    const pageSizeNum = Math.min(Math.max(Number(pageSize) || 20, 1), 100);
    const offset = (pageNum - 1) * pageSizeNum;

    const listPromise = pool.query(
      `
        SELECT
          pt.*, m.name AS milestone_name, m.status AS milestone_status, m.amount AS milestone_amount,
          inv.id AS invoice_id, inv.invoice_number, inv.status AS invoice_status, inv.amount AS invoice_amount,
          inv.currency AS invoice_currency, inv.issue_date AS invoice_issue_date, inv.due_date AS invoice_due_date
        FROM payment_transactions pt
        LEFT JOIN milestones m ON m.id = pt.milestone_id
        LEFT JOIN invoices inv ON inv.milestone_id = pt.milestone_id
        WHERE pt.project_id = $1
        ORDER BY pt.created_at DESC
        LIMIT $2 OFFSET $3
      `,
      [projectId, pageSizeNum, offset]
    );

    const countPromise = pool.query(
      'SELECT COUNT(*) FROM payment_transactions WHERE project_id = $1',
      [projectId]
    );

    const [listResult, countResult] = await Promise.all([listPromise, countPromise]);

    return res.json({
      data: listResult.rows.map(mapTransactionWithContext),
      page: pageNum,
      pageSize: pageSizeNum,
      total: Number(countResult.rows[0].count || 0),
    });
  } catch (error) {
    console.error('payments:list:homeowner:error', error);
    const message = pool ? 'Failed to fetch payments' : 'Database is not configured (set DATABASE_URL)';
    return res.status(500).json({ message });
  }
});

// Contractor: list payouts + related invoices
app.get('/api/contractors/:contractorId/payouts', async (req, res) => {
  try {
    const { contractorId } = req.params;
    const { page = 1, pageSize = 20 } = req.query || {};

    if (!contractorId) {
      return res.status(400).json({ message: 'contractorId is required' });
    }

    await assertDbReady();

    const pageNum = Math.max(Number(page) || 1, 1);
    const pageSizeNum = Math.min(Math.max(Number(pageSize) || 20, 1), 100);
    const offset = (pageNum - 1) * pageSizeNum;

    const listPromise = pool.query(
      `
        SELECT
          pt.*, m.name AS milestone_name, m.status AS milestone_status, m.amount AS milestone_amount,
          inv.id AS invoice_id, inv.invoice_number, inv.status AS invoice_status, inv.amount AS invoice_amount,
          inv.currency AS invoice_currency, inv.issue_date AS invoice_issue_date, inv.due_date AS invoice_due_date
        FROM payment_transactions pt
        LEFT JOIN milestones m ON m.id = pt.milestone_id
        LEFT JOIN invoices inv ON inv.milestone_id = pt.milestone_id
        WHERE pt.payee_id = $1 AND pt.type = 'PAYOUT'
        ORDER BY pt.created_at DESC
        LIMIT $2 OFFSET $3
      `,
      [contractorId, pageSizeNum, offset]
    );

    const countPromise = pool.query(
      'SELECT COUNT(*) FROM payment_transactions WHERE payee_id = $1 AND type = \'PAYOUT\'',
      [contractorId]
    );

    const [listResult, countResult] = await Promise.all([listPromise, countPromise]);

    return res.json({
      data: listResult.rows.map(mapTransactionWithContext),
      page: pageNum,
      pageSize: pageSizeNum,
      total: Number(countResult.rows[0].count || 0),
    });
  } catch (error) {
    console.error('payments:list:contractor:error', error);
    const message = pool ? 'Failed to fetch payouts' : 'Database is not configured (set DATABASE_URL)';
    return res.status(500).json({ message });
  }
});

// Upload milestone attachments (participants only)
app.post('/api/milestones/:milestoneId/attachments', async (req, res) => {
  const client = await pool.connect();
  try {
    const { milestoneId } = req.params;
    const { userId, fileName, mimeType, fileData, fileSize } = req.body || {};

    if (!milestoneId || !userId || !fileName || !mimeType || !fileData) {
      return res.status(400).json({ message: 'milestoneId, userId, fileName, mimeType, and fileData are required' });
    }

    if (!isAllowedMime(mimeType)) {
      return res.status(400).json({ message: 'Unsupported file type' });
    }

    const sizeNum = Number(fileSize || 0);
    const MAX_SIZE = 15 * 1024 * 1024; // 15MB
    if (sizeNum && sizeNum > MAX_SIZE) {
      return res.status(400).json({ message: 'File too large (max 15MB)' });
    }

    await assertDbReady();
    const projectId = await getProjectIdForMilestone(milestoneId);
    if (!projectId) {
      return res.status(404).json({ message: 'Milestone not found' });
    }

    const participants = await getProjectParticipants(projectId);
    if (!participants || (participants.ownerId !== userId && participants.contractorId !== userId)) {
      return res.status(403).json({ message: 'Not authorized to attach files for this milestone' });
    }

    const safeName = fileName.replace(/\s+/g, '_');
    const storageKey = `milestones/${milestoneId}/${Date.now()}_${safeName}`;

    let uploadResult;
    try {
      uploadResult = await storageService.uploadFile(storageKey, fileData, mimeType);
    } catch (storageError) {
      console.error('attachments:upload:storage:error', storageError);
      return res.status(502).json({ message: 'Failed to upload file' });
    }

    await client.query('BEGIN');
    const attachmentId = crypto.randomUUID?.() || crypto.randomBytes(16).toString('hex');
    const inserted = await client.query(
      `
        INSERT INTO milestone_attachments (id, milestone_id, uploader_id, storage_key, file_name, mime_type, file_size)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *
      `,
      [
        attachmentId,
        milestoneId,
        userId,
        uploadResult.key,
        fileName,
        mimeType,
        sizeNum || null,
      ]
    );

    await client.query('COMMIT');

    const signed = await storageService.getSignedUrl(uploadResult.key);

    return res.status(201).json({
      success: true,
      attachment: {
        ...mapAttachmentRow(inserted.rows[0]),
        signedUrl: signed?.url || null,
      },
    });
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('attachments:upload:error', error);
    const message = pool ? 'Failed to upload attachment' : 'Database is not configured (set DATABASE_URL)';
    return res.status(500).json({ message });
  } finally {
    client.release();
  }
});

// List milestone attachments (participants only)
app.get('/api/milestones/:milestoneId/attachments', async (req, res) => {
  try {
    const { milestoneId } = req.params;
    const { userId } = req.query || {};

    if (!milestoneId || !userId) {
      return res.status(400).json({ message: 'milestoneId and userId are required' });
    }

    await assertDbReady();
    const projectId = await getProjectIdForMilestone(milestoneId);
    if (!projectId) {
      return res.status(404).json({ message: 'Milestone not found' });
    }

    const participants = await getProjectParticipants(projectId);
    if (!participants || (participants.ownerId !== userId && participants.contractorId !== userId)) {
      return res.status(403).json({ message: 'Not authorized to view attachments for this milestone' });
    }

    const result = await pool.query(
      `
        SELECT * FROM milestone_attachments
        WHERE milestone_id = $1
        ORDER BY created_at DESC
      `,
      [milestoneId]
    );

    const attachments = await Promise.all(
      result.rows.map(async (row) => {
        const signed = await storageService.getSignedUrl(row.storage_key);
        return { ...mapAttachmentRow(row), signedUrl: signed?.url || null };
      })
    );

    return res.json({ success: true, attachments });
  } catch (error) {
    console.error('attachments:list:error', error);
    const message = pool ? 'Failed to fetch attachments' : 'Database is not configured (set DATABASE_URL)';
    return res.status(500).json({ message });
  }
});

// Create e-signature request for homeowner + contractor
app.post('/api/contracts/:contractId/sign-request', async (req, res) => {
  const client = await pool.connect();
  try {
    const { contractId } = req.params;
    const { userId } = req.body || {};

    if (!contractId || !userId) {
      return res.status(400).json({ message: 'contractId and userId are required' });
    }

    await assertDbReady();
    await client.query('BEGIN');
    const contractRes = await client.query('SELECT * FROM contracts WHERE id = $1 FOR UPDATE', [contractId]);
    if (!contractRes.rows.length) {
      await client.query('ROLLBACK');
      return res.status(404).json({ message: 'Contract not found' });
    }
    const contractRow = contractRes.rows[0];
    const projectRow = await getProjectById(contractRow.project_id);
    if (!projectRow) {
      await client.query('ROLLBACK');
      return res.status(404).json({ message: 'Project not found' });
    }

    const participants = await getProjectParticipants(projectRow.id);
    if (!participants || !participants.ownerId || !participants.contractorId) {
      await client.query('ROLLBACK');
      return res.status(400).json({ message: 'Contractor must be assigned before e-sign' });
    }
    if (![participants.ownerId, participants.contractorId].includes(userId)) {
      await client.query('ROLLBACK');
      return res.status(403).json({ message: 'Not authorized to initiate signature' });
    }

    const esignResp = await eSignatureProvider.createSignatureRequest(contractRow, [
      { id: participants.ownerId, role: 'homeowner' },
      { id: participants.contractorId, role: 'contractor' },
    ]);

    const updated = await client.query(
      `
        UPDATE contracts
        SET provider = $1, external_id = $2, status = 'pending', updated_at = NOW()
        WHERE id = $3
        RETURNING *
      `,
      [eSignatureProvider.provider, esignResp.externalId, contractId]
    );
    await client.query('COMMIT');

    return res.json({
      success: true,
      contract: mapContractRow(updated.rows[0]),
      signingUrls: esignResp.signingUrls || {},
    });
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('esign:request:error', error);
    const message = pool ? 'Failed to create signature request' : 'Database is not configured (set DATABASE_URL)';
    return res.status(500).json({ message });
  } finally {
    client.release();
  }
});

app.get('/api/projects/open', async (_req, res) => {
  try {
    const contractorId = _req.query.contractorId || null;
    if (contractorId && !isUuid(contractorId)) {
      return res.status(400).json({ message: 'Invalid contractorId' });
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
        pm.created_at AS media_created_at,
        pa.id AS app_id,
        pa.status AS app_status,
        pa.contractor_id AS app_contractor_id
      FROM projects p
      LEFT JOIN users u ON u.id = p.user_id
      LEFT JOIN milestones m ON m.project_id = p.id
      LEFT JOIN project_media pm ON pm.project_id = p.id
      LEFT JOIN project_applications pa ON pa.project_id = p.id AND pa.contractor_id = $1
      WHERE
        ($1::uuid IS NULL OR pa.id IS NULL OR pa.status NOT IN ('pending','accepted'))
        AND NOT EXISTS (
          SELECT 1 FROM project_applications pa2
          WHERE pa2.project_id = p.id AND pa2.status = 'accepted'
        )
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

    const applicationCheck = await pool.query(
      `
        SELECT id
        FROM project_applications
        WHERE project_id = $1 AND contractor_id = $2 AND status = 'accepted'
        LIMIT 1
      `,
      [projectId, contractorId]
    );
    if (!applicationCheck.rows.length) {
      return res.status(403).json({ message: 'You must be hired on this project to log expenses' });
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

    const applicationCheck = await pool.query(
      `
        SELECT id
        FROM project_applications
        WHERE project_id = $1 AND contractor_id = $2 AND status = 'accepted'
        LIMIT 1
      `,
      [projectId, contractorId]
    );
    if (!applicationCheck.rows.length) {
      return res.status(403).json({ message: 'You must be hired on this project to log work hours' });
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

app.get('/api/projects/:projectId/messages', async (req, res) => {
    try {
      const { projectId } = req.params;
      const { userId } = req.query || {};
      if (!projectId || !isUuid(projectId)) {
        return res.status(400).json({ message: 'Invalid projectId' });
      }
      if (!userId || !isUuid(userId)) {
        return res.status(400).json({ message: 'userId is required' });
      }

      await assertDbReady();
      const { participants, memberIds } = await buildProjectMemberSet(projectId);
      if (!participants) {
        return res.status(404).json({ message: 'Project not found' });
      }
      if (!memberIds.has(userId)) {
        return res.status(403).json({ message: 'Not authorized to view messages for this project' });
      }

      const result = await pool.query(
        `
          SELECT
            pm.*,
            sender.full_name AS sender_full_name,
            sender.email AS sender_email,
            sender.role AS sender_role,
            receiver.full_name AS receiver_full_name,
            receiver.email AS receiver_email,
            receiver.role AS receiver_role
          FROM project_messages pm
          LEFT JOIN users sender ON sender.id = pm.sender_id
          LEFT JOIN users receiver ON receiver.id = pm.receiver_id
          WHERE pm.project_id = $1
          ORDER BY pm.created_at ASC
        `,
        [projectId]
      );

      return res.json(result.rows.map((row) => mapMessageRow(row)));
    } catch (error) {
      logError(
        'project-messages:list:error',
        { projectId: req.params?.projectId, userId: req.query?.userId },
        error
      );
      const message = pool
        ? 'Failed to fetch messages'
        : 'Database is not configured (set DATABASE_URL)';
      return res.status(500).json({ message });
    }
  });

  app.post('/api/projects/:projectId/messages', async (req, res) => {
    try {
      const { projectId } = req.params;
      const { senderId, receiverId, body } = req.body || {};
      if (!projectId || !isUuid(projectId)) {
        return res.status(400).json({ message: 'Invalid projectId' });
      }
      if (!senderId || !isUuid(senderId)) {
        return res.status(400).json({ message: 'senderId is required' });
      }
      const trimmedBody = String(body || '').trim();
      if (!trimmedBody) {
        return res.status(400).json({ message: 'Message body is required' });
      }

      await assertDbReady();
      const { participants, memberIds } = await buildProjectMemberSet(projectId);
      if (!participants) {
        return res.status(404).json({ message: 'Project not found' });
      }
      if (!memberIds.has(senderId)) {
        return res.status(403).json({ message: 'Not authorized to send messages for this project' });
      }

      const resolvedReceiver = resolveMessageReceiver(participants, memberIds, senderId, receiverId);
      if (!resolvedReceiver) {
        return res.status(400).json({ message: 'No conversation partner available for this project' });
      }

      const [sender, receiverUser, project] = await Promise.all([
        getUserById(senderId),
        getUserById(resolvedReceiver),
        getProjectById(projectId),
      ]);
      const messageId = crypto.randomUUID?.() || crypto.randomBytes(16).toString('hex');
      const insertResult = await pool.query(
        `
          INSERT INTO project_messages (id, project_id, sender_id, receiver_id, body)
          VALUES ($1, $2, $3, $4, $5)
          RETURNING id
        `,
        [messageId, projectId, senderId, resolvedReceiver, trimmedBody]
      );

      const hydrated = await fetchMessageWithUsers(insertResult.rows[0].id);
      // Notify receiver about the new message
      if (receiverUser) {
        const notificationId = crypto.randomUUID?.() || crypto.randomBytes(16).toString('hex');
        const notifData = {
          type: 'message',
          projectId,
          projectTitle: project?.title || '',
          senderId,
          senderName: sender?.full_name || '',
          senderEmail: sender?.email || '',
          messageId: messageId,
        };
        await pool.query(
          `
            INSERT INTO notifications (id, user_id, title, body, data)
            VALUES ($1, $2, $3, $4, $5)
          `,
          [
            notificationId,
            receiverUser.id,
            sender?.full_name ? `${sender.full_name} sent you a message` : 'New project message',
            body,
            JSON.stringify(notifData),
          ]
        );
      }

      return res.status(201).json(mapMessageRow(hydrated));
    } catch (error) {
      logError(
        'project-messages:create:error',
        { projectId: req.params?.projectId, senderId: req.body?.senderId },
        error
      );
      const message = pool
        ? 'Failed to send message'
        : 'Database is not configured (set DATABASE_URL)';
      return res.status(500).json({ message });
    }
  });

  app.put('/api/projects/:projectId/messages/:messageId', async (req, res) => {
    try {
      const { projectId, messageId } = req.params;
      const { userId, body } = req.body || {};
      if (!projectId || !isUuid(projectId)) {
        return res.status(400).json({ message: 'Invalid projectId' });
      }
      if (!messageId || !isUuid(messageId)) {
        return res.status(400).json({ message: 'Invalid messageId' });
      }
      if (!userId || !isUuid(userId)) {
        return res.status(400).json({ message: 'userId is required' });
      }
      const trimmedBody = String(body || '').trim();
      if (!trimmedBody) {
        return res.status(400).json({ message: 'Message body is required' });
      }

      await assertDbReady();
      const messageResult = await pool.query(
        'SELECT * FROM project_messages WHERE id = $1 AND project_id = $2 LIMIT 1',
        [messageId, projectId]
      );
      if (!messageResult.rows.length) {
        return res.status(404).json({ message: 'Message not found' });
      }
      const messageRow = messageResult.rows[0];
      if (messageRow.sender_id !== userId) {
        return res.status(403).json({ message: 'Only the sender can edit this message' });
      }
      if (messageRow.is_deleted) {
        return res.status(400).json({ message: 'Cannot edit a deleted message' });
      }

      await pool.query(
        'UPDATE project_messages SET body = $1, updated_at = NOW() WHERE id = $2',
        [trimmedBody, messageId]
      );
      const hydrated = await fetchMessageWithUsers(messageId);
      return res.json(mapMessageRow(hydrated));
    } catch (error) {
      logError(
        'project-messages:update:error',
        { projectId: req.params?.projectId, messageId: req.params?.messageId },
        error
      );
      const message = pool
        ? 'Failed to update message'
        : 'Database is not configured (set DATABASE_URL)';
      return res.status(500).json({ message });
    }
  });

  app.delete('/api/projects/:projectId/messages/:messageId', async (req, res) => {
    try {
      const { projectId, messageId } = req.params;
      const { userId } = req.body || {};
      if (!projectId || !isUuid(projectId)) {
        return res.status(400).json({ message: 'Invalid projectId' });
      }
      if (!messageId || !isUuid(messageId)) {
        return res.status(400).json({ message: 'Invalid messageId' });
      }
      if (!userId || !isUuid(userId)) {
        return res.status(400).json({ message: 'userId is required' });
      }

      await assertDbReady();
      const messageResult = await pool.query(
        'SELECT * FROM project_messages WHERE id = $1 AND project_id = $2 LIMIT 1',
        [messageId, projectId]
      );
      if (!messageResult.rows.length) {
        return res.status(404).json({ message: 'Message not found' });
      }
      const messageRow = messageResult.rows[0];
      if (messageRow.sender_id !== userId) {
        return res.status(403).json({ message: 'Only the sender can delete this message' });
      }

      await pool.query(
        'UPDATE project_messages SET is_deleted = TRUE, deleted_at = NOW(), updated_at = NOW() WHERE id = $1',
        [messageId]
      );
      return res.status(204).send();
    } catch (error) {
      logError(
        'project-messages:delete:error',
        { projectId: req.params?.projectId, messageId: req.params?.messageId },
        error
      );
      const message = pool
        ? 'Failed to delete message'
        : 'Database is not configured (set DATABASE_URL)';
      return res.status(500).json({ message });
    }
  });

app.get('/api/projects/:projectId/personnel', async (req, res) => {
  try {
    const { projectId } = req.params;
    const { userId } = req.query || {};
    if (!projectId || !isUuid(projectId)) {
      return res.status(400).json({ message: 'Invalid projectId' });
    }
    if (!userId || !isUuid(userId)) {
      return res.status(400).json({ message: 'userId is required' });
    }
    await assertDbReady();
    const project = await getProjectById(projectId);
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }
    const participants = await getProjectParticipants(projectId);
    const rows = await fetchProjectPersonnel(projectId);

    // Authorization: owner, assigned contractor, any accepted contractor app, or any listed personnel
    const isOwner = project.user_id === userId;
    const isAssignedContractor = participants && participants.contractorId === userId;
    const isPersonnelMember = rows.some((r) => r.user_id === userId);
    const acceptedApp = await pool.query(
      "SELECT 1 FROM project_applications WHERE project_id = $1 AND contractor_id = $2 AND status = 'accepted' LIMIT 1",
      [projectId, userId]
    );
    const isAcceptedContractor = acceptedApp.rows.length > 0;

    if (!isOwner && !isAssignedContractor && !isPersonnelMember && !isAcceptedContractor) {
      return res.status(403).json({ message: 'Not authorized to view personnel' });
    }

    const augmented = [...rows];
    const seen = new Set(rows.map((r) => r.user_id));
    if (participants?.ownerId && !seen.has(participants.ownerId)) {
      const ownerUser = await getUserById(participants.ownerId);
      if (ownerUser) {
        augmented.push({
          id: null,
          project_id: projectId,
          user_id: ownerUser.id,
          personnel_role: 'owner',
          created_at: project?.created_at || new Date(),
          full_name: ownerUser.full_name,
          email: ownerUser.email,
          phone: ownerUser.phone,
          profile_photo_url: ownerUser.profile_photo_url,
          role: ownerUser.role,
        });
        seen.add(ownerUser.id);
      }
    }
    if (participants?.contractorId && !seen.has(participants.contractorId)) {
      const contractorUser = await getUserById(participants.contractorId);
      if (contractorUser) {
        augmented.push({
          id: null,
          project_id: projectId,
          user_id: contractorUser.id,
          personnel_role: 'contractor',
          created_at: project?.created_at || new Date(),
          full_name: contractorUser.full_name,
          email: contractorUser.email,
          phone: contractorUser.phone,
          profile_photo_url: contractorUser.profile_photo_url,
          role: contractorUser.role,
        });
        seen.add(contractorUser.id);
      }
    }

    return res.json(augmented.map((row) => mapProjectPersonnelRow(row)));
  } catch (error) {
    logError('project-personnel:list:error', { projectId: req.params?.projectId }, error);
    const message = pool
      ? 'Failed to fetch personnel'
      : 'Database is not configured (set DATABASE_URL)';
    return res.status(500).json({ message });
  }
});

app.post('/api/projects/:projectId/personnel', async (req, res) => {
  if (!pool) {
    return res.status(500).json({ message: 'Database is not configured (set DATABASE_URL)' });
  }
  const client = await pool.connect();
  try {
    const { projectId } = req.params;
    const { userId, people } = req.body || {};
    if (!projectId || !isUuid(projectId)) {
      return res.status(400).json({ message: 'Invalid projectId' });
    }
    if (!userId || !isUuid(userId)) {
      return res.status(400).json({ message: 'userId is required' });
    }
    if (!Array.isArray(people) || people.length === 0) {
      return res.status(400).json({ message: 'people list is required' });
    }

    const uniqueIds = Array.from(
      new Set(
        people
          .map((p) => p?.userId || p?.id)
          .filter((id) => typeof id === 'string' && isUuid(id))
      )
    );
    if (uniqueIds.length === 0) {
      return res.status(400).json({ message: 'No valid personnel ids provided' });
    }
    if (uniqueIds.length > 10) {
      return res.status(400).json({ message: 'You can add up to 10 people at a time' });
    }

    await assertDbReady();
    const project = await getProjectById(projectId);
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }
    const participants = await getProjectParticipants(projectId);
    const isOwnerOrContractor = participants && isProjectParticipant(participants, userId);
    let isAcceptedContractor = false;
    if (!isOwnerOrContractor) {
      const acceptedApp = await client.query(
        "SELECT 1 FROM project_applications WHERE project_id = $1 AND contractor_id = $2 AND status = 'accepted' LIMIT 1",
        [projectId, userId]
      );
      isAcceptedContractor = acceptedApp.rows.length > 0;
    }
    if (!isOwnerOrContractor && !isAcceptedContractor) {
      return res.status(403).json({ message: 'Not authorized to add personnel' });
    }

    await client.query('BEGIN');
    for (const personId of uniqueIds) {
      const userRow = await client.query('SELECT * FROM users WHERE id = $1 LIMIT 1', [personId]);
      if (!userRow.rows.length) continue;
      const roleLower = normalizeRole(userRow.rows[0].role);
      await client.query(
        `
          INSERT INTO project_personnel (project_id, user_id, personnel_role)
          VALUES ($1, $2, $3)
          ON CONFLICT (project_id, user_id) DO NOTHING
        `,
        [projectId, personId, userRow.rows[0].role || null]
      );
      if (roleLower === 'worker') {
        const notifId = crypto.randomUUID?.() || crypto.randomBytes(16).toString('hex');
        await client.query(
          `
            INSERT INTO notifications (id, user_id, title, body, data)
            VALUES ($1, $2, $3, $4, $5)
          `,
          [
            notifId,
            personId,
            'Added to project',
            `${project.title || 'A contractor'} added you to ${project.title || 'a project'}.`,
            JSON.stringify({
              type: 'worker-added',
              projectId,
              projectTitle: project.title || 'Project',
              contractorName: req.body?.contractorName || '',
            }),
          ]
        );
      }
    }
    await client.query('COMMIT');

    const rows = await fetchProjectPersonnel(projectId);
    return res.status(201).json(rows.map((row) => mapProjectPersonnelRow(row)));
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    logError('project-personnel:create:error', { projectId: req.params?.projectId }, error);
    const message = pool
      ? 'Failed to add personnel'
      : 'Database is not configured (set DATABASE_URL)';
    return res.status(500).json({ message });
  } finally {
    client.release();
  }
});

app.delete('/api/projects/:projectId/personnel/:personId', async (req, res) => {
  try {
    const { projectId, personId } = req.params;
    const { userId } = req.body || {};
    if (!projectId || !isUuid(projectId)) {
      return res.status(400).json({ message: 'Invalid projectId' });
    }
    if (!personId || !isUuid(personId)) {
      return res.status(400).json({ message: 'Invalid personId' });
    }
    if (!userId || !isUuid(userId)) {
      return res.status(400).json({ message: 'userId is required' });
    }

    await assertDbReady();
    const participants = await getProjectParticipants(projectId);
    if (!participants) {
      return res.status(404).json({ message: 'Project not found' });
    }
    if (participants.ownerId === personId) {
      return res.status(403).json({ message: 'Cannot remove the project owner' });
    }
    if (participants.contractorId !== userId) {
      return res.status(403).json({ message: 'Only the assigned contractor can remove personnel' });
    }

    const existing = await pool.query(
      'SELECT * FROM project_personnel WHERE project_id = $1 AND user_id = $2 LIMIT 1',
      [projectId, personId]
    );
    if (!existing.rows.length) {
      return res.status(404).json({ message: 'Personnel not found on this project' });
    }

    await pool.query('DELETE FROM project_personnel WHERE project_id = $1 AND user_id = $2', [
      projectId,
      personId,
    ]);
    return res.status(204).send();
  } catch (error) {
    logError(
      'project-personnel:delete:error',
      { projectId: req.params?.projectId, personId: req.params?.personId },
      error
    );
    const message = pool
      ? 'Failed to remove personnel'
      : 'Database is not configured (set DATABASE_URL)';
    return res.status(500).json({ message });
  }
});

app.post('/api/contracts', async (req, res) => {
  try {
    const { projectId, createdBy, title, terms } = req.body || {};
    if (!projectId || !createdBy || !title || !terms) {
      return res
        .status(400)
        .json({ message: 'projectId, createdBy, title, and terms are required' });
    }

    await assertDbReady();
    const project = await getProjectById(projectId);
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }
    const assignedContractorId = await getAssignedContractorId(projectId);
    const isOwner = project.user_id === createdBy;
    const isAssignedContractor = assignedContractorId && assignedContractorId === createdBy;
    if (!isOwner && !isAssignedContractor) {
      return res
        .status(403)
        .json({ message: 'Only the project owner or assigned contractor can create contracts' });
    }

    const creator = await getUserById(createdBy);
    if (!creator) {
      return res.status(404).json({ message: 'Creator not found' });
    }

    const contractId = crypto.randomUUID?.() || crypto.randomBytes(16).toString('hex');
    const result = await pool.query(
      `
        INSERT INTO contracts (id, project_id, created_by, title, terms, status)
        VALUES ($1, $2, $3, $4, $5, 'pending')
        RETURNING *
      `,
      [contractId, projectId, createdBy, title.trim(), terms]
    );

    const pdfMeta = await generateContractPdf({
      contract: { ...result.rows[0], version: 1 },
      project,
      signatures: [],
    });
    if (pdfMeta?.pdfUrl) {
      await pool.query('UPDATE contracts SET pdf_url = $1 WHERE id = $2', [pdfMeta.pdfUrl, contractId]);
    }

    return res
      .status(201)
      .json(
        mapContractRow({
          ...result.rows[0],
          owner_id: project.user_id,
          signature_count: 0,
          pdf_url: pdfMeta?.pdfUrl || '',
        })
      );
  } catch (error) {
    logError('contracts:create:error', { body: req.body }, error);
    const message = pool
      ? 'Failed to create contract'
      : 'Database is not configured (set DATABASE_URL)';
    return res.status(500).json({ message });
  }
});

app.get('/api/contracts/project/:projectId', async (req, res) => {
  try {
    const { projectId } = req.params;
    if (!projectId) {
      return res.status(400).json({ message: 'projectId is required' });
    }

    await assertDbReady();
    const result = await pool.query(
      `
        SELECT c.*, p.user_id AS owner_id, COUNT(cs.id) AS signature_count
        FROM contracts c
        JOIN projects p ON p.id = c.project_id
        LEFT JOIN contract_signatures cs ON cs.contract_id = c.id
        WHERE c.project_id = $1
        GROUP BY c.id, p.user_id
        ORDER BY c.created_at DESC
      `,
      [projectId]
    );
    return res.json(result.rows.map((row) => mapContractRow(row)));
  } catch (error) {
    logError('contracts:list:error', { projectId: req.params?.projectId }, error);
    const message = pool
      ? 'Failed to fetch contracts'
      : 'Database is not configured (set DATABASE_URL)';
    return res.status(500).json({ message });
  }
});

app.get('/api/contracts/user/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    if (!userId) {
      return res.status(400).json({ message: 'userId is required' });
    }

    await assertDbReady();
    const result = await pool.query(
      `
        SELECT
          c.*,
          p.user_id AS owner_id,
          COUNT(cs.id) AS signature_count
        FROM contracts c
        JOIN projects p ON p.id = c.project_id
        LEFT JOIN contract_signatures cs ON cs.contract_id = c.id
        WHERE c.created_by = $1
           OR EXISTS (
              SELECT 1
              FROM contract_signatures cs_inner
              WHERE cs_inner.contract_id = c.id AND cs_inner.user_id = $1
            )
        GROUP BY c.id, p.user_id
        ORDER BY c.created_at DESC
      `,
      [userId]
    );

    return res.json(result.rows.map((row) => mapContractRow(row)));
  } catch (error) {
    logError('contracts:list-user:error', { userId: req.params?.userId }, error);
    const message = pool
      ? 'Failed to fetch contracts'
      : 'Database is not configured (set DATABASE_URL)';
    return res.status(500).json({ message });
  }
});

app.get('/api/contracts/:contractId', async (req, res) => {
  try {
    const { contractId } = req.params;
    if (!contractId) {
      return res.status(400).json({ message: 'contractId is required' });
    }

    await assertDbReady();
    const contractResult = await pool.query(
      `
        SELECT c.*, p.user_id AS owner_id
        FROM contracts c
        JOIN projects p ON p.id = c.project_id
        WHERE c.id = $1
        LIMIT 1
      `,
      [contractId]
    );
    if (!contractResult.rows.length) {
      return res.status(404).json({ message: 'Contract not found' });
    }

    const signatures = await pool.query(
      `
        SELECT
          cs.*,
          u.full_name AS user_full_name,
          u.email AS user_email,
          u.role AS user_role
        FROM contract_signatures cs
        LEFT JOIN users u ON u.id = cs.user_id
        WHERE cs.contract_id = $1
        ORDER BY cs.signed_at ASC
      `,
      [contractId]
    );

    return res.json(
      mapContractRow(contractResult.rows[0], signatures.rows.map((row) => mapSignatureRow(row)))
    );
  } catch (error) {
    logError('contracts:detail:error', { contractId: req.params?.contractId }, error);
    const message = pool
      ? 'Failed to fetch contract'
      : 'Database is not configured (set DATABASE_URL)';
    return res.status(500).json({ message });
  }
});

app.delete('/api/contracts/:contractId', async (req, res) => {
  try {
    const { contractId } = req.params;
    const { userId } = req.body || {};
    if (!contractId || !userId) {
      return res.status(400).json({ message: 'contractId and userId are required' });
    }

    const contractRow = await fetchContractWithProject(contractId);
    if (!contractRow) {
      return res.status(404).json({ message: 'Contract not found' });
    }
    if ((contractRow.status || '').toLowerCase() !== 'pending') {
      return res.status(409).json({ message: 'Only pending contracts can be deleted' });
    }

    const participants = await getProjectParticipants(contractRow.project_id);
    const personnelRows = await fetchProjectPersonnel(contractRow.project_id);
    const contractorIds = await getProjectContractorIds(contractRow.project_id);

    const ownerSideUsers = new Set();
    if (participants?.ownerId) ownerSideUsers.add(participants.ownerId);
    personnelRows.forEach((row) => {
      const role = normalizeRole(row.personnel_role || row.role || '');
      if (role === 'owner') {
        ownerSideUsers.add(row.user_id);
      }
    });

    const contractorTeam = new Set();
    if (participants?.contractorId) contractorTeam.add(participants.contractorId);
    personnelRows.forEach((row) => {
      if (isNonLaborContractorRole(row.personnel_role || row.role || '')) {
        contractorTeam.add(row.user_id);
      }
    });

    const creatorIsOwnerSide = ownerSideUsers.has(contractRow.created_by);
    const creatorIsContractorSide = contractorTeam.has(contractRow.created_by);

    let authorized = false;
    if (creatorIsOwnerSide) {
      authorized = ownerSideUsers.has(userId);
    } else if (creatorIsContractorSide) {
      authorized = contractorTeam.has(userId);
    }

    if (!authorized) {
      return res.status(403).json({ message: 'Not authorized to delete this contract' });
    }

    const contractTitle = contractRow.title || 'Contract';
    const deleter = await getUserById(userId);
    const deleterName = deleter?.full_name || 'A team member';

    // Clean up sign-request notifications tied to this contract
    await pool.query(
      "DELETE FROM notifications WHERE data->>'contractId' = $1 AND data->>'type' = 'contract-signature'",
      [contractId]
    );

    await pool.query('DELETE FROM contracts WHERE id = $1', [contractId]);

    const notificationPromises = [];
    contractorIds.forEach((cid) => {
      const notifId = crypto.randomUUID?.() || crypto.randomBytes(16).toString('hex');
      notificationPromises.push(
        pool.query(
          `
            INSERT INTO notifications (id, user_id, title, body, data)
            VALUES ($1, $2, $3, $4, $5)
          `,
          [
            notifId,
            cid,
            'Contract deleted',
            `${deleterName} deleted pending contract: ${contractTitle}`,
            JSON.stringify({
              type: 'contract-deleted',
              contractId,
              projectId: contractRow.project_id,
              title: contractTitle,
              deleterId: userId,
              deleterName,
            }),
          ]
        )
      );
    });
    await Promise.all(notificationPromises);

    return res.json({ success: true });
  } catch (error) {
    logError('contracts:delete:error', { contractId: req.params?.contractId }, error);
    const message = pool
      ? 'Failed to delete contract'
      : 'Database is not configured (set DATABASE_URL)';
    return res.status(500).json({ message });
  }
});

app.put('/api/contracts/:contractId/status', async (req, res) => {
  try {
    const { contractId } = req.params;
    const { status, userId } = req.body || {};
    if (!contractId || !status || !userId) {
      return res.status(400).json({ message: 'contractId, status, and userId are required' });
    }

    const normalizedStatus = String(status).toLowerCase();
    if (!CONTRACT_STATUSES.has(normalizedStatus)) {
      return res.status(400).json({ message: 'Invalid contract status' });
    }

    const contractRow = await fetchContractWithProject(contractId);
    if (!contractRow) {
      return res.status(404).json({ message: 'Contract not found' });
    }
    if (contractRow.owner_id !== userId && contractRow.created_by !== userId) {
      return res.status(403).json({ message: 'Not authorized to update this contract' });
    }

    await pool.query('UPDATE contracts SET status = $1 WHERE id = $2', [normalizedStatus, contractId]);
    return res.json({ status: normalizedStatus });
  } catch (error) {
    logError('contracts:update-status:error', { contractId: req.params?.contractId }, error);
    const message = pool
      ? 'Failed to update contract status'
      : 'Database is not configured (set DATABASE_URL)';
    return res.status(500).json({ message });
  }
});

app.post('/api/contracts/:contractId/sign', async (req, res) => {
  try {
    const { contractId } = req.params;
    const { userId, signatureData, ipAddress } = req.body || {};
    if (!contractId || !userId || !signatureData) {
      return res.status(400).json({ message: 'contractId, userId, and signatureData are required' });
    }

    if (!isValidBase64(signatureData)) {
      return res.status(400).json({ message: 'signatureData must be a valid base64 string' });
    }

    const contractRow = await fetchContractWithProject(contractId);
    if (!contractRow) {
      return res.status(404).json({ message: 'Contract not found' });
    }

    const signer = await getUserById(userId);
    if (!signer) {
      return res.status(404).json({ message: 'User not found' });
    }

    const role = normalizeRole(signer.role);
    const isOwner = contractRow.owner_id === userId;
    const isContractor = role === 'contractor';
    if (!isOwner && !isContractor) {
      return res.status(403).json({ message: 'Only homeowners or contractors can sign contracts' });
    }

    const existing = await pool.query(
      'SELECT 1 FROM contract_signatures WHERE contract_id = $1 AND user_id = $2 LIMIT 1',
      [contractId, userId]
    );
    if (existing.rows.length) {
      return res.status(409).json({ message: 'User has already signed this contract' });
    }

    const signedAt = new Date();
    const insertResult = await pool.query(
      `
        INSERT INTO contract_signatures (contract_id, user_id, signature_data, signed_at, ip_address)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING *
      `,
      [contractId, userId, signatureData, signedAt, ipAddress || req.ip || null]
    );

    await refreshContractStatus(contractId);

    const payload = mapSignatureRow({
      ...insertResult.rows[0],
      user_full_name: signer.full_name,
      user_email: signer.email,
      user_role: signer.role,
    });

    // Re-generate PDF with signatures
    const project = await getProjectById(contractRow.project_id);
    const signatureRows = await pool.query(
      `
        SELECT cs.*, u.full_name AS user_full_name, u.email AS user_email, u.role AS user_role
        FROM contract_signatures cs
        LEFT JOIN users u ON u.id = cs.user_id
        WHERE cs.contract_id = $1
        ORDER BY cs.signed_at ASC
      `,
      [contractId]
    );
    const pdfMeta = await generateContractPdf({
      contract: { ...contractRow, version: contractRow.version || 1 },
      project,
      signatures: signatureRows.rows.map(mapSignatureRow),
    });
    if (pdfMeta?.pdfUrl) {
      await pool.query('UPDATE contracts SET pdf_url = $1 WHERE id = $2', [pdfMeta.pdfUrl, contractId]);
    }

    // Notify other party
    const otherUserId = contractRow.owner_id === userId ? contractRow.created_by : contractRow.owner_id;
    if (otherUserId) {
      const notifId = crypto.randomUUID?.() || crypto.randomBytes(16).toString('hex');
      await pool.query(
        `
          INSERT INTO notifications (id, user_id, title, body, data)
          VALUES ($1,$2,$3,$4,$5)
        `,
        [
          notifId,
          otherUserId,
          'Contract signature needed',
          `${signer.full_name || 'A user'} signed ${contractRow.title || 'a contract'}. Please sign to activate.`,
          JSON.stringify({ contractId, projectId: contractRow.project_id, type: 'contract-signature' }),
        ]
      );
    }

    return res.status(201).json(payload);
  } catch (error) {
    logError('contracts:sign:error', { contractId: req.params?.contractId }, error);
    const message = pool
      ? 'Failed to sign contract'
      : 'Database is not configured (set DATABASE_URL)';
    return res.status(500).json({ message });
  }
});

app.get('/api/contractors/:contractorId/portfolio', async (req, res) => {
  try {
    const { contractorId } = req.params;
    if (!contractorId) {
      return res.status(400).json({ message: 'contractorId is required' });
    }
    await assertDbReady();
    const portfolioRes = await pool.query('SELECT * FROM portfolios WHERE contractor_id = $1', [
      contractorId,
    ]);
    if (!portfolioRes.rows.length) {
      return res.json(null);
    }
    const portfolio = portfolioRes.rows[0];
    const mediaRes = await pool.query('SELECT * FROM portfolio_media WHERE portfolio_id = $1', [
      portfolio.id,
    ]);
    return res.json(mapPortfolioRow(portfolio, mediaRes.rows.map(mapMediaRow)));
  } catch (error) {
    logError('portfolio:get:error', { contractorId: req.params?.contractorId }, error);
    const message = pool
      ? 'Failed to fetch portfolio'
      : 'Database is not configured (set DATABASE_URL)';
    return res.status(500).json({ message });
  }
});

app.post('/api/portfolio', async (req, res) => {
  try {
    const { contractorId, title, bio, specialties = [], hourlyRate, serviceArea, media = [] } =
      req.body || {};
    if (!contractorId) {
      return res.status(400).json({ message: 'contractorId is required' });
    }
    await assertDbReady();

    const existing = await pool.query('SELECT * FROM portfolios WHERE contractor_id = $1', [
      contractorId,
    ]);
    const portfolioId =
      existing.rows[0]?.id || crypto.randomUUID?.() || crypto.randomBytes(16).toString('hex');
    const savedMedia = media?.length ? await persistPortfolioMedia(portfolioId, media) : [];

    if (existing.rows.length) {
      await pool.query(
        `
          UPDATE portfolios
          SET title = $1, bio = $2, specialties = $3, hourly_rate = $4, service_area = $5, updated_at = NOW()
          WHERE contractor_id = $6
        `,
        [title || '', bio || '', specialties, hourlyRate || null, serviceArea || '', contractorId]
      );
    } else {
      await pool.query(
        `
          INSERT INTO portfolios (id, contractor_id, title, bio, specialties, hourly_rate, service_area)
          VALUES ($1,$2,$3,$4,$5,$6,$7)
        `,
        [
          portfolioId,
          contractorId,
          title || '',
          bio || '',
          specialties,
          hourlyRate || null,
          serviceArea || '',
        ]
      );
    }

    if (savedMedia.length) {
      for (const item of savedMedia) {
        const id = crypto.randomUUID?.() || crypto.randomBytes(16).toString('hex');
        await pool.query(
          'INSERT INTO portfolio_media (id, portfolio_id, type, url, caption) VALUES ($1,$2,$3,$4,$5)',
          [id, portfolioId, item.type || 'general', item.url, item.caption || '']
        );
      }
    }

    const result = await pool.query(
      'SELECT * FROM portfolios WHERE contractor_id = $1 LIMIT 1',
      [contractorId]
    );
    const mediaRes = await pool.query('SELECT * FROM portfolio_media WHERE portfolio_id = $1', [
      portfolioId,
    ]);
    await appendAudit({
      actorId: contractorId,
      actorRole: 'contractor',
      action: existing.rows.length ? 'portfolio.update' : 'portfolio.create',
      entityType: 'portfolio',
      entityId: portfolioId,
    });
    return res.json(mapPortfolioRow(result.rows[0], mediaRes.rows.map(mapMediaRow)));
  } catch (error) {
    logError('portfolio:save:error', { body: req.body }, error);
    const message = pool
      ? 'Failed to save portfolio'
      : 'Database is not configured (set DATABASE_URL)';
    return res.status(500).json({ message });
  }
});

app.post('/api/portfolio/:portfolioId/media', async (req, res) => {
  try {
    const { portfolioId } = req.params;
    const { media = [] } = req.body || {};
    if (!portfolioId) {
      return res.status(400).json({ message: 'portfolioId is required' });
    }
    await assertDbReady();
    const saved = await persistPortfolioMedia(portfolioId, media);
    for (const item of saved) {
      const id = crypto.randomUUID?.() || crypto.randomBytes(16).toString('hex');
      await pool.query(
        'INSERT INTO portfolio_media (id, portfolio_id, type, url, caption) VALUES ($1,$2,$3,$4,$5)',
        [id, portfolioId, item.type || 'general', item.url, item.caption || '']
      );
    }
    const mediaRes = await pool.query('SELECT * FROM portfolio_media WHERE portfolio_id = $1', [
      portfolioId,
    ]);
    return res.json(mediaRes.rows.map(mapMediaRow));
  } catch (error) {
    logError('portfolio:media:error', { portfolioId: req.params?.portfolioId }, error);
    const message = pool ? 'Failed to add media' : 'Database is not configured (set DATABASE_URL)';
    return res.status(500).json({ message });
  }
});

app.post('/api/reviews', async (req, res) => {
  try {
    const {
      contractorId,
      projectId,
      reviewerId,
      ratingOverall,
      ratingQuality,
      ratingTimeliness,
      ratingCommunication,
      ratingBudget,
      comment,
      photos = [],
    } = req.body || {};

    if (!contractorId || !reviewerId || !ratingOverall) {
      return res
        .status(400)
        .json({ message: 'contractorId, reviewerId, and ratingOverall are required' });
    }
    await assertDbReady();

    const id = crypto.randomUUID?.() || crypto.randomBytes(16).toString('hex');
    await pool.query(
      `
        INSERT INTO reviews (
          id, contractor_id, project_id, reviewer_id, rating_overall, rating_quality,
          rating_timeliness, rating_communication, rating_budget, comment, photos, status
        )
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
      `,
      [
        id,
        contractorId,
        projectId || null,
        reviewerId,
        ratingOverall,
        ratingQuality || ratingOverall,
        ratingTimeliness || ratingOverall,
        ratingCommunication || ratingOverall,
        ratingBudget || ratingOverall,
        comment || '',
        JSON.stringify(photos || []),
        'pending',
      ]
    );

    await appendAudit({
      actorId: reviewerId,
      actorRole: 'homeowner',
      action: 'review.create',
      entityType: 'review',
      entityId: id,
      metadata: { contractorId, projectId },
    });
    return res.status(201).json({ id });
  } catch (error) {
    logError('reviews:create:error', { body: req.body }, error);
    const message = pool ? 'Failed to create review' : 'Database is not configured (set DATABASE_URL)';
    return res.status(500).json({ message });
  }
});

app.get('/api/contractors/:contractorId/reviews', async (req, res) => {
  try {
    const { contractorId } = req.params;
    if (!contractorId) {
      return res.status(400).json({ message: 'contractorId is required' });
    }
    await assertDbReady();
    const result = await pool.query(
      `
        SELECT r.*, u.full_name AS reviewer_name
        FROM reviews r
        LEFT JOIN users u ON u.id = r.reviewer_id
        WHERE contractor_id = $1
        ORDER BY created_at DESC
      `,
      [contractorId]
    );
    return res.json(result.rows.map(mapReviewRow));
  } catch (error) {
    logError('reviews:list:error', { contractorId: req.params?.contractorId }, error);
    const message = pool ? 'Failed to fetch reviews' : 'Database is not configured (set DATABASE_URL)';
    return res.status(500).json({ message });
  }
});

app.post('/api/reviews/:reviewId/respond', async (req, res) => {
  try {
    const { reviewId } = req.params;
    const { responseText } = req.body || {};
    if (!reviewId) {
      return res.status(400).json({ message: 'reviewId is required' });
    }
    await assertDbReady();
    await pool.query('UPDATE reviews SET response_text = $1, response_at = NOW() WHERE id = $2', [
      responseText || '',
      reviewId,
    ]);
    return res.json({ success: true });
  } catch (error) {
    logError('reviews:respond:error', { reviewId }, error);
    const message = pool ? 'Failed to respond' : 'Database is not configured (set DATABASE_URL)';
    return res.status(500).json({ message });
  }
});

app.post('/api/reviews/:reviewId/flag', async (req, res) => {
  try {
    const { reviewId } = req.params;
    if (!reviewId) {
      return res.status(400).json({ message: 'reviewId is required' });
    }
    await assertDbReady();
    await pool.query('UPDATE reviews SET status = $1 WHERE id = $2', ['flagged', reviewId]);
    return res.json({ success: true });
  } catch (error) {
    logError('reviews:flag:error', { reviewId }, error);
    const message = pool ? 'Failed to flag review' : 'Database is not configured (set DATABASE_URL)';
    return res.status(500).json({ message });
  }
});

app.get('/api/audit', async (req, res) => {
  try {
    const { actorId, entityType, entityId, limit = 50 } = req.query;
    await assertDbReady();
    const params = [];
    let query = 'SELECT * FROM audit_logs WHERE 1=1';
    if (actorId) {
      params.push(actorId);
      query += ` AND actor_id = $${params.length}`;
    }
    if (entityType) {
      params.push(entityType);
      query += ` AND entity_type = $${params.length}`;
    }
    if (entityId) {
      params.push(entityId);
      query += ` AND entity_id = $${params.length}`;
    }
    params.push(Math.min(Number(limit) || 50, 200));
    query += ` ORDER BY created_at DESC LIMIT $${params.length}`;
    const result = await pool.query(query, params);
    return res.json(result.rows.map(mapAuditRow));
  } catch (error) {
    logError('audit:list:error', { query: req.query }, error);
    const message = pool ? 'Failed to fetch audit logs' : 'Database is not configured (set DATABASE_URL)';
    return res.status(500).json({ message });
  }
});

app.post('/api/audit', async (req, res) => {
  try {
    const { actorId, actorRole, action, entityType, entityId, metadata } = req.body || {};
    if (!action) {
      return res.status(400).json({ message: 'action is required' });
    }
    await appendAudit({ actorId, actorRole, action, entityType, entityId, metadata });
    return res.json({ success: true });
  } catch (error) {
    logError('audit:create:error', { body: req.body }, error);
    const message = pool ? 'Failed to append audit' : 'Database is not configured (set DATABASE_URL)';
    return res.status(500).json({ message });
  }
});

app.get('/api/compliance/user/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    if (!userId) {
      return res.status(400).json({ message: 'userId is required' });
    }
    await assertDbReady();
    const result = await pool.query(
      'SELECT * FROM compliance_documents WHERE user_id = $1 ORDER BY created_at DESC',
      [userId]
    );
    return res.json(result.rows.map(mapComplianceRow));
  } catch (error) {
    logError('compliance:list:error', { userId: req.params?.userId }, error);
    const message = pool
      ? 'Failed to fetch compliance documents'
      : 'Database is not configured (set DATABASE_URL)';
    return res.status(500).json({ message });
  }
});

app.post('/api/compliance', async (req, res) => {
  try {
    const { userId, type, fileData, fileName, mimeType, expiresAt, notes } = req.body || {};
    if (!userId || !type || !fileData) {
      return res.status(400).json({ message: 'userId, type, and fileData are required' });
    }
    await assertDbReady();
    const persisted = await persistComplianceFile(userId, type, fileName, mimeType, fileData);
    const id = crypto.randomUUID?.() || crypto.randomBytes(16).toString('hex');
    await pool.query(
      `
        INSERT INTO compliance_documents (id, user_id, type, url, expires_at, status, notes)
        VALUES ($1,$2,$3,$4,$5,$6,$7)
      `,
      [id, userId, type, persisted.url, expiresAt || null, 'active', notes || '']
    );
    await appendAudit({
      actorId: userId,
      actorRole: 'contractor',
      action: 'compliance.upload',
      entityType: 'compliance',
      entityId: id,
      metadata: { type, expiresAt },
    });
    return res
      .status(201)
      .json(mapComplianceRow({ id, user_id: userId, type, url: persisted.url, expires_at: expiresAt, status: 'active', notes }));
  } catch (error) {
    logError('compliance:create:error', { body: req.body }, error);
    const message = pool
      ? 'Failed to upload compliance document'
      : 'Database is not configured (set DATABASE_URL)';
    return res.status(500).json({ message });
  }
});

app.post('/api/compliance/check-expiry', async (_req, res) => {
  try {
    await assertDbReady();
    const now = new Date();
    const soon = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    await pool.query(
      "UPDATE compliance_documents SET status = 'expired' WHERE expires_at IS NOT NULL AND expires_at < NOW() AND status <> 'expired'"
    );
    await pool.query(
      "UPDATE compliance_documents SET status = 'expiring' WHERE expires_at IS NOT NULL AND expires_at BETWEEN NOW() AND $1 AND status = 'active'",
      [soon.toISOString()]
    );
    return res.json({ success: true });
  } catch (error) {
    logError('compliance:check-expiry:error', {}, error);
    const message = pool ? 'Failed to check expiry' : 'Database is not configured (set DATABASE_URL)';
    return res.status(500).json({ message });
  }
});

app.get('/api/admin/analytics', async (req, res) => {
  try {
    if (!requireAdmin(req, res)) return;
    await assertDbReady();
    const projects = await pool.query('SELECT COUNT(*) FROM projects');
    const users = await pool.query('SELECT COUNT(*) FROM users');
    const disputes = await pool.query("SELECT COUNT(*) FROM disputes WHERE status = 'open'");
    const contractors = await pool.query("SELECT COUNT(*) FROM users WHERE role = 'contractor'");
    return res.json({
      activeProjects: Number(projects.rows[0].count || 0),
      users: Number(users.rows[0].count || 0),
      disputesOpen: Number(disputes.rows[0].count || 0),
      contractors: Number(contractors.rows[0].count || 0),
    });
  } catch (error) {
    logError('admin:analytics:error', {}, error);
    const message = pool ? 'Failed to fetch analytics' : 'Database is not configured (set DATABASE_URL)';
    return res.status(500).json({ message });
  }
});

app.get('/api/admin/users', async (req, res) => {
  try {
    if (!requireAdmin(req, res)) return;
    await assertDbReady();
    const result = await pool.query('SELECT id, full_name, email, role, created_at, profile_photo_url FROM users ORDER BY created_at DESC LIMIT 200');
    return res.json(result.rows.map(mapDbUser));
  } catch (error) {
    logError('admin:users:error', {}, error);
    const message = pool ? 'Failed to fetch users' : 'Database is not configured (set DATABASE_URL)';
    return res.status(500).json({ message });
  }
});

app.get('/api/admin/disputes', async (req, res) => {
  try {
    if (!requireAdmin(req, res)) return;
    await assertDbReady();
    const result = await pool.query('SELECT * FROM disputes ORDER BY created_at DESC LIMIT 200');
    return res.json(result.rows.map(mapDisputeRow));
  } catch (error) {
    logError('admin:disputes:error', {}, error);
    const message = pool ? 'Failed to fetch disputes' : 'Database is not configured (set DATABASE_URL)';
    return res.status(500).json({ message });
  }
});

app.post('/api/admin/disputes/:id/resolve', async (req, res) => {
  try {
    if (!requireAdmin(req, res)) return;
    const { id } = req.params;
    const { status, resolutionNotes } = req.body || {};
    if (!id || !status) {
      return res.status(400).json({ message: 'id and status are required' });
    }
    await assertDbReady();
    await pool.query(
      'UPDATE disputes SET status = $1, resolution_notes = $2, updated_at = NOW() WHERE id = $3',
      [status, resolutionNotes || '', id]
    );
    await appendAudit({
      actorRole: 'admin',
      action: 'dispute.resolve',
      entityType: 'dispute',
      entityId: id,
      metadata: { status },
    });
    return res.json({ success: true });
  } catch (error) {
    logError('admin:disputes:resolve:error', { id: req.params?.id }, error);
    const message = pool ? 'Failed to resolve dispute' : 'Database is not configured (set DATABASE_URL)';
    return res.status(500).json({ message });
  }
});

app.get('/api/contractors/search', async (req, res) => {
  try {
    const { specialty, ratingMin, serviceArea, priceMin, priceMax } = req.query || {};
    await assertDbReady();
    const params = [];
    let where = "u.role = 'contractor'";
    if (specialty) {
      params.push(specialty.toLowerCase());
      where += ` AND EXISTS (SELECT 1 FROM unnest(p.specialties) s WHERE lower(s) = $${params.length})`;
    }
    if (ratingMin) {
      params.push(Number(ratingMin));
      where += ` AND COALESCE(u.rating, 0) >= $${params.length}`;
    }
    if (serviceArea) {
      params.push(`%${serviceArea.toLowerCase()}%`);
      where += ` AND lower(p.service_area) LIKE $${params.length}`;
    }
    if (priceMin) {
      params.push(Number(priceMin));
      where += ` AND p.hourly_rate >= $${params.length}`;
    }
    if (priceMax) {
      params.push(Number(priceMax));
      where += ` AND p.hourly_rate <= $${params.length}`;
    }
    const result = await pool.query(
      `
        SELECT
          u.id,
          u.full_name,
          u.email,
          u.phone,
          u.profile_photo_url,
          u.rating,
          p.title,
          p.bio,
          p.specialties,
          p.hourly_rate,
          p.service_area,
          COALESCE(avg(r.rating_overall), u.rating) AS avg_rating,
          COUNT(r.id) AS review_count
        FROM users u
        LEFT JOIN portfolios p ON p.contractor_id = u.id
        LEFT JOIN reviews r ON r.contractor_id = u.id AND r.status <> 'flagged'
        WHERE ${where}
        GROUP BY u.id, p.title, p.bio, p.specialties, p.hourly_rate, p.service_area
        ORDER BY avg_rating DESC NULLS LAST
        LIMIT 100
      `,
      params
    );
    const mapped = result.rows.map((row) => ({
      id: row.id,
      fullName: row.full_name,
      email: row.email,
      phone: row.phone,
      profilePhotoUrl: row.profile_photo_url || '',
      rating: row.rating !== null && row.rating !== undefined ? Number(row.rating) : null,
      avgRating: row.avg_rating !== null && row.avg_rating !== undefined ? Number(row.avg_rating) : null,
      reviewCount: Number(row.review_count || 0),
      specialties: row.specialties || [],
      hourlyRate:
        row.hourly_rate !== null && row.hourly_rate !== undefined ? Number(row.hourly_rate) : null,
      serviceArea: row.service_area || '',
      title: row.title || '',
      bio: row.bio || '',
    }));
    return res.json(mapped);
  } catch (error) {
    logError('contractors:search:error', { query: req.query }, error);
    const message = pool
      ? 'Failed to search contractors'
      : 'Database is not configured (set DATABASE_URL)';
    return res.status(500).json({ message });
  }
});

app.get('/api/contractors/:contractorId/profile', async (req, res) => {
  try {
    const { contractorId } = req.params;
    if (!contractorId) {
      return res.status(400).json({ message: 'contractorId is required' });
    }
    await assertDbReady();
    const userRes = await pool.query('SELECT * FROM users WHERE id = $1 AND role = $2 LIMIT 1', [
      contractorId,
      'contractor',
    ]);
    if (!userRes.rows.length) {
      return res.status(404).json({ message: 'Contractor not found' });
    }
    const portfolioRes = await pool.query('SELECT * FROM portfolios WHERE contractor_id = $1', [
      contractorId,
    ]);
    const portfolio = portfolioRes.rows[0] || null;
    const mediaRes = portfolio
      ? await pool.query('SELECT * FROM portfolio_media WHERE portfolio_id = $1', [portfolio.id])
      : { rows: [] };
    const reviewsRes = await pool.query(
      `
        SELECT r.*, u.full_name AS reviewer_name
        FROM reviews r
        LEFT JOIN users u ON u.id = r.reviewer_id
        WHERE r.contractor_id = $1 AND r.status <> 'flagged'
        ORDER BY r.created_at DESC
      `,
      [contractorId]
    );
    const avgRating =
      reviewsRes.rows.length > 0
        ? reviewsRes.rows.reduce((sum, r) => sum + Number(r.rating_overall || 0), 0) /
          reviewsRes.rows.length
        : userRes.rows[0].rating;

    return res.json({
      id: userRes.rows[0].id,
      fullName: userRes.rows[0].full_name,
      email: userRes.rows[0].email,
      phone: userRes.rows[0].phone,
      profilePhotoUrl: userRes.rows[0].profile_photo_url || '',
      avgRating: avgRating ? Number(avgRating) : null,
      reviewCount: reviewsRes.rows.length,
      portfolio: portfolio ? mapPortfolioRow(portfolio, mediaRes.rows.map(mapMediaRow)) : null,
      reviews: reviewsRes.rows.map(mapReviewRow),
    });
  } catch (error) {
    logError('contractors:profile:error', { contractorId: req.params?.contractorId }, error);
    const message = pool
      ? 'Failed to fetch contractor profile'
      : 'Database is not configured (set DATABASE_URL)';
    return res.status(500).json({ message });
  }
});

app.get('/api/admin/flags', async (req, res) => {
  try {
    if (!requireAdmin(req, res)) return;
    await assertDbReady();
    const result = await pool.query('SELECT * FROM flags ORDER BY created_at DESC LIMIT 200');
    return res.json(result.rows);
  } catch (error) {
    logError('admin:flags:error', {}, error);
    const message = pool ? 'Failed to fetch flags' : 'Database is not configured (set DATABASE_URL)';
    return res.status(500).json({ message });
  }
});

app.post('/api/admin/flags/:id/resolve', async (req, res) => {
  try {
    if (!requireAdmin(req, res)) return;
    const { id } = req.params;
    await assertDbReady();
    await pool.query("UPDATE flags SET status = 'resolved', updated_at = NOW() WHERE id = $1", [id]);
    await appendAudit({
      actorRole: 'admin',
      action: 'flag.resolve',
      entityType: 'flag',
      entityId: id,
    });
    return res.json({ success: true });
  } catch (error) {
    logError('admin:flags:resolve:error', { id }, error);
    const message = pool ? 'Failed to resolve flag' : 'Database is not configured (set DATABASE_URL)';
    return res.status(500).json({ message });
  }
});

app.post('/api/projects/:projectId/contracts/propose', async (req, res) => {
  try {
    const { projectId } = req.params;
    const { description, totalBudget, currency, userId } = req.body || {};
    const budgetNum = Number(totalBudget);
    if (
      !projectId ||
      typeof description !== 'string' ||
      !description.trim() ||
      !Number.isFinite(budgetNum) ||
      budgetNum <= 0 ||
      typeof currency !== 'string' ||
      !currency.trim()
    ) {
      return res
        .status(400)
        .json({ error: 'BAD_REQUEST', message: 'Invalid contract proposal input' });
    }

    await assertDbReady();
    const project = await getProjectById(projectId);
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    // If a userId is provided, ensure they are owner, assigned contractor, or in personnel
    if (userId) {
      const participants = await getProjectParticipants(projectId);
      const contractorId = participants?.contractorId || (await getAssignedContractorId(projectId));
      let allowed = project.user_id === userId || contractorId === userId;
      if (!allowed) {
        const personnelRow = await pool.query(
          'SELECT personnel_role FROM project_personnel WHERE project_id = $1 AND user_id = $2 LIMIT 1',
          [projectId, userId]
        );
        if (personnelRow.rows.length) {
          const role = normalizeRole(personnelRow.rows[0].personnel_role || '');
          allowed = role ? ['contractor', 'owner', 'foreman', 'manager'].includes(role) : true;
        }
      }
      if (!allowed) {
        return res.status(403).json({ message: 'Not authorized to propose for this project' });
      }
    }

    const prompt = `
You are drafting a residential construction contract for a home renovation escrow platform.
Use the following data:

Project title: ${project.title || ''}
Project address: ${project.address || 'N/A'}
Jurisdiction: ${project.timeline || 'N/A'}
Total budget: ${budgetNum} ${currency}
Short description of the work: ${description}

Write a clear, professional contract between the homeowner and contractor.
Include sections like:
- Parties
- Scope of Work
- Milestones & Payment Schedule (break the total budget into 3–6 logical milestones)
- Change Orders
- Warranties
- Dispute Resolution
- Termination
- Signatures

Output the contract as clean markdown text only.
`.trim();

    let draft1;
    try {
      draft1 = await runGeminiPrompt(prompt);
    } catch (err) {
      logError('gemini:contract:prompt1', { projectId }, err);
      return res
        .status(502)
        .json({ error: 'GEMINI_ERROR', message: 'Failed to generate contract' });
    }

    let contractText = draft1 || '';
    const tooShort = !contractText || contractText.length < 800;
    const missingKeywords =
      !/scope of work/i.test(contractText) || !/payment/i.test(contractText);
    if (tooShort || missingKeywords) {
      try {
        const prompt2 = `
Improve and reformat the following contract draft into a professional, readable residential construction contract.
Keep the same meaning and legal intent, but fix awkward wording and formatting.
Return only markdown text.
${contractText}
`.trim();
        const draft2 = await runGeminiPrompt(prompt2);
        if (draft2 && draft2.length > 100) {
          contractText = draft2;
        }
      } catch (err) {
        logError('gemini:contract:prompt2', { projectId }, err);
      }
    }

    const id = crypto.randomUUID?.() || crypto.randomBytes(16).toString('hex');
    const insert = await pool.query(
      `
        INSERT INTO generated_contracts (id, project_id, description, total_budget, currency, contract_text, created_by_user_id)
        VALUES ($1,$2,$3,$4,$5,$6,$7)
        RETURNING *
      `,
      [id, projectId, description.trim(), budgetNum, currency.trim(), contractText, userId || null]
    );

    const row = insert.rows[0];
    return res.status(201).json({
      id: row.id,
      projectId,
      description: row.description,
      totalBudget: Number(row.total_budget),
      currency: row.currency,
      contractText,
      createdAt: row.created_at,
    });
  } catch (error) {
    logError('contracts:propose:error', { projectId: req.params?.projectId }, error);
    return res
      .status(500)
      .json({ error: 'GEMINI_ERROR', message: 'Failed to generate contract' });
  }
});

app.get('/api/projects/:projectId/contracts', async (req, res) => {
  try {
    const { projectId } = req.params;
    if (!projectId) {
      return res.status(400).json({ message: 'projectId is required' });
    }
    await assertDbReady();
    const result = await pool.query(
      `
        SELECT id, project_id, description, total_budget, currency, created_at
        FROM generated_contracts
        WHERE project_id = $1
        ORDER BY created_at DESC
      `,
      [projectId]
    );
    const mapped = result.rows.map((row) => ({
      id: row.id,
      projectId: row.project_id,
      description: row.description,
      totalBudget: Number(row.total_budget),
      currency: row.currency,
      createdAt: row.created_at,
    }));
    return res.json(mapped);
  } catch (error) {
    logError('contracts:list-generated:error', { projectId: req.params?.projectId }, error);
    const message = pool
      ? 'Failed to fetch contracts'
      : 'Database is not configured (set DATABASE_URL)';
    return res.status(500).json({ message });
  }
});

app.get('/api/projects/:projectId/contracts/:contractId', async (req, res) => {
  try {
    const { projectId, contractId } = req.params;
    if (!projectId || !contractId) {
      return res.status(400).json({ message: 'projectId and contractId are required' });
    }
    await assertDbReady();
    const contractResult = await pool.query(
      'SELECT * FROM generated_contracts WHERE id = $1 AND project_id = $2 LIMIT 1',
      [contractId, projectId]
    );
    if (!contractResult.rows.length) {
      return res.status(404).json({ message: 'Contract not found' });
    }
    const signatureResult = await pool.query(
      `
        SELECT gcs.*, u.full_name AS signer_name, u.role AS signer_role_db
        FROM generated_contract_signatures gcs
        LEFT JOIN users u ON u.id = gcs.user_id
        WHERE gcs.contract_id = $1
        ORDER BY gcs.signed_at ASC
      `,
      [contractId]
    );
    return res.json(mapGeneratedContractRow(contractResult.rows[0], signatureResult.rows));
  } catch (error) {
    logError('contracts:get-generated:error', { projectId: req.params?.projectId, contractId: req.params?.contractId }, error);
    const message = pool
      ? 'Failed to fetch contract'
      : 'Database is not configured (set DATABASE_URL)';
    return res.status(500).json({ message });
  }
});

// Approved generated contracts for a contractor (fully signed)
app.get('/api/contracts/approved/:contractorId', async (req, res) => {
  try {
    const { contractorId } = req.params;
    if (!contractorId || !isUuid(contractorId)) {
      return res.status(400).json({ message: 'contractorId is required' });
    }
    await assertDbReady();

    const result = await pool.query(
      `
        SELECT gc.*
        FROM generated_contracts gc
        JOIN generated_contract_signatures gcs ON gcs.contract_id = gc.id
        WHERE gcs.user_id = $1
          AND gc.homeowner_signed = true
          AND gc.contractor_signed = true
      `,
      [contractorId]
    );

    const ids = result.rows.map((r) => r.id);
    let signatures = [];
    if (ids.length) {
      const sigs = await pool.query(
        `
          SELECT gcs.*, u.full_name, u.role AS signer_role
          FROM generated_contract_signatures gcs
          LEFT JOIN users u ON u.id = gcs.user_id
          WHERE gcs.contract_id = ANY($1::uuid[])
        `,
        [ids]
      );
      signatures = sigs.rows;
    }

    const groupedSigs = signatures.reduce((acc, row) => {
      acc[row.contract_id] = acc[row.contract_id] || [];
      acc[row.contract_id].push(row);
      return acc;
    }, {});

    const payload = result.rows.map((row) => mapGeneratedContractRow(row, groupedSigs[row.id] || []));
    return res.json(payload);
  } catch (error) {
    logError('contracts:list-approved-contractor:error', { contractorId: req.params?.contractorId }, error);
    const message = pool
      ? 'Failed to fetch contracts'
      : 'Database is not configured (set DATABASE_URL)';
    return res.status(500).json({ message });
  }
});

// Approved generated contracts for any signed user (fully signed)
app.get('/api/contracts/approved/user/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    if (!userId || !isUuid(userId)) {
      return res.status(400).json({ message: 'userId is required' });
    }
    await assertDbReady();

    const result = await pool.query(
      `
        SELECT DISTINCT gc.*
        FROM generated_contracts gc
        JOIN generated_contract_signatures gcs ON gcs.contract_id = gc.id
        WHERE gcs.user_id = $1
          AND gc.homeowner_signed = true
          AND gc.contractor_signed = true
      `,
      [userId]
    );

    const ids = result.rows.map((r) => r.id);
    let signatures = [];
    if (ids.length) {
      const sigs = await pool.query(
        `
          SELECT gcs.*, u.full_name, u.role AS signer_role
          FROM generated_contract_signatures gcs
          LEFT JOIN users u ON u.id = gcs.user_id
          WHERE gcs.contract_id = ANY($1::uuid[])
        `,
        [ids]
      );
      signatures = sigs.rows;
    }

    const groupedSigs = signatures.reduce((acc, row) => {
      acc[row.contract_id] = acc[row.contract_id] || [];
      acc[row.contract_id].push(row);
      return acc;
    }, {});

    const payload = result.rows.map((row) => mapGeneratedContractRow(row, groupedSigs[row.id] || []));
    return res.json(payload);
  } catch (error) {
    logError('contracts:list-approved-user:error', { userId: req.params?.userId }, error);
    const message = pool
      ? 'Failed to fetch contracts'
      : 'Database is not configured (set DATABASE_URL)';
    return res.status(500).json({ message });
  }
});

// Update a generated contract (either party)
app.put('/api/projects/:projectId/contracts/:contractId', async (req, res) => {
  try {
    const { projectId, contractId } = req.params;
    const { userId, description, contractText, totalBudget, currency } = req.body || {};
    if (!projectId || !contractId || !userId) {
      return res
        .status(400)
        .json({ message: 'projectId, contractId, and userId are required' });
    }
    await assertDbReady();

    const contractResult = await pool.query(
      'SELECT * FROM generated_contracts WHERE id = $1 AND project_id = $2 LIMIT 1',
      [contractId, projectId]
    );
    if (!contractResult.rows.length) {
      return res.status(404).json({ message: 'Contract not found' });
    }
    const project = await getProjectById(projectId);
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }
    const participants = await getProjectParticipants(projectId);
    const contractorId = participants?.contractorId || (await getAssignedContractorId(projectId));
    const allowed =
      project.user_id === userId ||
      contractorId === userId ||
      contractResult.rows[0].created_by_user_id === userId;
    if (!allowed) {
      return res.status(403).json({ message: 'Not authorized to update this contract' });
    }

    const fields = [];
    const values = [];
    let idx = 1;
    if (description !== undefined) {
      fields.push(`description = $${idx++}`);
      values.push(description);
    }
    if (contractText !== undefined) {
      fields.push(`contract_text = $${idx++}`);
      values.push(contractText);
    }
    if (totalBudget !== undefined) {
      fields.push(`total_budget = $${idx++}`);
      values.push(totalBudget);
    }
    if (currency !== undefined) {
      fields.push(`currency = $${idx++}`);
      values.push(currency);
    }
    if (!fields.length) {
      return res.status(400).json({ message: 'No update fields provided' });
    }

    values.push(contractId);
    const updated = await pool.query(
      `
        UPDATE generated_contracts
        SET ${fields.join(', ')}
        WHERE id = $${idx}
        RETURNING *
      `,
      values
    );

    const signatureResult = await pool.query(
      `
        SELECT gcs.*, u.full_name, u.role AS signer_role
        FROM generated_contract_signatures gcs
        LEFT JOIN users u ON u.id = gcs.user_id
        WHERE gcs.contract_id = $1
        ORDER BY gcs.signed_at ASC
      `,
      [contractId]
    );

    // Notify involved parties
    try {
      const actor = await getUserById(userId);
      const targets = new Set();
      if (participants?.ownerId && participants.ownerId !== userId) targets.add(participants.ownerId);
      if (contractorId && contractorId !== userId) targets.add(contractorId);
      const title = 'Contract updated';
      const body = `${actor?.full_name || 'A user'} has updated ${description || updated.rows[0].description || 'a contract'}.`;
      for (const targetId of targets) {
        const notifId = crypto.randomUUID?.() || crypto.randomBytes(16).toString('hex');
        await pool.query(
          `
            INSERT INTO notifications (id, user_id, title, body, data)
            VALUES ($1, $2, $3, $4, $5)
          `,
          [
            notifId,
            targetId,
            title,
            body,
            JSON.stringify({
              type: 'contract-updated',
              projectId,
              contractId,
              contractTitle: description || updated.rows[0].description || 'Contract',
            }),
          ]
        );
      }
    } catch (notifErr) {
      logError('contracts:update:notify:error', { contractId, projectId }, notifErr);
    }

    return res.json(mapGeneratedContractRow(updated.rows[0], signatureResult.rows));
  } catch (error) {
    logError('contracts:update:error', { projectId: req.params?.projectId, contractId: req.params?.contractId }, error);
    const message = pool
      ? 'Failed to update contract'
      : 'Database is not configured (set DATABASE_URL)';
    return res.status(500).json({ message });
  }
});

// Delete a generated contract
app.delete('/api/projects/:projectId/contracts/:contractId', async (req, res) => {
  try {
    const { projectId, contractId } = req.params;
    const { userId } = req.body || {};
    if (!projectId || !contractId || !userId) {
      return res.status(400).json({ message: 'projectId, contractId, and userId are required' });
    }
    await assertDbReady();
    const contractResult = await pool.query(
      'SELECT * FROM generated_contracts WHERE id = $1 AND project_id = $2 LIMIT 1',
      [contractId, projectId]
    );
    if (!contractResult.rows.length) {
      return res.status(404).json({ message: 'Contract not found' });
    }
    const project = await getProjectById(projectId);
    const participants = await getProjectParticipants(projectId);
    const contractorId = participants?.contractorId || (await getAssignedContractorId(projectId));
    const allowed =
      project?.user_id === userId ||
      contractorId === userId ||
      contractResult.rows[0].created_by_user_id === userId;
    if (!allowed) {
      return res.status(403).json({ message: 'Not authorized to delete this contract' });
    }
    await pool.query('DELETE FROM generated_contracts WHERE id = $1', [contractId]);
    return res.status(204).send();
  } catch (error) {
    logError('contracts:delete-generated:error', { projectId: req.params?.projectId, contractId: req.params?.contractId }, error);
    const message = pool
      ? 'Failed to delete contract'
      : 'Database is not configured (set DATABASE_URL)';
    return res.status(500).json({ message });
  }
});

// Sign a generated contract (store signature data)
app.post('/api/projects/:projectId/contracts/:contractId/sign', async (req, res) => {
  try {
    const { projectId, contractId } = req.params;
    const { userId, signatureData, signerRole } = req.body || {};
    if (!projectId || !contractId || !userId || !signatureData) {
      return res
        .status(400)
        .json({ message: 'projectId, contractId, userId, and signatureData are required' });
    }

    await assertDbReady();
    const contractResult = await pool.query(
      'SELECT * FROM generated_contracts WHERE id = $1 AND project_id = $2 LIMIT 1',
      [contractId, projectId]
    );
    if (!contractResult.rows.length) {
      return res.status(404).json({ message: 'Contract not found' });
    }

    const participants = await getProjectParticipants(projectId);
    const contractorId = participants?.contractorId || (await getAssignedContractorId(projectId));
    let allowed = contractResult.rows[0].created_by_user_id === userId;
    if (!allowed) {
      allowed = projectId && (participants?.ownerId === userId || contractorId === userId);
    }
    if (!allowed) {
      // allow project personnel with elevated role
      const personnelRow = await pool.query(
        'SELECT personnel_role FROM project_personnel WHERE project_id = $1 AND user_id = $2 LIMIT 1',
        [projectId, userId]
      );
      if (personnelRow.rows.length) {
        const role = normalizeRole(personnelRow.rows[0].personnel_role || '');
        allowed = ['contractor', 'owner', 'foreman', 'manager'].includes(role);
      }
    }
    if (!allowed) {
      return res.status(403).json({ message: 'Not authorized to sign this contract' });
    }

    // Snapshot roles before signing
    const beforeRes = await pool.query(
      'SELECT signer_role FROM generated_contract_signatures WHERE contract_id = $1',
      [contractId]
    );
    const rolesBefore = new Set(
      beforeRes.rows.map((r) => normalizeRole(r.signer_role || '')).filter(Boolean)
    );

    const signerUser = await getUserById(userId);

    const sigId = crypto.randomUUID?.() || crypto.randomBytes(16).toString('hex');
    const signerRoleValue =
      normalizeRole(signerRole) ||
      (participants?.ownerId === userId ? 'homeowner' : 'contractor');
    const result = await pool.query(
      `
        INSERT INTO generated_contract_signatures (id, contract_id, user_id, signature_data, signer_role)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (contract_id, user_id)
        DO UPDATE SET signature_data = EXCLUDED.signature_data, signer_role = EXCLUDED.signer_role, signed_at = NOW()
        RETURNING *
      `,
      [sigId, contractId, userId, signatureData, signerRoleValue]
    );

    // Build signature state from all signatures on this contract
    const sigRows = await pool.query(
      `
        SELECT gcs.*, u.full_name, u.role AS user_role
        FROM generated_contract_signatures gcs
        LEFT JOIN users u ON u.id = gcs.user_id
        WHERE gcs.contract_id = $1
      `,
      [contractId]
    );

    let signatureState = {};
    for (const row of sigRows.rows) {
      const role = normalizeRole(row.signer_role || row.user_role || '');
      if (!role) continue;
      const fullName = row.full_name || '';
      if (!fullName) continue;
      signatureState = applySignature(
        signatureState,
        role === 'homeowner' ? 'homeowner' : 'contractor',
        fullName
      );
    }
    if (signerUser?.full_name) {
      signatureState = applySignature(
        signatureState,
        signerRoleValue === 'homeowner' ? 'homeowner' : 'contractor',
        signerUser.full_name
      );
    }

    const homeownerSigned = !!signatureState.homeownerName;
    const contractorSigned = !!signatureState.contractorName;
    const isFullySigned = homeownerSigned && contractorSigned;
    const wasFullySigned = rolesBefore.has('homeowner') && rolesBefore.has('contractor');

    // Update contract flags
    await pool.query(
      `
        UPDATE generated_contracts
        SET homeowner_signed = $1, contractor_signed = $2
        WHERE id = $3
      `,
      [homeownerSigned, contractorSigned, contractId]
    );

    // Update contract text to reflect signature lines
    const baseText = stripExistingSignaturesSection(contractResult.rows[0].contract_text || '');
    const updatedText =
      baseText + '\n\n**Signatures**\n\n' + renderSignaturesSection(signatureState);
    await pool.query('UPDATE generated_contracts SET contract_text = $1 WHERE id = $2', [
      updatedText,
      contractId,
    ]);

    // Notify all signers when fully signed
    if (!wasFullySigned && isFullySigned) {
      const signerIds = new Set(sigRows.rows.map((r) => r.user_id).filter(Boolean));
      signerIds.add(userId);
      for (const uid of signerIds) {
        const notifId = crypto.randomUUID?.() || crypto.randomBytes(16).toString('hex');
        await pool.query(
          `
            INSERT INTO notifications (id, user_id, title, body, data)
            VALUES ($1, $2, $3, $4, $5)
          `,
          [
            notifId,
            uid,
            'Contract fully signed',
            `${contractResult.rows[0].description || 'Contract'} is fully signed.`,
            JSON.stringify({
              type: 'contract-fully-signed',
              projectId,
              contractId,
              contractTitle: contractResult.rows[0].description || 'Contract',
            }),
          ]
        );
      }
    }

    return res.status(201).json({
      signature: {
        id: result.rows[0].id,
        userId: result.rows[0].user_id,
        signerRole: result.rows[0].signer_role,
        signatureData: result.rows[0].signature_data,
        signedAt:
          result.rows[0].signed_at instanceof Date
            ? result.rows[0].signed_at.toISOString()
            : result.rows[0].signed_at,
      },
      contractText: updatedText,
    });
  } catch (error) {
    logError('contracts:sign-generated:error', { projectId: req.params?.projectId, contractId: req.params?.contractId }, error);
    const message = pool
      ? 'Failed to sign contract'
      : 'Database is not configured (set DATABASE_URL)';
    return res.status(500).json({ message });
  }
});

app.get('/api/contracts/:contractId/signatures', async (req, res) => {
  try {
    const { contractId } = req.params;
    if (!contractId) {
      return res.status(400).json({ message: 'contractId is required' });
    }

    const contractRow = await fetchContractWithProject(contractId);
    if (!contractRow) {
      return res.status(404).json({ message: 'Contract not found' });
    }

    const result = await pool.query(
      `
        SELECT
          cs.*,
          u.full_name AS user_full_name,
          u.email AS user_email,
          u.role AS user_role
        FROM contract_signatures cs
        LEFT JOIN users u ON u.id = cs.user_id
        WHERE cs.contract_id = $1
        ORDER BY cs.signed_at ASC
      `,
      [contractId]
    );

    return res.json(result.rows.map((row) => mapSignatureRow(row)));
  } catch (error) {
    logError('contracts:signatures:list:error', { contractId: req.params?.contractId }, error);
    const message = pool
      ? 'Failed to fetch signatures'
      : 'Database is not configured (set DATABASE_URL)';
    return res.status(500).json({ message });
  }
});

app.get('/api/feature-flags', async (_req, res) => {
  try {
    await assertDbReady();
    const result = await pool.query('SELECT feature_name, enabled FROM feature_flags ORDER BY feature_name ASC');
    return res.json(result.rows.map((row) => ({ featureName: row.feature_name, enabled: !!row.enabled })));
  } catch (error) {
    logError('feature-flags:list:error', {}, error);
    const message = pool
      ? 'Failed to fetch feature flags'
      : 'Database is not configured (set DATABASE_URL)';
    return res.status(500).json({ message });
  }
});

app.get('/api/feature-flags/:featureName', async (req, res) => {
  try {
    const featureName = normalizeFeatureName(req.params?.featureName);
    if (!featureName) {
      return res.status(400).json({ message: 'featureName is required' });
    }
    await assertDbReady();
    const result = await pool.query('SELECT feature_name, enabled FROM feature_flags WHERE feature_name = $1', [featureName]);
    if (!result.rows.length) {
      return res.status(404).json({ message: 'Feature flag not found' });
    }
    const row = result.rows[0];
    return res.json({ featureName: row.feature_name, enabled: !!row.enabled });
  } catch (error) {
    logError('feature-flags:get:error', { featureName: req.params?.featureName }, error);
    const message = pool
      ? 'Failed to fetch feature flag'
      : 'Database is not configured (set DATABASE_URL)';
    return res.status(500).json({ message });
  }
});

app.post('/api/feature-flags', async (req, res) => {
  try {
    const { featureName, enabled = false, description = '', updatedBy } = req.body || {};
    const normalizedName = normalizeFeatureName(featureName);
    if (!normalizedName) {
      return res.status(400).json({ message: 'featureName is required' });
    }

    await assertDbReady();
    const result = await pool.query(
      `
        INSERT INTO feature_flags (feature_name, enabled, description, updated_by, updated_at)
        VALUES ($1, $2, $3, $4, NOW())
        ON CONFLICT (feature_name)
        DO UPDATE SET
          enabled = EXCLUDED.enabled,
          description = EXCLUDED.description,
          updated_by = EXCLUDED.updated_by,
          updated_at = NOW()
        RETURNING *
      `,
      [normalizedName, !!enabled, description, updatedBy || null]
    );

    return res.status(201).json(mapFeatureFlagRow(result.rows[0]));
  } catch (error) {
    logError('feature-flags:create:error', { body: req.body }, error);
    const message = pool
      ? 'Failed to create feature flag'
      : 'Database is not configured (set DATABASE_URL)';
    return res.status(500).json({ message });
  }
});

app.put('/api/feature-flags/:featureName', async (req, res) => {
  try {
    const featureName = normalizeFeatureName(req.params?.featureName);
    if (!featureName) {
      return res.status(400).json({ message: 'featureName is required' });
    }

    const { enabled, description, updatedBy } = req.body || {};
    if (enabled === undefined) {
      return res.status(400).json({ message: 'enabled value is required' });
    }

    await assertDbReady();
    const result = await pool.query(
      `
        UPDATE feature_flags
        SET enabled = $1,
            description = COALESCE($2, description),
            updated_by = $3,
            updated_at = NOW()
        WHERE feature_name = $4
        RETURNING *
      `,
      [!!enabled, description ?? null, updatedBy || null, featureName]
    );

    if (!result.rows.length) {
      return res.status(404).json({ message: 'Feature flag not found' });
    }

    return res.json(mapFeatureFlagRow(result.rows[0]));
  } catch (error) {
    logError('feature-flags:update:error', { featureName: req.params?.featureName }, error);
    const message = pool
      ? 'Failed to update feature flag'
      : 'Database is not configured (set DATABASE_URL)';
    return res.status(500).json({ message });
  }
});

app.get('/api/monitoring/health', async (_req, res) => {
  try {
    const uptimeSeconds = getUptimeSeconds();
    const memoryUsage = process.memoryUsage();
    let dbStatus = pool ? 'configured' : 'missing pool';
    let dbLatencyMs = null;
    if (pool) {
      const start = Date.now();
      try {
        await pool.query('SELECT 1');
        dbStatus = 'ok';
        dbLatencyMs = Date.now() - start;
      } catch (error) {
        dbStatus = 'error';
        dbLatencyMs = null;
        logError('monitoring:health:db', {}, error);
      }
    }

    return res.json({
      status: dbStatus === 'ok' ? 'ok' : 'degraded',
      uptimeSeconds,
      nodeVersion: process.version,
      memoryMB: Number((memoryUsage.rss / 1024 / 1024).toFixed(2)),
      requestCount,
      errorCount,
      averageResponseTimeMs:
        requestCount > 0 ? Number((totalResponseTimeMs / requestCount).toFixed(2)) : 0,
      db: {
        status: dbStatus,
        latencyMs: dbLatencyMs,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logError('monitoring:health:error', {}, error);
    return res.status(500).json({ status: 'error', message: 'Failed to gather health info' });
  }
});

app.get('/api/monitoring/stats', (_req, res) => {
  try {
    const memoryUsage = process.memoryUsage();
    const averageResponseTimeMs =
      requestCount > 0 ? totalResponseTimeMs / requestCount : 0;
    return res.json({
      requestCount,
      errorCount,
      uptimeSeconds: getUptimeSeconds(),
      memoryMB: Number((memoryUsage.rss / 1024 / 1024).toFixed(2)),
      averageResponseTimeMs: Number(averageResponseTimeMs.toFixed(2)),
    });
  } catch (error) {
    logError('monitoring:stats:error', {}, error);
    return res.status(500).json({ message: 'Failed to fetch stats' });
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

// Global error handler (after routes)
app.use((err, req, res, next) => {
  console.error('[UNHANDLED ROUTE ERROR]', {
    message: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
  });
  const status = err.statusCode || err.status || 500;
  const payload = {
    error: status === 500 ? 'Internal server error' : err.message || 'Request failed',
  };
  if (!res.headersSent) {
    res.status(status).json(payload);
  }
});

process.on('unhandledRejection', (reason) => {
  console.error('[process] UNHANDLED REJECTION:', reason);
});

process.on('uncaughtException', (err) => {
  console.error('[process] UNCAUGHT EXCEPTION:', err);
});

if (require.main === module) {
  (async () => {
    try {
      await dbReady;
      app.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
      });
    } catch (error) {
      console.error('Server failed to start:', error);
      process.exit(1);
    }
  })();
}

module.exports = app;
