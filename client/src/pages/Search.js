import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import api from '../api';
import MediaModal from '../components/MediaModal';
import VideoPlayer from '../components/VideoPlayer';
import './Home.css';

const Search = () => {
  const location = useLocation();
  const query = new URLSearchParams(location.search).get('q') || '';

  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [current, setCurrent] = useState(null);
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    const run = async () => {
      const trimmed = query.trim();
      if (!trimmed) {
        setResults([]);
        return;
      }
      setLoading(true);
      try {
        const res = await api.get('/media', { params: { q: trimmed, limit: 60 } });
        const list = res.data || [];
        // If backend already filtered, keep as-is; otherwise, ensure contains
        const filtered = list.filter(
          (item) => item.title && item.title.toLowerCase().includes(trimmed.toLowerCase())
        );
        setResults(filtered);
      } catch (err) {
        console.error('Search failed', err);
        setResults([]);
      } finally {
        setLoading(false);
      }
    };
    run();
  }, [query]);

  return (
    <div className="home-container">
      <div className="section-header">
        <div>
          <h2>Search</h2>
          <p className="muted">Results for “{query}”</p>
        </div>
      </div>

      {loading && <div className="muted">Searching...</div>}
      {!loading && query && results.length === 0 && <div className="muted">No matches found.</div>}

      {current && (
        <VideoPlayer
          url={current.hls_url || current.cloudinary_url}
          onClose={() => setCurrent(null)}
        />
      )}

      {selected && (
        <MediaModal
          item={selected}
          onClose={() => setSelected(null)}
          onPlay={(itm) => {
            setCurrent(itm);
            setSelected(null);
          }}
          onWatchlist={() => {}}
          onDelete={() => {}}
          isAdmin={false}
        />
      )}

      <div className="card-container">
        {results.map((item) => (
          <div
            key={`${item.type}-${item.id}`}
            className="card"
            role="button"
            onClick={() => setSelected(item)}
          >
            {item.thumbnail_url || item.poster || item.poster_url ? (
              <img src={item.thumbnail_url || item.poster || item.poster_url} alt={item.title} />
            ) : (
              <div className="card-placeholder">No poster</div>
            )}
            <div className="card-content">
              <h3>{item.title}</h3>
              <div className="pill small">{item.type}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Search;
