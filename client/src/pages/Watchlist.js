import React, { useState, useEffect } from 'react';
import api from '../api';
import VideoPlayer from '../components/VideoPlayer';
import MediaModal from '../components/MediaModal';
import RowSection from '../components/RowSection';
import './Watchlist.css';

const Watchlist = () => {
  const [watchlist, setWatchlist] = useState([]);
  const [current, setCurrent] = useState(null);
  const [selected, setSelected] = useState(null);
  const [continueList, setContinueList] = useState([]);

  useEffect(() => {
    api.get('/media/watchlist')
      .then((response) => setWatchlist(response.data))
      .catch((error) => console.error('Error fetching watchlist:', error));

    const loadCW = () => {
      try {
        const list = JSON.parse(localStorage.getItem('cw_entries')) || [];
        setContinueList(list);
      } catch {
        setContinueList([]);
      }
    };
    loadCW();
    const handler = () => loadCW();
    window.addEventListener('cw-updated', handler);
    return () => window.removeEventListener('cw-updated', handler);
  }, []);

  return (
    <div className="watchlist-container">
      <h1>Your Watchlist</h1>

      {watchlist.length > 0 ? (
        <>
          <RowSection
            title="Continue watching"
            items={continueList.slice(0, 12)}
            onCardClick={(itm) => setSelected(itm)}
          />
          <RowSection
            title="Saved titles"
            items={watchlist}
            onCardClick={(itm) => setSelected(itm)}
          />
        </>
      ) : (
        <p>Your watchlist is empty.</p>
      )}

      {current && (
        <div className="watchlist-player">
          <VideoPlayer
            url={current.hls_url || current.cloudinary_url}
            mediaItem={current}
            onClose={() => setCurrent(null)}
          />
        </div>
      )}
      {selected && (
        <MediaModal
          item={selected}
          onClose={() => setSelected(null)}
          onPlay={(itm) => {
            setCurrent(itm);
            setSelected(null);
          }}
          isAdmin={false}
        />
      )}
    </div>
  );
};

export default Watchlist;
