const express = require('express');
const multer = require('multer');
const fs = require('fs');
const cloudinary = require('../config/cloudinary');
const db = require('../config/db');
const jwt = require('jsonwebtoken');
const axios = require('axios');
const omdbKey = process.env.OMDB_API_KEY;
const tmdbKey = process.env.TMDB_API_KEY;

const router = express.Router();

// Ensure backdrop column exists (runs once per start; ignores if already exists)
db.query('ALTER TABLE media ADD COLUMN backdrop_url VARCHAR(255) NULL', (err) => {
  if (err && err.code !== 'ER_DUP_FIELDNAME') {
    console.error('Backdrop column check error:', err.message);
  }
});

// Multer config with basic validation (video + image)
const upload = multer({
  dest: 'uploads/',
  limits: { fileSize: 500 * 1024 * 1024 }, // 500MB cap
  fileFilter: (req, file, cb) => {
    const isVideo = file.fieldname === 'file' && file.mimetype.startsWith('video/');
    const isImage =
      (file.fieldname === 'thumbnail' || file.fieldname === 'backdrop') &&
      file.mimetype.startsWith('image/');
    if (isVideo || isImage) return cb(null, true);
    return cb(new Error('Invalid file type'));
  },
});

const deleteTemp = (path) => fs.promises.unlink(path).catch(() => {});

const buildHlsUrl = (secureUrl, explicitPublicId, explicitVersion) => {
  try {
    const cloud = process.env.CLOUDINARY_CLOUD_NAME;
    if (!cloud) return null;

    let publicId = explicitPublicId || null;
    let version = explicitVersion || null;

    if (secureUrl) {
      const match = secureUrl.match(/\/upload\/(?:v(\d+)\/)?([^\/]+?)(?:\.[^.\/]+)?$/);
      if (match) {
        version = version || match[1];
        publicId = publicId || match[2];
      }
    }

    if (!publicId) return null;

    const versionPart = version ? `v${version}/` : '';
    return `https://res.cloudinary.com/${cloud}/video/upload/sp_full_hd/${versionPart}${publicId}.m3u8`;
  } catch {
    return null;
  }
};

const fetchTmdbMetadata = async ({ title, type, year, season, episode, tmdbId }) => {
  const apiKey = process.env.TMDB_API_KEY;
  if (!apiKey || (!title && !tmdbId)) return null;
  const isMovie = type === 'movie';
  const searchEndpoint = isMovie ? 'movie' : 'tv';
  try {
    let hit = null;
    if (tmdbId) {
      const detail = await axios.get(`https://api.themoviedb.org/3/${searchEndpoint}/${tmdbId}`, {
        params: { api_key: apiKey },
      });
      hit = detail.data;
    } else {
      const search = await axios.get(`https://api.themoviedb.org/3/search/${searchEndpoint}`, {
        params: {
          api_key: apiKey,
          query: title,
          year: isMovie ? year : undefined,
          first_air_date_year: !isMovie ? year : undefined,
        },
      });
      hit = search.data?.results?.[0];
    }

    if (!hit) return null;

    let episodeInfo = null;
    if (!isMovie && season != null && episode != null) {
      try {
        const ep = await axios.get(
          `https://api.themoviedb.org/3/tv/${hit.id || hit.tv_id || tmdbId}/season/${season}/episode/${episode}`,
          { params: { api_key: apiKey } }
        );
        episodeInfo = ep.data;
      } catch {
        episodeInfo = null;
      }
    }

    return {
      tmdbId: hit.id || tmdbId,
      title: hit.title || hit.name,
      overview: episodeInfo?.overview || hit.overview,
      poster: hit.poster_path ? `https://image.tmdb.org/t/p/w780${hit.poster_path}` : null,
      backdrop: hit.backdrop_path ? `https://image.tmdb.org/t/p/w1280${hit.backdrop_path}` : null,
      releaseYear: (hit.release_date || hit.first_air_date || '').slice(0, 4) || year,
      episodeTitle: episodeInfo?.name,
      episodeOverview: episodeInfo?.overview,
    };
  } catch {
    return null;
  }
};

const fetchPosterFallback = async (title, type, year) => {
  if (!title) return null;
  // Try OMDb first (lighter)
  if (omdbKey) {
    try {
      const resp = await axios.get('https://www.omdbapi.com/', {
        params: { apikey: omdbKey, t: title, y: year, type: type === 'movie' ? 'movie' : 'series' },
      });
      if (resp.data?.Poster && resp.data.Poster !== 'N/A') return resp.data.Poster;
    } catch (e) {
      /* ignore */
    }
  }
  if (tmdbKey) {
    try {
      const endpoint = type === 'movie' ? 'movie' : 'tv';
      const search = await axios.get(`https://api.themoviedb.org/3/search/${endpoint}`, {
        params: {
          api_key: tmdbKey,
          query: title,
          year: type === 'movie' ? year : undefined,
          first_air_date_year: type !== 'movie' ? year : undefined,
        },
      });
      const hit = search.data?.results?.[0];
      if (hit?.poster_path) return `https://image.tmdb.org/t/p/w780${hit.poster_path}`;
    } catch (e) {
      /* ignore */
    }
  }
  return null;
};

const normalizeYear = (yearVal) => {
  if (!yearVal) return null;
  const match = String(yearVal).match(/\d{4}/);
  return match ? match[0] : null;
};

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
router.post(
  '/upload',
  authenticateUser,
  checkAdmin,
  upload.fields([{ name: 'file' }, { name: 'thumbnail' }, { name: 'backdrop' }]),
  async (req, res) => {
    try {
      const { type: reqType } = req.body;
      const isSeriesLike = reqType === 'series' || reqType === 'anime';

      // Metadata-only path for series/anime when no video provided
      if ((!req.files || !req.files.file) && isSeriesLike) {
        let { title, description, release_year, genre, tmdb_id, tmdb_type, poster_url, backdrop_url } = req.body;
        const uploadType = tmdb_type || reqType;
        const meta = await fetchTmdbMetadata({
          title,
          type: uploadType,
          year: release_year,
          tmdbId: tmdb_id,
        });
        if (meta) {
          title = title || meta.title;
          description = description || meta.overview;
          release_year = release_year || meta.releaseYear;
          if (!poster_url && meta.poster) poster_url = meta.poster;
          if (!backdrop_url && meta.backdrop) backdrop_url = meta.backdrop;
          if (!genre && meta.genre) genre = meta.genre;
        }
        release_year = normalizeYear(release_year);

        const sql = `
          INSERT INTO media (title, description, type, cloudinary_url, thumbnail_url, release_year, genre, backdrop_url)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `;
        const safePoster = poster_url || '';
        const values = [title, description, uploadType, safePoster, poster_url || null, release_year, genre, backdrop_url || poster_url || null];
        db.query(sql, values, (err, result) => {
          if (err) {
            console.error('❌ Error inserting metadata media:', err);
            return res.status(500).json({ error: 'Database error' });
          }
          return res.json({
            message: 'Metadata created successfully!',
            media_id: result.insertId,
            poster: poster_url || null,
            thumbnail_url: poster_url || null,
            backdrop_url: backdrop_url || poster_url || null,
            hls_url: null,
          });
        });
        return;
      }

      if (!req.files || !req.files.file) {
        return res.status(400).json({ error: 'No video file uploaded' });
      }

      const videoPath = req.files.file[0].path;
      const videoResult = await cloudinary.uploader.upload(videoPath, {
        resource_type: 'video',
        eager: [{ streaming_profile: 'full_hd', format: 'm3u8' }],
        eager_async: false, // wait so playback_url is available immediately
      });
      deleteTemp(videoPath);

      let thumbnail_url = null;
      let backdrop_url_uploaded = null;

      // ✅ Upload custom thumbnail if provided
      if (req.files.thumbnail) {
        const thumbPath = req.files.thumbnail[0].path;
        const thumbnailResult = await cloudinary.uploader.upload(thumbPath, {
          resource_type: 'image',
        });
        thumbnail_url = thumbnailResult.secure_url;
        deleteTemp(thumbPath);
      }

      // ✅ Upload custom backdrop if provided
      if (req.files.backdrop) {
        const bdPath = req.files.backdrop[0].path;
        const bdResult = await cloudinary.uploader.upload(bdPath, {
          resource_type: 'image',
        });
        backdrop_url_uploaded = bdResult.secure_url;
        deleteTemp(bdPath);
      }

      // ✅ Extract metadata from request body
      let { title, description, type: bodyType, release_year, genre, tmdb_id, tmdb_type, poster_url, backdrop_url } = req.body;
      const uploadType = tmdb_type || bodyType || reqType;

      // Try TMDb lookup if description/genre/year missing or no custom thumbnail
      if (!description || !genre || !release_year || (!thumbnail_url && poster_url) || tmdb_id) {
        const meta = await fetchTmdbMetadata({
          title,
          type: uploadType,
          year: release_year,
          tmdbId: tmdb_id,
        });
        if (meta) {
          title = title || meta.title;
          description = description || meta.overview;
          release_year = release_year || meta.releaseYear;
          if (!thumbnail_url && (poster_url || meta.poster)) thumbnail_url = poster_url || meta.poster;
          if (!backdrop_url && meta.backdrop) backdrop_url = meta.backdrop;
          if (!genre && meta.genre) genre = meta.genre;
        }
      }
      release_year = normalizeYear(release_year);

      // ✅ Save Video & Thumbnail Data in MySQL
      const sql = `
        INSERT INTO media (title, description, type, cloudinary_url, thumbnail_url, release_year, genre, backdrop_url) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `;
      const values = [
        title,
        description,
        uploadType,
        videoResult.secure_url,
        thumbnail_url,
        release_year,
        genre,
        backdrop_url_uploaded || backdrop_url || poster_url || null,
      ];

      const eagerHls = (videoResult.eager || []).find((e) => e.format === 'm3u8')?.secure_url;
      const hlsUrl =
        eagerHls ||
        videoResult.playback_url ||
        buildHlsUrl(videoResult.secure_url, videoResult.public_id, videoResult.version);

      db.query(sql, values, (err, result) => {
        if (err) {
          console.error('❌ Error inserting into MySQL:', err);
          return res.status(500).json({ error: 'Database error' });
        }
        res.json({
          message: 'Video uploaded successfully!',
          media_id: result.insertId,
          video_url: videoResult.secure_url,
          hls_url: hlsUrl,
          thumbnail_url: thumbnail_url,
          poster: thumbnail_url,
          backdrop_url: backdrop_url_uploaded || backdrop_url || thumbnail_url,
        });
      });

    } catch (error) {
      console.error('❌ Upload error:', error);
      res.status(500).json({ error: 'Upload failed: ' + error.message });
    }
  }
);

// ✅ Upload Backdrop/Hero image for an existing media (Admin)
router.post('/backdrop/:id', authenticateUser, checkAdmin, upload.single('backdrop'), async (req, res) => {
  const mediaId = req.params.id;
  if (!req.file) return res.status(400).json({ error: 'No image uploaded' });
  try {
    const imageUrl = await uploadToCloudinary(req.file.path, 'image');
    const sql = 'UPDATE media SET backdrop_url = ? WHERE id = ?';
    db.query(sql, [imageUrl, mediaId], (err) => {
      if (err) {
        console.error('❌ Error saving backdrop:', err);
        return res.status(500).json({ error: 'Failed to save backdrop' });
      }
      res.json({ backdrop_url: imageUrl });
    });
  } catch (e) {
    console.error('❌ Backdrop upload error:', e);
    res.status(500).json({ error: 'Failed to upload backdrop' });
  }
});

// ✅ Add Episode (Admin Only)
router.post('/upload-episode', authenticateUser, checkAdmin, upload.fields([{ name: 'file' }, { name: 'thumbnail' }]), async (req, res) => {
  try {
    if (!req.files || !req.files.file) return res.status(400).json({ error: 'No episode file uploaded' });

    const episodePath = req.files.file[0].path;
    const videoResult = await cloudinary.uploader.upload(episodePath, {
      resource_type: 'video',
      eager: [{ streaming_profile: 'full_hd', format: 'm3u8' }],
      eager_async: false,
    });
    deleteTemp(episodePath);

    let thumbnail_url = null;
    if (req.files.thumbnail) {
      const thumbPath = req.files.thumbnail[0].path;
      const thumbnailResult = await cloudinary.uploader.upload(thumbPath, {
        resource_type: 'image',
      });
      thumbnail_url = thumbnailResult.secure_url;
      deleteTemp(thumbPath);
    }

    let { media_id, season, episode, title, description, tmdb_tv_id } = req.body;

    // Auto-fill from TMDb if description/title missing
    if (!description || !title || tmdb_tv_id) {
      const meta = await fetchTmdbMetadata({
        title,
        type: 'series',
        year: null,
        season,
        episode,
        tmdbId: tmdb_tv_id,
      });
      if (meta) {
        title = title || meta.episodeTitle || meta.title;
        description = description || meta.episodeOverview || meta.overview;
      }
    }

    const sql = `
      INSERT INTO episodes (media_id, season, episode, title, description, cloudinary_url, thumbnail_url) 
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `;
    const values = [media_id, season, episode, title, description, videoResult.secure_url, thumbnail_url];

    const eagerHls = (videoResult.eager || []).find((e) => e.format === 'm3u8')?.secure_url;
    const hlsUrl =
      eagerHls ||
      videoResult.playback_url ||
      buildHlsUrl(videoResult.secure_url, videoResult.public_id, videoResult.version);

    db.query(sql, values, (err, result) => {
      if (err) return res.status(500).json({ error: 'Database error' });
      res.json({
        message: 'Episode uploaded successfully!',
        episode_id: result.insertId,
        video_url: videoResult.secure_url,
        hls_url: hlsUrl,
        poster: thumbnail_url,
      });
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
router.get('/watchlist', authenticateUser, async (req, res) => {
  const sql = `SELECT media.* FROM media JOIN watchlist ON media.id = watchlist.media_id WHERE watchlist.user_id = ?`;
  db.query(sql, [req.user.userId], async (err, results) => {
    if (err) return res.status(500).json({ error: 'Database error' });
    const enriched = await Promise.all(
      results.map(async (item) => {
        let poster = item.thumbnail_url;
        if (!poster) {
          poster = await fetchPosterFallback(item.title, item.type, item.release_year);
        }
        return {
          ...item,
          hls_url: item.cloudinary_url ? buildHlsUrl(item.cloudinary_url, null, item.version) : null,
          poster,
        };
      })
    );
    res.json(enriched);
  });
});

// ✅ Get episodes for a given media_id
router.get('/episodes', (req, res) => {
  const { media_id } = req.query;
  if (!media_id) return res.status(400).json({ error: 'media_id is required' });

  // Order by season then id to avoid missing column issues across schemas
  const sql = `SELECT * FROM episodes WHERE media_id = ? ORDER BY season ASC, id ASC`;
  db.query(sql, [media_id], (err, results) => {
    if (err) {
      console.error('❌ Error fetching episodes:', err);
      return res.status(500).json({ error: 'Failed to fetch episodes' });
    }
    const enriched = results.map((row) => ({
      ...row,
      hls_url: row.cloudinary_url
        ? buildHlsUrl(row.cloudinary_url, null, row.version)
        : null,
    }));
    res.status(200).json(enriched);
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
router.get('/', async (req, res) => {
  const { type, page = 1, limit = 20, q } = req.query; // type filter + optional search
  const safePage = Math.max(1, parseInt(page, 10) || 1);
  const safeLimit = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));

  let sql = 'SELECT * FROM media';
  const conditions = [];
  const values = [];

  if (type && (type === 'movie' || type === 'series' || type === 'anime')) {
    conditions.push('type = ?');
    values.push(type);
  }

  if (q && q.trim()) {
    const like = `%${q.trim()}%`;
    conditions.push('(title LIKE ? OR description LIKE ? OR genre LIKE ?)');
    values.push(like, like, like);
  }

  if (conditions.length) {
    sql += ' WHERE ' + conditions.join(' AND ');
  }

  sql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
  values.push(safeLimit, (safePage - 1) * safeLimit);

  db.query(sql, values, async (err, results) => {
    if (err) {
      console.error('❌ Error fetching media:', err);
      return res.status(500).json({ error: 'Failed to fetch media' });
    }
    const enriched = await Promise.all(
      results.map(async (item) => {
        let poster = item.thumbnail_url;
        if (!poster) {
          poster = await fetchPosterFallback(item.title, item.type, item.release_year);
        }
        return {
          ...item,
          hls_url: item.cloudinary_url ? buildHlsUrl(item.cloudinary_url, null, item.version) : null,
          poster,
        };
      })
    );
    res.status(200).json(enriched);
  });
});



module.exports = router;

