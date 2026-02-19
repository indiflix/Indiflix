import React, { useEffect, useMemo, useState } from 'react';
import api from '../api';
import './MediaModal.css';

const MediaModal = ({
  item,
  onClose,
  onPlay,
  onWatchlist,
  onDelete,
  isAdmin = false,
}) => {
  const [episodes, setEpisodes] = useState([]);
  const [season, setSeason] = useState(null);
  const [heroFile, setHeroFile] = useState(null);
  const [heroUploading, setHeroUploading] = useState(false);

  const isSeries = item?.type === 'series' || item?.type === 'anime';

  useEffect(() => {
    if (isSeries && item?.id) {
      api
        .get('/media/episodes', { params: { media_id: item.id } })
        .then((res) => setEpisodes(res.data || []))
        .catch(() => setEpisodes([]));
    }
  }, [isSeries, item?.id]);

  useEffect(() => {
    if (episodes.length) {
      const seasons = [...new Set(episodes.map((e) => e.season))];
      setSeason(seasons[0]);
    }
  }, [episodes]);

  const episodesForSeason = useMemo(
    () => episodes.filter((e) => (season == null ? true : e.season === season)),
    [episodes, season]
  );

  if (!item) return null;

  const posterSrc =
    item.thumbnail_url ||
    item.poster ||
    item.poster_url ||
    item.backdrop_url ||
    (item.cloudinary_url && item.cloudinary_url.replace(/\.mp4($|\?)/, '.jpg')) ||
    null;

  const handleHeroUpload = async () => {
    if (!heroFile || !item?.id) return;
    try {
      setHeroUploading(true);
      const fd = new FormData();
      fd.append('backdrop', heroFile);
      const res = await api.post(`/media/backdrop/${item.id}`, fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      if (res.data?.backdrop_url) {
        item.backdrop_url = res.data.backdrop_url; // mutate local reference to reflect change immediately
      }
      setHeroFile(null);
      alert('Hero image updated');
    } catch (e) {
      alert('Failed to upload hero image');
    } finally {
      setHeroUploading(false);
    }
  };

  return (
    <div className="media-modal" onClick={onClose}>
      <div className="media-modal__card glass-card" onClick={(e) => e.stopPropagation()}>
        <div className="media-modal__poster">
          {posterSrc ? (
            <img src={posterSrc} alt={item.title} />
          ) : (
            <div className="modal-poster-placeholder">No poster</div>
          )}
          <div className="modal-close" onClick={onClose}>
            ✖
          </div>
        </div>
        <div className="media-modal__body">
          <h2 className="media-modal__title">{item.title}</h2>
          <div className="media-modal__meta">
            {item.release_year && <span className="pill">{item.release_year}</span>}
            {item.genre && <span className="pill">{item.genre}</span>}
            {item.type && <span className="pill">{item.type.toUpperCase()}</span>}
          </div>
          <p className="media-modal__description">{item.description}</p>

          <div className="media-modal__actions">
            {item.cloudinary_url && (
              <button className="btn" onClick={() => onPlay(item)}>
                ▶ Play
              </button>
            )}
            {onWatchlist && (
              <button className="btn" onClick={() => onWatchlist(item.id)}>
                ＋ Watchlist
              </button>
            )}
            {isAdmin && onDelete && (
              <button className="btn" onClick={() => onDelete(item.id)}>
                🗑 Delete
              </button>
            )}
          </div>

          {isAdmin && (
            <div className="hero-upload">
              <div className="subdued" style={{ marginBottom: 6 }}>
                Hero/Backdrop image (for top banner)
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                <input type="file" accept="image/*" onChange={(e) => setHeroFile(e.target.files[0])} />
                <button className="btn" disabled={!heroFile || heroUploading} onClick={handleHeroUpload}>
                  {heroUploading ? 'Uploading…' : 'Upload hero image'}
                </button>
              </div>
            </div>
          )}

          {isSeries && (
            <>
              <div className="episode-controls">
                <span className="subdued">Episodes</span>
                <select
                  value={season ?? ''}
                  onChange={(e) => setSeason(Number(e.target.value))}
                >
                  {[...new Set(episodes.map((e) => e.season))].map((s) => (
                    <option key={`season-${s}`} value={s}>
                      Season {s}
                    </option>
                  ))}
                </select>
              </div>
              <div className="episode-list">
                {episodesForSeason.map((ep) => (
                  <div
                    key={ep.id}
                    className="episode-row"
                    onClick={() =>
                      onPlay({
                        ...ep,
                        type: item.type,
                        parent_id: item.id,
                        title: ep.title || `Episode ${ep.episode}`,
                        hls_url: ep.hls_url || ep.cloudinary_url,
                        cloudinary_url: ep.cloudinary_url,
                        poster: item.thumbnail_url || item.poster || item.poster_url,
                      })
                    }
                  >
                    <div>
                      <div className="value">
                        S{ep.season} · E{ep.episode} — {ep.title || 'Episode'}
                      </div>
                      <div className="subdued" style={{ fontSize: '0.9rem' }}>
                        {ep.description || 'Episode'}
                      </div>
                    </div>
                    {ep.cloudinary_url && <span>▶</span>}
                  </div>
                ))}
                {!episodesForSeason.length && <div className="subdued">No episodes yet.</div>}
              </div>
              {isAdmin && (
                <div className="glass-card" style={{ padding: '10px', marginTop: '10px' }}>
                  <div className="subdued">Upload an episode from the upload section; this list updates automatically.</div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default MediaModal;
