import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import VideoPlayer from '../components/VideoPlayer';
import axios from 'axios';
import './Movies.css';

const Movies = () => {
  const navigate = useNavigate();

  // ✅ State variables
  const [isAdmin, setIsAdmin] = useState(false);
 // const [videoUrl, setVideoUrl] = useState('');
  const [media, setMedia] = useState([]);
  const [currentMovie, setCurrentMovie] = useState(null);
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
  const [ratings, setRatings] = useState({});

  // ✅ Check if user is admin and fetch media data
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/login');
      return;
    }

    axios.get('http://localhost:5000/api/users/me', {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((response) => setIsAdmin(response.data.isAdmin))
      .catch(() => setIsAdmin(false));

      axios.get('http://localhost:5000/api/media?type=movie')
      .then((response) => setMedia(response.data))
      .catch((error) => console.error('Error fetching movies:', error));
  }, [navigate]);

  // ✅ Handle file selection
  const handleVideoChange = (event) => setVideoFile(event.target.files[0]);
  const handleThumbnailChange = (event) => setThumbnailFile(event.target.files[0]);

  // ✅ Handle video upload (Admin only)
  const handleUpload = async () => {
    if (!isAdmin) {
      alert('You are not authorized to upload videos.');
      return;
    }

    if (!videoFile || !thumbnailFile || !title || !description || !releaseYear || !genre) {
      alert('Please fill in all fields and select a video file and a thumbnail.');
      return;
    }

    const formData = new FormData();
    formData.append('file', videoFile);
    formData.append('thumbnail', thumbnailFile);
    formData.append('title', title);
    formData.append('description', description);
    formData.append('type', type);
    formData.append('release_year', releaseYear);
    formData.append('genre', genre);

    // ✅ Add season & episode for series & anime
    if (type === 'series' || type === 'anime') {
      formData.append('season', season);
      formData.append('episode', episode);
    }

    try {
      const token = localStorage.getItem('token');
      const response = await axios.post('http://localhost:5000/api/media/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data', Authorization: `Bearer ${token}` },
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
      const token = localStorage.getItem('token');
      await axios.delete(`http://localhost:5000/api/media/delete/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setMedia(media.filter((item) => item.id !== id));
      alert('Video deleted successfully!');
    } catch (error) {
      alert('Error deleting video: ' + (error.response ? error.response.data.error : error.message));
    }
  };

  // ✅ Handle adding to watchlist
  const handleAddToWatchlist = async (mediaId) => {
    try {
      const token = localStorage.getItem('token');
      await axios.post('http://localhost:5000/api/media/watchlist/add', { media_id: mediaId }, {
        headers: { Authorization: `Bearer ${token}` },
      });
      alert('Added to watchlist!');
    } catch (error) {
      alert('Failed to add to watchlist.');
    }
  };

  // ✅ Handle rating submission
  const handleRatingSubmit = async (mediaId, ratingValue) => {
    try {
      const token = localStorage.getItem('token');
      await axios.post('http://localhost:5000/api/media/rate', { media_id: mediaId, rating: ratingValue }, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setRatings({ ...ratings, [mediaId]: ratingValue });
      alert('Rating submitted!');
    } catch (error) {
      alert('Failed to submit rating.');
    }
  };

  return (
    <div className="movies-container">
      <h1>Movies</h1>

      {/* ✅ Video Player */}
      {currentMovie && <VideoPlayer url={currentMovie.cloudinary_url} />}
      {/* ✅ Upload Section (Admin only) */}
      {isAdmin && (
        <div className="upload-section">
          <h2>Upload Video</h2>
          <input type="file" accept="video/*" onChange={handleVideoChange} />
          <input type="file" accept="image/*" onChange={handleThumbnailChange} />
          <input type="text" placeholder="Title" value={title} onChange={(e) => setTitle(e.target.value)} />
          <textarea placeholder="Description" value={description} onChange={(e) => setDescription(e.target.value)} />
          <select value={type} onChange={(e) => setType(e.target.value)}>
            <option value="movie">Movie</option>
            <option value="series">Series</option>
            <option value="anime">Anime</option>
          </select>
          <input type="number" placeholder="Release Year" value={releaseYear} onChange={(e) => setReleaseYear(e.target.value)} />
          <input type="text" placeholder="Genre" value={genre} onChange={(e) => setGenre(e.target.value)} />
          {(type === 'series' || type === 'anime') && (
            <div className="season-episode-fields">
              <input type="number" placeholder="Season" value={season} onChange={(e) => setSeason(e.target.value)} />
              <input type="number" placeholder="Episode" value={episode} onChange={(e) => setEpisode(e.target.value)} />
            </div>
          )}

          {videoFile && thumbnailFile && <button className="upload-button" onClick={handleUpload}>Upload Video</button>}
        </div>
      )}

      {/* ✅ Movie List */}
      <div className="card-container">
        {media.map((item) => (
          <div key={item.id} className="card">
            <img src={item.thumbnail_url} alt={item.title} />
            <h3>{item.title}</h3>
            <p>{item.description}</p>
            <button onClick={() => setCurrentMovie(item)}>▶ Play</button>
            <button onClick={() => handleAddToWatchlist(item.id)}>Add to Watchlist</button>

            {/* ✅ Star-Based Rating */}
            <div className="rating-section">
              {[1, 2, 3, 4, 5].map((star) => (
                <span key={star} className={star <= (ratings[item.id] || 0) ? "star selected" : "star"} onClick={() => handleRatingSubmit(item.id, star)}>⭐</span>
              ))}
            </div>

            {isAdmin && <button className="delete-button" onClick={() => handleDelete(item.id)}>Delete</button>}
          </div>
        ))}
      </div>
    </div>
  );
};

export default Movies;
