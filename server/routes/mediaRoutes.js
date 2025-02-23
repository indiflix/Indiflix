const express = require('express');
const multer = require('multer');
const cloudinary = require('../config/cloudinary');
const db = require('../config/db');
const jwt = require('jsonwebtoken');

const router = express.Router();
const upload = multer({ dest: 'uploads/' });

// ✅ Middleware to verify user authentication
const authenticateUser = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Unauthorized' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
};

// ✅ Middleware to check if user is admin
const checkAdmin = (req, res, next) => {
  const { email } = req.user;

  db.query('SELECT isAdmin FROM users WHERE email = ?', [email], (err, results) => {
    if (err) return res.status(500).json({ error: 'Database error' });
    if (results.length === 0) return res.status(404).json({ error: 'User not found' });

    if (results[0].isAdmin !== 1) {
      return res.status(403).json({ error: 'Forbidden: You are not an admin' });
    }

    next();
  });
};

// ✅ Upload Video (Only for Admins)
router.post('/upload', authenticateUser, checkAdmin, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // ✅ Upload file to Cloudinary
    const result = await cloudinary.uploader.upload(req.file.path, {
      resource_type: 'video',
    });

    // ✅ Save Video Data in MySQL
    const { title, description, type, release_year, genre } = req.body;
    const sql = `
      INSERT INTO media (title, description, type, cloudinary_url, thumbnail_url, release_year, genre) 
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `;
    const values = [title, description, type, result.secure_url, result.secure_url + ".jpg", release_year, genre];

    db.query(sql, values, (err, result) => {
      if (err) {
        console.error('❌ Error inserting into MySQL:', err);
        return res.status(500).json({ error: 'Database error' });
      }
      res.json({ message: 'Video uploaded successfully!', media_id: result.insertId, video_url: result.secure_url });
    });
  } catch (error) {
    res.status(500).json({ error: 'Upload failed' });
  }
});
router.get('/', (req, res) => {
    const sql = 'SELECT * FROM media ORDER BY created_at DESC';
    db.query(sql, (err, results) => {
      if (err) {
        console.error('❌ Error fetching media:', err);
        return res.status(500).json({ error: 'Failed to fetch media' });
      }
      res.status(200).json(results);
    });
  });cc

module.exports = router;
