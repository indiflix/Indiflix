import React, { useState, useEffect } from 'react';
import VideoPlayer from '../components/VideoPlayer';
import MediaModal from '../components/MediaModal';
import RowSection from '../components/RowSection';
import HeroSpotlight from '../components/HeroSpotlight';
import api from '../api';
import './Series.css';

const Series = () => {
  const [series, setSeries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [currentEpisode, setCurrentEpisode] = useState(null);
  const [selected, setSelected] = useState(null);
  const [continueList, setContinueList] = useState([]);
 // const [currentMovie, setCurrentMovie] = useState(null);
 // const [videoUrl, setVideoUrl] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('token');

    if (!token) {
      setIsAdmin(false);
    } else {
      api.get('/users/me')
        .then((response) => setIsAdmin(response.data.isAdmin))
        .catch(() => setIsAdmin(false));
    }

    api.get('/media', { params: { type: 'series' } })
      .then((response) => {
        setSeries(response.data);
        setLoading(false);
      })
      .catch((error) => {
        console.error('Error fetching series:', error);
        setError('Failed to load series');
        setLoading(false);
      });

    const loadCW = () => {
      try {
        const list = JSON.parse(localStorage.getItem('cw_entries')) || [];
        setContinueList(list.filter((i) => i.type === 'series'));
      } catch {
        setContinueList([]);
      }
    };
    loadCW();
    const handler = () => loadCW();
    window.addEventListener('cw-updated', handler);
    return () => window.removeEventListener('cw-updated', handler);
  }, []);
  const handleNextEpisode = () => {
    if (!currentEpisode) return;

    const nextEpisode = series.find(
      (item) => item.season === currentEpisode.season && item.episode === currentEpisode.episode + 1
    );

    if (nextEpisode) {
      setCurrentEpisode(nextEpisode);
    } else {
      alert('No more episodes in this season!');
    }
  };
  // ✅ Handle Rating Submission
  const handleRating = async (mediaId, rating) => {
    try {
      await api.post('/media/rate', { media_id: mediaId, rating });
      alert('Rating submitted successfully!');
    } catch (error) {
      alert('Error submitting rating: ' + error.response?.data?.error || error.message);
    }
  };

  // ✅ Handle Watchlist Addition
  const handleWatchlist = async (mediaId) => {
    try {
      await api.post('/media/watchlist/add', { media_id: mediaId });
      alert('Added to watchlist!');
    } catch (error) {
      alert('Error adding to watchlist: ' + error.response?.data?.error || error.message);
    }
  };

  // ✅ Handle Series Deletion (Admin Only)
  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this series?')) return;

    try {
      await api.delete(`/media/delete/${id}`);

      alert('Series deleted successfully!');
      setSeries(series.filter((item) => item.id !== id)); // ✅ Remove from UI
    } catch (error) {
      alert('Error deleting series: ' + error.response?.data?.error || error.message);
    }
  };

  return (
    <div className="series-container">
      <h1>Series</h1>
      {/* ✅ Video Player */}
      {currentEpisode && (
        <VideoPlayer
          url={currentEpisode.hls_url || currentEpisode.cloudinary_url}
          mediaItem={currentEpisode}
          onNextEpisode={handleNextEpisode}
          onClose={() => setCurrentEpisode(null)}
        />
      )}
      {selected && (
        <MediaModal
          item={selected}
          onClose={() => setSelected(null)}
          onPlay={(itm) => {
            setCurrentEpisode(itm);
            setSelected(null);
          }}
          onWatchlist={handleWatchlist}
          onDelete={handleDelete}
          isAdmin={isAdmin}
        />
      )}

      {loading && <p>Loading series...</p>}
      {error && <p className="error">{error}</p>}

      {!loading && series.length > 0 ? (
        <>
          <HeroSpotlight
            items={series}
            onPlay={(itm) => setCurrentEpisode(itm)}
            onMore={(itm) => setSelected(itm)}
          />
          <RowSection
            title="Continue watching"
            items={continueList.slice(0, 12)}
            onCardClick={(itm) => setSelected(itm)}
          />
          <RowSection
            title="Trending series"
            items={series.slice(0, 12)}
            onCardClick={(itm) => setSelected(itm)}
          />
          <RowSection
            title="Drama & Romance"
            items={series.filter((m) => (m.genre || '').toLowerCase().match(/drama|romance/)).slice(0, 12)}
            onCardClick={(itm) => setSelected(itm)}
          />
          <RowSection
            title="Action & Adventure"
            items={series.filter((m) => (m.genre || '').toLowerCase().includes('action')).slice(0, 12)}
            onCardClick={(itm) => setSelected(itm)}
          />
        </>
      ) : (
        !loading && <p>No series available.</p>
      )}
    </div>
  );
};

export default Series;
