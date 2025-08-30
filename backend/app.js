const express = require('express');
const passport = require('passport');
const session = require('express-session');
const cors = require('cors');
const auth = require('./auth');
const { pool, initDB } = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(cors({ origin: true, credentials: true }));
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 24 * 60 * 60 * 1000, secure: process.env.NODE_ENV === 'production' }
}));
app.use(passport.initialize());
app.use(passport.session());

// Initialize DB
initDB();

// Routes
app.post('/register', async (req, res) => {
  const { username, password, role } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'Fields required' });
  try {
    const existing = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
    if (existing.rows.length > 0) return res.status(400).json({ error: 'Username taken' });
    const hash = await bcrypt.hash(password, 10);
    await pool.query('INSERT INTO users (username, password, role) VALUES ($1, $2, $3)', [username, hash, role || 'user']);
    res.status(201).json({ message: 'Registered' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/login', passport.authenticate('local'), (req, res) => res.json({ user: req.user }));
app.post('/logout', (req, res) => { req.logout(); res.json({ message: 'Logged out' }); });
app.get('/current-user', (req, res) => req.isAuthenticated() ? res.json(req.user) : res.status(401).json({ error: 'Not logged in' }));

// Resource Routes
app.get('/resources', async (req, res) => {
  if (!req.isAuthenticated()) return res.status(401);
  const query = req.user.role === 'admin' ? 
    'SELECT r.*, u.username as allocated_to_username FROM resources r LEFT JOIN users u ON r.allocated_to = u.id' :
    'SELECT * FROM resources';
  const resources = await pool.query(query);
  res.json(resources.rows);
});

app.post('/resources/request', async (req, res) => {
  if (!req.isAuthenticated()) return res.status(401);
  const { resourceId } = req.body;
  const userId = req.user.id;
  const resource = await pool.query('SELECT * FROM resources WHERE id = $1 AND status = \'available\'', [resourceId]);
  if (!resource.rows.length) return res.status(400).json({ error: 'Unavailable' });
  await pool.query('UPDATE resources SET allocated_to = $1, status = \'allocated\' WHERE id = $2', [userId, resourceId]);
  res.json({ success: true });
});

app.post('/resources/release', async (req, res) => {
  if (!req.isAuthenticated()) return res.status(401);
  const { resourceId } = req.body;
  const userId = req.user.id;
  const check = await pool.query('SELECT * FROM resources WHERE id = $1 AND (allocated_to = $2 OR $3 = \'admin\')', [resourceId, userId, req.user.role]);
  if (!check.rows.length) return res.status(403).json({ error: 'Not yours' });
  await pool.query('UPDATE resources SET allocated_to = NULL, status = \'available\' WHERE id = $1', [resourceId]);
  res.json({ success: true });
});

// Admin Routes
app.get('/admin/users', async (req, res) => req.user.role === 'admin' ? res.json((await pool.query('SELECT id, username, role FROM users')).rows) : res.status(403));
app.get('/admin/resources', async (req, res) => req.user.role === 'admin' ? res.json((await pool.query('SELECT * FROM resources')).rows) : res.status(403));

// Serve frontend in production
if (process.env.NODE_ENV === 'production') app.use(express.static('../frontend')) && app.get('*', (req, res) => res.sendFile(require('path').resolve(__dirname, '../frontend/index.html')));

app.listen(PORT, () => console.log(`Server on ${PORT}`));