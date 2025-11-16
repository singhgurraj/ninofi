const express = require('express');
const fs = require('fs-extra');
const path = require('path');
const cors = require('cors');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 3001;
const DATA_DIR = path.join(__dirname, 'data');
const USERS_SUFFIX = '_users.json';

fs.ensureDirSync(DATA_DIR);

app.use(cors());
app.use(express.json());

const getRoleFilePath = (role) => {
  const normalizedRole = (role || 'unknown').toLowerCase();
  return {
    normalizedRole,
    filePath: path.join(DATA_DIR, `${normalizedRole}${USERS_SUFFIX}`),
  };
};

const readUsersByRole = async (role) => {
  const { filePath } = getRoleFilePath(role);
  if (!(await fs.pathExists(filePath))) {
    return [];
  }
  try {
    const users = await fs.readJson(filePath);
    return Array.isArray(users) ? users : [];
  } catch {
    return [];
  }
};

const writeUsersByRole = async (role, users) => {
  const { filePath } = getRoleFilePath(role);
  await fs.writeJson(filePath, users, { spaces: 2 });
};

const sanitizeUser = (user) => {
  const { password, confirmPassword, ...safeUser } = user;
  return safeUser;
};

const findUserByEmail = async (email) => {
  const files = await fs.readdir(DATA_DIR).catch(() => []);
  for (const file of files) {
    if (!file.endsWith(USERS_SUFFIX)) continue;
    const role = file.replace(USERS_SUFFIX, '');
    const filePath = path.join(DATA_DIR, file);
    let users = [];
    try {
      users = await fs.readJson(filePath);
    } catch {
      users = [];
    }

    if (!Array.isArray(users)) continue;

    const user = users.find(
      (record) => record.email?.toLowerCase() === email?.toLowerCase()
    );
    if (user) {
      return { user, users, role, filePath };
    }
  }

  return { user: null, users: [], role: null, filePath: null };
};

const generateToken = () => {
  if (crypto.randomUUID) {
    return `mock-jwt-${crypto.randomUUID()}`;
  }
  return `mock-jwt-${crypto.randomBytes(16).toString('hex')}`;
};

app.get('/', (req, res) => {
  res.send(`
    <h1>Ninofi API Server</h1>
    <p>Available endpoints:</p>
    <ul>
      <li>POST /api/auth/register - Register a new user</li>
      <li>POST /api/auth/login - Login with existing user</li>
      <li>POST /api/users - (Legacy) Save raw user data</li>
      <li>GET /api/users/:role - Fetch users for a role</li>
    </ul>
  `);
});

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.post('/api/auth/register', async (req, res) => {
  try {
    const { fullName, email, password, role, phone } = req.body || {};

    if (!fullName || !email || !password || !role) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    const existingUser = await findUserByEmail(email);
    if (existingUser.user) {
      return res.status(409).json({ message: 'User already exists' });
    }

    const newUser = {
      id: Date.now().toString(),
      fullName,
      email,
      phone: phone || '',
      role: role.toLowerCase(),
      password,
      createdAt: new Date().toISOString(),
    };

    const users = await readUsersByRole(role);
    users.push(newUser);
    await writeUsersByRole(role, users);

    return res.status(201).json({
      user: sanitizeUser(newUser),
      token: generateToken(),
    });
  } catch (error) {
    console.error('Error registering user:', error);
    return res.status(500).json({ message: 'Failed to register user' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body || {};

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    const { user } = await findUserByEmail(email);
    if (!user || user.password !== password) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    return res.json({
      user: sanitizeUser(user),
      token: generateToken(),
    });
  } catch (error) {
    console.error('Error logging in:', error);
    return res.status(500).json({ message: 'Failed to login' });
  }
});

// Legacy endpoints retained for compatibility
app.post('/api/users', async (req, res) => {
  try {
    const userData = req.body;
    const role = userData.role || 'unknown';
    const users = await readUsersByRole(role);
    users.push(userData);
    await writeUsersByRole(role, users);
    res.status(201).json({ success: true });
  } catch (error) {
    console.error('Error saving user data:', error);
    res.status(500).json({ success: false, error: 'Failed to save user data' });
  }
});

app.get('/api/users/:role', async (req, res) => {
  try {
    const { role } = req.params;
    const users = await readUsersByRole(role);
    res.json(users);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

module.exports = app;
