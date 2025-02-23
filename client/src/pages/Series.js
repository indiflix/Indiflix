import React, { useState, useEffect } from 'react';
import axios from 'axios';
import VideoPlayer from '../components/VideoPlayer';
import './Series.css';

const Series = () => {
  const [series, setSeries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [currentEpisode, setCurrentEpisode] = useState(null);
 // const [currentMovie, setCurrentMovie] = useState(null);
 // const [videoUrl, setVideoUrl] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('token');

    if (!token) {
      setIsAdmin(false);
    } else {
      axios.get('http://localhost:5000/api/users/me', {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((response) => setIsAdmin(response.data.isAdmin))
        .catch(() => setIsAdmin(false));
    }

    axios.get('http://localhost:5000/api/media?type=Series')
      .then((response) => {
        setSeries(response.data);
        setLoading(false);
      })
      .catch((error) => {
        console.error('Error fetching series:', error);
        setError('Failed to load series');
        setLoading(false);
      });
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
      const token = localStorage.getItem('token');
      await axios.post('http://localhost:5000/api/media/rate', { media_id: mediaId, rating }, {
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
      await axios.post('http://localhost:5000/api/media/watchlist/add', { media_id: mediaId }, {
        headers: { Authorization: `Bearer ${token}` },
      });
      alert('Added to watchlist!');
    } catch (error) {
      alert('Error adding to watchlist: ' + error.response?.data?.error || error.message);
    }
  };

  // ✅ Handle Series Deletion (Admin Only)
  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this series?')) return;

    try {
      const token = localStorage.getItem('token');
      await axios.delete(`http://localhost:5000/api/media/delete/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

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
      {currentEpisode && <VideoPlayer url={currentEpisode.cloudinary_url} onNextEpisode={handleNextEpisode} />}

      {loading && <p>Loading series...</p>}
      {error && <p className="error">{error}</p>}

      {!loading && series.length > 0 ? (
        <div className="card-container">
          {series.map((item) => (
            <div key={item.id} className="card">
              <img src={item.thumbnail_url} alt={item.title} />
              <h3>{item.title} - S{item.season}E{item.episode}</h3>
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
        !loading && <p>No series available.</p>
      )}
    </div>
  );
};

export default Series;
