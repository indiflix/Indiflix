import React, { useState, useEffect } from 'react';
import axios from 'axios';
import VideoPlayer from '../components/VideoPlayer';
import './Home.css';

const Home = () => {
  const [media, setMedia] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
    const [currentMovie, setCurrentMovie] = useState(null);
  //const [videoUrl, setVideoUrl] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);

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

    axios.get('http://localhost:5000/api/media')
      .then((response) => {
        setMedia(response.data);
        setLoading(false);
      })
      .catch((error) => {
        console.error('Error fetching media:', error);
        setError('Failed to load media');
        setLoading(false);
      });
  }, []);

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

  // ✅ Handle Media Deletion (Admin Only)
  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this media?')) return;

    try {
      const token = localStorage.getItem('token');
      await axios.delete(`http://localhost:5000/api/media/delete/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      alert('Media deleted successfully!');
      setMedia(media.filter((item) => item.id !== id)); // ✅ Remove from UI
    } catch (error) {
      alert('Error deleting media: ' + error.response?.data?.error || error.message);
    }
  };

  return (
    <div className="home-container">
      <h1>Welcome to Indiflix</h1>
      {currentMovie && <VideoPlayer url={currentMovie.cloudinary_url} />}

      {loading && <p>Loading media...</p>}
      {error && <p className="error">{error}</p>}

      {!loading && media.length > 0 ? (
        <div className="card-container">
          {media.map((item) => (
            <div key={item.id} className="card">
              <img src={item.thumbnail_url} alt={item.title} />
              <h3>{item.title}</h3>
              <p>{item.description}</p>
              <button onClick={() => setCurrentMovie(item)}>▶ Play</button>
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
        !loading && <p>No media available.</p>
      )}
    </div>
  );
};

export default Home;
