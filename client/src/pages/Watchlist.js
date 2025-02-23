import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './Watchlist.css';

const Watchlist = () => {
  const [watchlist, setWatchlist] = useState([]);

  useEffect(() => {
    const token = localStorage.getItem('token');

    axios.get('https://indiflix.onrender.com/api/media/watchlist', {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((response) => setWatchlist(response.data))
      .catch((error) => console.error('Error fetching watchlist:', error));
  }, []);

  return (
    <div className="watchlist-container">
      <h1>Your Watchlist</h1>

      {watchlist.length > 0 ? (
        <div className="card-container">
          {watchlist.map((item) => (
            <div key={item.id} className="card">
              <img src={item.thumbnail_url} alt={item.title} />
              <h3>{item.title}</h3>
              <p>{item.description}</p>
              <button>Play</button>
            </div>
          ))}
        </div>
      ) : (
        <p>Your watchlist is empty.</p>
      )}
    </div>
  );
};

export default Watchlist;
