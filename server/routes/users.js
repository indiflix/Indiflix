const express = require('express');
const db = require('../config/db');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const router = express.Router();

// ✅ Middleware to authenticate user
const authenticateUser = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1]; // ✅ Extract token from `Authorization: Bearer <token>`
  if (!token) return res.status(401).json({ error: 'Unauthorized' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
};

// ✅ API to check if user is an admin
router.get('/me', authenticateUser, (req, res) => {
  const { email } = req.user;
  db.query('SELECT isAdmin FROM users WHERE email = ?', [email], (err, results) => {
    if (err) return res.status(500).json({ error: 'Database error' });
    if (results.length === 0) return res.status(404).json({ error: 'User not found' });

    res.json({ isAdmin: results[0].isAdmin === 1 }); // ✅ Returns true if admin
  });
});

// ✅ Register User (now hashes password)
router.post('/register', (req, res) => {
  const { name, email, password } = req.body;
  if (!email || !password || !name) return res.status(400).json({ error: 'Missing fields' });

  const hashed = bcrypt.hashSync(password, 10);
  const sql = 'INSERT INTO users (name, email, password, isAdmin) VALUES (?, ?, ?, 0)'; // Default isAdmin = 0
  db.query(sql, [name, email, hashed], (err) => {
    if (err) {
      if (err.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: 'User already exists' });
      return res.status(500).json({ error: 'Database error' });
    }
    res.json({ message: 'User registered successfully' });
  });
});

// ✅ Login User (password check with bcrypt)
router.post('/login', (req, res) => {
  const { email, password } = req.body;
  db.query('SELECT * FROM users WHERE email = ?', [email], (err, results) => {
    if (err) return res.status(500).json({ error: 'Database error' });
    if (results.length === 0) return res.status(401).json({ error: 'User not found' });

    const user = results[0];

    const passwordMatch = user.password ? bcrypt.compareSync(password, user.password) : false;
    if (!passwordMatch) return res.status(401).json({ error: 'Incorrect password' });

    // ✅ Generate JWT Token
    const token = jwt.sign({ id: user.id, email: user.email }, process.env.JWT_SECRET, { expiresIn: '7d' });

    res.json({ message: 'Login successful', token, isAdmin: user.isAdmin });
  });
});

module.exports = router;
