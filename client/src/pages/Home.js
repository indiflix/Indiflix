import React, { useState, useEffect } from 'react';
import VideoPlayer from '../components/VideoPlayer';
import MediaModal from '../components/MediaModal';
import RowSection from '../components/RowSection';
import HeroSpotlight from '../components/HeroSpotlight';
import api from '../api';
import './Home.css';

const Home = () => {
  const [media, setMedia] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentMovie, setCurrentMovie] = useState(null);
  const [selected, setSelected] = useState(null);
  //const [videoUrl, setVideoUrl] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);
  const [continueList, setContinueList] = useState([]);

  const loadContinue = () => {
    try {
      const list = JSON.parse(localStorage.getItem('cw_entries')) || [];
      setContinueList(list);
    } catch {
      setContinueList([]);
    }
  };

  useEffect(() => {
    const token = localStorage.getItem('token');

    if (!token) {
      setIsAdmin(false);
    } else {
      api.get('/users/me')
        .then((response) => setIsAdmin(response.data.isAdmin))
        .catch(() => setIsAdmin(false));
    }

    api.get('/media')
      .then((response) => {
        setMedia(response.data);
        setLoading(false);
      })
      .catch((error) => {
        console.error('Error fetching media:', error);
        setError('Failed to load media');
        setLoading(false);
      });

    loadContinue();
    const handler = () => loadContinue();
    window.addEventListener('cw-updated', handler);
    return () => window.removeEventListener('cw-updated', handler);
  }, []);

  // ✅ Handle Watchlist Addition
  const handleWatchlist = async (mediaId) => {
    try {
      await api.post('/media/watchlist/add', { media_id: mediaId });
      alert('Added to watchlist!');
    } catch (error) {
      alert('Error adding to watchlist: ' + error.response?.data?.error || error.message);
    }
  };

  // ✅ Handle Media Deletion (Admin Only)
  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this media?')) return;

    try {
      await api.delete(`/media/delete/${id}`);

      alert('Media deleted successfully!');
      setMedia(media.filter((item) => item.id !== id)); // ✅ Remove from UI
    } catch (error) {
      alert('Error deleting media: ' + error.response?.data?.error || error.message);
    }
  };

  return (
    <div className="home-container">
      <h1>Welcome to Indiflix</h1>
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
          onWatchlist={handleWatchlist}
          onDelete={handleDelete}
          isAdmin={isAdmin}
        />
      )}

      {loading && <p>Loading media...</p>}
      {error && <p className="error">{error}</p>}

      {!loading && media.length > 0 ? (
        <>
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
            title="Trending now"
            items={media.slice(0, 12)}
            onCardClick={(itm) => setSelected(itm)}
          />
          <RowSection
            title="Action & Adventure"
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
        </>
      ) : (
        !loading && <p>No media available.</p>
      )}
    </div>
  );
};

export default Home;
