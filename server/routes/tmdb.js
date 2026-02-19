const express = require('express');
const axios = require('axios');
require('dotenv').config();

const router = express.Router();

const TMDB_IMAGE = (path) => (path ? `https://image.tmdb.org/t/p/w780${path}` : null);
const OMDB_BASE = 'https://www.omdbapi.com/';

const normalizeOmdb = (o, type) => ({
  id: o.imdbID,
  title: o.Title,
  year: o.Year,
  overview: o.Plot,
  poster: o.Poster && o.Poster !== 'N/A' ? o.Poster : null,
  genres: o.Genre,
  type,
  source: 'omdb',
});

router.get('/search', async (req, res) => {
  const { type = 'movie', query, year } = req.query;
  if (!query) return res.status(400).json({ error: 'query is required' });

  const tmdbKey = process.env.TMDB_API_KEY;
  const omdbKey = process.env.OMDB_API_KEY;
  const isMovie = type === 'movie';
  const endpoint = isMovie ? 'movie' : 'tv';

  // Try TMDb first if available
  if (tmdbKey) {
    try {
      const resp = await axios.get(`https://api.themoviedb.org/3/search/${endpoint}`, {
        params: {
          api_key: tmdbKey,
          query,
          year: isMovie ? year : undefined,
          first_air_date_year: !isMovie ? year : undefined,
        },
      });
      const results = (resp.data?.results || []).map((r) => ({
        id: r.id,
        title: r.title || r.name,
        year: (r.release_date || r.first_air_date || '').slice(0, 4),
        overview: r.overview,
        poster: TMDB_IMAGE(r.poster_path),
      }));
      return res.json(results);
    } catch (err) {
      // fall through to OMDb
    }
  }

  // Fallback: OMDb
  if (omdbKey) {
    try {
      const resp = await axios.get(OMDB_BASE, {
        params: {
          apikey: omdbKey,
          s: query,
          type: isMovie ? 'movie' : 'series',
          y: year,
        },
      });
      if (resp.data?.Response === 'False') {
        return res.json([]);
      }
      const results = await Promise.all(
        (resp.data?.Search || []).map(async (r) => {
          // fetch full plot for better description
          try {
            const full = await axios.get(OMDB_BASE, {
              params: { apikey: omdbKey, i: r.imdbID, plot: 'full' },
            });
            return normalizeOmdb(full.data, type);
          } catch {
            return normalizeOmdb(
              {
                imdbID: r.imdbID,
                Title: r.Title,
                Year: r.Year,
                Plot: '',
                Poster: r.Poster,
                Genre: '',
              },
              type
            );
          }
        })
      );
      return res.json(results);
    } catch (err) {
      return res.status(500).json({ error: 'Search failed (TMDb/OMDb)', details: err.message });
    }
  }

  return res.status(500).json({ error: 'No metadata provider configured (TMDB_API_KEY or OMDB_API_KEY)' });
});

router.get('/details', async (req, res) => {
  const { id, type = 'movie' } = req.query;
  const tmdbKey = process.env.TMDB_API_KEY;
  const omdbKey = process.env.OMDB_API_KEY;
  if (!id) return res.status(400).json({ error: 'id is required' });

  const endpoint = type === 'movie' ? 'movie' : 'tv';
  if (tmdbKey) {
    try {
      const resp = await axios.get(`https://api.themoviedb.org/3/${endpoint}/${id}`, {
        params: { api_key: tmdbKey },
      });
      const r = resp.data;
      return res.json({
        id: r.id,
        title: r.title || r.name,
        year: (r.release_date || r.first_air_date || '').slice(0, 4),
        overview: r.overview,
        poster: TMDB_IMAGE(r.poster_path),
        genres: (r.genres || []).map((g) => g.name).join(', '),
      });
    } catch (err) {
      // fall through to OMDb
    }
  }

  if (omdbKey) {
    try {
      const resp = await axios.get(OMDB_BASE, {
        params: {
          apikey: omdbKey,
          i: id,
          plot: 'full',
        },
      });
      if (resp.data?.Response === 'False') return res.status(404).json({ error: 'Not found' });
      return res.json(normalizeOmdb(resp.data, type));
    } catch (err) {
      return res.status(500).json({ error: 'Details failed (TMDb/OMDb)', details: err.message });
    }
  }

  return res.status(500).json({ error: 'No metadata provider configured (TMDB_API_KEY or OMDB_API_KEY)' });
});

router.get('/episode', async (req, res) => {
  const { tv_id, season, episode } = req.query;
  const tmdbKey = process.env.TMDB_API_KEY;
  const omdbKey = process.env.OMDB_API_KEY;
  if (!tv_id || season == null || episode == null) {
    return res.status(400).json({ error: 'tv_id, season, episode are required' });
  }

  if (tmdbKey) {
    try {
      const resp = await axios.get(
        `https://api.themoviedb.org/3/tv/${tv_id}/season/${season}/episode/${episode}`,
        { params: { api_key: tmdbKey } }
      );
      const r = resp.data;
      return res.json({
        id: r.id,
        title: r.name,
        overview: r.overview,
        still: TMDB_IMAGE(r.still_path),
        season,
        episode,
      });
    } catch (err) {
      // fall through to OMDb
    }
  }

  if (omdbKey) {
    try {
      const resp = await axios.get(OMDB_BASE, {
        params: {
          apikey: omdbKey,
          i: tv_id,
          Season: season,
          Episode: episode,
        },
      });
      if (resp.data?.Response === 'False') return res.status(404).json({ error: 'Episode not found' });
      return res.json({
        id: resp.data.imdbID,
        title: resp.data.Title,
        overview: resp.data.Plot,
        still: resp.data.Poster && resp.data.Poster !== 'N/A' ? resp.data.Poster : null,
        season,
        episode,
      });
    } catch (err) {
      return res.status(500).json({ error: 'Episode lookup failed (TMDb/OMDb)', details: err.message });
    }
  }

  return res.status(500).json({ error: 'No metadata provider configured (TMDB_API_KEY or OMDB_API_KEY)' });
});

router.get('/season', async (req, res) => {
  const { tv_id, season } = req.query;
  const tmdbKey = process.env.TMDB_API_KEY;
  if (!tmdbKey) return res.status(500).json({ error: 'TMDB_API_KEY missing' });
  if (!tv_id || season == null) {
    return res.status(400).json({ error: 'tv_id and season are required' });
  }

  try {
    const resp = await axios.get(
      `https://api.themoviedb.org/3/tv/${tv_id}/season/${season}`,
      { params: { api_key: tmdbKey } }
    );
    const eps = (resp.data?.episodes || []).map((e) => ({
      id: e.id,
      episode: e.episode_number,
      season: e.season_number,
      title: e.name,
      overview: e.overview,
      still: TMDB_IMAGE(e.still_path),
    }));
    return res.json(eps);
  } catch (err) {
    return res.status(500).json({ error: 'Season fetch failed', details: err.message });
  }
});

module.exports = router;
