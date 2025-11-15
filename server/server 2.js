const express = require('express');
const fs = require('fs-extra');
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = 3001;
const DATA_DIR = path.join(__dirname, 'data');

// Create data directory if it doesn't exist
fs.ensureDirSync(DATA_DIR);

app.use(cors());
app.use(express.json());

// Save user data
app.post('/api/users', (req, res) => {
  try {
    const userData = req.body;
    const role = userData.role || 'unknown';
    const fileName = `${role}_users.json`;
    const filePath = path.join(DATA_DIR, fileName);
    
    // Read existing data
    let users = [];
    if (fs.existsSync(filePath)) {
      users = fs.readJsonSync(filePath);
      if (!Array.isArray(users)) {
        users = [users];
      }
    }
    
    // Add new user
    users.push(userData);
    
    // Save back to file
    fs.writeJsonSync(filePath, users, { spaces: 2 });
    
    res.status(201).json({ success: true });
  } catch (error) {
    console.error('Error saving user data:', error);
    res.status(500).json({ success: false, error: 'Failed to save user data' });
  }
});

// Get users by role
app.get('/api/users/:role', (req, res) => {
  try {
    const { role } = req.params;
    const filePath = path.join(DATA_DIR, `${role}_users.json`);
    
    if (fs.existsSync(filePath)) {
      const users = fs.readJsonSync(filePath);
      res.json(users);
    } else {
      res.json([]);
    }
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});
// Add this before app.listen()
app.get('/', (req, res) => {
  res.send(`
    <h1>Ninofi API Server</h1>
    <p>Available endpoints:</p>
    <ul>
      <li>POST /api/users - Save user data</li>
      <li>GET /api/users/:role - Get users by role</li>
    </ul>
  `);
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
