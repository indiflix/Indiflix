import React, { useEffect, useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../api';
import './Navbar.css';

const Navbar = () => {
  const [user, setUser] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const debounceRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    // ✅ Check if user is logged in
    const token = localStorage.getItem('token');
    if (token) {
      setUser(true);
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token'); // ✅ Remove token
    setUser(null);
    navigate('/login'); // ✅ Redirect to Login
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    const q = searchTerm.trim();
    if (!q) return;
    navigate(`/search?q=${encodeURIComponent(q)}`);
    setSuggestions([]);
  };

  // autocomplete suggestions (debounced)
  useEffect(() => {
    const q = searchTerm.trim();
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (q.length < 2) {
      setSuggestions([]);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      setLoadingSuggestions(true);
      try {
        const res = await api.get('/media', { params: { q, limit: 8 } });
        const list = res.data || [];
        // Keep only strong matches to avoid “all content” noise
        const filtered = list.filter(
          (item) => item.title && item.title.toLowerCase().includes(q.toLowerCase())
        );
        setSuggestions(filtered.slice(0, 8));
      } catch {
        setSuggestions([]);
      } finally {
        setLoadingSuggestions(false);
      }
    }, 250);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [searchTerm]);

  return (
    <nav className="navbar">
      <div className="navbar-left">
        <Link to="/" className="navbar-logo">Indiflix</Link>
        <Link to="/movies" className="navbar-link">Movies</Link>
        <Link to="/series" className="navbar-link">Series</Link>
        <Link to="/anime" className="navbar-link">Anime</Link>
      </div>

      <div className="navbar-search-wrapper">
        <form className="navbar-search" onSubmit={handleSearchSubmit}>
          <input
            type="text"
            placeholder="Search movies, series, anime..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            aria-label="Search"
          />
          <button type="submit" aria-label="Search">
            🔍
          </button>
        </form>
        {suggestions.length > 0 && (
          <div className="navbar-suggestions">
            {suggestions.map((s) => {
              const poster =
                s.thumbnail_url || s.poster || s.poster_url || 'https://via.placeholder.com/80x120?text=?';
              return (
                <button
                  key={`${s.type}-${s.id}`}
                  className="navbar-suggestion"
                  onClick={() => {
                    navigate(`/search?q=${encodeURIComponent(s.title)}`);
                    setSearchTerm(s.title);
                    setSuggestions([]);
                  }}
                >
                  <img src={poster} alt={s.title} className="suggest-thumb" />
                  <div className="suggest-text">
                    <span className="suggest-title">{s.title}</span>
                    <span className="suggest-meta">{s.type}</span>
                  </div>
                </button>
              );
            })}
          </div>
        )}
        {loadingSuggestions && <div className="navbar-suggestions loading">Searching…</div>}
      </div>

      <div className="navbar-right">
        <Link to="/contact" className="navbar-link">Contact</Link>
        {user ? (
          <>
            <Link to="/watchlist" className="navbar-link">Watchlist</Link>
            <button className="logout-button" onClick={handleLogout}>Logout</button>
          </>
        ) : (
          <>
            <Link to="/login" className="navbar-link">Login</Link>
            <Link to="/signup" className="navbar-link cta-button">Signup</Link>
          </>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
