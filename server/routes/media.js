const express = require('express');
const multer = require('multer');
const cloudinary = require('../config/cloudinary');
const db = require('../config/db');
const jwt = require('jsonwebtoken');

const router = express.Router();
const upload = multer({ dest: 'uploads/' });

// ✅ Middleware to authenticate user
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

// ✅ Upload Video (Admin Only)
router.post('/upload', authenticateUser, checkAdmin, upload.fields([{ name: 'file' }, { name: 'thumbnail' }]), async (req, res) => {
  try {
    if (!req.files || !req.files.file) {
      return res.status(400).json({ error: 'No video file uploaded' });
    }

    console.log('✅ Video File Received:', req.files.file[0].originalname);

    // ✅ Upload video to Cloudinary
    const videoResult = await cloudinary.uploader.upload(req.files.file[0].path, {
      resource_type: 'video',
    });

    console.log('✅ Video Uploaded to Cloudinary:', videoResult.secure_url);

    let thumbnail_url = null;

    // ✅ Upload custom thumbnail if provided
    if (req.files.thumbnail) {
      console.log('✅ Thumbnail File Received:', req.files.thumbnail[0].originalname);

      const thumbnailResult = await cloudinary.uploader.upload(req.files.thumbnail[0].path, {
        resource_type: 'image',
      });

      console.log('✅ Thumbnail Uploaded to Cloudinary:', thumbnailResult.secure_url);
      thumbnail_url = thumbnailResult.secure_url;
    }

    // ✅ Extract metadata from request body
    const { title, description, type, release_year, genre } = req.body;

    // ✅ Save Video & Thumbnail Data in MySQL
    const sql = `
      INSERT INTO media (title, description, type, cloudinary_url, thumbnail_url, release_year, genre) 
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `;
    const values = [title, description, type, videoResult.secure_url, thumbnail_url, release_year, genre];

    db.query(sql, values, (err, result) => {
      if (err) {
        console.error('❌ Error inserting into MySQL:', err);
        return res.status(500).json({ error: 'Database error' });
      }
      res.json({
        message: 'Video uploaded successfully!',
        media_id: result.insertId,
        video_url: videoResult.secure_url,
        thumbnail_url: thumbnail_url,
      });
    });

  } catch (error) {
    console.error('❌ Upload error:', error);
    res.status(500).json({ error: 'Upload failed: ' + error.message });
  }
});

// ✅ Add Episode (Admin Only)
router.post('/upload-episode', authenticateUser, checkAdmin, upload.fields([{ name: 'file' }, { name: 'thumbnail' }]), async (req, res) => {
  try {
    if (!req.files || !req.files.file) return res.status(400).json({ error: 'No episode file uploaded' });

    const videoResult = await cloudinary.uploader.upload(req.files.file[0].path, {
      resource_type: 'video',
    });

    let thumbnail_url = null;
    if (req.files.thumbnail) {
      const thumbnailResult = await cloudinary.uploader.upload(req.files.thumbnail[0].path, {
        resource_type: 'image',
      });
      thumbnail_url = thumbnailResult.secure_url;
    }

    const { media_id, season, episode, title, description } = req.body;

    const sql = `
      INSERT INTO episodes (media_id, season, episode, title, description, cloudinary_url, thumbnail_url) 
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `;
    const values = [media_id, season, episode, title, description, videoResult.secure_url, thumbnail_url];

    db.query(sql, values, (err, result) => {
      if (err) return res.status(500).json({ error: 'Database error' });
      res.json({ message: 'Episode uploaded successfully!', episode_id: result.insertId });
    });

  } catch (error) {
    res.status(500).json({ error: 'Upload failed: ' + error.message });
  }
});

// ✅ Add Comment
router.post('/add-comment', authenticateUser, (req, res) => {
  const { media_id, text } = req.body;
  const sql = `INSERT INTO comments (user_id, media_id, text) VALUES (?, ?, ?)`;
  db.query(sql, [req.user.userId, media_id, text], (err) => {
    if (err) return res.status(500).json({ error: 'Database error' });
    res.json({ message: 'Comment added successfully!' });
  });
});

// ✅ Add Rating (Fix duplicate entry error)
router.post('/rate', authenticateUser, (req, res) => {
  const { media_id, rating } = req.body;
  
  // Check if user already rated
  const checkSql = `SELECT * FROM ratings WHERE user_id = ? AND media_id = ?`;
  db.query(checkSql, [req.user.userId, media_id], (err, results) => {
    if (err) return res.status(500).json({ error: 'Database error' });

    if (results.length > 0) {
      // Update rating if it exists
      const updateSql = `UPDATE ratings SET rating = ? WHERE user_id = ? AND media_id = ?`;
      db.query(updateSql, [rating, req.user.userId, media_id], (err) => {
        if (err) return res.status(500).json({ error: 'Failed to update rating' });
        return res.json({ message: 'Rating updated successfully!' });
      });
    } else {
      // Insert new rating
      const insertSql = `INSERT INTO ratings (user_id, media_id, rating) VALUES (?, ?, ?)`;
      db.query(insertSql, [req.user.userId, media_id, rating], (err) => {
        if (err) return res.status(500).json({ error: 'Failed to submit rating' });
        res.json({ message: 'Rating submitted successfully!' });
      });
    }
  });
});

// ✅ Add to Watchlist (Fix duplicate entry issue)
router.post('/watchlist/add', authenticateUser, (req, res) => {
  const { media_id } = req.body;

  // Check if already in watchlist
  const checkSql = `SELECT * FROM watchlist WHERE user_id = ? AND media_id = ?`;
  db.query(checkSql, [req.user.userId, media_id], (err, results) => {
    if (err) return res.status(500).json({ error: 'Database error' });

    if (results.length > 0) {
      return res.status(400).json({ error: 'Already in watchlist' });
    } else {
      // Add to watchlist
      const insertSql = `INSERT INTO watchlist (user_id, media_id) VALUES (?, ?)`;
      db.query(insertSql, [req.user.userId, media_id], (err) => {
        if (err) return res.status(500).json({ error: 'Failed to add to watchlist' });
        res.json({ message: 'Added to watchlist!' });
      });
    }
  });
});


// ✅ Get Watchlist
router.get('/watchlist', authenticateUser, (req, res) => {
  const sql = `SELECT media.* FROM media JOIN watchlist ON media.id = watchlist.media_id WHERE watchlist.user_id = ?`;
  db.query(sql, [req.user.userId], (err, results) => {
    if (err) return res.status(500).json({ error: 'Database error' });
    res.json(results);
  });
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
});
router.delete('/delete/:id', authenticateUser, checkAdmin, async (req, res) => {
  const mediaId = req.params.id;

  // ✅ Fetch video and thumbnail URLs from MySQL
  const sqlFetch = 'SELECT cloudinary_url, thumbnail_url FROM media WHERE id = ?';
  db.query(sqlFetch, [mediaId], async (err, results) => {
    if (err) {
      console.error('❌ Error fetching media:', err);
      return res.status(500).json({ error: 'Database error' });
    }

    if (results.length === 0) {
      return res.status(404).json({ error: 'Media not found' });
    }

    const { cloudinary_url, thumbnail_url } = results[0];

    try {
      // ✅ Extract Cloudinary Public ID (needed to delete from Cloudinary)
      const videoPublicId = cloudinary_url.split('/').pop().split('.')[0];

      // ✅ Delete video from Cloudinary
      await cloudinary.uploader.destroy(videoPublicId, { resource_type: 'video' });

      // ✅ Delete thumbnail from Cloudinary (if exists)
      if (thumbnail_url) {
        const thumbnailPublicId = thumbnail_url.split('/').pop().split('.')[0];
        await cloudinary.uploader.destroy(thumbnailPublicId, { resource_type: 'image' });
      }

      // ✅ Delete from MySQL
      const sqlDelete = 'DELETE FROM media WHERE id = ?';
      db.query(sqlDelete, [mediaId], (err, result) => {
        if (err) {
          console.error('❌ Error deleting from MySQL:', err);
          return res.status(500).json({ error: 'Database error' });
        }
        res.json({ message: 'Video deleted successfully!', mediaId });
      });

    } catch (error) {
      console.error('❌ Cloudinary deletion error:', error);
      res.status(500).json({ error: 'Error deleting video from Cloudinary' });
    }
  });
});
// ✅ Get All Media (Filtered by Type)
router.get('/', (req, res) => {
  const { type } = req.query; // Get type from query parameter

  let sql = 'SELECT * FROM media';
  const values = [];

  // ✅ Filter by media type if provided (movies, series, anime)
  if (type && (type === 'movie' || type === 'series' || type === 'anime')) {
    sql += ' WHERE type = ?';
    values.push(type);
  }

  sql += ' ORDER BY created_at DESC';

  db.query(sql, values, (err, results) => {
    if (err) {
      console.error('❌ Error fetching media:', err);
      return res.status(500).json({ error: 'Failed to fetch media' });
    }
    res.status(200).json(results);
  });
});



module.exports = router;

