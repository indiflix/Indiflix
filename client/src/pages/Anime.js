import React, { useState, useEffect } from 'react';
import VideoPlayer from '../components/VideoPlayer';
import axios from 'axios';
import './Anime.css';

const Anime = () => {
  const [anime, setAnime] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentEpisode, setCurrentEpisode] = useState(null);
  //const [currentMovie, setCurrentMovie] = useState(null);
  //const [videoUrl, setVideoUrl] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('token');

    if (!token) {
      setIsAdmin(false);
    } else {
      axios.get('https://indiflix.onrender.com/api/users/me', {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((response) => setIsAdmin(response.data.isAdmin))
        .catch(() => setIsAdmin(false));
    }

    axios.get('https://indiflix.onrender.com/api/media?type=anime')
      .then((response) => {
        setAnime(response.data);
        setLoading(false);
      })
      .catch((error) => {
        console.error('Error fetching anime:', error);
        setError('Failed to load anime');
        setLoading(false);
      });
  }, []);
  const handleNextEpisode = () => {
    if (!currentEpisode) return;

    const nextEpisode = anime.find(
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
      const token = localStorage.getItem('token');
      await axios.post('https://indiflix.onrender.com/api/media/rate', { media_id: mediaId, rating }, {
        headers: { Authorization: `Bearer ${token}` },
      });
      alert('Rating submitted successfully!');
    } catch (error) {
      alert('Error submitting rating: ' + error.response?.data?.error || error.message);
    }
  };

  // ✅ Handle Watchlist Addition
  const handleWatchlist = async (mediaId) => {
    try {
      const token = localStorage.getItem('token');
      await axios.post('https://indiflix.onrender.com/api/media/watchlist/add', { media_id: mediaId }, {
        headers: { Authorization: `Bearer ${token}` },
      });
      alert('Added to watchlist!');
    } catch (error) {
      alert('Error adding to watchlist: ' + error.response?.data?.error || error.message);
    }
  };

  // ✅ Handle Anime Deletion (Admin Only)
  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this anime?')) return;

    try {
      const token = localStorage.getItem('token');
      await axios.delete(`https://indiflix.onrender.com/api/media/delete/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      alert('Anime deleted successfully!');
      setAnime(anime.filter((item) => item.id !== id)); // ✅ Remove from UI
    } catch (error) {
      alert('Error deleting anime: ' + error.response?.data?.error || error.message);
    }
  };

  return (
    <div className="anime-container">
      <h1>Anime</h1>
      {currentEpisode && <VideoPlayer url={currentEpisode.cloudinary_url} onNextEpisode={handleNextEpisode} />}

      {loading && <p>Loading anime...</p>}
      {error && <p className="error">{error}</p>}

      {!loading && anime.length > 0 ? (
        <div className="card-container">
          {anime.map((item) => (
            <div key={item.id} className="card">
              <img src={item.thumbnail_url} alt={item.title} />
              <h3>{item.title}</h3>
              <p>{item.description}</p>
              <button onClick={() => setCurrentEpisode(item)}>▶ Play</button>
              <button onClick={() => handleWatchlist(item.id)}>Add to Watchlist</button>

              {/* ✅ Rating UI (5 Stars) */}
              <div className="rating">
                {[1, 2, 3, 4, 5].map((star) => (
                  <span key={star} onClick={() => handleRating(item.id, star)}>⭐</span>
                ))}
              </div>

              {isAdmin && (
                <button className="delete-button" onClick={() => handleDelete(item.id)}>Delete</button>
              )}
            </div>
          ))}
        </div>
      ) : (
        !loading && <p>No anime available.</p>
      )}
    </div>
  );
};

export default Anime;
