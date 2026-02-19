import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import VideoPlayer from '../components/VideoPlayer';
import MediaModal from '../components/MediaModal';
import RowSection from '../components/RowSection';
import HeroSpotlight from '../components/HeroSpotlight';
import api from '../api';
import './Movies.css';

const Movies = () => {
  const navigate = useNavigate();

  // ✅ State variables
  const [isAdmin, setIsAdmin] = useState(false);
 // const [videoUrl, setVideoUrl] = useState('');
  const [media, setMedia] = useState([]);
  const [currentMovie, setCurrentMovie] = useState(null);
  const [selected, setSelected] = useState(null);
  const [continueList, setContinueList] = useState([]);
  // ✅ Form fields for uploading videos
  const [videoFile, setVideoFile] = useState(null);
  const [thumbnailFile, setThumbnailFile] = useState(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState('movie');
  const [releaseYear, setReleaseYear] = useState('');
  const [genre, setGenre] = useState('');
  const [season, setSeason] = useState('');
  const [episode, setEpisode] = useState('');
  const [metaResults, setMetaResults] = useState([]);
  const [selectedMeta, setSelectedMeta] = useState(null);
  const [posterUrl, setPosterUrl] = useState('');
  const [seriesOptions, setSeriesOptions] = useState([]);
  const [episodeVideoFile, setEpisodeVideoFile] = useState(null);
  const [episodeThumbFile, setEpisodeThumbFile] = useState(null);
  const [episodeTitle, setEpisodeTitle] = useState('');
  const [episodeDescription, setEpisodeDescription] = useState('');
  const [episodeMediaId, setEpisodeMediaId] = useState('');
  const [episodeSeason, setEpisodeSeason] = useState('');
  const [episodeNumber, setEpisodeNumber] = useState('');
  const [seasonsCount, setSeasonsCount] = useState(null);
  const [seasonEpisodes, setSeasonEpisodes] = useState([]);
  const [backdropUrl, setBackdropUrl] = useState('');
  const [backdropFile, setBackdropFile] = useState(null);

  // ✅ Check if user is admin and fetch media data
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/login');
      return;
    }

    api.get('/users/me')
      .then((response) => setIsAdmin(response.data.isAdmin))
      .catch(() => setIsAdmin(false));

    api.get('/media', { params: { type: 'movie' } })
      .then((response) => setMedia(response.data))
      .catch((error) => console.error('Error fetching movies:', error));

    api.get('/media', { params: { type: 'series', limit: 100 } })
      .then((response) => setSeriesOptions(response.data || []))
      .catch(() => setSeriesOptions([]));

    const loadCW = () => {
      try {
        const list = JSON.parse(localStorage.getItem('cw_entries')) || [];
        setContinueList(list.filter((i) => i.type === 'movie'));
      } catch {
        setContinueList([]);
      }
    };
    loadCW();
    const handler = () => loadCW();
    window.addEventListener('cw-updated', handler);
    return () => window.removeEventListener('cw-updated', handler);
  }, [navigate]);

  // ✅ Handle file selection
  const handleVideoChange = (event) => setVideoFile(event.target.files[0]);
  const handleThumbnailChange = (event) => setThumbnailFile(event.target.files[0]);
  const handleBackdropChange = (event) => setBackdropFile(event.target.files[0]);

  // ✅ Handle video upload (Admin only)
  const handleUpload = async () => {
    if (!isAdmin) {
      alert('You are not authorized to upload videos.');
      return;
    }

    const isSeriesLike = type === 'series' || type === 'anime';

    if (!title) {
      alert('Please provide a title.');
      return;
    }
    if (!isSeriesLike && !videoFile) {
      alert('Please select a video file.');
      return;
    }

    const formData = new FormData();
    if (videoFile) formData.append('file', videoFile);
    if (thumbnailFile) formData.append('thumbnail', thumbnailFile);
    formData.append('title', title);
    formData.append('description', description);
    formData.append('type', type);
    formData.append('release_year', releaseYear);
    formData.append('genre', genre);
    if (selectedMeta) {
      formData.append('tmdb_id', selectedMeta.id);
      formData.append('tmdb_type', type);
    }
    if (posterUrl) {
      formData.append('poster_url', posterUrl);
    }
    if (backdropUrl) {
      formData.append('backdrop_url', backdropUrl);
    }
    if (backdropFile) {
      formData.append('backdrop', backdropFile);
    }

    // ✅ Add season & episode for series & anime
    if (type === 'series' || type === 'anime') {
      formData.append('season', season);
      formData.append('episode', episode);
    }

    try {
      const response = await api.post('/media/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      if (response.status === 200) {
        alert('Video and Thumbnail uploaded successfully!');
        setMedia([...media, response.data]);
        setVideoFile(null);
        setThumbnailFile(null);
        setTitle('');
        setDescription('');
        setReleaseYear('');
        setGenre('');
        setSeason('');
        setEpisode('');
        setMetaResults([]);
        setSelectedMeta(null);
        setPosterUrl('');
      } else {
        alert('Upload failed');
      }
    } catch (error) {
      alert('Upload failed: ' + (error.response ? error.response.data.error : error.message));
    }
  };

  // ✅ Handle video deletion (Admin only)
  const handleDelete = async (id) => {
    if (!isAdmin) {
      alert('You are not authorized to delete videos.');
      return;
    }

    if (!window.confirm('Are you sure you want to delete this video?')) return;

    try {
      await api.delete(`/media/delete/${id}`);

      setMedia(media.filter((item) => item.id !== id));
      alert('Video deleted successfully!');
    } catch (error) {
      alert('Error deleting video: ' + (error.response ? error.response.data.error : error.message));
    }
  };

  // ✅ Handle adding to watchlist
  const handleAddToWatchlist = async (mediaId) => {
    try {
      await api.post('/media/watchlist/add', { media_id: mediaId });
      alert('Added to watchlist!');
    } catch (error) {
      alert('Failed to add to watchlist.');
    }
  };

  const fetchMetadata = async () => {
    if (!title) {
      alert('Enter a title first.');
      return;
    }
    try {
      const effectiveType = type === 'anime' || type === 'series' ? 'tv' : 'movie';
      const res = await api.get('/tmdb/search', {
        params: { type: effectiveType, query: title, year: releaseYear },
      });
      setMetaResults(res.data || []);
      if ((res.data || []).length === 1) {
        applyMetadata(res.data[0]);
      }
    } catch {
      alert('Metadata lookup failed.');
    }
  };

  const applyMetadata = async (meta) => {
    setSelectedMeta(meta);
    setTitle(meta.title || title);
    setDescription(meta.overview || description);
    setReleaseYear(meta.year || releaseYear);
    setPosterUrl(meta.backdrop || meta.poster || '');
    setBackdropUrl(meta.backdrop || meta.poster || '');
    try {
      const effectiveType = type === 'anime' || type === 'series' ? 'tv' : type;
      const detail = await api.get('/tmdb/details', {
        params: { id: meta.id, type: meta.type || effectiveType },
      });
      const d = detail.data;
      if (d) {
        setGenre(d.genres || genre);
        if (d.poster) setPosterUrl(d.poster);
        if (d.backdrop) setBackdropUrl(d.backdrop);
        if (!description) setDescription(d.overview || description);
        if (d.number_of_seasons || d.seasons) {
          setSeasonsCount(d.number_of_seasons || d.seasons);
        } else if (meta.totalSeasons) {
          setSeasonsCount(meta.totalSeasons);
        }
      }
    } catch {
      /* ignore */
    }
  };

  const handleEpisodeUpload = async () => {
    if (!isAdmin) {
      alert('You are not authorized.');
      return;
    }
    if (!episodeMediaId || !episodeVideoFile) {
      alert('Select series and episode video.');
      return;
    }
    const formData = new FormData();
    formData.append('file', episodeVideoFile);
    if (episodeThumbFile) formData.append('thumbnail', episodeThumbFile);
    formData.append('media_id', episodeMediaId);
    formData.append('season', episodeSeason);
    formData.append('episode', episodeNumber);
    formData.append('title', episodeTitle);
    formData.append('description', episodeDescription);
    if (selectedMeta) formData.append('tmdb_tv_id', selectedMeta.id);

    try {
      const res = await api.post('/media/upload-episode', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      if (res.status === 200) {
        alert('Episode uploaded!');
        setEpisodeVideoFile(null);
        setEpisodeThumbFile(null);
        setEpisodeTitle('');
        setEpisodeDescription('');
        setEpisodeSeason('');
        setEpisodeNumber('');
      }
    } catch (error) {
      alert('Episode upload failed: ' + (error.response?.data?.error || error.message));
    }
  };

  const fetchSeasonList = () => {
    if (!seasonsCount || seasonsCount < 1) return [];
    return Array.from({ length: seasonsCount }, (_, i) => i + 1);
  };

  const fetchEpisodesForSeason = async (seasonVal) => {
    if (!selectedMeta) return;
    try {
      const res = await api.get('/tmdb/season', {
        params: { tv_id: selectedMeta.id, season: seasonVal },
      });
      setSeasonEpisodes(res.data || []);
    } catch {
      setSeasonEpisodes([]);
    }
  };

  return (
    <div className="movies-container">
      <h1>Movies</h1>

      {/* ✅ Video Player */}
      {currentMovie && (
        <VideoPlayer
          url={currentMovie.hls_url || currentMovie.cloudinary_url}
          mediaItem={currentMovie}
          onClose={() => setCurrentMovie(null)}
        />
      )}
      {selected && (
        <MediaModal
          item={selected}
          onClose={() => setSelected(null)}
          onPlay={(itm) => {
            setCurrentMovie(itm);
            setSelected(null);
          }}
          onWatchlist={handleAddToWatchlist}
          onDelete={handleDelete}
          isAdmin={isAdmin}
        />
      )}
      {/* ✅ Upload Section (Admin only) */}
      {isAdmin && (
        <div className="upload-section">
          <h2>Upload Video</h2>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
            <button className="btn" type="button" onClick={fetchMetadata}>Fetch metadata (movie / series / anime)</button>
            {selectedMeta && (
              <span className="pill">Chosen: {selectedMeta.title}{selectedMeta.year ? ` (${selectedMeta.year})` : ''}</span>
            )}
          </div>
          {metaResults.length > 0 && (
            <div style={{ display: 'grid', gap: '10px', margin: '10px 0', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
              {metaResults.map((m) => (
                <div key={m.id} className="glass-card" style={{ padding: '10px', cursor: 'pointer' }} onClick={() => applyMetadata(m)}>
                  {m.poster && <img src={m.poster} alt={m.title} style={{ width: '100%', borderRadius: '10px', marginBottom: '8px' }} />}
                  <div style={{ fontWeight: 700 }}>{m.title} {m.year ? `(${m.year})` : ''}</div>
                  <div style={{ fontSize: '0.9rem', color: 'var(--muted)' }}>{(m.overview || '').slice(0, 140)}{(m.overview || '').length > 140 ? '…' : ''}</div>
                </div>
              ))}
            </div>
          )}
          {type === 'movie' && <input type="file" accept="video/*" onChange={handleVideoChange} />}
          {!posterUrl && (
            <input type="file" accept="image/*" onChange={handleThumbnailChange} />
          )}
          {posterUrl && (
            <div className="glass-card" style={{ padding: '10px', display: 'flex', gap: '10px', alignItems: 'center' }}>
              <img src={posterUrl} alt="Poster preview" style={{ width: 90, borderRadius: 8 }} />
              <div>
                <div style={{ fontWeight: 700 }}>Poster fetched</div>
                <div className="subdued" style={{ fontSize: '0.9rem' }}>Will be used as thumbnail unless you upload your own.</div>
                <button className="btn" type="button" onClick={() => setPosterUrl('')}>Clear poster</button>
              </div>
            </div>
          )}
          {posterUrl && (
            <div className="glass-card" style={{ padding: '10px', display: 'flex', gap: '10px', alignItems: 'center' }}>
              <img src={posterUrl} alt="Poster preview" style={{ width: 90, borderRadius: 8 }} />
              <div>
                <div style={{ fontWeight: 700 }}>Using fetched poster</div>
                <div className="subdued" style={{ fontSize: '0.9rem' }}>This will be saved as thumbnail unless you upload your own.</div>
                <button className="btn" type="button" onClick={() => setPosterUrl('')}>Clear poster</button>
              </div>
            </div>
          )}
          <input type="file" accept="image/*" onChange={handleBackdropChange} />
          {backdropUrl && (
            <div className="glass-card" style={{ padding: '10px', display: 'flex', gap: '10px', alignItems: 'center' }}>
              <img src={backdropUrl} alt="Hero preview" style={{ width: 140, borderRadius: 8, aspectRatio: '16/9', objectFit: 'cover' }} />
              <div>
                <div style={{ fontWeight: 700 }}>Hero/Backdrop</div>
                <div className="subdued" style={{ fontSize: '0.9rem' }}>Used for the top hero slider (wide image).</div>
                <button className="btn" type="button" onClick={() => setBackdropUrl('')}>Clear hero</button>
              </div>
            </div>
          )}
          <input type="text" placeholder="Title" value={title} onChange={(e) => setTitle(e.target.value)} />
          <select value={type} onChange={(e) => setType(e.target.value)}>
            <option value="movie">Movie</option>
            <option value="series">Series</option>
            <option value="anime">Anime</option>
          </select>

          {posterUrl && (
            <div className="glass-card" style={{ padding: '10px', display: 'flex', gap: '10px', alignItems: 'center' }}>
              <img src={posterUrl} alt="Poster preview" style={{ width: 90, borderRadius: 8 }} />
              <div>
                <div style={{ fontWeight: 700 }}>Poster fetched</div>
                <div className="subdued" style={{ fontSize: '0.9rem' }}>Will be used as thumbnail unless you upload your own.</div>
                <button className="btn" type="button" onClick={() => setPosterUrl('')}>Clear poster</button>
              </div>
            </div>
          )}

          {(description || releaseYear || genre) && (
            <div className="glass-card" style={{ padding: '12px' }}>
              <div style={{ fontWeight: 700, marginBottom: 6 }}>Fetched details</div>
              {releaseYear && <div className="pill">Year: {releaseYear}</div>}
              {genre && <div className="pill">Genre: {genre}</div>}
              {description && <div className="subdued" style={{ marginTop: 6 }}>{description}</div>}
            </div>
          )}

          {(type === 'series' || type === 'anime') && (
            <div className="season-episode-fields" style={{ display: 'grid', gap: 8 }}>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                <select
                  value={season}
                  onChange={(e) => {
                    setSeason(e.target.value);
                    setEpisode('');
                    setEpisodeTitle('');
                    setEpisodeDescription('');
                    if (e.target.value) fetchEpisodesForSeason(Number(e.target.value));
                  }}
                >
                  <option value="">Select season</option>
                  {fetchSeasonList().map((s) => (
                    <option key={`sel-s-${s}`} value={s}>Season {s}</option>
                  ))}
                  {!fetchSeasonList().length && <option value="">(Choose show first)</option>}
                </select>
                <select
                  value={episode}
                  onChange={(e) => {
                    setEpisode(e.target.value);
                    const ep = seasonEpisodes.find((x) => String(x.episode) === e.target.value);
                    if (ep) {
                      setEpisodeTitle(ep.title || '');
                      setEpisodeDescription(ep.overview || '');
                      if (ep.still && !episodeThumbFile) setPosterUrl(ep.still);
                    }
                  }}
                  disabled={!seasonEpisodes.length}
                >
                  <option value="">Select episode</option>
                  {seasonEpisodes.map((ep) => (
                    <option key={ep.id} value={ep.episode}>
                      E{ep.episode} - {ep.title || 'Episode'}
                    </option>
                  ))}
                </select>
                {selectedMeta && season && episode && (
                  <button
                    className="btn"
                    type="button"
                    onClick={async () => {
                      try {
                        const res = await api.get('/tmdb/episode', {
                          params: { tv_id: selectedMeta.id, season, episode },
                        });
                        const ep = res.data;
                        if (ep) {
                          setEpisodeTitle(ep.title || episodeTitle);
                          setEpisodeDescription(ep.overview || episodeDescription);
                          if (ep.still && !episodeThumbFile && !posterUrl) setPosterUrl(ep.still);
                        }
                      } catch {
                        alert('Episode metadata lookup failed.');
                      }
                    }}
                  >
                    Fetch episode details
                  </button>
                )}
              </div>
            </div>
          )}

          {(videoFile || type === 'series' || type === 'anime') && (
            <button className="upload-button" onClick={handleUpload}>
              {type === 'movie' ? 'Upload Video' : 'Create series/anime entry'}
            </button>
          )}
        </div>
      )}

      {/* ✅ Episode Upload (Admin only) */}
      {isAdmin && (
        <div className="upload-section">
          <h2>Upload Episode (Series/Anime)</h2>
          <div style={{ display: 'grid', gap: '10px' }}>
            <select
              value={episodeMediaId}
              onChange={(e) => setEpisodeMediaId(e.target.value)}
            >
              <option value="">Select Series</option>
              {seriesOptions.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.title} ({s.release_year || 'YR'})
                </option>
              ))}
            </select>
            <input type="file" accept="video/*" onChange={(e) => setEpisodeVideoFile(e.target.files[0])} />
            <input type="file" accept="image/*" onChange={(e) => setEpisodeThumbFile(e.target.files[0])} />
            <div className="season-episode-fields">
              <input type="number" placeholder="Season" value={episodeSeason} onChange={(e) => setEpisodeSeason(e.target.value)} />
              <input type="number" placeholder="Episode" value={episodeNumber} onChange={(e) => setEpisodeNumber(e.target.value)} />
              {selectedMeta && episodeSeason && episodeNumber && (
                <button
                  className="btn"
                  type="button"
                  onClick={async () => {
                    try {
                      const res = await api.get('/tmdb/episode', {
                        params: { tv_id: selectedMeta.id, season: episodeSeason, episode: episodeNumber },
                      });
                      const ep = res.data;
                      if (ep) {
                        setEpisodeTitle(ep.title || episodeTitle);
                        setEpisodeDescription(ep.overview || episodeDescription);
                        if (ep.still && !episodeThumbFile) setPosterUrl(ep.still);
                      }
                    } catch {
                      alert('Episode metadata lookup failed.');
                    }
                  }}
                >
                  Fetch episode details
                </button>
              )}
            </div>
            <input type="text" placeholder="Episode title" value={episodeTitle} onChange={(e) => setEpisodeTitle(e.target.value)} />
            <textarea placeholder="Episode description" value={episodeDescription} onChange={(e) => setEpisodeDescription(e.target.value)} />
            {episodeVideoFile && (
              <button className="upload-button" onClick={handleEpisodeUpload}>Upload Episode</button>
            )}
          </div>
        </div>
      )}

      <HeroSpotlight
        items={media}
        onPlay={(itm) => setCurrentMovie(itm)}
        onMore={(itm) => setSelected(itm)}
      />

      <RowSection
        title="Continue watching"
        items={continueList.slice(0, 12)}
        onCardClick={(itm) => setSelected(itm)}
      />
      <RowSection
        title="Trending movies"
        items={media.slice(0, 12)}
        onCardClick={(itm) => setSelected(itm)}
      />
      <RowSection
        title="Action"
        items={media.filter((m) => (m.genre || '').toLowerCase().includes('action')).slice(0, 12)}
        onCardClick={(itm) => setSelected(itm)}
      />
      <RowSection
        title="Drama & Romance"
        items={media.filter((m) => (m.genre || '').toLowerCase().match(/drama|romance/)).slice(0, 12)}
        onCardClick={(itm) => setSelected(itm)}
      />
      <RowSection
        title="Sci‑Fi & Fantasy"
        items={media.filter((m) => (m.genre || '').toLowerCase().match(/sci|fantasy/)).slice(0, 12)}
        onCardClick={(itm) => setSelected(itm)}
      />
    </div>
  );
};

export default Movies;
